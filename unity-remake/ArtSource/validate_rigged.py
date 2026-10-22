"""Validate exported FBX skin clusters, baked take names and exact clip durations."""
from pathlib import Path
import json, sys
from io_scene_fbx import parse_fbx
ROOT=Path(__file__).resolve().parents[1]
sample='--sample' in sys.argv
manifest=json.loads((ROOT/'ArtSource'/('rig_sample.json' if sample else 'asset_manifest.json')).read_text())
records=manifest if sample else manifest['models']
required={'Idle':2.,'Walk':.8,'Attack':.65,'Hit':.25,'Death':.8,'Special':1.4}
report=[]
for record in records:
    file=ROOT/'Unity'/'Assets'/'Resources'/'Models'/(record['name']+'.fbx')
    tree,version=parse_fbx.parse(str(file))
    objects=next(e for e in tree.elems if e.id==b'Objects')
    meshes=[e for e in objects.elems if e.id==b'Geometry' and e.props[2]==b'Mesh']
    bones=[e for e in objects.elems if e.id==b'Model' and e.props[2]==b'LimbNode']
    skins=[e for e in objects.elems if e.id==b'Deformer' and e.props[2]==b'Skin']
    clusters=[e for e in objects.elems if e.id==b'Deformer' and e.props[2]==b'Cluster']
    takes=[e for e in objects.elems if e.id==b'AnimationStack']
    assert len(meshes)==1,(file.name,'meshcount',len(meshes))
    assert skins and clusters,(file.name,'missing skin')
    vertices=next(e.props[0] for e in meshes[0].elems if e.id==b'Vertices');count=len(vertices)//3
    weighted=set()
    for c in clusters:
        idx=next((e.props[0] for e in c.elems if e.id==b'Indexes'),[])
        weights=next((e.props[0] for e in c.elems if e.id==b'Weights'),[])
        weighted.update(i for i,w in zip(idx,weights) if w>0)
    assert len(weighted)==count,(file.name,'vertex coverage',len(weighted),count)
    clips={}
    for take in takes:
        name=take.props[1].split(b'\x00')[0].decode()
        props=next(e for e in take.elems if e.id==b'Properties70')
        times={e.props[0]:e.props[-1] for e in props.elems if e.id==b'P'}
        duration=(times.get(b'LocalStop',0)-times.get(b'LocalStart',0))/46186158000
        clips[name]=round(duration,4)
    for name,duration in required.items():assert name in clips and abs(clips[name]-duration)<.001,(file.name,name,clips)
    report.append({'name':record['name'],'mesh_vertices':count,'skin_clusters':len(clusters),'fbx_bones':len(bones),
        'vertex_weight_coverage':len(weighted)/count,'clips':clips,'file_bytes':file.stat().st_size})
result={'status':'PASS','model_count':len(report),'required_clips':required,'checks':['actual FBX Skin and Cluster deformers','100% exported mesh vertex coverage','six distinct named baked takes with exact durations'],'models':report}
path=ROOT/'ArtSource'/('sample_validation.json' if sample else 'validation_report.json')
path.write_text(json.dumps(result,indent=2))
print(json.dumps(result,indent=2))
