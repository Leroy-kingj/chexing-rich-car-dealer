const fs = require('fs');
const s0 = fs.readFileSync('game_data.js', 'utf8');
const map = {
  '初入车行': 0,
  '拥抱财富': 500000,
  '显露身手': 1500000,
  '称霸赛场': 8000000,
  '突破桎梏': 24000000,
  '我的世界': 60000000
};
let s = s0;
let count = 0;
for (const [name, val] of Object.entries(map)) {
  // 转义正则特殊字符
  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp('"name": "' + esc + '"');
  if (re.test(s)) {
    s = s.replace(re, '"assetReq": ' + val + ', "name": "' + name + '"');
    count++;
  } else {
    console.log('NOT FOUND:', name);
  }
}
fs.writeFileSync('game_data.js', s);
console.log('patched', count, 'chapters');
