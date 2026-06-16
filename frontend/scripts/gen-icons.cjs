// One-off placeholder-icon generator. Produces valid PNGs (solid Influero-violet
// tile with a centered white rounded square) so the PWA manifest + apple-touch
// icons resolve. Dependency-free (Node's zlib only). Replace the output with
// real brand artwork later. Run: node scripts/gen-icons.cjs
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const ACCENT = [110, 86, 245]; // #6e56f5
const WHITE = [255, 255, 255];

const crcTable = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const body = Buffer.concat([typeBuf, data]);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function makePng(size) {
  const mark = Math.round(size * 0.56);
  const offset = Math.round((size - mark) / 2);
  const radius = Math.round(mark * 0.22);

  const inMark = (x, y) => {
    const lx = x - offset;
    const ly = y - offset;
    if (lx < 0 || ly < 0 || lx >= mark || ly >= mark) return false;
    // rounded corners
    const rx = Math.min(lx, mark - 1 - lx);
    const ry = Math.min(ly, mark - 1 - ly);
    if (rx < radius && ry < radius) {
      const dx = radius - rx;
      const dy = radius - ry;
      return dx * dx + dy * dy <= radius * radius;
    }
    return true;
  };

  const raw = Buffer.alloc((size * 4 + 1) * size);
  let p = 0;
  for (let y = 0; y < size; y += 1) {
    raw[p] = 0; // filter type 0
    p += 1;
    for (let x = 0; x < size; x += 1) {
      const [r, g, b] = inMark(x, y) ? WHITE : ACCENT;
      raw[p] = r;
      raw[p + 1] = g;
      raw[p + 2] = b;
      raw[p + 3] = 255;
      p += 4;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const outDir = path.join(__dirname, "..", "public", "icons");
fs.mkdirSync(outDir, { recursive: true });

const targets = [
  ["icon-192.png", 192],
  ["icon-512.png", 512],
  ["icon-maskable-512.png", 512],
  ["apple-touch-icon.png", 180],
];

for (const [name, size] of targets) {
  fs.writeFileSync(path.join(outDir, name), makePng(size));
  process.stdout.write(`wrote ${name} (${size}x${size})\n`);
}
