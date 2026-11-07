#!/usr/bin/env python3
"""
tools/build-single.py — 把 css/js 内联,生成单文件 dist/timespace-single.html
用途:只想发一个 HTML 文件(例如发布到只允许单文件的平台)时使用。
注意:media/ 文件夹里的图片和课件不会被内联,仍需一起部署。
运行:在站点根目录执行  python tools/build-single.py
"""
import re, os
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
html = open(os.path.join(root, 'index.html'), encoding='utf8').read()

def read(p): return open(os.path.join(root, p), encoding='utf8').read()
# 内联样式表
html = re.sub(r'<link rel="stylesheet" href="([^"]+)">', lambda m: '<style>\n' + read(m.group(1)) + '</style>', html)
# 内联本地脚本(http 开头的外部库保持不动)
html = re.sub(r'<script src="((?!http)[^"]+)"></script>', lambda m: '<script>\n' + read(m.group(1)) + '</script>', html)
os.makedirs(os.path.join(root, 'dist'), exist_ok=True)
out = os.path.join(root, 'dist', 'timespace-single.html')
open(out, 'w', encoding='utf8').write(html)
print('生成', out, len(html) // 1024, 'KB')
