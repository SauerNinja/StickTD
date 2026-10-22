"""Render authored FK clips from the saved native workshop; never rewrites FBXs/source."""
import bpy, math, json
from pathlib import Path
from mathutils import Vector
ART=Path(__file__).resolve().parent
folder=ART/'RigAnimationFrames';folder.mkdir(parents=True,exist_ok=True)
scene=bpy.context.scene
show=[('Swordsman','Attack',.65),('Archer','Attack',.65),('Mage','Special',1.4),
      ('Paladin','Walk',.8),('Gatling','Attack',.65),('Boss','Attack',.65),
      ('Wolf','Walk',.8),('Chest','Special',1.4),('Tree','Wind',2)]
allowed=set()
for i,(name,state,duration) in enumerate(show):
    root=bpy.data.objects[name];root.location=((i%3)*2.6,(i//3)*2.6,0);root.scale=(1.3,)*3 if name not in ('Tree','Chest') else (1,1,1)
    allowed.add(root)
    for child in root.children_recursive:allowed.add(child)
    rig=bpy.data.objects[name+'_Rig']
    rig.animation_data.action=None
    for track in rig.animation_data.nla_tracks:
        track.mute=track.name!=state
        if track.name==state:
            strip=track.strips[0];strip.scale=48/(duration*40)
    label=bpy.data.objects.get('Label_'+name)
    if label:
        label.location=((i%3)*2.6,(i//3)*2.6-1.0,.025);label.data.body=name+'  /  '+state;label.data.size=.17;allowed.add(label)
for obj in scene.objects:
    if obj.type in ('LIGHT','CAMERA') or obj.name=='RiggedWorkshop_Backdrop':continue
    obj.hide_render=obj not in allowed
camera=scene.camera;camera.data.ortho_scale=10.4
scene.render.resolution_x=1100;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
scene.render.engine='CYCLES';scene.cycles.samples=12
scene.render.image_settings.file_format='PNG'
target=Vector((2.6,2.45,.6))
for i in range(12):
    phase=i/11;angle=-.10+.20*phase
    camera.location=target+Vector((math.sin(angle)*11,-math.cos(angle)*11,11.5))
    camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler()
    scene.frame_set(1+int(round(48*phase)))
    scene.render.filepath=str(folder/('RigQA_%02d.png'%i))
    bpy.ops.render.render(write_still=True)
    print('QA FRAME',i,scene.frame_current,flush=True)
(ART/'rig_animation_qa.json').write_text(json.dumps({'source':'StickTD_Rigged.blend','frames':12,
 'rendered_animation':'actual authored NLA clips evaluated through armature deformation','models':[{'name':a,'clip':b,'duration':c} for a,b,c in show]},indent=2))
print('RIG ANIMATION QA COMPLETE',flush=True)
