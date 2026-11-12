// 仅使用 Node 内置模块生成原创 A / 波形 PNG 图标。
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
function crc32(b) {
  let c = 0xffffffff;
  for (const n of b) {
    c ^= n;
    for (let j = 0; j < 8; j++) c = c >>> 1 ^ (c & 1 ? 0xedb88320 : 0);
  }
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const t = Buffer.from(type),
    len = Buffer.alloc(4),
    crc = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}
function distance(x, y, a, b, c, d) {
  const dx = c - a,
    dy = d - b,
    t = Math.max(0, Math.min(1, ((x - a) * dx + (y - b) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(x - a - t * dx, y - b - t * dy);
}
for (const size of [180, 192, 512]) {
  const data = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const px = x / size * 512,
        py = y / size * 512,
        idx = y * (size * 4 + 1) + 1 + x * 4;
      let rgb = [53, 24, 33];
      if (Math.abs(Math.hypot(px - 256, py - 256) - 174) < 1.5) rgb = [117, 65, 78];
      if ([[151, 347, 256, 147], [256, 147, 361, 347], [190, 285, 322, 285]].some(l => distance(px, py, ...l) < 7)) rgb = [233, 185, 194];
      if (py > 250 && py < 255 && px > 115 && px < 397) rgb = [172, 92, 112];
      data.set([...rgb, 255], idx);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(data)),
    chunk('IEND', Buffer.alloc(0))
  ]);
  writeFileSync(new URL(size === 180 ? 'apple-touch-icon.png' : `icon-${size}.png`, import.meta.url), png);
}
