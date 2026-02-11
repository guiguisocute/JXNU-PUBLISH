import os
import re
from datetime import datetime, timedelta

def auto_fill_end_at():
    card_dir = 'content/card/ai'
    for fname in os.listdir(card_dir):
        if not fname.endswith('.md'): continue
        path = os.path.join(card_dir, fname)
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
        parts = re.split(r'^---$', content, flags=re.MULTILINE)
        if len(parts) < 3: continue
        fm_block, body = parts[1].strip(), parts[2].strip()
        end_at_match = re.search(r"end_at:\s*'?'?(.*?)'?'?\n", fm_block)
        current_end_at = end_at_match.group(1).strip().strip("'").strip('"') if end_at_match else ""
        if not current_end_at:
            start_at_match = re.search(r"start_at:\s*'?'?(.*?)'?'?\n", fm_block)
            if start_at_match:
                start_val = start_at_match.group(1).strip().strip("'").strip('"')
                if start_val and 'T' in start_val:
                    try:
                        base_time_str = start_val.split('+')[0]
                        dt = datetime.fromisoformat(base_time_str)
                        end_dt = dt + timedelta(hours=1)
                        end_val = f"'{end_dt.isoformat()}+08:00'"
                        new_fm = re.sub(r"end_at:.*", f"end_at: {end_val}", fm_block)
                        with open(path, 'w', encoding='utf-8') as f_out:
                            f_out.write("---\n" + new_fm + "\n---\n\n" + body)
                    except: pass

if __name__ == '__main__':
    auto_fill_end_at()
