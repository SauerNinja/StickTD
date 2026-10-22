"""StickTD: Forge — all visual models are authored here in Blender.

Run: blender --background --factory-startup --python ArtSource/build_assets.py
Creates individual Unity-ready FBX meshes plus a native, arranged asset workshop.
No existing .blend files are read, changed, or overwritten by this script.
"""
import bpy, math, json, os, random, wave, struct
from mathutils import Vector
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'ArtSource'
OUT = ROOT / 'Unity' / 'Assets' / 'Resources' / 'Models'
ART.mkdir(parents=True, exist_ok=True)
OUT.mkdir(parents=True, exist_ok=True)
random.seed(8)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.name = 'StickTD_AssetWorkshop'
scene.unit_settings.system = 'METRIC'
scene.unit_settings.scale_length = 1.0

PALETTE = {
 'Ink':'263744', 'Cream':'F4E9C9', 'Teal':'32B6A0', 'TealDark':'206F72',
 'Gold':'E9B652', 'Steel':'A8BCC8', 'SteelDark':'526879', 'Wood':'80533B',
 'WoodLight':'BA8757', 'Coral':'EF745C', 'Red':'B6424D', 'Violet':'9778CF',
 'Purple':'573F84', 'Ice':'82D2E8', 'Blue':'438DD0', 'White':'F3F4ED',
 'Grass':'7C9E68', 'GrassLight':'9CB880', 'GrassDark':'587756', 'Earth':'674A3B',
 'Sand':'C7AE7E', 'SandLight':'DAC59A', 'Stone':'748489', 'StoneLight':'A5B1A4',
 'Orange':'F19A42', 'Glow':'78E8BD', 'Moss':'67884D', 'Bone':'C7C7AE',
 'DarkPurple':'333045', 'Pink':'E7A5BC', 'Black':'111F2A'
}
MATS = {}
for name, h in PALETTE.items():
    m=bpy.data.materials.new('ST_'+name+'_'+h)
    rgb=tuple(int(h[i:i+2],16)/255 for i in (0,2,4))
    m.diffuse_color=(*rgb,1)
    m.use_nodes=True
    bsdf=m.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value=(*rgb,1)
    bsdf.inputs['Roughness'].default_value=.72
    if name in ('Gold','Steel','SteelDark'): bsdf.inputs['Metallic'].default_value=.25
    if name in ('Glow','Ice'):
        bsdf.inputs['Emission Color'].default_value=(*rgb,1)
        bsdf.inputs['Emission Strength'].default_value=.25
    MATS[name]=m

parts=[]
def finish(o,name,mat):
    o.name=name
    o.data.materials.append(MATS[mat])
    parts.append(o)
    return o

def cube(name,loc,scale,mat,bevel=.02):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc)
    o=finish(bpy.context.object,name,mat)
    o.scale=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bevel:
        mod=o.modifiers.new('Soft crafted edges','BEVEL');mod.width=bevel;mod.segments=1
        bpy.context.view_layer.objects.active=o
        bpy.ops.object.modifier_apply(modifier=mod.name)
        mod=o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return o

def sphere(name,loc,scale,mat,sub=2):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=sub,radius=1,location=loc)
    o=finish(bpy.context.object,name,mat);o.scale=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    return o

def cyl(name,a,b,r,mat,verts=8,r2=None):
    a,b=Vector(a),Vector(b);d=b-a
    if r2 is None:
        bpy.ops.mesh.primitive_cylinder_add(vertices=verts,radius=r,depth=d.length,location=(a+b)/2)
    else:
        bpy.ops.mesh.primitive_cone_add(vertices=verts,radius1=r,radius2=r2,depth=d.length,location=(a+b)/2)
    o=finish(bpy.context.object,name,mat)
    o.rotation_euler=d.to_track_quat('Z','Y').to_euler()
    return o

def ring(name,loc,radius,minor,mat,vertical=False):
    bpy.ops.mesh.primitive_torus_add(major_segments=32,minor_segments=6,location=loc,major_radius=radius,minor_radius=minor)
    o=finish(bpy.context.object,name,mat)
    if vertical:o.rotation_euler[0]=math.pi/2
    return o

