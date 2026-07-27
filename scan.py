src = open("app.js", "r", encoding="utf-8").read()
# Strip the IIFE wrapper so leftover opens reveal the missing-`}` block
idx = src.find("(function(){")
if idx != -1:
    src = src[:idx] + src[idx + len("(function(){"):]
ridx = src.rfind("})();")
if ridx != -1:
    src = src[:ridx] + src[ridx + len("})();"):]

i = 0
n = len(src)
line = 1
# context stack: each entry is (kind, openchar, line)
# kinds: code, tmpl, str1, str2, line, block
stack = [("code", None, 0)]
opens = {"(": ")", "{": "}", "[": "]"}
close_to_open = {")": "(", "]": "[", "}": "{"}
BS = chr(92)

def top():
    return stack[-1]

while i < n:
    c = src[i]
    nxt = src[i + 1] if i + 1 < n else ""
    if c == "\n":
        line += 1
    k = top()[0]
    if k == "code":
        if c == "/" and nxt == "/":
            stack.append(("line", None, line)); i += 1; continue
        if c == "/" and nxt == "*":
            stack.append(("block", None, line)); i += 1; continue
        if c == '"':
            stack.append(("str1", None, line)); i += 1; continue
        if c == "'":
            stack.append(("str2", None, line)); i += 1; continue
        if c == "`":
            stack.append(("tmpl", None, line)); i += 1; continue
        if c in ("(", "[", "{"):
            stack.append(("code", c, line)); i += 1; continue
        if c in (")", "]", "}"):
            if top()[0] == "code" and top()[1] == close_to_open.get(c):
                stack.pop()
            else:
                print("WARN mismatch close", repr(c), "at line", line, "top:", top())
            i += 1; continue
        i += 1; continue
    elif k == "tmpl":
        if c == BS:
            i += 2; continue
        if c == "`":
            stack.pop(); i += 1; continue
        if c == "$" and nxt == "{":
            stack.append(("code", "{", line)); i += 2; continue
        i += 1; continue
    elif k == "str1":
        if c == BS:
            i += 2; continue
        if c == '"':
            stack.pop()
        i += 1; continue
    elif k == "str2":
        if c == BS:
            i += 2; continue
        if c == "'":
            stack.pop()
        i += 1; continue
    elif k == "line":
        if c == "\n":
            stack.pop()
        i += 1; continue
    elif k == "block":
        if c == "*" and nxt == "/":
            stack.pop(); i += 2; continue
        i += 1; continue

print("SCAN COMPLETE. Remaining context stack:")
if len(stack) == 1 and stack[0][0] == "code":
    print("  (balanced)")
else:
    for entry in stack:
        print("  ", entry)
