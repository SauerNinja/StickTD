"""Validate, archive, package and describe StickTD releases; standard library only.

Commands:
  check    validate versions and the changelog
  prepare  archive older release families into HISTORY.md
  native   stage the desktop and Android packaging folder
  compose  write dist/release-notes.md and dist/SHA256SUMS.txt from the built binaries

Release notes list every changelog entry newer than the previous published
release and no newer than this one, searching CHANGELOG.md and HISTORY.md, so
no entry is skipped however many versions passed between releases.
"""
from pathlib import Path
import hashlib, json, os, re, shutil, struct, sys, zlib

ROOT = Path(__file__).resolve().parent
if not (ROOT / 'index.html').is_file():
    ROOT = ROOT.parent
DIST = ROOT / 'dist'
PACKAGING = ROOT / 'packaging'
REPOSITORY = os.environ.get('GITHUB_REPOSITORY', 'SauerNinja/StickTD')
PLAY_URL = 'https://sauerninja.github.io/StickTD/'
WEB_ASSET_SUFFIXES = ('.html', '.json', '.png', '.ico', '.svg', '.webp', '.css', '.js', '.mp3', '.ogg', '.wav', '.mid')
WEB_ASSET_NAMES = ('CHANGELOG.md', 'HISTORY.md', 'LICENSE')
EXCLUDED_PARTS = ('packaging', 'dist', 'scripts', 'node_modules')
ENTRY_PATTERN = re.compile(r'^## \[(\d+\.\d+\.\d+)\][^\n]*\n[\s\S]*?(?=^## \[|\Z)', re.M)
TAG_VERSION = re.compile(r'^v(\d+\.\d+\.\d+)')
DOWNLOADS = (
    ('Windows 64-bit, portable', '*-win-x64.exe'),
    ('macOS, Apple Silicon', '*-mac-arm64.dmg'),
    ('macOS, Intel', '*-mac-x64.dmg'),
    ('Linux 64-bit, AppImage', '*-linux-x86_64.AppImage'),
    ('Android', '*-android*.apk'),
)


def version_key(version):
    return tuple(int(part) for part in version.split('.'))


def read_game_version():
    html = (ROOT / 'index.html').read_text(encoding='utf-8')
    version = re.search(r"const GAME_VERSION = '([0-9.]+)'", html).group(1)
    for marker in (f'content="{version}"', f'"softwareVersion": "{version}"'):
        if marker not in html:
            raise SystemExit(f'Release blocked: index.html metadata does not carry version {version} ({marker}).')
    return version


def read_entries(file_name):
    path = ROOT / file_name
    if not path.exists():
        return {}
    return {match.group(1): match.group(0).strip() for match in ENTRY_PATTERN.finditer(path.read_text(encoding='utf-8'))}


def validate_changelog(version):
    text = (ROOT / 'CHANGELOG.md').read_text(encoding='utf-8')
    matches = list(ENTRY_PATTERN.finditer(text))
    versions = [match.group(1) for match in matches]
    if not versions or versions[0] != version:
        found = versions[0] if versions else 'no version'
        raise SystemExit(f'Release blocked: index.html is {version}, but CHANGELOG.md starts with {found}. Commit the matching index.html and CHANGELOG.md together.')
    family = '.'.join(version.split('.')[:2])
    older = [match.group(0) for match in matches if not match.group(1).startswith(family + '.')]
    return text, [match.group(0) for match in matches], older


def archive_older_families(text, blocks, older):
    history_path = ROOT / 'HISTORY.md'
    previous = history_path.read_text(encoding='utf-8') if history_path.exists() else '# Release history\n\n'
    fresh = ''.join(block for block in older if block not in previous)
    split = previous.find('## [')
    if split < 0:
        split = len(previous)
    history_path.write_text(previous[:split] + fresh + previous[split:], encoding='utf-8')
    (ROOT / 'CHANGELOG.md').write_text(text[:text.index('## [')] + ''.join(block for block in blocks if block not in older), encoding='utf-8')


def stage_web_folder():
    web = PACKAGING / 'www'
    if web.exists():
        shutil.rmtree(web)
    web.mkdir(parents=True)
    for path in ROOT.rglob('*'):
        relative = path.relative_to(ROOT)
        if any(part.startswith('.') or part in EXCLUDED_PARTS for part in relative.parts):
            continue
        if path.is_file() and (path.suffix.lower() in WEB_ASSET_SUFFIXES or path.name in WEB_ASSET_NAMES):
            target = web / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(path, target)


