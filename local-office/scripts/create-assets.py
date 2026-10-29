"""Generate the rooftop map and keep the existing original avatar designs."""
from PIL import Image, ImageDraw
from pathlib import Path
import json, runpy, subprocess
root=Path(__file__).resolve().parents[2]
out=root/'play/public/office'
(out/'avatars').mkdir(parents=True, exist_ok=True)
runpy.run_path(str(Path(__file__).with_name('create-rooftop.py')), run_name='__main__')
# Each original 32x32 avatar has down, left, right, up × 3 walking poses.
characters=[('street-jacket','Street Jacket','#242f37','#516c7e','#c78b64','jacket'),('neon-runner','Neon Runner','#a7ce5b','#303a51','#c58968','hoodie'),('night-boss','Night Boss','#795b91','#262938','#dfb48c','suit'),('city-skater','City Skater','#d88966','#394d65','#7a523e','cap'),('codex-crew','Codex Crew','#59b5a7','#273c46','#ead5b4','robot')]
for ident,name,shirt,pants,skin,style in characters:
    atlas=Image.new('RGBA',(96,128))
    for direction in range(4):
        for step in range(3):
            f=Image.new('RGBA',(32,32)); p=ImageDraw.Draw(f); shift=[-1,0,1][step]
            p.ellipse((7,27,25,31),fill=(0,0,0,75))
            p.rectangle((10,20,14,27+shift),fill=pants);p.rectangle((18,20,22,27-shift),fill=pants)
            p.rectangle((9,27+shift,15,29+shift),fill='#17242c');p.rectangle((17,27-shift,24,29-shift),fill='#17242c')
            p.rounded_rectangle((8,11,24,22),radius=3,fill=shirt)
            p.rectangle((6,13+shift,9,22+shift),fill=skin);p.rectangle((24,13-shift,26,22-shift),fill=skin)
            p.rounded_rectangle((11,2,22,12),radius=3,fill=skin)
            if style=='robot':
                p.rectangle((11,3,22,11),fill='#d9f6ef');p.rectangle((12,6,21,8),fill='#163f45');p.point((14,7),fill='#aaffbd');p.point((19,7),fill='#aaffbd')
            else:
                p.rectangle((11,2,22,5),fill='#1f252d')
                if style in ['cap','hoodie']: p.rectangle((10,1,23,4),fill=shirt)
                if direction!=3:
                    p.rectangle((12,6,21,7),fill='#162730') # sunglasses
                    p.line((16,9,19,9),fill='#6c493d')
                else: p.rectangle((11,4,22,10),fill='#252d35')
            if style=='suit': p.polygon([(13,12),(19,12),(16,18)],fill='#eee0d0');p.line((16,14,16,20),fill='#e19972',width=1)
            if style=='jacket': p.line((16,12,16,21),fill='#b1ada2');p.line((10,14,13,14),fill='#899db0')
            if style=='hoodie':p.line((13,13,13,17),fill='#e4e7cf');p.line((19,13,19,17),fill='#e4e7cf')
            if direction in [1,2]:
                if direction==1:f=f.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
                # Side profile width remains compatible with WorkAdventure's collision body.
            atlas.paste(f,(step*32,direction*32))
    atlas.save(out/'avatars'/f'{ident}.png')
woka=root/'play/src/pusher/data/woka.json'; data=json.loads(woka.read_text())
data['woka']['collections'] = [collection for collection in data['woka']['collections'] if collection['name'] != 'Sidequest Originals']
data['woka']['collections'].insert(0,{'name':'Sidequest Originals','position':-1,'textures':[dict(id=i,name=n,url=f'office/avatars/{i}.png',position=k) for k,(i,n,*_) in enumerate(characters)]})
woka.write_text(json.dumps(data,indent=4)+'\n')
subprocess.run(['node',str(Path(__file__).with_name('register-crew.mjs'))],check=True)
print('Generated rooftop map, collisions and the 5 existing animated avatar sheets.')
