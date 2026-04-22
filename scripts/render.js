const path = require('path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'leo.jpg');
const OUT = path.join(ROOT, 'today.png');

const BACKGROUND = { r: 0x0e, g: 0x0e, b: 0x10, alpha: 1 };

function daysSince(zeroIso) {
  const [y, m, d] = zeroIso.split('-').map(Number);
  const zero = Date.UTC(y, m - 1, d);
  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.max(0, Math.floor((today - zero) / 86400000));
}

async function main() {
  const dayZero = process.env.DAY_ZERO || '2026-04-20';
  const n = daysSince(dayZero);

  const { width: W, height: H } = await sharp(SRC).metadata();

  const cols = 2 ** Math.ceil(n / 2);
  const rows = 2 ** Math.floor(n / 2);
  const tileW = Math.max(1, Math.floor(W / cols));
  const tileH = Math.max(1, Math.floor((W / cols) * (H / W)));

  const tile = await sharp(SRC).resize(tileW, tileH).toBuffer();

  const composites = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      composites.push({ input: tile, top: r * tileH, left: c * tileW });
    }
  }

  await sharp({
    create: { width: W, height: H, channels: 3, background: BACKGROUND },
  })
    .composite(composites)
    .png()
    .toFile(OUT);

  console.log(`Rendered day ${n}: ${cols}x${rows} tiles → ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
