import os
import re
import yaml

def final_yaml_fix():
    card_dir = 'content/card/ai'
    for fname in os.listdir(card_dir):
        if not fname.endswith('.md'): continue
        path = os.path.join(card_dir, fname)
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # 提取 Frontmatter
        m = re.match(r'^---
(.*?)
---

(.*)$', content, re.DOTALL)
        if not m: continue
        
        fm_text = m.group(1)
        body = m.group(2)
        
        # 使用正则表达式清理 attachments
        # 将 JSON 格式的 [ { "name": ..., "url": ... }, ... ] 转为 YAML
        # 或者直接重新生成整个 FM
        
        # 简单粗暴点：提取出 attachments 之后的内容
        parts = re.split(r'attachments:', fm_text)
        if len(parts) < 2: continue
        
        pre_att = parts[0]
        att_json_part = parts[1].strip()
        
        # 尝试解析 JSON
        try:
            import json
            # 清理一下可能存在的尾随逗号或其他干扰
            att_data = json.loads(att_json_part)
            
            # 生成 YAML 格式的 attachments
            new_att_yaml = "attachments:"
            if not att_data:
                new_att_yaml += " []"
            else:
                for item in att_data:
                    new_att_yaml += f"
  - name: {item['name']}
    url: {item['url']}"
            
            new_fm = pre_att + new_att_yaml
            with open(path, 'w', encoding='utf-8') as f:
                f.write("---
" + new_fm.strip() + "
---

" + body)
        except:
            continue

if __name__ == '__main__':
    final_yaml_fix()
