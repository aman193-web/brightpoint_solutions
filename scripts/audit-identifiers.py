#!/usr/bin/env python3
"""
Catch what the build cannot.

This project has no tsconfig and no TypeScript installed, so `vite build` strips
type syntax without ever resolving an identifier: a JSX tag with no import, a
constant that was never imported, a prop declared in the type but missing from the
destructure — all compile clean and throw in the browser. Every one of those has
shipped here at least once.

Two checks:
  1. UNRESOLVED       — a JSX tag or SCREAMING_CASE constant that is neither
                        imported nor declared in the file.
  2. NOT-DESTRUCTURED — a prop in a component's type that the body uses but the
                        parameter list never unpacked. This is the one that blanks
                        a whole screen with `x is not defined`.

Comments are stripped before scanning. Without that, a comment ending in a
keyword ("…ordering by type") lets the declaration regex capture the *next*
line's `const` and skip the real name, which both hides real declarations and
invents failures.
"""
import re, sys, pathlib, glob

KNOWN = {
    'React', 'Set', 'Map', 'Record', 'Partial', 'Omit', 'Pick', 'Array', 'Promise',
    'CSSProperties', 'ReactNode', 'ElementType', 'MouseEvent', 'DragEvent',
    'FormEvent', 'ChangeEvent', 'KeyboardEvent', 'PointerEvent', 'WheelEvent',
}

def strip_comments(s: str) -> str:
    """Blank out comments and string bodies, preserving line structure."""
    out, i, n = [], 0, len(s)
    while i < n:
        two = s[i:i + 2]
        if two == '//':
            j = s.find('\n', i)
            j = n if j < 0 else j
            out.append(' ' * (j - i)); i = j
        elif two == '/*':
            j = s.find('*/', i + 2)
            j = n if j < 0 else j + 2
            out.append(''.join(c if c == '\n' else ' ' for c in s[i:j])); i = j
        elif s[i] in '"\'`':
            q, j = s[i], i + 1
            while j < n and s[j] != q:
                j += 2 if s[j] == '\\' else 1
            j = min(j + 1, n)
            out.append(''.join(c if c == '\n' else ' ' for c in s[i:j])); i = j
        else:
            out.append(s[i]); i += 1
    return ''.join(out)

def matching_brace(s: str, open_idx: int) -> int:
    depth = 0
    for k in range(open_idx, len(s)):
        if s[k] == '{': depth += 1
        elif s[k] == '}':
            depth -= 1
            if depth == 0: return k
    return len(s)

def audit(path: str) -> list[str]:
    raw = pathlib.Path(path).read_text()
    s = strip_comments(raw)
    problems = []

    names = set(KNOWN)
    for m in re.finditer(r'import\s+(?:type\s+)?(?:(\w+)\s*,\s*)?\{([^}]*)\}\s+from', s, re.S):
        if m.group(1): names.add(m.group(1))
        names.update(p.strip().split(' as ')[-1].strip() for p in m.group(2).split(',') if p.strip())
    names.update(re.findall(r'import\s+(\w+)\s+from', s))
    names.update(re.findall(r'import\s+\*\s+as\s+(\w+)\s+from', s))   # namespace imports
    names.update(re.findall(r'\b(?:const|let|var|function|class|type|interface|enum)\s+([A-Za-z_$][\w$]*)', s))
    for grp in re.findall(r'(?:const|let)\s*\{([^}]*)\}', s):
        for x in grp.split(','):
            x = x.strip().split('=')[0].strip()
            if not x: continue
            names.add(x.split(':')[0].strip())
            names.add(x.split(':')[-1].strip())   # `icon: Icon` binds Icon
    names.update(x for pair in re.findall(r'(?:const|let)\s*\[\s*([\w$]+)\s*,\s*([\w$]+)\s*\]', s) for x in pair)
    # generics: <T,>, <T extends …>, and function type params
    names.update(re.findall(r'<\s*([A-Z]\w*)\s*(?:extends|,|>)', s))
    # dom/lib types used in type position only
    names.update(re.findall(r'\b(HTML\w+Element|SVG\w+Element)\b', s))
    # destructured function params and .map(({a, b}) => …)
    for grp in re.findall(r'\(\s*\{([^}]*)\}', s):
        for x in grp.split(','):
            x = x.strip().split('=')[0].strip()
            if not x: continue
            names.add(x.split(':')[0].strip())
            names.add(x.split(':')[-1].strip())

    # array destructuring of any arity: ([m, Icon, title]) => …
    for grp in re.findall(r'\[\s*([A-Za-z_$][\w$,\s]*)\]\s*(?:=>|\)|=)', s):
        names.update(x.strip() for x in grp.split(',') if x.strip().isidentifier())

    tags = {t.split('.')[0] for t in re.findall(r'<([A-Z][\w.]*)', s)}
    # `(?<!\.)` so a member access (Number.MAX_SAFE_INTEGER) is not read as a
    # free identifier that ought to have been imported.
    consts = {c for c in re.findall(r'(?<![\w.$])([A-Z][A-Z0-9_]{3,})\b', s) if '_' in c}
    for miss in sorted((tags | consts) - names):
        problems.append(f'UNRESOLVED       {path}: {miss}')

    for m in re.finditer(r'function\s+(\w+)\s*\(\s*\{([^}]*)\}\s*:\s*\{', s):
        comp, dest = m.group(1), m.group(2)
        unpacked = {x.strip().split(':')[0].split('=')[0].strip() for x in dest.split(',') if x.strip()}
        tclose = matching_brace(s, m.end() - 1)
        declared = set(re.findall(r'^\s*([\w$]+)\??\s*:', s[m.end():tclose], re.M))
        bopen = s.find('{', tclose)
        body = s[bopen:matching_brace(s, bopen)] if bopen > 0 else ''
        for prop in sorted(declared - unpacked):
            if re.search(r'(?<![\w.$])' + re.escape(prop) + r'(?![\w$])', body):
                problems.append(f'NOT-DESTRUCTURED {path} {comp}: {prop}')
    return problems

targets = sys.argv[1:] or (
    glob.glob('src/app/**/*.tsx', recursive=True) + glob.glob('src/app/**/*.ts', recursive=True)
)
found = [p for f in sorted(targets) if 'components/ui/' not in f for p in audit(f)]
print('\n'.join(found) if found else 'clean')
print(f'--- {len(found)} problem(s) across {len(targets)} file(s)')
sys.exit(1 if found else 0)
