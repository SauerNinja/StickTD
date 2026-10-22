"""Non-destructive rig/detail upgrade for the original Blender-authored StickTD assets.

Run in Blender 5.1: blender --background --factory-startup --python ArtSource/upgrade_rigged.py
Append -- --sample to export only Swordsman first. The original source .blend is preserved.
All mesh vertices receive real deform weights. Named NLA strips export individual FBX takes.
"""
import bpy, math, json, random, sys, re
from pathlib import Path
from mathutils import Vector, Quaternion, Euler

SOURCE=Path(__file__).resolve().parent
# Reuse only the original modeling definitions. Its build/export/render block never runs.
prefix=(SOURCE/'build_assets.py').read_text().split('\nfor n in TOWERS:export_model(n,tower)')[0]
exec(compile(prefix,str(SOURCE/'build_assets.py'),'exec'),globals())
scene=bpy.context.scene;scene.name='StickTD_RiggedWorkshop';scene.render.fps=40
SAMPLE='--sample' in sys.argv
DURATIONS={'Idle':2.0,'Walk':.8,'Attack':.65,'Hit':.25,'Death':.8,'Special':1.4}
NEW=['GrassTuft','FlowerPatch','Fern','Mushroom','Log','Stump','SmallStone','Reed','LeafParticle','RainDrop','Firefly','Cloud','ContactShadow','Puddle']
ROOTS=[];REPORT=[]

def material(name,color,alpha=1):
    m=bpy.data.materials.new(name);m.diffuse_color=(*color,alpha);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,alpha)
    p.inputs['Roughness'].default_value=.72;p.inputs['Alpha'].default_value=alpha
    if alpha<1:m.surface_render_method='DITHERED'
    return m
MATS['Shadow']=material('Shadow_111F2A',(17/255,31/255,42/255),.2)
MATS['Puddle']=material('ST_Puddle_438DD0',(.263,.553,.816),.55)

def base(o):return re.sub(r'\.\d+$','',o.name)
def nearest_side(o):
    center=o.matrix_world@(sum((Vector(v) for v in o.bound_box),Vector())/8)
    return 'L' if center.x<0 else 'R'
def multi(name):return {'Swarm':.72,'Splitmini':.55,'Tank':1.18,'Boss':1.55,'Troll':1.25,'Runner':.92}.get(name,1)
def text_add(body,loc,size=.18):
    bpy.ops.object.text_add(location=loc)
    o=bpy.context.object;o.name='Label_'+body;o.data.body=body;o.data.size=size
    o.data.align_x='CENTER';o.data.materials.append(MATS['Cream']);return o

def humanoid_detail(name,s):
    if name=='Barricade':
        for x in (-.36,0,.36):
            for z in (.25,.7):sphere('Rivet',(x*s,-.19*s,z*s),(.035*s,.02*s,.035*s),'Gold',1)
            for z in (.4,.55,.8):
                cube('Woodgrain',(x*s,-.12*s,z*s),(.1*s,.012*s,.012*s),'Wood',.002*s)
        return
    if name in ('Boulder','Wolf'):return
    hostile=name in ENEMIES
    color=('Coral' if hostile else 'Teal')
    if name in ('Mage','Wraith','Reaper','Splitter','Splitmini'):color='Violet'
    if name in ('Paladin','Boss'):color='Gold'
    if name in ('Cleric','Healer'):color='White'
    skin='Bone' if name in ('Skeleton','Reaper') else 'Cream'
    for side in (-1,1):
        # Readable eyebrows and softly faceted ears add expression to the round heads.
        brow=cube('Eyebrow',(side*.075*s,-.186*s,1.566*s),(.067*s,.022*s,.015*s),'Ink',.003*s)
        brow.rotation_euler[1]=side*(.20 if hostile else -.10)
        if name not in ('Wraith','Reaper','Fire','Ice'):
            sphere('Ear',(side*.218*s,0,1.47*s),(.038*s,.05*s,.055*s),skin,1)
        sphere('Shoulder joint',(side*.12*s,0,1.12*s),(.073*s,.071*s,.073*s),'SteelDark',1)
        sphere('Elbow joint',(side*.25*s,-.05*s,.93*s),(.062*s,.061*s,.062*s),'Ink',1)
        sphere('Knee joint',(side*.15*s,.025*s,.36*s),(.066*s,.064*s,.064*s),'SteelDark',1)
        cube('Boot sole',(side*.19*s,-.06*s,.018*s),(.17*s,.26*s,.037*s),'Ink',.008*s)
        cube('Boot toe cap',(side*.19*s,-.155*s,.083*s),(.16*s,.09*s,.08*s),'Steel',.015*s)
        cyl('Glove cuff',(side*.29*s,-.12*s,.99*s),(side*.30*s,-.14*s,1.055*s),.072*s,color,8)
        for z in (.11,.16):
            cube('Boot lace',(side*.19*s,-.18*s,z*s),(.09*s,.015*s,.012*s),'WoodLight',.002*s)
    cyl('Waist belt',(0,0,.72*s),(0,0,.79*s),.115*s,'Wood',10)
    cube('Belt buckle',(0,-.12*s,.758*s),(.085*s,.025*s,.07*s),'Gold',.008*s)
    for side in (-1,1):
        cube('Chest harness',(side*.065*s,-.085*s,.97*s),(.027*s,.028*s,.30*s),'Wood',.005*s)
        for z in (.86,1.08):sphere('Harness rivet',(side*.065*s,-.104*s,z*s),(.017*s,.014*s,.017*s),'Gold',1)
    # Hexagonal class pin, inset enamel and small contrasting center.
    cyl('Insignia trim',(0,-.14*s,1.06*s),(0,-.157*s,1.06*s),.072*s,'Gold',6)
    cyl('Insignia enamel',(0,-.158*s,1.06*s),(0,-.167*s,1.06*s),.051*s,color,6)
    sphere('Insignia gem',(0,-.18*s,1.06*s),(.02*s,.012*s,.024*s),'White',1)
    if name in ('Mage','Paladin','Cleric','Boss','Reaper','Healer'):
        o=prism('Cape',[(-.14*s,1.20*s),(.14*s,1.20*s),(.27*s,.29*s),(.07*s,.35*s),(0,.28*s),(-.27*s,.29*s)],.04*s,'Red' if hostile else 'TealDark')
        o.location.y=.17*s
        for side in (-1,1):
            cyl('Cape trim',(side*.14*s,.197*s,1.18*s),(side*.26*s,.197*s,.31*s),.015*s,'Gold',5)
            sphere('Cape clasp',(side*.12*s,-.015*s,1.19*s),(.045*s,.045*s,.045*s),'Gold',1)
    if name in ('Tank','Boss','Shielded','Paladin'):
        for side in (-1,1):
            cube('Armor trim',(side*.17*s,-.14*s,1.14*s),(.12*s,.025*s,.035*s),'Gold',.005*s)
            for z in (.87,1.03):sphere('Armor rivet',(side*.16*s,-.155*s,z*s),(.018*s,.016*s,.018*s),'Gold',1)
        cube('Helmet center ridge',(0,-.035*s,1.75*s),(.04*s,.35*s,.035*s),'Gold',.005*s)
    if name in ('Zombie','Troll'):
        for side in (-1,1):
            cyl('Tusk detail',(side*.11*s,-.17*s,1.33*s),(side*.12*s,-.19*s,1.43*s),.025*s,'Bone',5,r2=0)
    if name=='Skeleton':
        for x in (-.09,-.03,.03,.09):cube('Skull tooth',(x*s,-.185*s,1.34*s),(.04*s,.035*s,.055*s),'Bone',.005*s)
    # Two extra metal/fiber wraps make class weapons read at close range.
    if name in ('Swordsman','Paladin','Spearman','Hammerman','Axeman'):
        for z in (.88,1.00):cyl('Weapon binding',(.33*s,-.14*s,z*s),(.33*s,-.14*s,(z+.025)*s),.043*s,'Gold',8)
    if name in ('Mage','Cleric','Healer'):
        for z in (.6,.9,1.25,1.45):cyl('Staff binding',(.34*s,-.13*s,z*s),(.34*s,-.13*s,(z+.04)*s),.043*s,'Gold',8)
    if name in ('Gatling','Sniper','Gunalinder','DualSquirtGun'):
        for y in (-.24,-.33):cube('Gun receiver rib',(.26*s,y*s,1.145*s),(.15*s,.025*s,.03*s),'Steel',.005*s)

