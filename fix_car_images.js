// fix_car_images.js — 批量更新车辆图片引用
// 用法: node fix_car_images.js [game_data.js路径]
// 功能: 将 game_data.js 中指定车辆的 image 字段更新为新的图片文件名
//
// 使用方法:
//   1. 先运行 node extract_cars.js > report.txt 查看完整报告
//   2. 根据报告确定需要修改的车辆
//   3. 在下方 IMAGE_MAP 中添加/修改映射关系
//   4. 运行本脚本应用修改
//   5. 备份原文件会自动保存为 game_data.js.backup

const fs = require('fs');
const path = require('path');

const file = process.argv[2] || 'game_data.js';

// ========== 图片映射表: carId -> 新图片文件名 ==========
// 格式: "车辆ID": "新图片文件名(相对于 assets/cars/)"
// 添加需要修正的车辆到这里:
const IMAGE_MAP = {
  // 火神系列 - 阿斯顿·马丁 Vulcan 三色变体
  "9":  "Aston_Martin_Vulcan_supercar_i_2026-07-24T02-10-08.png",  // 层云白 (白色)
  "10": "Aston_Martin_Vulcan_supercar_i_2026-07-24T02-11-14.png",  // 苹果绿 (绿色)
  // 注意: ID 8 (火焰红) 保持原有 car_08.png (红色 ✓)

  // 五菱宏光S - 初始车辆
  // "83": "Wuling_Hongguang_S__五菱宏光S___si_2026-07-24T02-26-23.png",

  // 在此添加更多需要修正的车辆...
};

// ============================================================

console.log('=== 车辆图片引用批量更新工具 ===\n');

if (!fs.existsSync(file)) { console.error('错误: 找不到文件 ' + file); process.exit(1); }

const raw = fs.readFileSync(file, 'utf8');
const start = raw.indexOf('{');
if (start < 0) { console.error('错误: 文件中未找到 JSON'); process.exit(1); }

// 备份
const backupFile = file + '.backup';
fs.writeFileSync(backupFile, raw, 'utf8');
console.log('✓ 已备份原文件到: ' + backupFile);

const data = JSON.parse(raw.slice(start));
const cars = data.cars || [];
let changed = 0;
let notFound = [];

for (const [idStr, newImage] of Object.entries(IMAGE_MAP)) {
  const id = parseInt(idStr);
  const car = cars.find(c => c.id === id);
  if (!car) { notFound.push(id); continue; }
  const oldImage = car.image;
  if (oldImage === newImage) { console.log(`  #${id} ${car.name}: 未变化 (${newImage})`); continue; }
  car.image = newImage;
  changed++;
  console.log(`  #${id} ${car.name}: ${oldImage} → ${newImage}`);
}

// 写回 (保持原有的 window.GAME_DATA = 格式)
const output = raw.slice(0, start) + JSON.stringify(data, null, 0);
fs.writeFileSync(file, output, 'utf8');

console.log('\n--- 结果 ---');
console.log(`已更新: ${changed} 辆车`);
if (notFound.length) console.log(`未找到ID: ${notFound.join(', ')}`);
console.log(`总车辆数: ${cars.length}`);
console.log('\n✓ 完成! 原文件已备份到 ' + backupFile);
