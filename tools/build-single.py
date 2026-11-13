#!/usr/bin/env python3
"""
tools/build-single.py — 把页面引用的 css/js 内联,生成单文件 HTML(输出到 dist/)
用法(在站点根目录执行):
  python tools/build-single.py                         主页面 → dist/timespace-single.html
  python tools/build-single.py race/index.html race-single.html   赛车页 → dist/race-single.html
注意:media/ 里的图片和课件不会被内联,仍需一起部署;http 开头的外部库保持不动。
"""
import re, os, sys
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
page = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
outname = sys.argv[2] if len(sys.argv) > 2 else 'timespace-single.html'
path = os.path.join(root, page)
base = os.path.dirname(path)                        # css/js 的相对路径以页面所在目录为准
html = open(path, encoding='utf8').read()
def read(p): return open(os.path.join(base, p), encoding='utf8').read()
html = re.sub(r'<link rel="stylesheet" href="([^"]+)">', lambda m: '<style>\n' + read(m.group(1)) + '</style>', html)
html = re.sub(r'<script src="((?!http)[^"]+)"></script>', lambda m: '<script>\n' + read(m.group(1)) + '</script>', html)
os.makedirs(os.path.join(root, 'dist'), exist_ok=True)
out = os.path.join(root, 'dist', outname)
open(out, 'w', encoding='utf8').write(html)
print('生成', out, len(html) // 1024, 'KB')
