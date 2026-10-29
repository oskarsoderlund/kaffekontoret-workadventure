/** Import generated transparent sheets into WorkAdventure's 3×4 animation atlas.
 * Imagegen makes the artwork; this script only detects gutters, crops, sizes and packs frames.
 */
import {spawnSync} from 'node:child_process';
import {readFile,writeFile,mkdir,mkdtemp,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import os from 'node:os';

const root=fileURLToPath(new URL('../..',import.meta.url));
const assets=path.join(root,'local-office/assets/crew');
const output=path.join(root,'play/public/office/avatars/crew');
const catalog=JSON.parse(await readFile(path.join(assets,'catalog.json'),'utf8'));
const requested=process.argv.slice(2);
const selected=requested.length?catalog.filter(c=>requested.includes(c.id)):catalog;
const reports=[];
function magick(args,buffer=false) {
    const r=spawnSync('magick',args,{maxBuffer:150*1024*1024,encoding:buffer?undefined:'utf8'});
    if(r.status!==0)throw Error('ImageMagick failed: '+String(r.stderr));
    return r.stdout;
}
function cuts(projection,parts) {
    const result=[0],length=projection.length;
    for(let i=1;i<parts;i++) {
        const target=length*i/parts;
        let best=Math.round(target),score=Infinity;
        for(let p=Math.floor(target-length/(parts*3));p<target+length/(parts*3);p++) {
            let sum=0;for(let d=-2;d<=2;d++)sum+=projection[p+d]||0;
            if(sum<score||(sum===score&&Math.abs(p-target)<Math.abs(best-target))){best=p;score=sum;}
        }
        if(score>100)throw Error('Generated sprites touch across a gutter; inspect source before packing.');
        result.push(best);
    }
    result.push(length);return result;
}
await mkdir(output,{recursive:true});
for(const character of selected) {
    const source=path.join(assets,'raw',character.id+'.png');
    const [w,h,opaque]=magick(['identify','-format','%w %h %[opaque]',source]).trim().split(' ');
    const width=Number(w),height=Number(h);
    if(opaque!=='False')throw Error(character.id+': source must have genuine transparency.');
    const pixels=magick([source,'-depth','8','rgba:-'],true);
    const rowCounts=Array(height).fill(0);
    for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(pixels[(y*width+x)*4+3]>40)rowCounts[y]++;
    const ys=cuts(rowCounts,4);
    const temp=await mkdtemp(path.join(os.tmpdir(),'office-crew-atlas-'));
    const frames=[],bounds=[];
    try {
        for(let row=0;row<4;row++) {
            const columns=Array(width).fill(0);
            for(let y=ys[row];y<ys[row+1];y++)for(let x=0;x<width;x++)if(pixels[(y*width+x)*4+3]>40)columns[x]++;
            const xs=cuts(columns,3);
            for(let column=0;column<3;column++) {
                const index=row*3+column;
                const box={x:xs[column],y:ys[row],width:xs[column+1]-xs[column],height:ys[row+1]-ys[row]};
                const frame=path.join(temp,index+'.png');
                const flip=(character.id==='crew-hacker'||character.id==='crew-diva')&&index===5;
                magick([source,'-crop',`${box.width}x${box.height}+${box.x}+${box.y}`,'+repage',
                    '-trim','+repage',...(flip?['-flop']:[]),'-resize','112x112',
                    '-gravity','south','-background','none','-extent','128x120',
                    '-gravity','north','-extent','128x128',frame]);
                frames.push(frame);bounds.push({...box,flip});
            }
        }
        const rows=[];
        for(let row=0;row<4;row++) {
            const rowFile=path.join(temp,'row-'+row+'.png');
            magick([...frames.slice(row*3,row*3+3),'+append',rowFile]);rows.push(rowFile);
        }
        magick([...rows,'-append',path.join(output,character.id+'.png')]);
        reports.push({id:character.id,sourceSize:[width,height],frameSize:128,atlasSize:[384,512],bounds});
        console.log('Packed',character.id,'12 transparent frames');
    } finally {await rm(temp,{recursive:true,force:true});}
}
await writeFile(path.join(assets,'packing-report'+(requested.length?'-partial':'')+'.json'),JSON.stringify(reports,null,2));