def environment_detail(name):
    if name in ('GrassTile','PathTile'):
        for i in range(16):
            x,y=random.uniform(-.46,.46),random.uniform(-.46,.46)
            if name=='PathTile':
                r=random.uniform(.012,.035);sphere('Fine gravel',(x,y,.022),(r,r*.75,r*.45),'SandLight' if i%2 else 'Stone',1)
                if i<4:
                    cyl('Edge grass',(x,.47*(1 if y>0 else -1),.02),(x+.025,.47*(1 if y>0 else -1),.12),.012,'Grass',3,r2=0)
            else:
                for j in range(3):cyl('Grass blade',(x+j*.012,y,.02),(x+(j-1)*.035,y+.015,.11+random.random()*.07),.012,'GrassLight' if j%2 else 'GrassDark',3,r2=0)
        for i in range(5):sphere('Soil grit',(random.uniform(-.45,.45),-.49,-.14),(.025,.016,.018),'WoodLight',1)
    elif name=='Tree':
        for side in (-1,1):
            cyl('Branch',(0,0,.65),(side*.43,.10,1.45),.065,'Wood',7,r2=.025)
            for z in (.25,.45,.7,.94):
                cube('Bark notch',(side*.06,-.113,z),(.085,.015,.025),'WoodLight',.004)
            for j in range(3):
                sphere('Foliage layer',(side*(.28+j*.07),.10-j*.08,1.35+j*.15),(.30,.24,.25),'GrassLight' if j%2 else 'GrassDark',1)
    elif name in ('Rock','SmallStone'):
        for i in range(5):
            x,y=random.uniform(-.22,.22),random.uniform(-.18,.18)
            sphere('Moss cluster',(x,y,.42),(.065,.055,.025),'Moss',1)
            cube('Rock seam',(x,-.25,.2+i*.025),(.10,.008,.012),'SteelDark',.002)
    elif name=='Chest':
        for part in list(parts):
            if base(part)=='Chest binding':part.dimensions=(.065,.54,.4);part.location.z=.22
        for x in (-.28,.28):
            cyl('Lid hinge',(x-.045,.245,.46),(x+.045,.245,.46),.045,'Gold',8)
            for z in (.16,.43):sphere('Chest rivet',(x,-.26,z),(.022,.015,.022),'Gold',1)
            cube('Lid binding',(x,0,.55),(.065,.54,.15),'Gold',.012)
        for x in (-.1,.1):cube('Lid plank seam',(x,0,.596),(.008,.43,.008),'Wood',.001)
        for z in (.17,.28,.4):cube('Chest plank seam',(0,-.244,z),(.69,.01,.009),'WoodLight',.001)
    elif name=='Portal':
        for side in (-1,1):
            cube('Portal plinth',(side*.59,0,.2),(.3,.48,.4),'Stone',.035)
            sphere('Portal crystal',(side*.59,-.13,.4),(.095,.08,.16),'Violet',1)
    elif name in ('Core','Relic'):
        for a in range(8):
            t=a*math.tau/8
            cube('Pedestal rune',(math.cos(t)*.34,math.sin(t)*.34,.245),(.045,.06,.012),'Cream',.003)
    elif name=='Foundation':
        for x in (-.4,.4):
            for y in (-.4,.4):cyl('Corner bolt',(x,y,-.035),(x,y,-.011),.025,'Gold',6)

