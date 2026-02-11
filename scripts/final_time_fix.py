import os
import re

def fix():
    d = 'content/card/ai'
    pat = r'(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})'
    for f in os.listdir(d):
        if not f.endswith('.md'): continue
        p = os.path.join(d, f)
        with open(p, 'r', encoding='utf-8') as file: c = file.read()
        parts = c.split('---')
        if len(parts) < 3: continue
        fm = parts[1]
        body = parts[2]
        lines = fm.strip().split('
')
        nl = []
        for l in lines:
            if any(k in l for k in ['published:', 'start_at:', 'end_at:']):
                k, v = l.split(':', 1)
                v = v.strip().strip("'").strip('"')
                if v and v != 'null':
                    m = re.search(pat, v)
                    if m:
                        nl.append(f"{k}: '{m.group(1)}+08:00'")
                    else:
                        nl.append(f"{k}: ''")
                else:
                    nl.append(f"{k}: ''")
            else:
                nl.append(l)
        with open(p, 'w', encoding='utf-8') as out:
            out.write('---
' + '
'.join(nl) + '
---
' + body)

if __name__ == '__main__':
    fix()
