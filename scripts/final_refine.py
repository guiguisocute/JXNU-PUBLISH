import os
import re
import json

def get_final_category(body):
    text = body.lower()
    if any(k in text for k in ['问卷', '收集表', '登记表', '统计表', '填报', '填写表格', '共享表格', '在线文档', '汇总表']):
        return "问卷填表"
    if any(k in text for k in ['赛', '挑战杯', '锦标赛', '选拔', '海选', '十佳歌手']):
        return "竞赛相关"
    if any(k in text for k in ['志愿者', '支教', '西部计划', '志愿时长', '志愿者平台']):
        return "志愿实习"
    if any(k in text for k in ['讲座', '培训', '沙龙', '讲堂', '艺起来', '活动', '剧本杀', '狼人杀', '鼓圈', '观赛', '演出']):
        return "二课活动"
    if any(k in text for k in ['决定', '名单', '更正', '纠正', '说明', '截止', '提醒', '要求', '规范', '通知', '地址', '提示']):
        return "通知公告"
    return "其它分类"

def refine_card(body):
    title_match = re.search(r'[【\[](.*?)[】\]]', body)
    if title_match:
        raw_title = title_match.group(1)
        clean_title = re.sub(r'\d+月\d+日\s*', '', raw_title).strip()
        if len(clean_title) < 4 or clean_title.startswith('通知'):
            if '辩论' in body: clean_title = "辩论赛相关通知"
            elif '二课' in body: clean_title = "二课相关业务通知"
            elif '志愿者' in body: clean_title = "志愿者相关通知"
            elif '挑战杯' in body: clean_title = "挑战杯竞赛通知"
            else: clean_title = clean_title or "校园通知"
    else:
        clean_title = "人工智能学院通知"

    clean_body = re.sub(r'各位.*?：|大家好！?|你们好！?|25级.*?：', '', body).strip()
    clean_body = re.sub(r'\s+', ' ', clean_body)
    description = clean_body[:90] + "..." if len(clean_body) > 90 else clean_body
    
    return clean_title, description, get_final_category(body)

def run_refine():
    card_dir = 'content/card/ai'
    files = [f for f in os.listdir(card_dir) if f.endswith('.md')]
    
    for fname in files:
        path = os.path.join(card_dir, fname)
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        parts = re.split(r'^---$', content, flags=re.MULTILINE)
        if len(parts) < 3: continue
        
        fm = parts[1]
        body = parts[2].strip()
        
        if '待生成' in fm or 'title: "待生成"' in fm:
            title, desc, cat = refine_card(body)
            lines = fm.split('\n')
            new_lines = []
            for line in lines:
                if line.startswith('title:'): new_lines.append('title: ' + json.dumps(title, ensure_ascii=False))
                elif line.startswith('description:'): new_lines.append('description: ' + json.dumps(desc, ensure_ascii=False))
                elif line.startswith('category:'): new_lines.append('category: ' + json.dumps(cat, ensure_ascii=False))
                elif line.startswith('tags:'):
                    tags = ["人工智能学院"]
                    if "二课" in body: tags.append("赣青二课")
                    if "志愿者" in body or "志愿" in body: tags.append("志愿服务")
                    if "赛" in body or "竞赛" in body: tags.append("竞赛相关")
                    new_lines.append('tags: ' + json.dumps(tags, ensure_ascii=False))
                else:
                    new_lines.append(line)
            fm = '\n'.join(new_lines)
        else:
            cat = get_final_category(body)
            fm = re.sub(r'category:.*', 'category: ' + json.dumps(cat, ensure_ascii=False), fm)
        
        with open(path, 'w', encoding='utf-8') as f:
            f.write("---" + fm + "---\n\n" + body)

if __name__ == '__main__':
    run_refine()