def leaf(name,a,b,width,mat='GrassLight'):
    a,b=Vector(a),Vector(b);mid=(a+b)/2;d=b-a
    side=Vector((-d.y,d.x,0)).normalized()*width
    verts=[a,mid+side,b,mid-side,mid+Vector((0,0,width*.35))]
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],[(0,1,4),(1,2,4),(2,3,4),(3,0,4)]);mesh.update()
    o=bpy.data.objects.new(name,mesh);scene.collection.objects.link(o);return finish(o,name,mat)

def scenery(name):
    if name=='GrassTuft':
        for i in range(11):
            a=i*2.399;r=.03+(i%3)*.025;h=.17+(i%4)*.045
            leaf('Grass blade',(math.cos(a)*r,math.sin(a)*r,0),(math.cos(a)*.17,math.sin(a)*.17,h),.026,'GrassLight' if i%3 else 'GrassDark')
    elif name=='FlowerPatch':
        for i in range(7):
            a=i*2.399;x,y=math.cos(a)*.14,math.sin(a)*.14;h=.15+(i%3)*.04
            cyl('Flower stem',(x,y,0),(x,y,h),.009,'GrassDark',5)
            leaf('Flower leaf',(x,y,.06),(x+.075,y+.04,.11),.03,'Grass')
            for j in range(5):
                t=j*math.tau/5
                sphere('Petal',(x+math.cos(t)*.032,y+math.sin(t)*.032,h),(.032,.023,.018),'White' if i%2 else 'Pink',1)
            sphere('Pollen',(x,y,h+.012),(.023,.023,.02),'Gold',1)
    elif name=='Fern':
        for i in range(7):
            a=i*math.tau/7;end=Vector((math.cos(a)*.21,math.sin(a)*.21,.22+(i%2)*.05))
            cyl('Fern stem',(0,0,0),end,.009,'GrassDark',5)
            for j in range(1,6):
                p=end*(j/6);p2=end*((j+.8)/6);width=.065*(1-j/7)
                side=Vector((-math.sin(a),math.cos(a),.12))
                for s in (-1,1):leaf('Fern frond',p,p2+side*width*s,width*.38,'Grass' if j%2 else 'GrassLight')
    elif name=='Mushroom':
        for x,y,s in ((-.09,0,1),(.10,.07,.7),(.07,-.10,.55)):
            cyl('Mushroom stem',(x,y,.01),(x,y,.22*s),.034*s,'Cream',8,r2=.025*s)
            sphere('Mushroom cap',(x,y,.23*s),(.115*s,.115*s,.065*s),'Coral',2)
            for a in range(4):
                t=a*math.tau/4;sphere('Cap speckle',(x+math.cos(t)*.055*s,y+math.sin(t)*.055*s,.281*s),(.018*s,.018*s,.009*s),'Cream',1)
    elif name=='Log':
        cyl('Bark log',(-.25,0,.105),(.25,0,.105),.105,'Wood',10)
        for side in (-1,1):
            cyl('Endgrain',(side*.252,0,.105),(side*.255,0,.105),.084,'WoodLight',10)
            for radius in (.04,.065):
                o=ring('Tree rings',(side*.257,0,.105),radius,.005,'Wood');o.rotation_euler[1]=math.pi/2
        for a in range(8):
            t=a*math.tau/8
            cyl('Bark ridge',(-.23,math.cos(t)*.105,.105+math.sin(t)*.105),(.23,math.cos(t)*.105,.105+math.sin(t)*.105),.008,'WoodLight' if a%3==0 else 'Earth',5)
        sphere('Log moss',(.02,.015,.21),(.15,.055,.025),'Moss',1)
    elif name=='Stump':
        cyl('Stump',(0,0,0),(0,0,.26),.15,'Wood',10,r2=.115)
        cyl('Cut surface',(0,0,.26),(0,0,.266),.115,'WoodLight',10)
        for r in (.04,.075,.1):ring('Growth ring',(0,0,.268),r,.004,'Wood')
        for a in range(5):
            t=a*math.tau/5;cyl('Root buttress',(math.cos(t)*.09,math.sin(t)*.09,.14),(math.cos(t)*.23,math.sin(t)*.23,.015),.06,'Wood',5,r2=.02)
    elif name=='SmallStone':
        sphere('Pebble',(0,0,.10),(.19,.14,.12),'Stone',1)
        sphere('Pebble facet',(-.06,.02,.17),(.10,.09,.055),'StoneLight',1)
    elif name=='Reed':
        for i in range(6):
            a=i*2.399;x,y=math.cos(a)*.07,math.sin(a)*.07;h=.35+(i%3)*.065
            cyl('Reed stem',(x,y,0),(x+.02,y,h),.008,'GrassDark',5)
            cyl('Cattail',(x+.02,y,h),(x+.02,y,h+.09),.025,'Wood',7)
            leaf('Reed leaf',(x,y,.05),(x+math.cos(a)*.14,y+math.sin(a)*.14,h*.7),.025,'Grass')
    elif name=='LeafParticle':
        leaf('Leaf',(0,-.11,0),(0,.11,.018),.065,'Orange')
        cyl('Leaf vein',(0,-.12,.002),(0,.105,.019),.004,'WoodLight',4)
    elif name=='RainDrop':
        sphere('Raindrop',(0,0,.06),(.018,.018,.04),'Ice',1)
        cyl('Rain taper',(0,0,.065),(0,0,.18),.018,'Ice',6,r2=0)
    elif name=='Firefly':
        sphere('Firefly body',(0,0,.035),(.025,.04,.025),'Ink',1)
        sphere('Firefly lantern',(0,.035,.03),(.03,.035,.028),'Glow',1)
        for side in (-1,1):sphere('Wing'+('L' if side<0 else 'R'),(side*.04,-.005,.045),(.045,.025,.007),'Cream',1)
    elif name=='Cloud':
        for x,y,z,s in ((0,0,.08,.22),(-.23,.03,.03,.16),(.23,.01,.04,.18),(-.08,0,.19,.18),(.12,.02,.18,.16)):
            sphere('Cloud puff',(x,y,z),(s,s*.7,s*.7),'White',2)
    elif name=='ContactShadow':
        cyl('Contact shadow',(0,0,0),(0,0,.001),.5,'Shadow',48)
    elif name=='Puddle':
        points=[]
        for i in range(24):
            t=i*math.tau/24;r=.42+math.sin(t*3)*.04+math.cos(t*5)*.035
            points.append((math.cos(t)*r,math.sin(t)*r,0))
        verts=[(0,0,.002)]+points
        mesh=bpy.data.meshes.new('Puddle');mesh.from_pydata(verts,[],[(0,i+1,(i+1)%24+1) for i in range(24)]);mesh.update()
        o=bpy.data.objects.new('Puddle',mesh);scene.collection.objects.link(o);finish(o,'Puddle','Puddle')
        for x,y in ((-.1,.04),(.12,-.05)):
            ring('Water ripple',(x,y,.003),.08,.005,'Ice')

