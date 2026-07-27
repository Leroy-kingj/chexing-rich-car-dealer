const fs = require("fs");
const acorn = require("acorn");
const src = fs.readFileSync("app.js", "utf8");
try {
  acorn.parse(src, { ecmaVersion: "latest", sourceType: "script", allowReturnOutsideFunction: true, locations: true });
  console.log("PARSE OK");
} catch (e) {
  console.log("PARSE ERROR:", e.message);
  if (e.loc) {
    const { line, column } = e.loc;
    console.log("at line", line, "col", column);
    const lines = src.split("\n");
    const from = Math.max(0, line - 3);
    const to = Math.min(lines.length, line + 2);
    for (let i = from; i < to; i++) {
      console.log((i + 1) + ": " + lines[i]);
    }
  }
}
