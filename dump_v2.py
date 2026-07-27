import xlrd, json, os, sys, shutil

BASE = r"E:\Made Games\预写方案\自研备选\[社交收集、休闲]车行项目（99%）"
OUT = r"C:\Users\Administrator\WorkBuddy\2026-07-23-12-28-02\dump_v2"
os.makedirs(OUT, exist_ok=True)

def dump_sheet(wb, si, prefix):
    sh = wb.sheet_by_index(si)
    rows = sh.nrows
    cols = sh.ncols
    fname = os.path.join(OUT, f"{prefix}_{sh.name.replace('/','_')}.txt")
    with open(fname, 'w', encoding='utf-8') as f:
        f.write(f"=== Sheet: {sh.name} | rows={rows} cols={cols} ===\n\n")
        for r in range(rows):
            vals = []
            for c in range(cols):
                cell = sh.cell(r, c)
                v = cell.value
                if cell.ctype == 2 and isinstance(v, float):
                    if v == int(v):
                        v = str(int(v))
                    else:
                        v = f"{v:.4f}"
                else:
                    v = str(v).strip()
                vals.append(v)
            line = "\t".join(vals)
            f.write(line + "\n")
    print(f"  wrote {fname} ({rows} rows)")

# UI doc
wb = xlrd.open_workbook(os.path.join(BASE, "UI交互说明.xls"), on_demand=True)
print(f"UI sheets: {wb.nsheets}")
for i in range(wb.nsheets):
    dump_sheet(wb, i, "ui")
wb.release_resources()

# Config
wb2 = xlrd.open_workbook(os.path.join(BASE, "相关配置.xls"), on_demand=True)
print(f"\nConfig sheets: {wb2.nsheets}")
for i in range(wb2.nsheets):
    dump_sheet(wb2, i, "config")
wb2.release_resources()

print("\nDone!")