def bone_specs(name,s):
    B=[('Root',(0,0,0),(0,0,.2),None)]
    def add(n,h,t,p='Root'):B.append((n,tuple(Vector(h)*s),tuple(Vector(t)*s),p))
    if name in TOWERS+ENEMIES and name not in ('Barricade','Boulder','Wolf'):
        add('Hips',(0,0,.65),(0,0,.82));add('Spine',(0,0,.82),(0,0,1.18),'Hips')
        add('Neck',(0,0,1.18),(0,0,1.28),'Spine');add('Head',(0,0,1.28),(0,0,1.73),'Neck')
        for side,sgn in (('L',-1),('R',1)):
            add('ArmUpper'+side,(sgn*.12,0,1.12),(sgn*.25,-.05,.93),'Spine')
            add('ArmLower'+side,(sgn*.25,-.05,.93),(sgn*.30,-.14,1.01),'ArmUpper'+side)
            add('Hand'+side,(sgn*.30,-.14,1.01),(sgn*.30,-.19,1.08),'ArmLower'+side)
            add('Weapon'+side,(sgn*.30,-.14,1.01),(sgn*.30,-.14,1.40),'Hand'+side)
            add('LegUpper'+side,(sgn*.095,0,.68),(sgn*.15,.025,.36),'Hips')
            add('LegLower'+side,(sgn*.15,.025,.36),(sgn*.19,-.035,.075),'LegUpper'+side)
            add('Foot'+side,(sgn*.19,-.035,.075),(sgn*.19,-.17,.055),'LegLower'+side)
        add('Cape',(0,.17,1.18),(0,.20,.34),'Spine')
    elif name=='Barricade':
        for side,x in (('L',-.36),('C',0),('R',.36)):add('Hinge'+side,(x,0,.08),(x,0,.95))
    elif name=='Boulder':add('Roll',(0,0,.49),(0,0,.95))
    elif name=='Wolf':
        add('Spine',(0,.24,.52),(0,-.25,.6));add('Neck',(0,-.25,.6),(0,-.34,.72),'Spine')
        add('Head',(0,-.34,.72),(0,-.55,.75),'Neck');add('Tail',(0,.4,.58),(.14,.72,.83),'Spine')
        for label,y in (('Front',-.22),('Hind',.31)):
            for side,sgn in (('L',-1),('R',1)):
                add('LegUpper'+label+side,(sgn*.17,y,.49),(sgn*.18,y,.28),'Spine')
                add('LegLower'+label+side,(sgn*.18,y,.28),(sgn*.20,y-.04,.07),'LegUpper'+label+side)
    elif name=='Tree':
        add('Trunk',(0,0,.03),(0,0,1.2));add('Crown',(0,0,1.2),(0,0,1.9),'Trunk')
        for side,sgn in (('L',-1),('R',1)):add('Branch'+side,(0,0,.7),(sgn*.45,.10,1.5),'Trunk')
    elif name=='Chest':add('Lid',(0,.245,.46),(0,.245,.75))
    elif name=='Portal':add('Energy',(0,0,1),(0,0,1.4))
    elif name in ('Core','Relic'):add('Gem',(0,0,.26),(0,0,.9))
    elif name in ('GrassTuft','FlowerPatch','Fern','Reed','GrassTile','PathTile'):
        add('Stem',(0,0,0),(0,0,.15));add('Tip',(0,0,.15),(0,0,.38),'Stem')
    elif name=='Firefly':
        for side,sgn in (('L',-1),('R',1)):add('Wing'+side,(sgn*.015,0,.04),(sgn*.08,0,.045))
    else:add('Motion',(0,0,0),(0,0,.15))
    return B

def build_rig(name,s):
    data=bpy.data.armatures.new(name+'_Skeleton');rig=bpy.data.objects.new(name+'_Rig',data);scene.collection.objects.link(rig)
    bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
    for n,h,t,p in bone_specs(name,s):
        b=data.edit_bones.new(n);b.head=h;b.tail=t
        if p:b.parent=data.edit_bones[p]
    bpy.ops.object.mode_set(mode='OBJECT');rig.show_in_front=True;rig.data.display_type='STICK'
    for b in rig.pose.bones:b.rotation_mode='QUATERNION'
    return rig

