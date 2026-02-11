import os
import re
import json

def get_hard_refined_fields(body):
    # 强制分类逻辑 (优先级最高)
    category = "其它分类"
    if any(k in body for k in ['问卷', '收集表', '统计表', '填报', '登记表', '表格', '在线文档', '汇总表', '报送表', '小程序', '申报材料']):
        category = "问卷填表"
    elif any(k in body for k in ['赛', '挑战杯', '锦标赛', '选拔', '海选', '十佳歌手', '辩论', '大创']):
        category = "竞赛相关"
    elif any(k in body for k in ['志愿者', '支教', '西部计划', '志愿时长']):
        category = "志愿实习"
    elif any(k in body for k in ['培训', '讲座', '沙龙', '讲堂', '艺起来', '活动', '剧本杀', '狼人杀', '鼓圈', '观赛', '分享会']):
        category = "二课活动"
    elif any(k in body for k in ['名单', '公示', '决定', '表彰', '更正', '说明', '截止', '提醒', '通知', '地址', '回应', '提示']):
        category = "通知公告"

    # 标题精炼逻辑
    title = ""
    if any(k in body for k in ['辩论', '新生杯']): title = "全校“新生杯”辩论大赛报名及相关通知"
    elif '武术' in body: title = "第九届武术（套路/散打）锦标赛参赛通知"
    elif '挑战杯' in body: title = "“挑战杯”创业竞赛立项申报及补充材料通知"
    elif '十佳歌手' in body: title = "校园十佳歌手大赛报名及门票领取通知"
    elif '朗诵' in body: title = "“青春筑梦·声动赣鄱”朗诵比赛参赛通知"
    elif '职业规划' in body or '职规' in body: title = "大学生职业生涯规划大赛参赛及选拔通知"
    elif '拔河' in body: title = "“向往杯”拔河比赛参赛组织及名单收集通知"
    elif '创新大赛' in body or '大创' in body: title = "中国国际大学生创新大赛（2026）选拔通知"
    elif '校运会' in body: title = "2025年校运会选拔、看台及口号纪律通知"
    elif '志愿者' in body: title = "青年志愿者注册、管理及优志评选相关通知"
    elif '支教' in body: title = "腾讯数字支教志愿者招募、补贴发放相关通知"
    elif '暖冬' in body: title = "2026年“希望工程·暖冬行动”特别资助申报"
    elif '二课' in body: title = "赣青二课账号管理、系统业务及培训通知"
    elif '学代会' in body or '学生代表' in body: title = "关于学代会代表选举及提案征集相关通知"
    elif '消费维权' in body: title = "“江西省消费维权人物”推荐选拔相关通知"
    elif '办公' in body and '地址' in body: title = "关于学院学生会办公室办公地址变更的说明"
    elif '图书馆' in body and '回应' in body: title = "图书馆关于读者诉求及设施改善的官方回应"
    elif '笔记' in body: title = "“笔记接力，学海同行”备考辅导活动通知"
    
    if not title:
        # 兜底从【...】提取并清洗
        m = re.search(r'[【\[](.*?)[】\]]', body)
        if m:
            title = re.sub(r'\d+月\d+日\s*', '', m.group(1)).strip()
            if len(title) < 4: title += "相关通知"
        else: title = "人工智能学院校园通知"

    # 描述精炼逻辑 (新闻摘要体，去口语)
    clean = re.sub(r'各位.*?：|大家好！?|你们好！?|25级.*?：|请.*?：|@全体成员', '', body).strip()
    clean = re.sub(r'\s+', ' ', clean)
    description = clean[:90] + "..." if len(clean) > 90 else clean

    # 时间提取 (硬核提取 end_at)
    end_at = ""
    # 匹配 YYYY-MM-DD 或具体月份
    if '9月26日14:00' in body: end_at = "2025-09-26T14:00:00+08:00"
    elif '9月26日16:00' in body: end_at = "2025-09-26T16:00:00+08:00"
    elif '9月29日17:00' in body: end_at = "2025-09-29T17:00:00+08:00"
    elif '10月16日' in body: end_at = "2025-10-16T23:59:59+08:00"
    elif '10月8日18:00' in body: end_at = "2025-10-08T18:00:00+08:00"
    elif '10月7日' in body: end_at = "2025-10-07T23:59:59+08:00"
    elif '1月31日17:00' in body: end_at = "2026-01-31T17:00:00+08:00"
    elif '12月25日' in body: end_at = "2025-12-25T23:59:59+08:00"
    elif '1月8日22:00' in body: end_at = "2026-01-08T22:00:00+08:00"
    elif '11月30日18:00' in body: end_at = "2025-11-30T18:00:00+08:00"

    return title, description, category, end_at

def run_final():
    d = 'content/card/ai'
    for f in os.listdir(d):
        if not f.endswith('.md'): continue
        p = os.path.join(d, f)
        with open(p, 'r', encoding='utf-8') as file: c = file.read()
        parts = re.split(r'^---$', c, flags=re.MULTILINE)
        if len(parts) < 3: continue
        fm_block = parts[1].strip()
        body = parts[2].strip()
        
        t, ds, cat, e_at = get_hard_refined_fields(body)
        
        # 核心字段更新，保留物理字段
        lines = fm_block.split('\n')
        new_lines = []
        for l in lines:
            if not l.strip(): continue
            if l.startswith('title:'): new_lines.append(f'title: {json.dumps(t, ensure_ascii=False)}')
            elif l.startswith('description:'): new_lines.append(f'description: {json.dumps(ds, ensure_ascii=False)}')
            elif l.startswith('category:'): new_lines.append(f'category: {json.dumps(cat, ensure_ascii=False)}')
            elif l.startswith('end_at:'): new_lines.append(f"end_at: '{e_at}'")
            elif l.startswith('tags:'):
                tags = ["二课办理"] if "二课" in body else []
                if "志愿者" in body: tags.append("志愿服务")
                if cat != "其它分类": tags.append(cat)
                new_lines.append(f'tags: {json.dumps(tags, ensure_ascii=False)}')
            else: new_lines.append(l)
            
        with open(p, 'w', encoding='utf-8') as out:
            out.write('---\n' + '\n'.join(new_lines) + '\n---\n\n' + body)

if __name__ == '__main__':
    run_final()
