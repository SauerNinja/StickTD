"""Read-only FBX coordinate and WAV validation, run through Blender Python."""
from pathlib import Path
from io_scene_fbx import parse_fbx
import json, wave
ROOT=Path(__file__).resolve().parents[1]
folder=ROOT/'Unity'/'Assets'/'Resources'/'Models'
results=[]
for file in sorted(folder.glob('*.fbx')):
    root,version=parse_fbx.parse(str(file))
    objects=next(e for e in root.elems if e.id==b'Objects')
    geometry=[e for e in objects.elems if e.id==b'Geometry']
    assert len(geometry)==1,(file.name,len(geometry))
    raw=next(e.props[0] for e in geometry[0].elems if e.id==b'Vertices')
    mins=[min(raw[i::3]) for i in range(3)];maxs=[max(raw[i::3]) for i in range(3)]
    bounds=[round(maxs[i]-mins[i],4) for i in range(3)]
    results.append({'model':file.stem,'fbx_xyz_bounds':bounds,'min_y':round(mins[1],4),'max_y':round(maxs[1],4)})
lookup={r['model']:r for r in results}
assert len(results)==50
assert lookup['Foundation']['fbx_xyz_bounds']==[1,0.45,1],lookup['Foundation']
assert lookup['Foundation']['max_y']==0,lookup['Foundation']
for name in ('GrassTile','PathTile'):
    assert lookup[name]['fbx_xyz_bounds'][0]==1 and lookup[name]['fbx_xyz_bounds'][2]==1
for name in ('SelectionRing','RangeRing'):
    assert lookup[name]['fbx_xyz_bounds'][0]==2 and lookup[name]['fbx_xyz_bounds'][2]==2
    assert lookup[name]['fbx_xyz_bounds'][1]<.05
assert lookup['Arrow']['fbx_xyz_bounds']==[.12,.12,.76],lookup['Arrow']
assert lookup['Bullet']['fbx_xyz_bounds']==[.07,.07,.28],lookup['Bullet']
audio=[]
for file in sorted((ROOT/'Unity'/'Assets'/'Resources'/'Audio').glob('*.wav')):
    with wave.open(str(file)) as wav:
        assert wav.getnchannels()==1 and wav.getframerate()==22050 and wav.getsampwidth()==2
        audio.append({'name':file.stem,'duration_seconds':round(wav.getnframes()/22050,3)})
assert len(audio)==10
report={'status':'PASS','models':50,'audio_clips':10,'coordinate_system':'FBX X right, Y up, +Z model facing',
 'checks':['All FBX files contain exactly one mesh','Tiles exactly1m square','Foundation1x0.45x1m, topY0',
 'Both rings diameter2m inXZ plane','Arrow and Bullet long axisZ','All WAVs mono16bit22050Hz'],
 'model_bounds':results,'audio':audio}
print(json.dumps(report,indent=2))
(ROOT/'ArtSource'/'validation_report.json').write_text(json.dumps(report,indent=2))