HEAD_WORDS=('Head','Eye','Mouth','Ear','Eyebrow','Skull','Helmet','Hat','Plume','Crown','Goggle','Lens','Forehead','Stitch','Leaf headdress','Flame crest','Ice crest','Split halo','Split seam','Tusk','Hood')
WEAPON_WORDS=('Sword','Cross guard','Blade','Leather grip','Shield','Staff','Focus','Holy cross','Bow','Recurve','Bamboo','Dagger','Spear','Weapon','Axe','Hammer','Mace','Club','Scythe','Gun','Barrel','Stock','Scope','Ammo magazine','Muzzle','Water pistol','Water tank','Orange nozzle','Round bomb','Lit fuse','Fuse')
def weights_for_part(o,name,rig,s):
    n=base(o);side=nearest_side(o);bones=rig.data.bones
    if 'Hips' in bones:
        if n.startswith(HEAD_WORDS) or n in ('Mushroom cap',):b='Head'
        elif n.startswith(('Thigh',)):b='LegUpper'+side
        elif n.startswith(('Shin','Knee')):b='LegLower'+side
        elif n.startswith(('Boot','Foot')):b='Foot'+side
        elif n.startswith(('Upper arm','Shoulder','Pauldron','Heavy pauldron','Armor trim')):b='ArmUpper'+side
        elif n.startswith(('Forearm','Elbow')):b='ArmLower'+side
        elif n.startswith(('Hand','Glove','Fire fist')):b='Hand'+side
        elif n.startswith(WEAPON_WORDS):b='Weapon'+side
        elif n.startswith(('Cape trim','Cape')) and n!='Cape clasp':b='Cape'
        elif n.startswith(('Scarf collar',)):b='Neck'
        elif n.startswith(('Waist','Belt')):b='Hips'
        else:b='Spine'
    elif name=='Barricade':b=('Hinge'+('L' if o.location.x<-.1 else 'R' if o.location.x>.1 else 'C')) if n.startswith(('Timber','Stake','Woodgrain')) else 'Root'
    elif name=='Boulder':b='Roll'
    elif name=='Wolf':
        if n.startswith(('Wolf head','Muzzle','Nose','Ear','Wolf eye')):b='Head'
        elif n.startswith('Tail'):b='Tail'
        elif n.startswith('Wolf leg'):b='LegUpper'+('Front' if o.location.y<0 else 'Hind')+side
        else:b='Spine'
    elif name=='Tree':
        b='Crown' if n.startswith('Foliage') and abs(o.location.x)<.20 else 'Branch'+side if n.startswith(('Foliage','Branch')) else 'Trunk' if n.startswith(('Tree trunk','Bark')) else 'Root'
    elif name=='Chest':b='Lid' if n.startswith(('Chest lid','Lid','Chest binding')) and o.location.z>.4 else 'Root'
    elif name=='Portal':b='Energy' if n.startswith(('Portal energy','Portal aperture','Portal heart')) else 'Root'
    elif name in ('Core','Relic'):b='Gem' if n.startswith(('Crystal','Core ring')) else 'Root'
    elif name in ('GrassTuft','FlowerPatch','Fern','Reed','GrassTile','PathTile'):
        b='Stem' if n.startswith(('Grass blade','Flower','Petal','Pollen','Fern','Reed','Cattail','Edge grass')) else 'Root'
    elif name=='Firefly':b=n if n in ('WingL','WingR') else 'Root'
    elif name in ('ContactShadow','Puddle','Foundation','Rock','SmallStone','Log','Stump','Mushroom'):b='Root'
    else:b='Motion'
    if b not in bones:b='Root'
    g=o.vertex_groups.new(name=b)
    g.add(list(range(len(o.data.vertices))),1,'REPLACE')
    if b=='Stem':
        tip=o.vertex_groups.new(name='Tip')
        for v in o.data.vertices:
            z=(o.matrix_world@v.co).z;w=max(0,min(.90,(z-.08)/.25))
            if w:tip.add([v.index],w,'REPLACE');g.add([v.index],1-w,'REPLACE')
    # A smooth transition in the torso and trunk gives genuine skin deformation.
    if n in ('Torso','Tree trunk'):
        other='Hips' if n=='Torso' else 'Root';low=.73*s if n=='Torso' else .2
        high=.95*s if n=='Torso' else .9
        h=o.vertex_groups.get(other) or o.vertex_groups.new(name=other)
        for v in o.data.vertices:
            z=(o.matrix_world@v.co).z;w=max(0,min(1,(z-low)/(high-low)))
            g.add([v.index],w,'REPLACE');h.add([v.index],1-w,'REPLACE')

def rotate(rig,bone,angles):
    if bone not in rig.pose.bones:return
    b=rig.pose.bones[bone];basis=rig.data.bones[bone].matrix_local.to_quaternion()
    q=Euler(angles,'XYZ').to_quaternion();b.rotation_quaternion=basis.inverted()@q@basis
def move(rig,bone,xyz):
    if bone in rig.pose.bones:rig.pose.bones[bone].location=rig.data.bones[bone].matrix_local.to_3x3().inverted()@Vector(xyz)
def reset(rig):
    for b in rig.pose.bones:b.location=(0,0,0);b.rotation_quaternion=(1,0,0,0);b.scale=(1,1,1)

