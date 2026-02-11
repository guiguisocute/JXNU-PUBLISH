import os
import re
import json

def refine_contest_tag():
    card_dir = 'content/card/ai'
    for fname in os.listdir(card_dir):
        if not fname.endswith('.md'): continue
        path = os.path.join(card_dir, fname)
        with open(path, 'r', encoding='utf-8') as f: content = f.read()
        pts = re.split(r'^---$', content, flags=re.M)
        if len(pts) < 3: continue
        fm, bd = pts[1].strip(), pts[2].strip()
        m = re.search(r'tags:\s*(\[.*?\])', fm)
        if m:
            try:
                ts = json.loads(m.group(1))
                nts = sorted(list(set(["竞赛" if t == "体育竞赛" else t for t in ts])))
                nl = f'tags: {json.dumps(nts, ensure_ascii=False)}'
                nfm = fm.replace(m.group(0), nl)
                with open(path, 'w', encoding='utf-8') as fo:
                    fo.write("---\n" + nfm + "\n---\n\n" + bd)
            except: pass

if __name__ == '__main__':
    refine_contest_tag()