def scale_favicon(target, factor=16):
    data = (ROOT / 'favicon.png').read_bytes()
    position, header, chunks = 8, None, []
    while position < len(data):
        length, kind = struct.unpack('>I4s', data[position:position + 8])
        body = data[position + 8:position + 8 + length]
        if kind == b'IHDR':
            header = struct.unpack('>IIBBBBB', body)
        elif kind == b'IDAT':
            chunks.append(body)
        position += 12 + length
    width, height, depth, color_type, _, _, interlace = header
    if depth != 8 or color_type != 6 or interlace:
        raise SystemExit('Release blocked: favicon.png must be 8-bit RGBA and not interlaced.')
    raw, stride, rows, previous = zlib.decompress(b''.join(chunks)), width * 4, [], bytearray(width * 4)
    for row in range(height):
        start = row * (stride + 1)
        method, line = raw[start], bytearray(raw[start + 1:start + 1 + stride])
        for index in range(stride):
            left = line[index - 4] if index >= 4 else 0
            above = previous[index]
            corner = previous[index - 4] if index >= 4 else 0
            if method == 1: line[index] = (line[index] + left) & 255
            elif method == 2: line[index] = (line[index] + above) & 255
            elif method == 3: line[index] = (line[index] + (left + above) // 2) & 255
            elif method == 4:
                estimate = left + above - corner
                nearest = min((abs(estimate - left), left), (abs(estimate - above), above), (abs(estimate - corner), corner))[1]
                line[index] = (line[index] + nearest) & 255
        rows.append(line)
        previous = line
    scaled = bytearray()
    for line in rows:
        wide = b''.join(bytes(line[x * 4:x * 4 + 4]) * factor for x in range(width))
        scaled += (b'\x00' + wide) * factor
    def chunk(kind, body):
        return struct.pack('>I', len(body)) + kind + body + struct.pack('>I', zlib.crc32(kind + body) & 0xffffffff)
    png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', width * factor, height * factor, 8, 6, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(bytes(scaled), 9)) + chunk(b'IEND', b'')
    target.write_bytes(png)


def mac_build_options():
    options = {'target': ['dmg'], 'category': 'public.app-category.strategy-games'}
    if os.environ.get('SIGN_MAC') == 'true':
        options.update({'hardenedRuntime': True, 'notarize': True})
    else:
        options['identity'] = None
    return options


def write_native_project(version):
    package = {
        'name': 'sticktd', 'version': version, 'description': 'StickTD tower defense', 'author': 'SauerNinja', 'license': 'MIT', 'main': 'main.cjs',
        'devDependencies': {'electron': '43.0.0', 'electron-builder': '26.0.12', '@capacitor/cli': '8.0.0'},
        'dependencies': {'@capacitor/core': '8.0.0', '@capacitor/android': '8.0.0'},
        'build': {
            'appId': 'io.github.sauerninja.sticktd', 'productName': 'StickTD', 'files': ['main.cjs', 'app-icon.png', 'www/**/*'], 'directories': {'buildResources': '.'},
            'win': {'target': ['portable'], 'icon': 'app-icon.png'},
            'linux': {'target': ['AppImage'], 'category': 'Game', 'icon': 'app-icon.png'},
            'mac': {**mac_build_options(), 'icon': 'app-icon.png'},
            'artifactName': 'StickTD-${version}-${os}-${arch}.${ext}',
        },
    }
    scale_favicon(PACKAGING / 'app-icon.png')
    (PACKAGING / 'package.json').write_text(json.dumps(package, indent=2), encoding='utf-8')
    (PACKAGING / 'capacitor.config.json').write_text(json.dumps({'appId': 'io.github.sauerninja.sticktd', 'appName': 'StickTD', 'webDir': 'www', 'backgroundColor': '#1a1f14'}), encoding='utf-8')
    (PACKAGING / 'main.cjs').write_text("""const {app,BrowserWindow,shell}=require('electron');
const path=require('node:path');
app.commandLine.appendSwitch('autoplay-policy','no-user-gesture-required');
if(!app.requestSingleInstanceLock()) app.quit();
let mainWindow=null;
app.on('second-instance',()=>{ if(mainWindow){ if(mainWindow.isMinimized()) mainWindow.restore(); mainWindow.focus(); } });
app.whenReady().then(()=>{
 mainWindow=new BrowserWindow({width:1280,height:800,minWidth:640,minHeight:400,show:false,backgroundColor:'#1a1f14',title:'StickTD',autoHideMenuBar:true,icon:path.join(__dirname,'app-icon.png'),webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true}});
 mainWindow.removeMenu();
 mainWindow.once('ready-to-show',()=>mainWindow.show());
 mainWindow.webContents.setWindowOpenHandler(({url})=>{ if(/^https:\\/\\//.test(url)) shell.openExternal(url); return {action:'deny'}; });
 mainWindow.webContents.on('will-navigate',event=>event.preventDefault());
 mainWindow.webContents.on('before-input-event',(event,input)=>{ if(input.type==='keyDown' && input.key==='F11'){ mainWindow.setFullScreen(!mainWindow.isFullScreen()); event.preventDefault(); } });
 mainWindow.loadFile(path.join(__dirname,'www','index.html'));
});
app.on('window-all-closed',()=>app.quit());
""", encoding='utf-8')


def previous_release_version(version):
    tags = os.environ.get('RELEASED_TAGS', '').split()
    released = [match.group(1) for match in map(TAG_VERSION.match, tags) if match and version_key(match.group(1)) < version_key(version)]
    return max(released, key=version_key) if released else None


def entries_since_previous_release(version, previous):
    entries = {**read_entries('HISTORY.md'), **read_entries('CHANGELOG.md')}
    if previous is None:
        return [entries[version]]
    selected = [number for number in entries if version_key(previous) < version_key(number) <= version_key(version)]
    return [entries[number] for number in sorted(selected, key=version_key, reverse=True)]


def sha256_of(path):
    digest = hashlib.sha256()
    with path.open('rb') as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b''):
            digest.update(chunk)
    return digest.hexdigest()