def pose(rig,name,state,u,s):
    reset(rig);sn=math.sin(math.tau*u);pulse=math.sin(math.pi*u);hit=math.sin(math.pi*min(1,u*1.4))
    if 'Hips' in rig.pose.bones:
        if state=='Idle':
            move(rig,'Hips',(0,0,.008*s*sn));rotate(rig,'Spine',(.025*sn,0,.016*sn));rotate(rig,'Head',(0,0,.045*sn))
            for side,sg in (('L',-1),('R',1)):rotate(rig,'ArmUpper'+side,(.025*sn,0,sg*.018*sn))
            rotate(rig,'Cape',(.07*sn,.03*sn,0))
            if name=='Wraith':move(rig,'Root',(0,0,.05+.025*sn))
        elif state=='Walk':
            move(rig,'Hips',(0,0,.045*s*abs(sn)));rotate(rig,'Spine',(.09,0,.065*sn))
            for side,sg in (('L',1),('R',-1)):
                a=sn*sg;rotate(rig,'LegUpper'+side,(a*.58,0,0));rotate(rig,'LegLower'+side,(-max(0,-a)*.8,0,0))
                rotate(rig,'Foot'+side,(max(0,a)*.24,0,0));rotate(rig,'ArmUpper'+side,(-a*.42,0,0));rotate(rig,'ArmLower'+side,(-.12-max(0,a)*.18,0,0))
            rotate(rig,'Head',(0,0,-.045*sn));rotate(rig,'Cape',(.12+.10*sn,.04*sn,0))
            if name=='Wraith':move(rig,'Root',(0,0,.09+.035*sn))
        elif state=='Attack':
            rotate(rig,'Spine',(-.12*pulse,0,-.22*pulse));rotate(rig,'Head',(.05*pulse,0,.08*pulse))
            ranged=name in ('Archer','Gatling','Gunalinder','Sniper','Blowdart','DualSquirtGun')
            caster=name in ('Mage','Cleric','Healer','Wraith','Fire','Ice','Splitter','Splitmini')
            if ranged:
                for side in ('L','R'):rotate(rig,'ArmUpper'+side,(-.65-.18*pulse,0,0));rotate(rig,'ArmLower'+side,(-.22,0,0))
                move(rig,'Hips',(0,.035*pulse*s,0));rotate(rig,'WeaponR',(.07*pulse,0,0))
                if name=='Archer':rotate(rig,'ArmLowerL',(-.4,0,-.35*pulse))
            elif caster:
                rotate(rig,'ArmUpperR',(-1.1*pulse,.2*pulse,.2*pulse));rotate(rig,'ArmLowerR',(-.3*pulse,0,0))
                rotate(rig,'ArmUpperL',(-.7*pulse,0,-.65*pulse));rotate(rig,'WeaponR',(0,0,.25*pulse))
            else:
                swing=math.sin(math.pi*u)*(-1.35 if u<.55 else .65)
                rotate(rig,'ArmUpperR',(swing,.12*pulse,-.55*pulse));rotate(rig,'ArmLowerR',(-.35*pulse,0,.28*pulse))
                rotate(rig,'ArmUpperL',(-.2*pulse,0,.15*pulse));rotate(rig,'WeaponR',(.25*pulse,0,0))
                move(rig,'Hips',(0,-.06*pulse*s,0));rotate(rig,'LegUpperL',(.15*pulse,0,0))
            rotate(rig,'Cape',(.16*pulse,0,-.12*pulse))
        elif state=='Hit':
            rotate(rig,'Spine',(-.22*pulse,.12*pulse,0));rotate(rig,'Head',(-.2*pulse,0,.08*pulse));move(rig,'Hips',(0,.07*s*pulse,-.03*s*pulse))
            rotate(rig,'ArmUpperL',(-.2*pulse,0,-.25*pulse));rotate(rig,'ArmUpperR',(-.2*pulse,0,.25*pulse))
        elif state=='Death':
            e=math.sin(u*math.pi/2);rotate(rig,'Root',(math.pi*.48*e,0,.1*e));move(rig,'Root',(0,0,.02*e))
            rotate(rig,'ArmUpperL',(-.3*e,0,-.5*e));rotate(rig,'ArmUpperR',(-.55*e,0,.35*e));rotate(rig,'Head',(.3*e,0,0))
            rotate(rig,'LegLowerL',(-.5*e,0,0));rotate(rig,'LegLowerR',(-.3*e,0,0))
            if name=='Wraith':rig.pose.bones['Root'].scale=(1-.95*u,)*3
        elif state=='Special':
            rotate(rig,'ArmUpperL',(-1.6*pulse,0,-.4*pulse));rotate(rig,'ArmUpperR',(-1.6*pulse,0,.4*pulse))
            rotate(rig,'ArmLowerL',(-.3*pulse,0,0));rotate(rig,'ArmLowerR',(-.3*pulse,0,0));rotate(rig,'Head',(-.15*pulse,0,.2*sn))
            move(rig,'Hips',(0,0,.10*s*pulse));rotate(rig,'Cape',(.3*pulse,.1*sn,0));rotate(rig,'WeaponR',(0,0,.3*sn))
    elif name=='Wolf':
        if state in ('Idle','Walk','Special'):
            rotate(rig,'Tail',(0,.12*sn,.25*sn));rotate(rig,'Head',(.05*sn,0,.08*sn))
            if state=='Walk':
                for limb,sign in (('FrontL',1),('FrontR',-1),('HindL',-1),('HindR',1)):
                    rotate(rig,'LegUpper'+limb,(sn*sign*.65,0,0));rotate(rig,'LegLower'+limb,(-max(0,sn*sign)*.5,0,0))
                move(rig,'Spine',(0,0,.035*abs(sn)))
            if state=='Special':rotate(rig,'Head',(-.6*pulse,0,0))
        elif state=='Attack':rotate(rig,'Head',(.4*pulse,0,0));move(rig,'Spine',(0,-.12*pulse,.03*pulse))
        elif state=='Hit':rotate(rig,'Spine',(-.2*pulse,0,.12*pulse))
        elif state=='Death':rotate(rig,'Root',(0,math.pi*.48*u,0))
    elif name=='Boulder':
        if state=='Walk':rotate(rig,'Roll',(-math.tau*u,0,0))
        elif state in ('Attack','Special'):move(rig,'Roll',(0,0,.15*pulse));rotate(rig,'Roll',(.3*sn,.2*sn,0))
        elif state=='Hit':rotate(rig,'Roll',(.15*pulse,0,.1*pulse))
        elif state=='Death':rig.pose.bones['Roll'].scale=(1-.8*u,)*3
    elif name=='Barricade':
        if state in ('Hit','Death','Special'):
            for side,sign in (('L',-1),('C',.2),('R',1)):
                rotate(rig,'Hinge'+side,((u*1.2 if state=='Death' else pulse*.12),0,sign*(u*.4 if state=='Death' else pulse*.05)))
    elif name=='Chest':
        if state in ('Special','Open'):rotate(rig,'Lid',(-1.75*math.sin(u*math.pi/2),0,0))
        elif state=='Hit':rotate(rig,'Lid',(-.12*pulse,0,0))
    elif name=='Tree':
        if state in ('Idle','Wind','Walk','Special'):
            rotate(rig,'Trunk',(.018*sn,.025*sn,0));rotate(rig,'Crown',(.035*sn,.045*sn,0))
            rotate(rig,'BranchL',(.035*sn,.05*sn,0));rotate(rig,'BranchR',(-.045*sn,-.04*sn,0))
        elif state=='Hit':rotate(rig,'Trunk',(.05*pulse,0,0))
        elif state=='Death':rotate(rig,'Trunk',(0,1.2*u,0))
    elif name in ('GrassTuft','FlowerPatch','Fern','Reed','GrassTile','PathTile'):
        if state in ('Idle','Wind','Walk','Special'):
            rotate(rig,'Stem',(.08*sn,.1*sn,0));rotate(rig,'Tip',(.12*sn,.14*sn,0))
        elif state=='Hit':rotate(rig,'Stem',(.2*pulse,0,0))
        # Terrain is always fixed to Root. Only actual grass/stems deform.
    elif name=='Portal':
        if state in ('Idle','Walk','Special'):rotate(rig,'Energy',(0,math.tau*u,0))
        elif state in ('Hit','Attack'):rig.pose.bones['Energy'].scale=(1+.12*pulse,)*3
        elif state=='Death':rig.pose.bones['Energy'].scale=(1-.98*u,)*3
    elif name in ('Core','Relic'):
        if state in ('Idle','Walk','Special'):
            rotate(rig,'Gem',(0,0,.3*sn));move(rig,'Gem',(0,0,.045*sn))
        elif state in ('Attack','Hit'):rig.pose.bones['Gem'].scale=(1+.15*pulse,)*3
        elif state=='Death':rig.pose.bones['Gem'].scale=(1-.9*u,)*3
    elif name=='Firefly':
        if state in ('Idle','Walk','Special'):
            move(rig,'Root',(.03*sn,.02*math.sin(math.tau*u*2),.035*sn))
            for side,sg in (('L',1),('R',-1)):rotate(rig,'Wing'+side,(0,sg*.7*math.sin(math.tau*u*4),0))
    elif name in ('Foundation','Rock','SmallStone','Log','Stump','Mushroom','Puddle','ContactShadow'):
        pass # Deliberately fixed props. Every standard take exists with fixed root keys.
    else:
        if state in ('Idle','Walk','Special'):
            if name in ('Cloud','LeafParticle'):move(rig,'Motion',(.025*sn,0,.02*sn));rotate(rig,'Motion',(.08*sn,.10*sn,.15*sn))
            elif name in ('Orb','Bomb','HeroCrown'):move(rig,'Motion',(0,0,.025*sn));rotate(rig,'Motion',(0,0,.25*sn))
            elif name in ('SelectionRing','RangeRing'):rotate(rig,'Motion',(0,0,.12*sn))
        elif state=='Hit':rig.pose.bones['Motion'].scale=(1+.15*pulse,)*3
        elif state=='Attack' and name in ('HitSpark','Orb','Bomb'):rig.pose.bones['Motion'].scale=(.6+1.2*pulse,)*3
        elif state=='Death':rig.pose.bones['Motion'].scale=(1-.95*u,)*3

