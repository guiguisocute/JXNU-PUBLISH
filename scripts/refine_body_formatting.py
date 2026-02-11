import os
import re

def refine_body_formatting():
    card_dir = 'content/card/ai'
    for f in os.listdir(card_dir):
        if not f.endswith('.md'): continue
        p = os.path.join(card_dir, f)
        with open(p, 'r', encoding='utf-8') as file: c = file.read()
        pts = re.split(r'^---$', c, flags=re.M)
        if len(pts) < 3: continue
        fm, bd = pts[1].strip(), pts[2].strip()
        
        # Replace long spaces with newline
        bd = re.sub(r' {4,}', '\n\n', bd)
        
        # Add spacing before common list/key items
        kws = [
            (r'([一二三四五]、)', r'\n\n\1'),
            (r'(\d+[、\.])', r'\n\n\1'),
            (r'(注：)', r'\n\n\1'),
            (r'(如有疑问)', r'\n\n\1'),
            (r'(【.*?】)', r'\n\n\1'),
            (r'(!\[.*?\]\(.*?\))', r'\n\n\1\n\n')
        ]
        for pat, repl in kws: bd = re.sub(pat, repl, bd)
        
        bd = re.sub(r'\n{3,}', '\n\n', bd).strip()
        with open(p, 'w', encoding='utf-8') as fo:
            fo.write("---\n" + fm + "\n---\n\n" + bd + "\n")

if __name__ == '__main__':
    refine_body_formatting()
