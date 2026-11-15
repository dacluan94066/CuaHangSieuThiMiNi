import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '..', 'public', 'images', 'products');

const items = [
  { code: 'SP001', q: 'nước ngọt coca cola lon 330ml' },
  { code: 'SP002', q: 'nước ngọt pepsi lon 330ml' },
  { code: 'SP003', q: 'nước tinh khiết aquafina 500ml' },
  { code: 'SP004', q: 'nước khoáng la vie 500ml' },
  { code: 'SP005', q: 'mì hảo hảo tôm chua cay 75g' },
  { code: 'SP006', q: 'mì omachi sườn hầm ngũ quả' },
  { code: 'SP007', q: 'xúc xích tiệt trùng vissan 35g' },
  { code: 'SP008', q: 'bánh quy oreo vani 133g' },
  { code: 'SP009', q: 'bánh chocopie orion hộp 12 cái' },
  { code: 'SP010', q: 'bánh quy cosy marie 240g' },
  { code: 'SP011', q: 'sữa tươi vinamilk có đường 180ml' },
  { code: 'SP012', q: 'sữa tươi th true milk 180ml' },
  { code: 'SP013', q: 'sữa đặc có đường ông thọ xanh 380g' },
  { code: 'SP014', q: 'nước mắm nam ngư 750ml' },
  { code: 'SP015', q: 'dầu ăn tường an 1 lít' },
  { code: 'SP016', q: 'bột ngọt ajinomoto 454g' },
  { code: 'SP017', q: 'kem đánh răng p/s bảo vệ 123 180g' },
  { code: 'SP018', q: 'xà phòng lifebuoy đỏ 90g' },
  { code: 'SP019', q: 'dầu gội clear bạc hà 630g' },
  { code: 'SP020', q: 'khăn giấy bỏ túi bless you' }
];

async function getVqd(query) {
  const tokenRes = await fetch('https://duckduckgo.com/?q=' + encodeURIComponent(query), {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });
  const html = await tokenRes.text();
  const match = html.match(/vqd=([0-9-]+)/);
  return match ? match[1] : null;
}

async function searchImages(query, vqd) {
  const url = `https://duckduckgo.com/i.js?l=wt-wt&o=json&q=${encodeURIComponent(query)}&vqd=${vqd}&f=,,,`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.results || []).map(r => r.image).filter(Boolean);
}

async function tryDownload(urls, destPath) {
  for (const u of urls.slice(0, 5)) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(u, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*'
        }
      });
      clearTimeout(timeout);
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length > 5000) {
          fs.writeFileSync(destPath, buf);
          return { size: buf.length, url: u };
        }
      }
    } catch {}
  }
  return null;
}

async function main() {
  console.log('Downloading REAL product photos from authentic supermarket packshots...\n');
  let successCount = 0;

  for (const item of items) {
    process.stdout.write(`[${item.code}] ${item.q}... `);
    try {
      const vqd = await getVqd(item.q);
      if (!vqd) {
        console.log('VQD error!');
        continue;
      }
      const imgUrls = await searchImages(item.q, vqd);
      if (!imgUrls.length) {
        console.log('No results found!');
        continue;
      }

      const dest = path.join(outDir, `${item.code}.jpg`);
      const downloaded = await tryDownload(imgUrls, dest);
      if (downloaded) {
        console.log(`OK (${(downloaded.size / 1024).toFixed(1)} KB)`);
        successCount++;
      } else {
        console.log('All download attempts failed!');
      }
    } catch (e) {
      console.log('Error:', e.message);
    }
    await new Promise(r => setTimeout(r, 600));
  }

  console.log(`\nDONE: ${successCount}/${items.length} real product photos saved!`);
}

main();