def animate(rig,name,s):
    rig.animation_data_create();clips=dict(DURATIONS)
    if name in ('Tree','GrassTuft','FlowerPatch','Fern','Reed','GrassTile','PathTile'):clips['Wind']=2.0
    if name=='Chest':clips['Open']=1.4
    for state,duration in clips.items():
        action=bpy.data.actions.new(name+'_'+state);action.use_fake_user=True;rig.animation_data.action=action
        frames=int(round(duration*40))
        # Nine authored poses, plus dense exporter sampling, retain FK articulation.
        for i in range(9):
            frame=1+frames*i/8;pose(rig,name,state,i/8,s)
            for b in rig.pose.bones:
                b.keyframe_insert(data_path='location',frame=frame,group=b.name)
                b.keyframe_insert(data_path='rotation_quaternion',frame=frame,group=b.name)
                b.keyframe_insert(data_path='scale',frame=frame,group=b.name)
        rig.animation_data.action=None
        track=rig.animation_data.nla_tracks.new();track.name=state
        strip=track.strips.new(state,1,action);strip.name=state;strip.action_frame_start=1;strip.action_frame_end=frames+1
        strip.extrapolation='NOTHING';strip.blend_type='REPLACE';strip.use_sync_length=False
    reset(rig);scene.frame_set(1)
    return clips

