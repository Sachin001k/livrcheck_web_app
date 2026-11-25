"""Converts the Flutter app's lib/translations/*.dart maps into src/i18n/*.json.

Usage: python3 scripts/convert_translations.py <path-to-flutter-app>
Re-run whenever the Flutter translations change.
"""
import json, re, sys, pathlib

def parse_dart_map(src: str) -> dict:
    # Start after the first "= {".
    i = src.index('= {') + 3
    out, n = {}, len(src)
    def skip_ws(i):
        while i < n:
            if src[i].isspace(): i += 1
            elif src.startswith('//', i): i = src.index('\n', i) + 1 if '\n' in src[i:] else n
            elif src.startswith('/*', i): i = src.index('*/', i) + 2
            else: break
        return i
    def read_str(i):
        raw = src.startswith('r', i) and src[i+1] in '\'"'
        if raw: i += 1
        q = src[i]
        triple = src.startswith(q*3, i)
        end = q*3 if triple else q
        i += len(end)
        buf = []
        while not src.startswith(end, i):
            c = src[i]
            if c == '\\' and not raw:
                nx = src[i+1]
                buf.append({'n': '\n', 't': '\t', 'r': '\r'}.get(nx, nx)); i += 2
            elif c == '$' and not raw:
                raise ValueError(f'interpolation at {src[i:i+30]!r}')
            else:
                buf.append(c); i += 1
        return ''.join(buf), i + len(end)
    def read_strs(i):  # adjacent string literals concatenate
        parts = []
        while True:
            i = skip_ws(i)
            if i < n and (src[i] in '\'"' or (src[i] == 'r' and src[i+1] in '\'"')):
                s, i = read_str(i); parts.append(s)
            else:
                return ''.join(parts), i
    while True:
        i = skip_ws(i)
        if src[i] == '}': return out
        if src.startswith('...', i):  # spread, e.g. ...enGuide
            m = re.match(r'\.\.\.(\w+)', src[i:]); out[f'__spread__{m.group(1)}'] = ''
            i += m.end(); i = skip_ws(i)
            if src[i] == ',': i += 1
            continue
        k, i = read_strs(i)
        i = skip_ws(i); assert src[i] == ':', src[i-40:i+40]; i += 1
        v, i = read_strs(i)
        out[k] = v
        i = skip_ws(i)
        if src[i] == ',': i += 1

root = pathlib.Path(sys.argv[1]) / 'lib' / 'translations'
dest = pathlib.Path(__file__).resolve().parent.parent / 'src' / 'i18n'
dest.mkdir(parents=True, exist_ok=True)
guide = parse_dart_map((root / 'en_guide.dart').read_text())
for f in sorted(root.glob('*.dart')):
    if f.stem == 'en_guide': continue
    m = parse_dart_map(f.read_text())
    spreads = [k for k in m if k.startswith('__spread__')]
    for k in spreads:
        del m[k]
        m.update(guide)
    (dest / f'{f.stem}.json').write_text(json.dumps(m, ensure_ascii=False, indent=1))
    print(f.stem, len(m))
