import os
import re

def remove_redundant_tags():
    card_dir = 'content/card/ai'
    tag_to_remove = "人工智能学院"
    
    for fname in os.listdir(card_dir):
        if not fname.endswith('.md'):
            continue
        path = os.path.join(card_dir, fname)
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # 匹配 tags: [...] 这一行
        def clean_tags(match):
            tags_line = match.group(0)
            # 移除标签（处理带引号的情况）
            cleaned = tags_line.replace(f'"{tag_to_remove}"', '').replace(f"'{tag_to_remove}'", "")
            # 清理多余的逗号和空格
            cleaned = re.sub(r',\s*,', ',', cleaned)
            cleaned = re.sub(r'\[\s*,', '[', cleaned)
            cleaned = re.sub(r',\s*\]', ']', cleaned)
            # 如果是 tags: [] 保持原样或美化
            return cleaned

        new_content = re.sub(r'tags: \s*\[.*\]', clean_tags, content)
        
        with open(path, 'w', encoding='utf-8') as f:
            f.write(new_content)

if __name__ == '__main__':
    remove_redundant_tags()
