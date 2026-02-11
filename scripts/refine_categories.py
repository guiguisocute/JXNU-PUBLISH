import os
import re
import json

def merge_and_fix():
    card_dir = 'content/card/ai'
    
    def get_content(fid):
        p = os.path.join(card_dir, f"{fid}.md")
        if not os.path.exists(p): return None
        with open(p, 'r', encoding='utf-8') as f: return f.read()

    def update_card(fid, new_content):
        p = os.path.join(card_dir, f"{fid}.md")
        with open(p, 'w', encoding='utf-8') as f: f.write(new_content)

    def extract_fm_body(content):
        parts = re.split(r'^---$', content, flags=re.MULTILINE)
        if len(parts) < 3: return None, None
        return parts[1].strip(), parts[2].strip()

    # 1. 20251117-ai-74 -> 72
    c72 = get_content('20251117-ai-72')
    c74 = get_content('20251117-ai-74')
    if c72 and c74:
        fm72, b72 = extract_fm_body(c72)
        _, b74 = extract_fm_body(c74)
        new_b = b72 + "\n\n【补充通知】\n" + b74
        new_fm = fm72.replace("published: '2025-11-17T09:53:42+08:00'", "published: '2025-11-17T10:54:59+08:00'")
        update_card('20251117-ai-72', f"---\n{new_fm}\n---\n\n{new_b}")

    # 2. 20251111-ai-69 -> 20251104-ai-56
    c56 = get_content('20251104-ai-56')
    c69 = get_content('20251111-ai-69')
    if c56 and c69:
        fm56, b56 = extract_fm_body(c56)
        _, b69 = extract_fm_body(c69)
        new_b = b56 + "\n\n【补充通知】\n" + b69
        new_fm = fm56.replace("published: '2025-11-04T11:52:57+08:00'", "published: '2025-11-11T22:12:27+08:00'")
        new_fm = new_fm.replace("end_at: '2025-11-12T18:00:00+08:00'", "end_at: '2025-11-14T17:00:00+08:00'")
        update_card('20251104-ai-56', f"---\n{new_fm}\n---\n\n{new_b}")

    # 3. 20251106-ai-62 -> 20251105-ai-60
    c60 = get_content('20251105-ai-60')
    c62 = get_content('20251106-ai-62')
    if c60 and c62:
        fm60, b60 = extract_fm_body(c60)
        _, b62 = extract_fm_body(c62)
        new_b = b60 + "\n\n【重要更正】\n" + b62
        new_fm = fm60.replace("published: '2025-11-05T21:57:31+08:00'", "published: '2025-11-06T08:18:42+08:00'")
        update_card('20251105-ai-60', f"---\n{new_fm}\n---\n\n{new_b}")

    # 4. 20251104-ai-58 -> 57
    c57 = get_content('20251104-ai-57')
    c58 = get_content('20251104-ai-58')
    if c57 and c58:
        fm57, b57 = extract_fm_body(c57)
        _, b58 = extract_fm_body(c58)
        new_b = b57 + "\n\n【补充说明】\n" + b58
        new_fm = fm57.replace("published: '2025-11-04T16:14:05+08:00'", "published: '2025-11-04T16:31:25+08:00'")
        update_card('20251104-ai-57', f"---\n{new_fm}\n---\n\n{new_b}")

    # 5. 20251028-ai-40 -> 123
    c123 = get_content('20251028-ai-123')
    c40 = get_content('20251028-ai-40')
    if c123 and c40:
        fm123, b123 = extract_fm_body(c123)
        _, b40 = extract_fm_body(c40)
        new_b = b123 + "\n\n【补充通知】\n" + b40
        new_fm = fm123.replace("published: '2025-10-28T18:54:59+08:00'", "published: '2025-10-28T20:19:51+08:00'")
        update_card('20251028-ai-123', f"---\n{new_fm}\n---\n\n{new_b}")

    # 6. 20251027-ai-37 -> 14-98
    c98 = get_content('20251014-ai-98')
    c37 = get_content('20251027-ai-37')
    if c98 and c37:
        fm98, b98 = extract_fm_body(c98)
        _, b37 = extract_fm_body(c37)
        new_b = b98 + "\n\n【延期通知】\n" + b37
        new_fm = fm98.replace("published: '2025-10-14T22:50:02+08:00'", "published: '2025-10-27T22:07:14+08:00'")
        new_fm = new_fm.replace("start_at: '2025-11-15T09:00:00+08:00'", "start_at: '2025-11-15T09:00:00+08:00'") # Keep late start
        update_card('20251014-ai-98', f"---\n{new_fm}\n---\n\n{new_b}")

    # 7. 20251027-ai-36 -> 119
    c119 = get_content('20251027-ai-119')
    c36 = get_content('20251027-ai-36')
    if c119 and c36:
        fm119, b119 = extract_fm_body(c119)
        _, b36 = extract_fm_body(c36)
        new_b = b119 + "\n\n【补充规范】\n" + b36
        new_fm = fm119.replace("published: '2025-10-27T14:07:15+08:00'", "published: '2025-10-27T19:48:41+08:00'")
        update_card('20251027-ai-119', f"---\n{new_fm}\n---\n\n{new_b}")

    # 8. 20251025-ai-33 -> 116
    c116 = get_content('20251025-ai-116')
    c33 = get_content('20251025-ai-33')
    if c116 and c33:
        fm116, b116 = extract_fm_body(c116)
        _, b33 = extract_fm_body(c33)
        new_b = b116 + "\n\n【补充通知】\n" + b33
        new_fm = fm116.replace("published: '2025-10-25T12:11:19+08:00'", "published: '2025-10-25T21:05:13+08:00'")
        update_card('20251025-ai-116', f"---\n{new_fm}\n---\n\n{new_b}")

    # 9. 20251022-ai-30 -> 112
    c112 = get_content('20251022-ai-112')
    c30 = get_content('20251022-ai-30')
    if c112 and c30:
        fm112, b112 = extract_fm_body(c112)
        _, b30 = extract_fm_body(c30)
        new_b = b112 + "\n\n【负责人联系群】\n" + b30
        new_fm = fm112.replace("published: '2025-10-22T12:51:55+08:00'", "published: '2025-10-22T21:57:15+08:00'")
        update_card('20251022-ai-112', f"---\n{new_fm}\n---\n\n{new_b}")

    # 10. 20251021-ai-27 -> 108
    c108 = get_content('20251021-ai-108')
    c27 = get_content('20251021-ai-27')
    if c108 and c27:
        fm108, b108 = extract_fm_body(c108)
        _, b27 = extract_fm_body(c27)
        new_b = b108 + "\n\n【观赛时间提醒】\n" + b27
        new_fm = fm108.replace("published: '2025-10-21T22:33:03+08:00'", "published: '2025-10-21T23:18:53+08:00'")
        update_card('20251021-ai-108', f"---\n{new_fm}\n---\n\n{new_b}")

    # 11. 20251020-ai-106 -> 104
    c104 = get_content('20251020-ai-104')
    c106 = get_content('20251020-ai-106')
    if c104 and c106:
        fm104, b104 = extract_fm_body(c104)
        _, b106 = extract_fm_body(c106)
        new_b = b104 + "\n\n【地点更正】\n" + b106
        new_fm = fm104.replace("published: '2025-10-20T17:43:35+08:00'", "published: '2025-10-20T21:05:59+08:00'")
        update_card('20251020-ai-104', f"---\n{new_fm}\n---\n\n{new_b}")

    # 12. 20251017-ai-103 -> 14-99
    c99 = get_content('20251014-ai-99')
    c103 = get_content('20251017-ai-103')
    if c99 and c103:
        fm99, b99 = extract_fm_body(c99)
        _, b103 = extract_fm_body(c103)
        new_b = b99 + "\n\n【25级硬性要求】\n" + b103
        new_fm = fm99.replace("published: '2025-10-14T22:53:17+08:00'", "published: '2025-10-17T18:22:02+08:00'")
        new_fm = new_fm.replace("end_at: '2025-10-16T12:00:00+08:00'", "end_at: '2025-10-20T20:00:00+08:00'")
        update_card('20251014-ai-99', f"---\n{new_fm}\n---\n\n{new_b}")

    # 13. 20251016-ai-102 -> 15-100
    c100 = get_content('20251015-ai-100')
    c102 = get_content('20251016-ai-102')
    if c100 and c102:
        fm100, b100 = extract_fm_body(c100)
        _, b102 = extract_fm_body(c102)
        new_b = b100 + "\n\n【报名延期】\n" + b102
        new_fm = fm100.replace("published: '2025-10-15T07:56:01+08:00'", "published: '2025-10-16T12:31:31+08:00'")
        new_fm = new_fm.replace("end_at: '2025-10-16T12:00:00+08:00'", "end_at: '2025-10-17T12:00:00+08:00'")
        update_card('20251015-ai-100', f"---\n{new_fm}\n---\n\n{new_b}")

    # 14. 20251015-ai-19 -> 14-95
    c95 = get_content('20251014-ai-95')
    c19 = get_content('20251015-ai-19')
    if c95 and c19:
        fm95, b95 = extract_fm_body(c95)
        _, b19 = extract_fm_body(c19)
        new_b = b95 + "\n\n【时间更正】\n" + b19
        new_fm = fm95.replace("published: '2025-10-14T14:02:03+08:00'", "published: '2025-10-15T15:30:02+08:00'")
        update_card('20251014-ai-95', f"---\n{new_fm}\n---\n\n{new_b}")

    # 15. 20251104-ai-55 (Link update)
    c55 = get_content('20251104-ai-55')
    if c55:
        fm55, b55 = extract_fm_body(c55)
        new_b = b55 + "\n\n[评选启事详情](https://mp.weixin.qq.com/s?__biz=MzkwNDU4NDIyNg==&mid=2247487253&idx=1&sn=fb103d6e5a05b2c0f242bdac68d4db9e&chksm=c1a49873406af1bab4114358e180478fd31ef9e58e8ccd4ab6ccec5fa41457258fac161fe8e0&mpshare=1&scene=23&srcid=1102u8t7rqJUr4fL4k8aA0eB&sharer_shareinfo=caa686d90a8ca0c29e3993880cc037da&sharer_shareinfo_first=71ed7bb851852ebde63dd2f9ead163bd#rd)"
        update_card('20251104-ai-55', f"---\n{fm55}\n---\n\n{new_b}")

    # 16. 20251010-ai-94 (Link update)
    c94 = get_content('20251010-ai-94')
    if c94:
        fm94, b94 = extract_fm_body(c94)
        new_b = b94 + "\n\n[微信公众平台详情](https://mp.weixin.qq.com/s?__biz=Mzg2NTg1MDc3MQ==&mid=2247499534&idx=1&sn=01f5f54300881f6b86c1ea323a05edb6&chksm=cff0e830587230906eca665cb504a4b5172cc1b7bcf9e0318478e3f37e57026be53e76b6952a&mpshare=1&scene=23&srcid=1010aQi81xRNSjkVoeA8hHtH&sharer_shareinfo=c62c0038cb691ab6ae81be6a31650090&sharer_shareinfo_first=fbaf925dab0a2052a1244f9d15050e91#rd)"
        update_card('20251010-ai-94', f"---\n{fm94}\n---\n\n{new_b}")

    # 17. 20251010-ai-93 (Link update)
    c93 = get_content('20251010-ai-93')
    if c93:
        fm93, b93 = extract_fm_body(c93)
        new_b = b93 + "\n\n[二课学分轻松获取指南](https://mp.weixin.qq.com/s?__biz=MjM5NjY0MDA0NA==&mid=2884162064&idx=1&sn=55f37bd987fb9031a463db3ca59eb5f7&chksm=89554fc6c6f5a8074a7cf6b80e269412767d2b9180935525efc387d4c1d08a8452d0d75a3968&mpshare=1&scene=23&srcid=10091OnPNZw964cKWIhJfqeE&sharer_shareinfo=8f30195ade13e83fcdd70f09d28dbd35&sharer_shareinfo_first=150e71e1fbc7cd2b5348ae0c0512c539&qq_aio_chat_type=3#rd)"
        update_card('20251010-ai-93', f"---\n{fm93}\n---\n\n{new_b}")

    # 18. 20251009-ai-87 -> 86
    c86 = get_content('20251009-ai-86')
    c87 = get_content('20251009-ai-87')
    if c86 and c87:
        fm86, b86 = extract_fm_body(c86)
        _, b87 = extract_fm_body(c87)
        new_b = b86 + "\n\n【补充通知】\n" + b87
        new_fm = fm86.replace("published: '2025-10-09T21:54:55+08:00'", "published: '2025-10-09T22:28:54+08:00'")
        update_card('20251009-ai-86', f"---\n{new_fm}\n---\n\n{new_b}")

    # 19. Fix missing descriptions for legacy cards
    fixes = {
        '20251029-ai-42': "关于学生日常管理规范及违纪预警的提醒。请全体同学务必遵守校规校纪，诚信考试、安全出行。如有异常情况请及时向辅导员及班委反馈。",
        '20251028-ai-41': "开展25级各班二课制度专题培训。请团支书认真组织，留存培训PPT及现场照片，并于10月31日前发送至邮箱2650986131@qq.com进行考核。",
        '20250930-ai-10': "“许梦亭”“鹏霄轩”自习室管理志愿者招募开始。报名时间10月2日至7日。欢迎同学们积极参与志愿服务，共同维护校园良好学习秩序与环境。",
        '20250929-ai-09': "第15届“挑战杯”创业竞赛立项申报材料补交提醒。请相关团队于10月8日18:00前提交电子版及汇总表至指定邮箱并扫码进通知群对接。",
        '20250928-ai-08': "【紧急】二课系统25级新生及变动同学信息重填通知。因系统导入规则调整，请各班于9月29日17:00前按最新模板汇总信息并重新报送。",
        '20250928-ai-07': "第九届武术散打锦标赛参赛报名及保险申报通知。电子报名截止10月16日。参赛者必须自行购买意外保险，10月21日进行现场检录称重。",
        '20250928-ai-06': "第九届武术（套路）锦标赛报名通知。前八名颁发证书奖牌并计综测分。请各班级于10月16日前汇总名单发至邮箱并扫码加入赛事交流群。",
        '20250927-ai-05': "25级新生及24级学生二课信息采集通知。涵盖账号创建及转专业变动修改。请班长于9月29日17:00前按模版汇总表格并发送至指定邮箱。",
        '20250925-ai-04': "2025年第二期入团名单公示及“青蓝之星”表彰决定发布。涵盖表彰2024-2025学年优秀学员名单。详情请查阅附件通知文件。",
        '20250925-ai-03': "转发省青基会关于招募腾讯数字支教志愿者的动员说明。请各班级积极组织转发并动员报名。如有疑问联系学院青协负责人杨凯杰。",
        '20250925-ai-02': "“红色家书里的家国情怀”沉浸式剧本杀活动通知。25级每班派2人参加。请班委于9月26日16:00前发名单至邮箱并通知同学准时参加。",
        '20250925-ai-01': "2025年秋季校运会运动员选拔及训练激励通知。参与训练队出勤可获3-6分综测奖励并可与赛事奖项叠算。请有意者于9月26日前报送名单。"
    }
    
    for fid, desc in fixes.items():
        content = get_content(fid)
        if content:
            fm, body = extract_fm_body(content)
            new_fm = re.sub(r'description: ".*?"', f'description: "{desc}"', fm)
            update_card(fid, f"---\n{new_fm}\n---\n\n{body}")

if __name__ == '__main__':
    merge_and_fix()
