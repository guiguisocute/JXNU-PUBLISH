import os
import re

def fix_time_format():
    card_dir = 'content/card/ai'
    # ISO 8601 pattern with or without timezone
    iso_pattern = r'(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\+08:00)?'
    
    for fname in os.listdir(card_dir):
        if not fname.endswith('.md'):
            continue
        path = os.path.join(card_dir, fname)
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        parts = content.split('---')
        if len(parts) < 3:
            continue
            
        fm = parts[1]
        body = parts[2]
        
        lines = fm.strip().split('
')
        new_lines = []
        for line in lines:
            # Handle published, start_at, end_at
            if any(k in line for k in ['published:', 'start_at:', 'end_at:']):
                key, val = line.split(':', 1)
                val = val.strip().strip("'").strip('"')
                
                if val and val != 'null':
                    # Check if it's already ISO format
                    match = re.search(iso_pattern, val)
                    if match:
                        clean_time = match.group(1)
                        new_val = f"'{clean_time}+08:00'"
                        new_lines.append(f"{key}: {new_val}")
                    else:
                        # If not ISO, could be raw date from prev logic, 
                        # but our overhaul script already produced ISO.
                        # If weird, fallback to empty string as per rule.
                        new_lines.append(f"{key}: ''")
                else:
                    new_lines.append(f"{key}: ''")
            else:
                new_lines.append(line)
        
        new_content = '---
' + '
'.join(nl for nl in new_lines) + '
---
' + body
        
        with open(path, 'w', encoding='utf-8') as f:
            f.write(new_content)

if __name__ == '__main__':
    fix_time_format()