def export_rigged(name):
    global parts
    parts=[]
    s=.6*multi(name) if name in TOWERS+ENEMIES else 1
    if name in TOWERS:tower(name)
    elif name in ENEMIES:enemy(name)
    elif name in ENV:environment(name)
    elif name in FX:effect(name)
    else:scenery(name)
    if name in TOWERS+ENEMIES:
        # Original enemy builder already applies its class size variant.
        for part in parts:part.location*=.6;part.scale*=.6
        humanoid_detail(name,s)
    elif name in ENV:environment_detail(name)
    if name in ('Arrow','Bullet'):
        from mathutils import Matrix
        rotation=Matrix.Rotation(math.pi/2,4,'X')
        for part in parts:part.matrix_world=rotation@part.matrix_world
    generated=list(parts)
    bpy.ops.object.select_all(action='DESELECT')
    rig=build_rig(name,s);rig.select_set(False)
    for o in generated:weights_for_part(o,name,rig,s)
    bpy.ops.object.select_all(action='DESELECT')
    for o in generated:o.select_set(True)
    bpy.context.view_layer.objects.active=generated[0];bpy.ops.object.convert(target='MESH');bpy.ops.object.join()
    mesh=bpy.context.object;mesh.name=name+'_Mesh';scene.cursor.location=(0,0,0)
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR');bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
    modifier=mesh.modifiers.new('Weighted deforming skeleton','ARMATURE');modifier.object=rig
    root=bpy.data.objects.new(name,None);scene.collection.objects.link(root)
    mesh.parent=rig;rig.parent=root
    bpy.context.view_layer.update();dimensions=[round(float(x),4) for x in mesh.dimensions]
    covered=sum(1 for v in mesh.data.vertices if sum(g.weight for g in v.groups)>.999)
    assert covered==len(mesh.data.vertices),(name,covered,len(mesh.data.vertices))
    clips=animate(rig,name,s)
    # Source-side deformation proof uses evaluated skinned vertices, not bone counts.
    for track in rig.animation_data.nla_tracks:track.mute=True
    def evaluated_vertices():
        bpy.context.view_layer.update();deps=bpy.context.evaluated_depsgraph_get()
        ev=mesh.evaluated_get(deps);data=ev.to_mesh();values=[v.co.copy() for v in data.vertices];ev.to_mesh_clear();return values
    reset(rig);rest=evaluated_vertices();probe={}
    for state,u in [('Walk',.25),('Attack',.37),('Hit',.5),('Special',.5)]:
        pose(rig,name,state,u,s);current=evaluated_vertices()
        probe[state]=round(max((a-b).length for a,b in zip(rest,current)),5)
    reset(rig)
    for track in rig.animation_data.nla_tracks:track.mute=False
    bpy.ops.object.select_all(action='DESELECT')
    for o in (root,rig,mesh):o.select_set(True)
    bpy.context.view_layer.objects.active=rig
    bpy.ops.export_scene.fbx(filepath=str(OUT/(name+'.fbx')),use_selection=True,object_types={'EMPTY','ARMATURE','MESH'},
        axis_forward='-Z',axis_up='Y',global_scale=1,apply_unit_scale=True,apply_scale_options='FBX_SCALE_UNITS',
        bake_space_transform=False,use_mesh_modifiers=True,mesh_smooth_type='FACE',use_tspace=False,
        add_leaf_bones=False,use_armature_deform_only=True,armature_nodetype='NULL',
        primary_bone_axis='Y',secondary_bone_axis='X',bake_anim=True,bake_anim_use_all_bones=True,
        bake_anim_use_nla_strips=True,bake_anim_use_all_actions=False,bake_anim_force_startend_keying=True,
        bake_anim_step=2,bake_anim_simplify_factor=0,path_mode='AUTO')
    # Native workshop previews one idle strip; all other authored actions remain intact.
    for track in rig.animation_data.nla_tracks:track.mute=track.name!='Idle'
    record={'name':name,'file':name+'.fbx','dimensions_blender_xyz_m':dimensions,'vertices':len(mesh.data.vertices),
        'triangles':sum(len(p.vertices)-2 for p in mesh.data.polygons),'bone_count':len(rig.data.bones),
        'bones':[b.name for b in rig.data.bones],'weighted_vertices':covered,'vertex_weight_coverage':1.0,
        'clips':clips,'deformation_probe_max_m':probe,'materials':[m.name for m in mesh.data.materials if m]}
    ROOTS.append((root,rig,mesh));REPORT.append(record)
    print('RIGGED',name,'bones',len(rig.data.bones),'vertices',len(mesh.data.vertices),'clips',','.join(clips),flush=True)

names=['Swordsman'] if SAMPLE else TOWERS+ENEMIES+ENV+FX+NEW
for name in names:export_rigged(name)
if SAMPLE:
    (ART/'rig_sample.json').write_text(json.dumps(REPORT,indent=2))
    bpy.ops.wm.save_as_mainfile(filepath=str(ART/'RigSample.blend'))
    print('SAMPLE READY: Swordsman.fbx',flush=True)
else:
    metadata={'title':'StickTD: Forge — rigged detail upgrade','model_count':len(REPORT),'authoring':'Blender 5.1 original geometry, armatures, weights and FK actions',
        'units':'meters','fbx_export':'-Z forward, Y up, armature-compatible coordinate transforms','legacy_animation':True,
        'clip_durations_seconds':DURATIONS,'palette':PALETTE,'models':REPORT}
    (ART/'asset_manifest.json').write_text(json.dumps(metadata,indent=2))
    # Full workshop, arranged without changing the exported coordinate origins.
    for i,(root,rig,mesh) in enumerate(ROOTS):
        c=i%8;r=i//8;root.location=(c*2.8,r*2.8,0)
        if REPORT[i]['name'] in TOWERS+ENEMIES:root.scale=(1.2,)*3
        text_add(REPORT[i]['name'],(c*2.8,r*2.8-1.03,.02),.17)
    bpy.ops.mesh.primitive_plane_add(size=150,location=(9.8,9.8,-.47))
    backdrop=bpy.context.object;backdrop.name='RiggedWorkshop_Backdrop';backdrop.data.materials.append(MATS['Ink'])
    world=bpy.data.worlds.new('Rigged_Studio');scene.world=world;world.use_nodes=True
    world.node_tree.nodes['Background'].inputs[0].default_value=(.17,.21,.24,1)
    world.node_tree.nodes['Background'].inputs[1].default_value=.6
    for label,loc,power,size in [('Key',(-5,-5,18),2600,12),('Fill',(22,8,17),2100,12),('Rim',(10,28,18),1900,10)]:
        bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.name=label;o.data.energy=power;o.data.shape='DISK';o.data.size=size
        o.rotation_euler=(Vector((9.8,9.8,.5))-o.location).to_track_quat('-Z','Y').to_euler()
    bpy.ops.object.camera_add(location=(9.8,-14,35));camera=bpy.context.object
    camera.name='RiggedWorkshop_Camera';camera.rotation_euler=(Vector((9.8,9.4,.4))-camera.location).to_track_quat('-Z','Y').to_euler()
    camera.data.type='ORTHO';camera.data.ortho_scale=25.5;scene.camera=camera
    scene.render.engine='CYCLES';scene.cycles.samples=24;scene.render.resolution_x=2200;scene.render.resolution_y=1800
    scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.view_settings.view_transform='AgX'
    scene.frame_set(1);scene.render.filepath=str(ART/'RiggedAssetPreview.png')
    bpy.ops.wm.save_as_mainfile(filepath=str(ART/'StickTD_Rigged.blend'))
    bpy.ops.render.render(write_still=True)
    import runpy
    runpy.run_path(str(ART/'build_weather_audio.py'))
    runpy.run_path(str(ART/'validate_rigged.py'))
    if '--qa' in sys.argv:runpy.run_path(str(ART/'render_rig_qa.py'))
    print('COMPLETE: '+str(len(REPORT))+' rigged FBX assets',flush=True)
