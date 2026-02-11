import os
import re
import json

FIX_DATA = {
    "20260130-ai-15": ["问卷填表", "评优评先"],
    "20260108-ai-05": ["问卷填表", "信息采集"],
    "20251220-ai-41": ["档案团务", "公示名单"],
    "20251218-ai-39": ["讲座培训", "二课学分"],
    "20251217-ai-37": ["思政教育", "红色文化"],
    "20251210-ai-29": ["志愿服务", "公示名单"],
    "20251205-ai-24": ["文艺活动", "十佳歌手"],
    "20251203-ai-20": ["志愿服务", "社会实践"],
    "20251201-ai-18": ["作品征集", "红色文化"],
    "20251201-ai-16": ["文艺活动", "作品征集"],
    "20251129-ai-81": ["毕业就业", "讲座培训"],
    "20251120-ai-75": ["双创大赛", "讲座培训"],
    "20251104-ai-55": ["科研学术", "评优评先"],
    "20251029-ai-42": ["二课学分", "账号管理"],
    "20251028-ai-41": ["制度规范", "讲座培训"],
    "20251022-ai-111": ["校运会", "体育竞赛"],
    "20251021-ai-107": ["思政教育", "红色文化"],
    "20251010-ai-91": ["档案团务", "公示名单"],
    "20250928-ai-08": ["二课学分", "账号管理"],
    "20250928-ai-07": ["体育竞赛", "作品征集"],
    "20250928-ai-06": ["体育竞赛", "作品征集"],
    "20250927-ai-05": ["二课学分", "账号管理"],
    "20250925-ai-04": ["档案团务", "公示名单"],
    "20250925-ai-01": ["校运会", "体育竞赛"],
    "19700102-ai-01": ["制度规范", "账号管理"]
}

def fix_empty_tags():
    card_dir = 'content/card/ai'
    for fid, new_tags in FIX_DATA.items():
        path = os.path.join(card_dir, f"{fid}.md")
        if not os.path.exists(path): continue
        with open(path, 'r', encoding='utf-8') as f: content = f.read()
        pts = re.split(r'^---$', content, flags=re.M)
        if len(pts) < 3: continue
        fm, bd = pts[1].strip(), pts[2].strip()
        tl = f'tags: {json.dumps(new_tags, ensure_ascii=False)}'
        nfm = re.sub(r'tags: \[\]', tl, fm)
        with open(path, 'w', encoding='utf-8') as f_out:
            f_out.write("---\n" + nfm + "\n---\n\n" + bd)

if __name__ == '__main__':
    fix_empty_tags()
