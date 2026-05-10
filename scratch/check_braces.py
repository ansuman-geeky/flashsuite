import os

def check_braces(filepath):
    if not os.path.exists(filepath):
        print(f"File {filepath} not found")
        return
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    open_braces = content.count('{')
    close_braces = content.count('}')
    
    print(f"File: {filepath}")
    print(f"Open: {open_braces}")
    print(f"Close: {close_braces}")
    if open_braces != close_braces:
        print("!!! UNBALANCED BRACES !!!")

check_braces('public/styles.css')
check_braces('public/index.html')
check_braces('public/admin.html')