def format_size(byte_count):
    return f'{byte_count / 1048576:.1f} MB' if byte_count >= 1048576 else f'{max(1, round(byte_count / 1024))} KB'


def signing_summary():
    windows = os.environ.get('SIGN_WIN') == 'true'
    mac = os.environ.get('SIGN_MAC') == 'true'
    android = os.environ.get('SIGN_ANDROID') == 'true'
    return '\n'.join([
        f"- Windows: {'code-signed' if windows else 'not code-signed; Windows SmartScreen may ask for confirmation'}",
        f"- macOS: {'signed and notarized' if mac else 'not notarized; open with right-click, then Open'}",
        f"- Android: {'signed with the release key' if android else 'debug-signed test build'}",
        '- Every file is listed in SHA256SUMS.txt and carries a GitHub build-provenance attestation tying it to this commit and workflow run.',
    ])


def compose_release_notes(version):
    previous = previous_release_version(version)
    entries = entries_since_previous_release(version, previous)
    shown = [re.sub(r'^## ', '### ', re.sub(r'^### ', '#### ', entry, flags=re.M), count=1) for entry in entries]
    scope = f'Changes since {previous}' if previous else 'Changes in this release'
    commit = os.environ.get('GITHUB_SHA', 'local')
    run_url = f"{os.environ.get('GITHUB_SERVER_URL', 'https://github.com')}/{REPOSITORY}/actions/runs/{os.environ.get('GITHUB_RUN_ID', '')}"
    rows = ['| Platform | File | Size |', '|---|---|---|']
    for label, pattern in DOWNLOADS:
        for path in sorted(DIST.glob(pattern)):
            rows.append(f'| {label} | `{path.name}` | {format_size(path.stat().st_size)} |')
    notes = [
        f'## StickTD {version}', '',
        f'Play in the browser at [{PLAY_URL}]({PLAY_URL}) or download a build below.', '',
        '### Downloads', '', '\n'.join(rows), '',
        '### Authenticity', '', signing_summary(), '',
        f'Verify a download with `gh attestation verify <file> --repo {REPOSITORY}`, or compare its hash with `SHA256SUMS.txt`.', '',
        f'### {scope}', '', '\n\n'.join(shown), '',
        f'Build commit `{commit}` · [workflow run]({run_url})', '',
    ]
    (DIST / 'release-notes.md').write_text('\n'.join(notes), encoding='utf-8')
    binaries = sorted(path for path in DIST.iterdir() if path.is_file() and path.name not in ('release-notes.md', 'SHA256SUMS.txt'))
    (DIST / 'SHA256SUMS.txt').write_text(''.join(f'{sha256_of(path)}  {path.name}\n' for path in binaries), encoding='utf-8')


def main():
    command = sys.argv[1] if len(sys.argv) > 1 else 'check'
    version = read_game_version()
    text, blocks, older = validate_changelog(version)
    if command == 'prepare' and older:
        archive_older_families(text, blocks, older)
    elif older:
        raise SystemExit('Run python release.py prepare to archive older release families.')
    if command == 'native':
        stage_web_folder()
        write_native_project(version)
    elif command == 'compose':
        compose_release_notes(version)
    print(version)


main()
