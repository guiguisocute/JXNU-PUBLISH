import os
import re
import json

def clean_tags():
    card_dir = 'content/card/ai'
    for fname in os.listdir(card_dir):
        if not fname.endswith('.md'): continue
        path = os.path.join(card_dir, fname)
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        parts = re.split(r'^---$', content, flags=re.MULTILINE)
        if len(parts) < 3: continue
        
        fm_block = parts[1].strip()
        body = parts[2].strip()
        
        # 提取 category
        cat_match = re.search(r'category:\s*(.*)', fm_block)
        category = ""
        if cat_match:
            category = cat_match.group(1).strip().strip("'").strip('"')
        
        # 处理 tags: [...]
        tags_match = re.search(r'tags:\s*(\[.*?\])', fm_block)
        if tags_match:
            try:
                tags = json.loads(tags_match.group(1))
                cleaned_tags = [t for t in tags if t != "人工智能学院" and t != category]
                tags_line = f'tags: {json.dumps(cleaned_tags, ensure_ascii=False)}'
                new_fm = fm_block.replace(tags_match.group(0), tags_line)
                
                with open(path, 'w', encoding='utf-8') as f:
                    f.write("---\n" + new_fm + "\n---\n\n" + body)
            except:
                pass

if __name__ == '__main__':
    clean_tags()
