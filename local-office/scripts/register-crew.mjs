import {readFile,writeFile,access} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../..',import.meta.url));
const crew=JSON.parse(await readFile(path.join(root,'local-office/assets/crew/catalog.json'),'utf8'));
const config=path.join(root,'play/src/pusher/data/woka.json');
const data=JSON.parse(await readFile(config,'utf8'));
for(const c of crew)await access(path.join(root,'play/public/office/avatars/crew',c.id+'.png'));
data.woka.collections=data.woka.collections.filter(c=>c.name!=='OSKAR BUSINESSOS · Crew');
data.woka.collections.unshift({name:'OSKAR BUSINESSOS · Crew',position:-2,textures:crew.map((c,position)=>({
    id:c.id,name:c.name,url:'office/avatars/crew/'+c.id+'.png',position,
}))});
await writeFile(config,JSON.stringify(data,null,4)+'\n');
console.log('Registered all 12 crew avatars. Oski is the first choice. Existing collections preserved.');
