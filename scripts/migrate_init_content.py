import os
import re
import json
from datetime import datetime

def parse_messages(file_path, default_year):
    if not os.path.exists(file_path): return []
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    pattern = r'([\w\.]+):\s*(?:(\d{4})-)?(\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\s+'
    matches = list(re.finditer(pattern, content))
    messages = []
    for i in range(len(matches)):
        m = matches[i]
        sender = m.group(1)
        year = m.group(2) or str(default_year)
        timestamp = f"{year}-{m.group(3)}"
        start = m.end()
        end = matches[i+1].start() if i + 1 < len(matches) else len(content)
        body = content[start:end].strip()
        messages.append({'sender': sender, 'time': timestamp, 'body': body})
    return messages

def migrate():
    months_config = [('sept', 2025), ('oct', 2025), ('nov', 2025), ('dec', 2025), ('jan', 2026)]
    attachments_root = 'content/attachments'
    all_attachments = {}
    attachment_dirs = [
        ('init-sept', 'legacy-ai/init-sept/file'),
        ('init-oct', 'legacy-ai/init-oct/file'),
        ('init-nov', 'legacy-ai/init-nov/file'),
        ('init-dec', 'legacy-init-dec/file'),
        ('init-jan', 'legacy-init-jan/file')
    ]
    for _, adir in attachment_dirs:
        full_path = os.path.join(attachments_root, adir)
        if os.path.exists(full_path):
            for fname in os.listdir(full_path):
                match = re.match(r'^(\d+)_', fname)
                if match: all_attachments[int(match.group(1))] = {'name': fname, 'url': f'/attachments/{adir}/{fname}'.replace('\\', '/')}

    images_root = 'content/img'
    card_dir = 'content/card/ai'
    if not os.path.exists(card_dir): os.makedirs(card_dir)
    
    attachment_idx = 1
    for m, year in months_config:
        path = f'init-{m}/word.md' if m == 'sept' else f'init-{m}/Markdown File.md'
        messages = parse_messages(path, year)
        notifications = []
        current_notification = None
        for msg in messages:
            if ('【' in msg['body'] or '[' in msg['body']) and '通知' in msg['body']:
                if current_notification: notifications.append(current_notification)
                current_notification = {'sender': msg['sender'], 'published': msg['time'], 'body': msg['body'], 'attachments': [], 'images': []}
            elif current_notification: current_notification['body'] += '\n' + msg['body']
            else: current_notification = {'sender': msg['sender'], 'published': msg['time'], 'body': msg['body'], 'attachments': [], 'images': []}
        if current_notification: notifications.append(current_notification)
            
        for idx, note in enumerate(notifications):
            file_slots = re.findall(r'\[文件\]', note['body'])
            for _ in file_slots:
                if attachment_idx in all_attachments: note['attachments'].append(all_attachments[attachment_idx])
                attachment_idx += 1
            clean_body = note['body'].replace('[文件]', '').strip()
            month_img_dir = os.path.join(images_root, f'init-{m}')
            if os.path.exists(month_img_dir):
                available_imgs = os.listdir(month_img_dir)
                def replace_img(match):
                    full_match = match.group(0)
                    fname = re.split(r'[/\\]', full_match.rstrip(')'))[-1]
                    if fname in available_imgs:
                        url = f'/img/init-{m}/{fname}'
                        if url not in note['images']: note['images'].append(url)
                        return f'![通知配图]({url})'
                    return full_match
                clean_body = re.sub(r'!\[img\]\(file://[^)]+\)', replace_img, clean_body)

            pub_date = datetime.strptime(note['published'], '%Y-%m-%d %H:%M:%S')
            file_id = f"{pub_date.strftime('%Y%m%d')}-ai-{idx+1:02d}"
            atts_fm = [{'name': att['name'].split('_', 1)[-1], 'url': att['url']} for att in note['attachments']]
            cover = note['images'][0] if note['images'] else ''
            
            fm = f"---\ntitle: \"待生成\"\ndescription: \"待生成\"\ncategory: \"其他\"\ntags: []\nstart_at: \"\"\nend_at: \"\"\nid: {file_id}\nschool_slug: ai\nsubscription_id: ai-25-26学年学生干部通知群\nschool_name: 人工智能学院\npublished: '{pub_date.isoformat()}+08:00'\npinned: false\ncover: \"{cover}\"\nsource:\n  channel: 25-26学年学生干部通知群\n  sender: {note['sender']}\nattachments:"
            if not atts_fm: fm += " []"
            else:
                for a in atts_fm: fm += f"\n  - name: {a['name']}\n    url: {a['url']}"
            
            with open(os.path.join(card_dir, f"{file_id}.md"), 'w', encoding='utf-8') as f:
                f.write(fm + "\n---\n\n" + clean_body)

if __name__ == '__main__':
    migrate()
