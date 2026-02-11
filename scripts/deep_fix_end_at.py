import os
import re
from datetime import datetime, timedelta

def deep_fix():
    card_dir = 'content/card/ai'
    files_to_check = [
        '20260119-ai-10.md', '20251217-ai-37.md', '20251201-ai-16.md', '20251120-ai-75.md',
        '20251111-ai-66.md', '20251110-ai-64.md', '20251105-ai-60.md', '20251105-ai-59.md',
        '20251104-ai-57.md', '20251104-ai-55.md', '20251029-ai-42.md', '20251025-ai-116.md',
        '20251022-ai-111.md', '20251014-ai-97.md', '20251010-ai-93.md', '20251010-ai-94.md',
        '20251010-ai-91.md', '20251009-ai-86.md', '20251009-ai-84.md', '20250929-ai-09.md',
        '20250925-ai-03.md', '20250925-ai-04.md', '20250925-ai-02.md'
    ]
    for f in files_to_check:
        p = os.path.join(card_dir, f)
        if not os.path.exists(p): continue
        with open(p, 'r', encoding='utf-8') as file: c = file.read()
        pts = re.split(r'^---$', c, flags=re.M)
        if len(pts) < 3: continue
        fm, bd = pts[1].strip(), pts[2].strip()
        sm = re.search(r"start_at:\s*'?(.*?)'?", fm)
        if sm:
            sv = sm.group(1).strip().strip("'").strip('"')
            if 'T' in sv:
                try:
                    dt = datetime.fromisoformat(sv.split('+')[0])
                    ne = f"'{(dt + timedelta(hours=1)).isoformat()}+08:00'"
                    fm = re.sub(r"end_at:.*", f"end_at: {ne}", fm)
                    with open(p, 'w', encoding='utf-8') as out: out.write("---\n" + fm + "\n---\n\n" + bd)
                    continue
                except: pass
        y = f[:4]
        found = False
        for pat in [r'(\d+)月(\d+)日(\d+):(\d+)前', r'(\d+)月(\d+)日.*?截止', r'截止时间为.*?(\d+)月(\d+)日']:
            m = re.search(pat, bd)
            if m:
                try:
                    mo, dy = m.group(1).zfill(2), m.group(2).zfill(2)
                    hr = m.group(3).zfill(2) if len(m.groups()) >= 4 else "23"
                    mi = m.group(4).zfill(2) if len(m.groups()) >= 4 else "59"
                    ie = f"'{y}-{mo}-{dy}T{hr}:{mi}:59+08:00'"
                    fm = re.sub(r"end_at:.*", f"end_at: {ie}", fm)
                    with open(p, 'w', encoding='utf-8') as out: out.write("---\n" + fm + "\n---\n\n" + bd)
                    found = True; break
                except: pass
        if found: continue
        tm = re.search(r'(\d{1,2}):(\d{2})', bd)
        if tm:
            try:
                mi, di = f[4:6], f[6:8]
                hr, mi_val = tm.group(1).zfill(2), tm.group(2).zfill(2)
                dt = datetime.fromisoformat(f"{y}-{mi}-{di}T{hr}:{mi_val}:00")
                ie = f"'{(dt + timedelta(hours=1)).isoformat()}+08:00'"
                if "start_at: ''" in fm: fm = fm.replace("start_at: ''", f"start_at: '{dt.isoformat()}+08:00'")
                fm = re.sub(r"end_at:.*", f"end_at: {ie}", fm)
                with open(p, 'w', encoding='utf-8') as out: out.write("---\n" + fm + "\n---\n\n" + bd)
            except: pass

if __name__ == '__main__':
    deep_fix()