def prism(name,points,depth,mat):
    # Blade silhouette in the X/Z plane, facing the camera along -Y.
    verts=[(x,-depth/2,z) for x,z in points]+[(x,depth/2,z) for x,z in points]
    n=len(points); faces=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]
    faces += [(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
    o=bpy.data.objects.new(name,mesh);scene.collection.objects.link(o)
    return finish(o,name,mat)

def scarf(color='Teal',scale=1):
    cyl('Scarf collar',(0,0,1.18),(0,0,1.28),.15,color,10)
    o=cube('Scarf tail',(.17,.07,1.08),(.14,.08,.35),color,.012);o.rotation_euler[1]=-.35

def face(color='Ink',z=1.48,wide=1):
    for x in (-.075,.075):
        sphere('Eye',(x*wide,-.184,z+.028),(.024,.014,.035),color,1)
    cube('Mouth',(0,-.199,z-.065),(.065,.015,.012),color,.002)

def body(color='Teal',skin='Cream',arm='Ink',pose='ready'):
    # Simple round head, thin dark limbs, chunky boots. Head front is Blender -Y.
    cyl('Torso',(0,0,.62),(0,0,1.19),.087,arm,10)
    sphere('Head',(0,0,1.48),(.225,.20,.24),skin,2)
    face('Ink' if skin not in ('Ink','DarkPurple') else 'Glow')
    for side in (-1,1):
        x=side*.095
        hip=(x,0,.68); knee=(side*.15,.025,.36); foot=(side*.19,-.035,.075)
        cyl('Thigh',hip,knee,.055,arm)
        cyl('Shin',knee,foot,.052,arm)
        cube('Boot',(side*.19,-.06,.065),(.16,.25,.13),'SteelDark',.025)
        shoulder=(side*.12,0,1.12); elbow=(side*.25,-.05,.93); hand=(side*.30,-.14,1.01)
        cyl('Upper arm',shoulder,elbow,.052,arm)
        cyl('Forearm',elbow,hand,.047,arm)
        sphere('Hand',hand,(.065,.065,.065),skin,1)
    scarf(color)
    # Small hexagonal team pin, visible at isometric distances.
    cyl('Team medallion',(0,-.088,1.06),(0,-.13,1.06),.065,color,6)

def sword(x=.32):
    cyl('Leather grip',(x,-.14,.83),(x,-.14,1.1),.035,'Wood')
    cube('Cross guard',(x,-.14,1.08),(.28,.085,.06),'Gold',.015)
    o=prism('Sword blade',[(x-.055,1.1),(x-.055,1.61),(x,1.77),(x+.055,1.61),(x+.055,1.1)],.045,'Steel');o.location.y=-.14
    cyl('Blade glint',(x-.015,-.168,1.14),(x-.015,-.168,1.6),.008,'White',4)

def shield(x=-.33,material='Teal',size=1):
    pts=[(x-.19*size,1.22),(x+.19*size,1.22),(x+.16*size,.88),(x,.73),(x-.16*size,.88)]
    o=prism('Shield frame',pts,.1,'Gold');o.location.y=-.22
    pts2=[(x-.15*size,1.18),(x+.15*size,1.18),(x+.12*size,.91),(x,.79),(x-.12*size,.91)]
    o=prism('Shield enamel',pts2,.025,material);o.location.y=-.285
    cube('Shield crest',(x,-.31,1.02),(.045,.025,.2),'Cream',.005)
    cube('Shield crest',(x,-.31,1.05),(.16,.025,.04),'Cream',.005)

def staff(color='Violet',cleric=False):
    cyl('Staff',(.34,-.13,.06),(.34,-.13,1.70),.035,'WoodLight')
    ring('Staff crown',(.34,-.13,1.75),.14,.025,'Gold',True)
    sphere('Focus',(.34,-.13,1.76),(.09,.08,.12),color,1)
    if cleric:
        cube('Holy cross',(.34,-.2,1.76),(.20,.05,.045),'White',.005)
        cube('Holy cross',(.34,-.2,1.76),(.045,.05,.23),'White',.005)

def bow():
    points=[(.36,-.15,.56),(.48,-.18,.75),(.52,-.19,1.05),(.48,-.18,1.32),(.36,-.15,1.49)]
    for a,b in zip(points,points[1:]):cyl('Recurve bow',a,b,.028,'WoodLight',6)
    cyl('Bow string',points[0],points[-1],.007,'Cream',4)
    cube('Quiver',(-.12,.16,1.05),(.17,.16,.45),'Wood',.025)
    for x in (-.19,-.12,-.05):
        cyl('Quiver arrow',(x,.17,1.1),(x,.17,1.47),.012,'WoodLight',4)
        cube('Arrow fletching',(x,.17,1.43),(.055,.03,.07),'Cream',.005)

def gun(kind):
    x=.26
    if kind=='DualSquirtGun':
        for s in (-1,1):
            cube('Water pistol',(s*.31,-.27,1.05),(.14,.44,.15),'Blue',.028)
            cyl('Orange nozzle',(s*.31,-.46,1.05),(s*.31,-.57,1.05),.045,'Orange')
            sphere('Water tank',(s*.31,-.18,1.19),(.09,.12,.08),'Ice',1)
        return
    long=kind=='Sniper'; barrel=.75 if long else .48
    cube('Gun body',(x,-.25,1.06),(.18,.39,.16),'SteelDark',.025)
    cube('Stock',(x,-.01,1.04),(.15,.22,.12),'Wood',.025)
    cyl('Barrel',(x,-.35,1.08),(x,-.35-barrel,1.08),.043 if long else .06,'Ink')
    if long:
        cyl('Scope',(x,-.15,1.22),(x,-.45,1.22),.055,'Ink')
        cyl('Lens',(x,-.45,1.22),(x,-.47,1.22),.043,'Ice')
        sphere('Camouflage cap',(0,.02,1.66),(.24,.21,.085),'Moss',1)
    elif kind=='Gatling':
        for angle in range(6):
            t=angle*math.tau/6
            xx=x+math.cos(t)*.075;zz=1.08+math.sin(t)*.075
            cyl('Rotating barrel',(xx,-.35,zz),(xx,-.92,zz),.025,'Steel')
        cyl('Barrel collar',(x,-.7,1.08),(x,-.77,1.08),.125,'Gold',12)
        cube('Ammo pack',(-.02,.18,.96),(.35,.28,.42),'Wood',.025)
    else:
        cube('Ammo magazine',(x,-.19,.9),(.10,.15,.22),'Gold',.018)
        cyl('Muzzle',(x,-.78,1.08),(x,-.82,1.08),.073,'Gold')
        cube('Eyepatch',(-.075,-.195,1.51),(.065,.02,.065),'Ink',.01)

def tower(name):
    if name=='Barricade':
        for x in (-.36,0,.36):
            o=cube('Timber stake',(x,0,.48),(.24,.23,.96),'WoodLight',.035)
            o.rotation_euler[1]=.05 if x else -.05
            cyl('Stake cap',(x,0,.94),(x,0,1.1),.17,'Wood',4,r2=0)
        for z in (.25,.7):
            cube('Iron reinforcement',(0,-.14,z),(.99,.07,.09),'SteelDark',.02)
            for x in (-.36,0,.36):sphere('Rivet',(x,-.19,z),(.032,.022,.032),'Gold',1)
        return
    color={'Swordsman':'Teal','Archer':'Grass','Mage':'Violet','Hammerman':'Orange','Axeman':'Coral','Spearman':'TealDark','Paladin':'Gold','Gatling':'Orange','Blowdart':'Moss','Bomber':'Red','Gunalinder':'Coral','Sniper':'Moss','DualSquirtGun':'Blue','Cleric':'White'}[name]
    body(color)
    if name in ('Swordsman','Paladin'):
        sword();shield(material=color)
        if name=='Paladin':
            cyl('Golden helmet',(0,0,1.59),(0,0,1.73),.24,'Gold',10)
            cube('Helmet visor',(0,-.2,1.59),(.29,.06,.055),'SteelDark',.02)
            cube('Plume',(0,.04,1.84),(.09,.16,.25),'White',.02)
            for side in (-1,1):sphere('Pauldron',(side*.17,0,1.14),(.14,.13,.12),'Gold',1)
    elif name=='Archer':bow()
    elif name=='Mage':
        staff()
        cyl('Wizard hat',(0,.01,1.64),(0,.01,2.12),.235,'Purple',8,r2=.015)
        cyl('Hat brim',(0,0,1.63),(0,0,1.67),.30,'Violet',12)
        sphere('Hat star',(-.09,-.16,1.83),(.035,.02,.035),'Gold',1)
        o=prism('Robe',[(-.10,1.08),(.10,1.08),(.25,.21),(-.25,.21)],.13,'Purple');o.location.y=.045
    elif name in ('Hammerman','Axeman'):
        cyl('Weapon handle',(.33,-.14,.55),(.33,-.14,1.73),.035,'WoodLight')
        if name=='Hammerman':
            cube('Hammer head',(.33,-.14,1.65),(.57,.25,.28),'SteelDark',.04)
            for x in (.08,.58):cube('Hammer striking face',(x,-.14,1.65),(.08,.28,.31),'Steel',.025)
        else:
            o=prism('Axe blade',[(.30,1.47),(.65,1.48),(.73,1.72),(.62,1.91),(.32,1.73)],.08,'Steel');o.location.y=-.14
            cyl('Axe pin',(.33,-.2,1.68),(.33,-.22,1.68),.06,'Gold')
    elif name=='Spearman':
        cyl('Spear shaft',(.33,-.14,.01),(.33,-.14,2.00),.027,'WoodLight')
        o=prism('Spear head',[(.25,1.93),(.33,2.24),(.41,1.93),(.33,1.98)],.06,'Steel');o.location.y=-.14
        shield(material='TealDark',size=.75)
    elif name in ('Gatling','Gunalinder','Sniper','DualSquirtGun'):gun(name)
    elif name=='Blowdart':
        cyl('Bamboo dart pipe',(.29,-.12,1.2),(.29,-.9,1.2),.038,'WoodLight')
        for y in (-.22,-.43,-.64,-.85):cyl('Bamboo joint',(.29,y,1.2),(.29,y-.035,1.2),.045,'Moss')
        for side in (-1,1):
            o=prism('Leaf headdress',[(side*.08,1.65),(side*.27,2.0),(side*.29,1.75)],.025,'Grass');o.location.y=.03
    elif name=='Bomber':
        sphere('Round bomb',(.34,-.19,1.11),(.21,.20,.20),'Ink')
        cyl('Fuse',(.34,-.19,1.29),(.40,-.19,1.42),.018,'Sand')
        sphere('Lit fuse',(.40,-.19,1.44),(.05,.04,.06),'Orange',1)
        cube('Bomb satchel',(-.17,.17,.93),(.31,.29,.37),'Red',.025)
        cyl('Goggle strap',(0,0,1.51),(0,0,1.56),.218,'Wood',12)
        for x in (-.09,.09):
            sphere('Goggle',(x,-.19,1.55),(.075,.04,.065),'Gold',1)
            sphere('Glass',(x,-.221,1.55),(.047,.014,.04),'Ice',1)
    elif name=='Cleric':
        staff('Glow',True)
        cyl('Healer hood',(0,.025,1.55),(0,.025,1.72),.22,'White',10,r2=.1)
        cube('Healer apron',(0,-.1,.76),(.26,.06,.52),'White',.025)
        cube('Apron cross',(0,-.139,.81),(.055,.02,.23),'Red',.005)
        cube('Apron cross',(0,-.14,.84),(.17,.02,.05),'Red',.005)

def enemy(name):
    if name=='Boulder':
        sphere('Granite boulder',(0,0,.49),(.53,.47,.49),'Stone',2)
        for x in (-.17,.17):sphere('Crystal eye',(x,-.42,.57),(.065,.04,.065),'Orange',1)
        cube('Stone scowl',(0,-.456,.38),(.23,.04,.045),'Ink',.005)
        for x,y in ((-.22,.05),(.2,.08),(.04,-.1)):
            cyl('Crystal outcrop',(x,y,.72),(x,y,1.03),.10,'StoneLight',5,r2=0)
        return
    if name=='Wolf':
        sphere('Wolf body',(0,.07,.55),(.26,.43,.27),'SteelDark')
        sphere('Wolf head',(0,-.34,.72),(.25,.26,.24),'StoneLight')
        sphere('Muzzle',(0,-.54,.65),(.13,.18,.11),'Cream',1)
        sphere('Nose',(0,-.69,.67),(.065,.035,.05),'Ink',1)
        for side in (-1,1):
            cyl('Ear',(side*.17,-.29,.83),(side*.20,-.25,1.10),.12,'SteelDark',3,r2=0)
            sphere('Wolf eye',(side*.13,-.55,.79),(.032,.022,.037),'Coral',1)
            for y in (-.22,.31):cyl('Wolf leg',(side*.17,y,.49),(side*.20,y-.04,.07),.06,'Ink')
        cyl('Tail',(0,.40,.58),(.14,.72,.83),.10,'SteelDark',6,r2=.025)
        return
    specs={
      'Grunt':('Coral','Cream','Ink'), 'Swarm':('Orange','Cream','Ink'),
      'Tank':('Red','Cream','Ink'),'Runner':('Orange','Cream','Ink'),
      'Boss':('Red','Cream','Ink'),'Fire':('Orange','Orange','Ink'),
      'Ice':('Ice','Ice','SteelDark'),'Splitter':('Violet','Pink','DarkPurple'),
      'Splitmini':('Violet','Pink','DarkPurple'),'Healer':('Moss','Cream','Ink'),
      'Shielded':('Red','Cream','Ink'),'Troll':('Moss','GrassLight','GrassDark'),
      'Zombie':('Moss','Moss','Ink'),'Wraith':('Violet','DarkPurple','DarkPurple'),
      'Skeleton':('SteelDark','Bone','Bone'),'Reaper':('Purple','Bone','DarkPurple')
    }
    color,skin,arm=specs[name];body(color,skin,arm)
    if name in ('Tank','Boss','Shielded'):
        cube('Armored vest',(0,0,.94),(.39,.28,.43),'SteelDark',.055)
        for side in (-1,1):sphere('Heavy pauldron',(side*.19,0,1.13),(.17,.16,.13),'Steel',1)
        cyl('Helmet',(0,0,1.57),(0,0,1.76),.24,'SteelDark',10)
        cube('Visor',(0,-.21,1.57),(.33,.06,.055),'Coral',.012)
        if name=='Shielded':shield(-.33,'Red',1.3)
        if name=='Boss':
            cyl('Crown rim',(0,0,1.74),(0,0,1.82),.25,'Gold',10)
            for a in range(5):
                t=a*math.tau/5
                cyl('Crown spike',(math.cos(t)*.20,math.sin(t)*.20,1.8),(math.cos(t)*.23,math.sin(t)*.23,2.04),.06,'Gold',4,r2=0)
            sword(.34)
        else:
            cyl('Club handle',(.33,-.14,.73),(.33,-.14,1.45),.045,'Wood')
            cube('Mace',(.33,-.14,1.48),(.26,.26,.31),'SteelDark',.04)
    elif name=='Fire':
        for side in (-1,0,1):
            cyl('Flame crest',(side*.12,.02,1.65),(side*.17,.01,1.95-abs(side)*.13),.10,'Orange',5,r2=0)
        for x in (-.32,.32):sphere('Fire fist',(x,-.17,1.03),(.12,.11,.15),'Gold',1)
    elif name=='Ice':
        for side in (-1,0,1):
            cyl('Ice crest',(side*.13,.02,1.65),(side*.19,.03,2.0-abs(side)*.16),.10,'Ice',4,r2=0)
        for side in (-1,1):cyl('Crystal shoulder',(side*.15,0,1.15),(side*.34,0,1.44),.10,'White',4,r2=0)
    elif name in ('Splitter','Splitmini'):
        ring('Split halo',(0,0,1.48),.29,.025,'Violet',True)
        cube('Split seam',(0,-.201,1.48),(.018,.018,.38),'Purple',.003)
        for side in (-1,1):sphere('Split pod',(side*.2,.14,1.12),(.12,.11,.16),'Violet',1)
    elif name in ('Runner','Swarm'):
        cube('Headband',(0,-.04,1.60),(.43,.35,.07),'Orange',.025)
        for side in (-1,1):cyl('Sprinting ribbon',(side*.16,.08,1.6),(side*.32,.4,1.42),.035,'Coral',5)
        cyl('Dagger',(.32,-.14,.95),(.32,-.14,1.38),.035,'Steel',5,r2=0)
    elif name=='Healer':
        staff('Glow',True)
        cube('Medic bag',(-.2,.14,.97),(.27,.23,.35),'White',.025)
        cube('Medic cross',(-.2,.269,.97),(.04,.025,.2),'Moss',.003)
        cube('Medic cross',(-.2,.27,.97),(.15,.025,.04),'Moss',.003)
    elif name=='Troll':
        for side in (-1,1):
            sphere('Long ear',(side*.25,0,1.50),(.16,.08,.075),'Moss',1)
            cyl('Tusk',(side*.11,-.17,1.34),(side*.13,-.20,1.46),.035,'Cream',5,r2=0)
        cyl('Huge club',(.33,-.14,.5),(.33,-.14,1.50),.07,'Wood')
        sphere('Club stone',(.33,-.14,1.56),(.22,.2,.29),'Stone',1)
    elif name=='Zombie':
        cube('Forehead stitch',(0,-.19,1.6),(.20,.02,.025),'Ink',.003)
        for x in (-.065,0,.065):cube('Stitch',(x,-.207,1.6),(.012,.012,.07),'Cream',.001)
        cube('Torn tunic',(0,.01,.9),(.29,.22,.39),'Wood',.02)
    elif name in ('Wraith','Reaper'):
        cyl('Shadow robe',(0,0,.05),(0,0,1.15),.31,'DarkPurple',8,r2=.12)
        # Hood sits behind the pale/magical face; opening remains readable.
        sphere('Hood',(0,.085,1.51),(.29,.23,.33),'Purple',1)
        sphere('Hood face',(0,-.11,1.48),(.18,.10,.20),skin,1)
        face('Glow' if name=='Wraith' else 'Ink')
        if name=='Reaper':
            cyl('Scythe pole',(.36,-.14,.02),(.36,-.14,2.05),.03,'Wood')
            o=prism('Scythe blade',[(.33,2.08),(-.15,2.09),(-.44,1.86),(-.21,1.98),(.33,1.97)],.055,'Steel');o.location.y=-.14
        else:staff('Violet')
    elif name=='Skeleton':
        for z in (.85,.96,1.07):cube('Rib',(0,-.08,z),(.27,.07,.035),'Bone',.015)
        for x in (-.07,.07):sphere('Skull socket',(x,-.194,1.5),(.045,.02,.05),'Ink',1)
        sword()
    elif name=='Grunt':
        cyl('Wooden club',(.32,-.14,.83),(.32,-.14,1.57),.055,'Wood',7,r2=.09)
    scales={'Swarm':.72,'Splitmini':.55,'Tank':1.18,'Boss':1.55,'Troll':1.25,'Runner':.92}
    s=scales.get(name,1)
    if s!=1:
        for o in parts:o.location*=s;o.scale*=s

def environment(name):
    if name in ('GrassTile','PathTile'):
        cube('Soil',(0,0,-.15),(1,1,.30),'Earth',.025)
        cube('Surface',(0,0,-.015),(1,1,.075),'Grass' if name=='GrassTile' else 'Sand',.025)
        if name=='GrassTile':
            for x,y in ((-.3,.24),(.25,-.25),(.28,.28)):
                for dx in (-.035,.035):cyl('Grass blade',(x+dx,y,.02),(x+dx*1.4,y,.12),.018,'GrassLight',3,r2=0)
        else:
            for x,y,r in ((-.28,.25,.08),(.27,-.23,.06),(.20,.27,.04)):
                sphere('Path pebble',(x,y,.035),(r,r*.7,.025),'SandLight',1)
    elif name=='Foundation':
        cube('Platform',(0,0,-.27),(1,1,.36),'Stone',.04)
        cube('Platform rim',(0,0,-.05),(1,1,.08),'StoneLight',.025)
        ring('Team inlay',(0,0,-.015*math.sin(math.tau/6)),.37,.015,'Gold')
    elif name=='Tree':
        cyl('Tree trunk',(0,0,0),(0,0,1.45),.13,'Wood',7,r2=.09)
        for x,y,z,r in ((0,0,1.55,.66),(-.35,.10,1.27,.42),(.34,.07,1.43,.48),(0,0,1.93,.42)):
            sphere('Foliage',(x,y,z),(r,r*.82,r*.80),'Grass' if z<1.7 else 'GrassLight',1)
        for side in (-1,1):cyl('Root',(0,0,.06),(side*.31,.12,.015),.07,'Wood',6,r2=.025)
    elif name=='Rock':
        sphere('Rock',(0,0,.23),(.44,.35,.27),'Stone',1)
        sphere('Rock plane',(-.18,.02,.38),(.23,.22,.16),'StoneLight',1)
        sphere('Moss patch',(.15,.07,.39),(.22,.18,.06),'Moss',1)
    elif name=='Chest':
        cube('Chest body',(0,0,.24),(.74,.48,.46),'Wood',.035)
        cube('Chest lid',(0,0,.52),(.79,.52,.15),'WoodLight',.055)
        for x in (-.25,.25):cube('Chest binding',(x,-.015,.32),(.065,.54,.56),'Gold',.012)
        cube('Chest lock',(0,-.275,.37),(.12,.045,.16),'Gold',.015)
        sphere('Keyhole',(0,-.303,.39),(.022,.009,.028),'Ink',1)
    elif name in ('Relic','Core'):
        cyl('Pedestal',(0,0,.01),(0,0,.18),.40,'Stone',8)
        cyl('Pedestal rim',(0,0,.17),(0,0,.24),.43,'Gold',8)
        cyl('Crystal',(0,0,.27),(0,0,1.15 if name=='Core' else .87),.23,'Glow' if name=='Core' else 'Violet',5,r2=0)
        cyl('Crystal foot',(0,0,.27),(0,0,.5),.12,'TealDark' if name=='Core' else 'Purple',5,r2=.23)
        if name=='Core':
            ring('Core ring',(0,0,.64),.42,.035,'Gold')
            for a in range(3):
                t=a*math.tau/3
                x,y=math.cos(t)*.3,math.sin(t)*.3
                cyl('Core prong',(x,y,.2),(x,y,.54),.05,'Gold',6,r2=.02)
    elif name=='Portal':
        cube('Portal footing',(0,0,.08),(1.48,.60,.16),'Stone',.035)
        ring('Portal arch',(0,0,1.0),.78,.14,'DarkPurple',True)
        ring('Portal energy',(0,-.035,1.0),.61,.055,'Violet',True)
        for a in range(8):
            t=a*math.tau/8
            x,z=math.cos(t)*.8,1+math.sin(t)*.8
            o=cube('Portal rune',(x,-.145,z),(.09,.045,.15),'Glow',.01);o.rotation_euler[1]=-t
        # Thin solid magical aperture gives a readable entrance from the isometric camera.
        cyl('Portal aperture',(0,.035,1),(0,.08,1),.57,'Purple',32)
        sphere('Portal heart',(0,-.02,1),(.22,.04,.35),'Violet',1)

def effect(name):
    if name=='Arrow':
        cyl('Arrow shaft',(0,0,-.33),(0,0,.28),.016,'WoodLight',6)
        cyl('Arrowhead',(0,0,.25),(0,0,.43),.06,'Steel',4,r2=0)
        for angle in range(3):
            o=cube('Fletching',(0,0,-.25),(.11,.025,.16),'Cream',.005);o.rotation_euler[2]=angle*math.tau/3
    elif name=='Orb':
        sphere('Magic orb',(0,0,0),(.15,.15,.15),'Glow',2)
        ring('Orb halo',(0,0,0),.20,.018,'Gold')
    elif name=='Bullet':cyl('Bullet',(0,0,-.12),(0,0,.16),.035,'Gold',8,r2=0)
    elif name=='Bomb':
        sphere('Bomb',(0,0,.14),(.15,.15,.15),'Ink',2)
        cyl('Fuse',(0,0,.27),(.06,0,.38),.015,'Sand')
        sphere('Spark',(.06,0,.39),(.04,.04,.04),'Orange',1)
    elif name=='HitSpark':
        for a in range(6):
            t=a*math.tau/6
            cyl('Impact ray',(math.cos(t)*.05,math.sin(t)*.05,0),(math.cos(t)*.29,math.sin(t)*.29,0),.025,'Gold',4,r2=0)
        sphere('Impact core',(0,0,0),(.07,.07,.07),'White',1)
    elif name=='SelectionRing':ring('Selection',(0,0,.025),.975,.025,'Gold')
    elif name=='RangeRing':
        for a in range(48):
            t=a*math.tau/48;u=t+.075
            cyl('Range dash',(math.cos(t)*.986,math.sin(t)*.986,.02),(math.cos(u)*.986,math.sin(u)*.986,.02),.014,'Teal',4)
    elif name=='HeroCrown':
        cyl('Crown circlet',(0,0,0),(0,0,.065),.18,'Gold',10)
        for a in range(5):
            t=a*math.tau/5
            x,y=math.cos(t)*.15,math.sin(t)*.15
            cyl('Crown point',(x,y,.06),(x*1.15,y*1.15,.22),.045,'Gold',4,r2=0)
            sphere('Crown gem',(x*1.15,y*1.15,.22),(.035,.035,.035),'Glow',1)

TOWERS=['Swordsman','Archer','Mage','Barricade','Hammerman','Axeman','Spearman','Paladin','Gatling','Blowdart','Bomber','Gunalinder','Sniper','DualSquirtGun','Cleric']
ENEMIES=['Grunt','Swarm','Tank','Runner','Boss','Fire','Ice','Splitter','Splitmini','Boulder','Healer','Shielded','Wolf','Troll','Zombie','Wraith','Skeleton','Reaper']
ENV=['GrassTile','PathTile','Foundation','Tree','Rock','Chest','Relic','Portal','Core']
FX=['Arrow','Orb','Bullet','Bomb','HitSpark','SelectionRing','RangeRing','HeroCrown']
roots=[];manifest=[]

def export_model(name,builder):
    global parts
    parts=[];builder(name)
    if name in TOWERS+ENEMIES:
        for part in parts:part.location*=.6;part.scale*=.6
    if name in ('Arrow','Bullet'):
        # Blender -Y forward becomes Unity +Z; projectile origins are at their center.
        from mathutils import Matrix
        rot=Matrix.Rotation(math.pi/2,4,'X')
        for part in parts:part.matrix_world=rot@part.matrix_world
    bpy.ops.object.select_all(action='DESELECT')
    for o in parts:o.select_set(True)
    bpy.context.view_layer.objects.active=parts[0]
    bpy.ops.object.convert(target='MESH')
    bpy.ops.object.join()
    o=bpy.context.object;o.name=name
    scene.cursor.location=(0,0,0)
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
    bpy.context.view_layer.update()
    dims=[round(float(x),4) for x in o.dimensions]
    bpy.ops.export_scene.fbx(filepath=str(OUT/(name+'.fbx')),use_selection=True,
        object_types={'MESH'},axis_forward='-Z',axis_up='Y',global_scale=1.0,
        apply_unit_scale=True,apply_scale_options='FBX_SCALE_UNITS',
        bake_space_transform=True,use_mesh_modifiers=True,mesh_smooth_type='FACE',
        use_tspace=False,add_leaf_bones=False,bake_anim=False,path_mode='AUTO')
    manifest.append({'name':name,'file':name+'.fbx','dimensions_blender_xyz_m':dims,
                     'vertices':len(o.data.vertices),'triangles':sum(len(p.vertices)-2 for p in o.data.polygons),
                     'materials':[m.name for m in o.data.materials if m]})
    roots.append(o)
    print('EXPORTED',name,dims,flush=True)

for n in TOWERS:export_model(n,tower)
for n in ENEMIES:export_model(n,enemy)
for n in ENV:export_model(n,environment)
for n in FX:export_model(n,effect)

manifest_data={'title':'StickTD: Forge','authoring':'Blender 5.1 procedural original art',
 'model_count':len(roots),'units':'meters','blender_up':'+Z','blender_forward':'-Y',
 'fbx_up':'+Y','fbx_forward':'-Z','origin':'ground center; projectile effects centered',
 'palette':PALETTE,'models':manifest}
(ART/'asset_manifest.json').write_text(json.dumps(manifest_data,indent=2))
(ART/'README.md').write_text('''# StickTD: Forge asset workshop

All 50 game model assets were created in Blender. `build_assets.py` reproduces the entire
workshop and every FBX, with no downloaded models or textures. Run it in Blender 5.1
with `blender --background --factory-startup --python ArtSource/build_assets.py`.

`StickTD_Assets.blend` contains the arranged source collection. The original Blender
session/file was inspected and left untouched. Each FBX is a single joined mesh with
descriptive material slots and a ground-centered origin. Blender uses Z up and -Y front;
FBX exports use -Z forward, Y up, 1 meter scale. Units are approximately 1.0 m tall,
with boss/enemy scale variants. Grass and path tiles are 1 m square. Effects are centered.

Material names encode sRGB colors, e.g. `ST_Teal_32B6A0`, to allow deterministic Unity
material reconstruction. `asset_manifest.json` records exact bounds and geometry counts.
''')

# Original game audio, synthesized inside the same Blender build. No sample libraries.
AUDIO=ROOT/'Unity'/'Assets'/'Resources'/'Audio';AUDIO.mkdir(parents=True,exist_ok=True)
audio_specs={'build':(.19,660,990,.12),'arrow':(.13,1500,400,.65),
 'magic':(.32,440,1320,.03),'hit':(.10,160,70,.80),'wave':(.55,220,440,.02),
 'clear':(.70,523,1046,.01),'wood':(.14,220,90,.65),'stone':(.16,95,50,.70),
 'level':(.48,660,1320,.02)}
for key,(duration,f0,f1,noise_mix) in audio_specs.items():
    sr=22050;count=int(duration*sr);samples=[];phase=0
    for n in range(count):
        t=n/sr;u=t/duration
        freq=f0+(f1-f0)*u
        if key in ('clear','level'):
            notes=(1,1.25,1.5,2);freq=f0*notes[min(3,int(u*4))]
        if key=='wave':freq=f0*(1 if u<.35 else 1.5 if u<.7 else 2)
        phase+=math.tau*freq/sr
        env=min(1,t/.008)*(1-u)**1.5
        tonal=math.sin(phase)+.25*math.sin(phase*2)+.1*math.sin(phase*3)
        value=(tonal*(1-noise_mix)+random.uniform(-1,1)*noise_mix)*env*.28
        samples.append(struct.pack('<h',int(max(-1,min(1,value))*32767)))
    with wave.open(str(AUDIO/(key+'.wav')),'wb') as wav:
        wav.setnchannels(1);wav.setsampwidth(2);wav.setframerate(sr);wav.writeframes(b''.join(samples))
import runpy
runpy.run_path(str(ART/'build_ambience.py'))

# Arrange the workshop after export. Exports retain origins at zero.
for i,o in enumerate(roots):
    col=i%10;row=i//10
    o.location=(col*2.8,row*3.25,0)
    if o.name in TOWERS+ENEMIES:o.scale*=1.35
    # Display projectiles upright as their Blender source convention.
    bpy.ops.object.text_add(location=(col*2.8,row*3.25-1.15,.025))
    text=bpy.context.object;text.name='Label_'+o.name
    text.data.body=o.name;text.data.align_x='CENTER';text.data.size=.20
    text.data.extrude=0;text.data.materials.append(MATS['Cream'])

bpy.ops.mesh.primitive_plane_add(size=200,location=(12.6,6.5,-.46))
plane=bpy.context.object;plane.name='Preview_Backdrop';plane.data.materials.append(MATS['Ink'])
world=bpy.data.worlds.new('Studio_World');scene.world=world;world.use_nodes=True
world.node_tree.nodes['Background'].inputs[0].default_value=(.14,.18,.21,1)
world.node_tree.nodes['Background'].inputs[1].default_value=.5
for name,loc,power,size in [('Key',(-8,-7,20),2400,14),('Fill',(22,9,18),1800,12),('Rim',(8,28,15),1600,10)]:
    bpy.ops.object.light_add(type='AREA',location=loc)
    o=bpy.context.object;o.name=name;o.data.energy=power;o.data.shape='DISK';o.data.size=size
    o.rotation_euler=(Vector((12.6,6.5,0))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(12.6,-18,32))
cam=bpy.context.object;cam.name='AssetWorkshop_Camera'
cam.rotation_euler=(Vector((12.6,6.0,.4))-cam.location).to_track_quat('-Z','Y').to_euler()
cam.data.type='ORTHO';cam.data.ortho_scale=31.0
scene.camera=cam
scene.render.engine='CYCLES';scene.cycles.samples=24
scene.render.resolution_x=2400;scene.render.resolution_y=1150;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.filepath=str(ART/'AssetPreview.png')
scene.view_settings.view_transform='AgX'
scene.render.film_transparent=False
bpy.ops.wm.save_as_mainfile(filepath=str(ART/'StickTD_Assets.blend'))
bpy.ops.render.render(write_still=True)
runpy.run_path(str(ART/'validate_assets.py'))
print('COMPLETE: '+str(len(roots))+' Blender-authored FBX assets',flush=True)
