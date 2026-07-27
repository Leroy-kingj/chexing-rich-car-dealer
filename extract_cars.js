// extract_cars.js — 车辆素材分析工具
// 用法: node extract_cars.js [game_data.js路径]
// 输出: 全部88辆车清单 + 按图片分组 + 颜色冲突标记 + 自定义图片清单
const fs = require('fs');
const file = process.argv[2] || 'game_data.js';
const raw = fs.readFileSync(file, 'utf8');
const start = raw.indexOf('{');
if (start < 0) { console.error('未找到 JSON 起始 {'); process.exit(1); }
const data = JSON.parse(raw.slice(start));
const cars = data.cars || [];
const list = cars.map(c => ({ id:c.id, name:c.name, brand:c.brand, rating:c.rating, image:c.image }));
const COLOR_KW = ['红','赤','朱','绯','焰','白','银','雪','云','霜','绿','翠','碧','翡翠','蓝','青','靛','蔚','黑','墨','碳','暗','夜','影','金','黄','香槟','橙','橘','琥珀','紫','罗兰','灰','钛','石墨','粉','玫瑰'];
const colorsOf = (name) => COLOR_KW.filter(c => name.includes(c));
const byImage = {};
for (const car of list) { (byImage[car.image] = byImage[car.image] || []).push(car); }
const customImages = Object.keys(byImage).filter(img => !/^car_\d+\.png$/i.test(img));
const flagged = [];
for (const [img, group] of Object.entries(byImage)) {
  if (group.length < 2) continue;
  const sets = group.map(c => colorsOf(c.name).join('|'));
  if (new Set(sets).size > 1) flagged.push({image: img, cars: group.map(c=>({id:c.id,name:c.name,colors:colorsOf(c.name)}))});
}
const pad=(s,n)=>String(s).padEnd(n,' ');
console.log('================ 全部车辆 ('+list.length+' 辆) ================');
for (const c of list) console.log('#'+pad(c.id,4)+' '+pad(c.name,20)+' '+pad(c.brand,14)+' '+pad(c.rating,3)+' '+c.image);
console.log('\n================ 按 image 分组 ================');
for (const [img,group] of Object.entries(byImage)) {
  console.log('\n['+img'] -> '+group.length+' 辆');
  for (const c of group) { const cs=colorsOf(c.name).join(','); console.log('   #'+c.id+' '+c.name+' ('+c.brand+', '+c.rating+')'+(cs?'  [色:'+cs+]':'')); }
}
console.log('\n================ 自定义图片 (不在 car_01..car_47) ================');
if (!customImages.length) console.log('  (无)');
else customImages.forEach(i=>{ console.log('  '+i); byImage[i].forEach(c=>console.log('    #'+c.id+' '+c.name)); });
console.log('\n================ 标记: 同图但车名颜色不同 (需生成新图) ================');
if (!flagged.length) console.log('  (无)');
else flagged.forEach(f=>{ console.log('\n  image: '+f.image); f.cars.forEach(c=>console.log('    #'+c.id+' '+c.name+'  颜色=['+c.colors.join(',')+']')); });
console.log('\n================ 汇总统计 ================');
console.log('总车辆: '+list.length);
console.log('唯一图片: '+Object.keys(byImage).length);
console.log('颜色冲突组: '+flagged.length+' (涉及'+flagged.reduce((s,f)=>s+f.cars.length,0)+' 辆车)');
console.log('自定义图片: '+customImages.length+' 个');
