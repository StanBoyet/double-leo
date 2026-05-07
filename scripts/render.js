const path = require('path');
const fs = require('fs');
const http = require('http');
const puppeteer = require('puppeteer');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'today.png');
const WIDTH = 800;
const HEIGHT = 800;

function startServer(root) {
  const mimeTypes = {
    '.html': 'text/html', '.js': 'text/javascript',
    '.jpg': 'image/jpeg', '.png': 'image/png',
  };
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let url = req.url.split('?')[0];
      if (url === '/') url = '/index.html';
      const file = path.join(root, url);
      fs.readFile(file, (err, data) => {
        if (err) { res.writeHead(404); res.end(); return; }
        res.writeHead(200, { 'Content-Type': mimeTypes[path.extname(file)] || 'application/octet-stream' });
        res.end(data);
      });
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

async function main() {
  const server = await startServer(ROOT);
  const port = server.address().port;

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 1 });
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle0' });

  await page.waitForFunction(() => window.__doubling && window.__doubling.isReady(), { timeout: 10000 });

  await page.evaluate(() => {
    document.querySelector('header').style.display = 'none';
    document.querySelector('.controls').style.display = 'none';
    document.querySelector('.hint').style.display = 'none';
    window.__doubling.setZoom(0.5);
  });

  await page.screenshot({ path: OUT, type: 'png' });

  await browser.close();
  server.close();

  const dayZero = process.env.DAY_ZERO || '2026-04-20';
  const [y, m, d] = dayZero.split('-').map(Number);
  const zero = Date.UTC(y, m - 1, d);
  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const n = Math.max(0, Math.floor((today - zero) / 86400000));
  console.log(`Rendered day ${n} screenshot (${WIDTH}x${HEIGHT}) → ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
