import os
import re
from datetime import datetime, timedelta

def ultimate_fix():
    card_dir = 'content/card/ai'
    for f in os.listdir(card_dir):
        if not f.endswith('.md'): continue
        p = os.path.join(card_dir, f)
        with open(p, 'r', encoding='utf-8') as file: c = file.read()
        pts = re.split(r'^---$', c, flags=re.M)
        if len(pts) < 3: continue
        fm, bd = pts[1].strip(), pts[2].strip()
        
        # Extract fields robustly
        sm = re.search(r"start_at:\s*'?(.*?)'?", fm)
        em = re.search(r"end_at:\s*'?(.*?)'?", fm)
        cur_start = sm.group(1).strip().strip("'").strip('"') if sm else ""
        cur_end = em.group(1).strip().strip("'").strip('"') if em else ""
        y = f[:4]
        
        if cur_start and 'T' in cur_start and (not cur_end or cur_end == 'null' or cur_end == "''"):
            try:
                dt = datetime.fromisoformat(cur_start.split('+')[0])
                cur_end = (dt + timedelta(hours=1)).isoformat() + "+08:00"
            except: pass

        if not cur_end or cur_end == 'null' or cur_end == "''":
            m = re.search(r'(\d+)月(\d+)日\s*(\d+)[:：](\d+)', bd)
            if m:
                try:
                    mo, dy, hr, mi = m.group(1).zfill(2), m.group(2).zfill(2), m.group(3).zfill(2), m.group(4).zfill(2)
                    cur_end = f"{y}-{mo}-{dy}T{hr}:{mi}:59+08:00"
                except: pass
            else:
                m2 = re.search(r'(\d+)月(\d+)日', bd)
                if m2:
                    try:
                        mo, dy = m2.group(1).zfill(2), m2.group(2).zfill(2)
                        cur_end = f"{y}-{mo}-{dy}T23:59:59+08:00"
                    except: pass

        def wrap(v): return f"'{v}'" if v else "''"
        fm = re.sub(r"start_at:.*", f"start_at: {wrap(cur_start)}", fm)
        fm = re.sub(r"end_at:.*", f"end_at: {wrap(cur_end)}", fm)
        with open(p, 'w', encoding='utf-8') as out:
            out.write("---\n" + fm + "\n---\n\n" + bd)

if __name__ == '__main__':
    ultimate_fix()
