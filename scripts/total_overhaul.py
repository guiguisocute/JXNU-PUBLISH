import os
import re
import json

def get_refined_fields(body):
    title = ""
    description = ""
    category = "其它分类"
    
    # Category mapping
    if any(k in body for k in ['问卷', '收集表', '统计表', '填报', '调查', '填写表格', '共享表格', '在线文档', '汇总表', '登记表', '报名表', '申报表', '小程序']):
        category = "问卷填表"
    elif any(k in body for k in ['赛', '挑战杯', '锦标赛', '选拔', '海选', '十佳歌手', '辩论', '大创']):
        category = "竞赛相关"
    elif any(k in body for k in ['志愿者', '支教', '西部计划', '公益', '捐', '红十字']):
        category = "志愿实习"
    elif any(k in body for k in ['培训', '讲座', '沙龙', '讲堂', '艺起来', '活动', '剧本杀', '狼人杀', '鼓圈', '观赛', '演出', '晚会', '座谈']):
        category = "二课活动"
    elif any(k in body for k in ['决定', '名单', '更正', '纠正', '说明', '截止', '提醒', '要求', '规范', '通知', '地址', '公示', '提示']):
        category = "通知公告"

    # Title mapping
    if any(k in body for k in ['辩论', '新生杯']): title = "全校“新生杯”辩论大赛相关通知"
    elif '武术' in body: title = "第九届武术（套路/散打）锦标赛通知"
    elif '挑战杯' in body: title = "“挑战杯”大学生创业计划竞赛相关通知"
    elif '十佳歌手' in body: title = "校园/院十佳歌手大赛报名及门票通知"
    elif '朗诵' in body: title = "“青春筑梦·声动赣鄱”朗诵比赛通知"
    elif '职业规划' in body: title = "大学生职业生涯规划大赛参赛通知"
    elif '拔河' in body: title = "“向往杯”拔河比赛参赛及组织通知"
    elif '创新大赛' in body: title = "中国国际大学生创新大赛（2026）选拔通知"
    elif '匹克球' in body or '校运会' in body: title = "校运会/大运会运动员及校队选拔通知"
    elif '支教' in body: title = "腾讯数字支教志愿者招募及管理通知"
    elif '暖冬' in body: title = "2026年“希望工程·暖冬行动”特别资助申报"
    elif '二课' in body: title = "赣青二课账号管理及业务办理通知"
    elif '学代会' in body: title = "关于学代会代表选举及提案征集相关通知"
    elif any(k in body for k in ['更正', '纠正', '地址']): title = "关于办公地址或活动信息的更正说明"
    
    if not title: title = "人工智能学院校园通知"
    
    # Description
    clean = re.sub(r'各位.*?：|大家好！?|你们好！?|25级.*?：|请.*?：|@全体成员', '', body).strip()
    clean = re.sub(r'\s+', ' ', clean)
    description = clean[:90] + "..." if len(clean) > 90 else clean

    return title, description, category

def run():
    d = 'content/card/ai'
    iso_pat = r'(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})'
    
    for f in os.listdir(d):
        if not f.endswith('.md'): continue
        p = os.path.join(d, f)
        with open(p, 'r', encoding='utf-8') as file: c = file.read()
        
        # Safe split using regex
        parts = re.split(r'^---$', c, flags=re.MULTILINE)
        if len(parts) < 3: continue
        
        fm_block = parts[1].strip()
        body = parts[2].strip()
        
        t, ds, cat = get_refined_fields(body)
        
        # Process FM lines
        lines = fm_block.split('\n')
        new_lines = []
        skip_to_next_key = False
        
        for l in lines:
            if not l.strip(): continue
            
            # Simple field replacement
            if l.startswith('title:'):
                new_lines.append(f'title: {json.dumps(t, ensure_ascii=False)}')
            elif l.startswith('description:'):
                new_lines.append(f'description: {json.dumps(ds, ensure_ascii=False)}')
            elif l.startswith('category:'):
                new_lines.append(f'category: {json.dumps(cat, ensure_ascii=False)}')
            elif l.startswith('tags:'):
                tags = []
                if "二课" in body: tags.append("赣青二课")
                if "志愿者" in body: tags.append("志愿服务")
                if cat != "其它分类": tags.append(cat)
                new_lines.append(f'tags: {json.dumps(tags, ensure_ascii=False)}')
            elif any(l.startswith(k) for k in ['published:', 'start_at:', 'end_at:']):
                k, v = l.split(':', 1)
                v = v.strip().strip("'").strip('"')
                if v and v != 'null':
                    m = re.search(iso_pat, v)
                    if m: new_lines.append(f"{k}: '{m.group(1)}+08:00'")
                    else: new_lines.append(f"{k}: ''")
                else: new_lines.append(f"{k}: ''")
            else:
                # Keep other fields like id, slug, attachments, source etc.
                new_lines.append(l)
        
        with open(p, 'w', encoding='utf-8') as out:
            out.write('---\n' + '\n'.join(new_lines) + '\n---\n\n' + body)

if __name__ == '__main__':
    run()
