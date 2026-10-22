"""src/original.html(정리기 원본 = claude.ai 「맵툴 로그 정리기 (슬라임)」 판) + oremas-addon.html → index.html
원본이 바뀌면 src/original.html 만 바꾸고 python build.py 를 다시 돌린다.

합치면서 문서 구조도 바로잡는다 (원본 파일은 건드리지 않는다).
- <html lang="ko">
- <body> 안에 들어 있던 <title> · <link> · <script src> 를 <head> 로 옮긴다
"""
import pathlib, re

root = pathlib.Path(__file__).parent
base = (root / 'src' / 'original.html').read_text(encoding='utf-8')
addon = (root / 'oremas-addon.html').read_text(encoding='utf-8')

# 1) 덧붙임은 </body> 바로 앞에
i = base.lower().rfind('</body>')
out = base[:i] + '\n' + addon + '\n' + base[i:] if i >= 0 else base + '\n' + addon

# 2) <html lang="ko">
out = re.sub(r'<html(?![^>]*\blang=)', '<html lang="ko"', out, count=1, flags=re.I)

# 3) <body> 첫머리에 붙어 있는 <title> · <link> · <script src></script> 를 <head> 끝으로 옮긴다
m = re.search(r'<body[^>]*>', out, flags=re.I)
head_end = out.lower().find('</head>')
if m and 0 <= head_end < m.start():
    pos = m.end()
    pat = re.compile(r'\s*(<title>[^<]*</title>|<link\b[^>]*>|<script\b[^>]*\bsrc=[^>]*>\s*</script>)', re.I)
    moved = []
    while True:
        mm = pat.match(out, pos)
        if not mm:
            break
        moved.append(mm.group(1))
        pos = mm.end()
    if moved:
        out = out[:head_end] + ''.join(moved) + out[head_end:m.end()] + out[pos:]

# 4) 탭 제목: 바탕이 claude.ai 의 「… (슬라임)」 판이라 붙은 꼬리를 뗀다
out = out.replace('<title>맵툴 로그 정리기 (슬라임)</title>', '<title>맵툴 로그 정리기</title>', 1)

(root / 'index.html').write_text(out, encoding='utf-8')
print('index.html', f'{len(out.encode("utf-8")):,} bytes', f'({len(out):,} chars)')
