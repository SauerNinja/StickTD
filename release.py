"""Validate, archive and package StickTD; standard-library-only release tooling."""
from pathlib import Path
import json, re, shutil, sys, zipfile
ROOT = Path(__file__).resolve().parent
if not (ROOT/'index.html').is_file():
    ROOT = ROOT.parent
s = (ROOT/'index.html').read_text(encoding='utf-8')
v = re.search(r"const GAME_VERSION = '([0-9.]+)'", s).group(1)
family = '.'.join(v.split('.')[:2])
log = ROOT/'CHANGELOG.md'
text = log.read_text(encoding='utf-8')
entries = re.findall(r'^## \[(\d+\.\d+\.\d+)\][\s\S]*?(?=^## \[|\Z)', text, re.M)
blocks = re.findall(r'^## \[\d+\.\d+\.\d+\][\s\S]*?(?=^## \[|\Z)', text, re.M)
assert entries and entries[0] == v, 'Changelog version mismatch'
assert f'content="{v}"' in s and f'"softwareVersion": "{v}"' in s, 'HTML metadata mismatch'
older = [b for n,b in zip(entries,blocks) if not n.startswith(family+'.')]
command = sys.argv[1] if len(sys.argv)>1 else 'check'
if command == 'prepare' and older:
    history = ROOT/'HISTORY.md'
    previous = history.read_text(encoding='utf-8') if history.exists() else '# Release history\n\n'
    fresh = ''.join(block for block in older if block not in previous)
    split = previous.find('## [')
    if split < 0: split = len(previous)
    previous = previous[:split]+fresh+previous[split:]
    history.write_text(previous, encoding='utf-8')
    log.write_text(text[:text.index('## [')]+''.join(b for b in blocks if b not in older), encoding='utf-8')
else:
    assert not older, 'Run python scripts/release.py prepare to archive older release families'
if command in ('web','native'):
    dist=ROOT/'dist'; dist.mkdir(exist_ok=True)
    web=ROOT/'packaging'/'www'
    if web.exists(): shutil.rmtree(web)
    web.mkdir(parents=True,exist_ok=True)
    # Copy local web assets, preserving relative locations; never include tooling or git data.
    for p in ROOT.rglob('*'):
        rel=p.relative_to(ROOT)
        if any(part.startswith('.') or part in ('packaging','dist','scripts','node_modules') for part in rel.parts): continue
        if p.is_file() and (p.suffix.lower() in ('.html','.json','.png','.ico','.svg','.webp','.css','.js','.mp3','.ogg','.wav','.mid') or p.name in ('CHANGELOG.md','HISTORY.md','LICENSE')):
            target=web/rel; target.parent.mkdir(parents=True,exist_ok=True); shutil.copy2(p,target)
    shutil.copy2(ROOT/'index.html',dist/f'StickTD-{v}.html')
    shutil.copy2(log,dist/f'CHANGELOG-{v}.md')
    (dist/'release-notes.md').write_text(blocks[0],encoding='utf-8')
    with zipfile.ZipFile(dist/f'StickTD-{v}-web.zip','w',zipfile.ZIP_DEFLATED) as z:
        for p in web.rglob('*'):
            if p.is_file(): z.write(p,p.relative_to(web))
    if command=='native':
        pkg={'name':'sticktd','version':v,'description':'StickTD tower defense','author':'SauerNinja','license':'MIT','main':'main.cjs','devDependencies':{'electron':'43.0.0','electron-builder':'26.0.12','@capacitor/cli':'8.0.0'},'dependencies':{'@capacitor/core':'8.0.0','@capacitor/android':'8.0.0'},'build':{'appId':'io.github.sauerninja.sticktd','productName':'StickTD','files':['main.cjs','www/**/*'],'win':{'target':['portable']},'linux':{'target':['AppImage'],'category':'Game'},'mac':{'target':['dmg'],'category':'public.app-category.strategy-games','identity':None},'artifactName':'StickTD-${version}-${os}-${arch}.${ext}'}}
        (web.parent/'package.json').write_text(json.dumps(pkg,indent=2),encoding='utf-8')
        (web.parent/'capacitor.config.json').write_text(json.dumps({'appId':'io.github.sauerninja.sticktd','appName':'StickTD','webDir':'www'}),encoding='utf-8')
        (web.parent/'main.cjs').write_text("""const {app,BrowserWindow}=require('electron');
const path=require('node:path');
app.whenReady().then(()=>{
 const win=new BrowserWindow({width:1280,height:800,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true}});
 win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
 win.webContents.on('will-navigate',event=>event.preventDefault());
 win.loadFile(path.join(__dirname,'www','index.html'));
});
app.on('window-all-closed',()=>app.quit());
""",encoding='utf-8')
print(v)
