import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '..', 'public', 'images', 'products');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

function svgWrapper(bgGrad, content) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 280" width="100%" height="100%">
  <defs>
    <radialGradient id="bg" cx="50%" cy="40%" r="60%">
      <stop offset="0%" stop-color="${bgGrad[0]}"/>
      <stop offset="100%" stop-color="${bgGrad[1]}"/>
    </radialGradient>
    <filter id="shadow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="8" stdDeviation="8" flood-opacity="0.18" flood-color="#000"/>
    </filter>
    <linearGradient id="metal" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#b0b0b0"/>
      <stop offset="25%" stop-color="#f0f0f0"/>
      <stop offset="50%" stop-color="#ffffff"/>
      <stop offset="75%" stop-color="#d0d0d0"/>
      <stop offset="100%" stop-color="#999999"/>
    </linearGradient>
  </defs>
  <rect width="280" height="280" rx="12" fill="url(#bg)"/>
  <ellipse cx="140" cy="242" rx="65" ry="10" fill="#000" opacity="0.12"/>
  ${content}
</svg>`;
}

const products = {
  // SP001: Coca-Cola 330ml
  SP001: svgWrapper(['#ffebee', '#f5f5f5'], `
    <g filter="url(#shadow)">
      <!-- Can body -->
      <rect x="95" y="55" width="90" height="170" rx="14" fill="#df0012"/>
      <!-- Can top/bottom rims -->
      <rect x="100" y="50" width="80" height="10" rx="4" fill="url(#metal)"/>
      <ellipse cx="140" cy="50" rx="36" ry="6" fill="#cccccc"/>
      <ellipse cx="140" cy="50" rx="20" ry="3" fill="#999999"/>
      <rect x="102" y="220" width="76" height="7" rx="3" fill="url(#metal)"/>
      <!-- Highlight -->
      <path d="M106 58 Q103 140 106 218" stroke="#ffffff" stroke-width="6" stroke-linecap="round" opacity="0.35"/>
      <!-- Brand Ribbon -->
      <path d="M96 145 Q135 125 184 150 Q150 165 96 155 Z" fill="#ffffff" opacity="0.9"/>
      <!-- Brand Text -->
      <text x="140" y="132" font-family="'Brush Script MT', 'Arial Black', cursive, sans-serif" font-size="24" font-weight="bold" fill="#ffffff" text-anchor="middle" font-style="italic">Coca-Cola</text>
      <!-- Subtext -->
      <rect x="115" y="175" width="50" height="16" rx="8" fill="#ffffff" opacity="0.25"/>
      <text x="140" y="187" font-family="sans-serif" font-size="10" font-weight="bold" fill="#ffffff" text-anchor="middle">330 ml</text>
    </g>
  `),

  // SP002: Pepsi 330ml
  SP002: svgWrapper(['#e3f2fd', '#f5f5f5'], `
    <g filter="url(#shadow)">
      <!-- Can body -->
      <rect x="95" y="55" width="90" height="170" rx="14" fill="#004b93"/>
      <!-- Can rims -->
      <rect x="100" y="50" width="80" height="10" rx="4" fill="url(#metal)"/>
      <ellipse cx="140" cy="50" rx="36" ry="6" fill="#cccccc"/>
      <ellipse cx="140" cy="50" rx="20" ry="3" fill="#999999"/>
      <rect x="102" y="220" width="76" height="7" rx="3" fill="url(#metal)"/>
      <!-- Highlight -->
      <path d="M106 58 Q103 140 106 218" stroke="#ffffff" stroke-width="6" stroke-linecap="round" opacity="0.35"/>
      <!-- Pepsi Globe -->
      <g transform="translate(140, 120)">
        <circle cx="0" cy="0" r="26" fill="#ffffff"/>
        <path d="M -24 -6 A 25 25 0 0 1 24 -6 Q 0 8 -24 -6 Z" fill="#da291c"/>
        <path d="M -24 6 A 25 25 0 0 0 24 6 Q 0 -8 -24 6 Z" fill="#004b93"/>
      </g>
      <!-- Text -->
      <text x="140" y="172" font-family="'Arial Black', sans-serif" font-size="16" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="2">PEPSI</text>
      <rect x="118" y="186" width="44" height="14" rx="7" fill="#ffffff" opacity="0.2"/>
      <text x="140" y="197" font-family="sans-serif" font-size="9" font-weight="bold" fill="#ffffff" text-anchor="middle">330 ml</text>
    </g>
  `),

  // SP003: Aquafina 500ml
  SP003: svgWrapper(['#e1f5fe', '#f5f5f5'], `
    <g filter="url(#shadow)">
      <!-- Bottle neck & cap -->
      <rect x="131" y="42" width="18" height="14" rx="3" fill="#0052a5"/>
      <path d="M128 56 Q140 68 140 76 Q140 68 152 56 Z" fill="#e0f7fa" opacity="0.8"/>
      <!-- Bottle body -->
      <path d="M110 95 L110 215 Q110 230 125 230 L155 230 Q170 230 170 215 L170 95 Q170 80 152 75 L128 75 Q110 80 110 95 Z" fill="#e0f7fa" opacity="0.75" stroke="#b2ebf2" stroke-width="1.5"/>
      <!-- Label -->
      <rect x="108" y="125" width="64" height="60" rx="3" fill="#0052a5"/>
      <!-- Label mountains -->
      <polygon points="120,150 135,135 150,150" fill="#ffffff" opacity="0.8"/>
      <polygon points="135,150 148,138 160,150" fill="#ffffff" opacity="0.6"/>
      <circle cx="140" cy="133" r="5" fill="#fbc02d"/>
      <text x="140" y="166" font-family="'Arial Black', sans-serif" font-size="10" font-weight="bold" fill="#ffffff" text-anchor="middle" letter-spacing="1">AQUAFINA</text>
      <text x="140" y="177" font-family="sans-serif" font-size="7" fill="#81d4fa" text-anchor="middle">500 ml</text>
      <!-- Water reflections -->
      <line x1="116" y1="95" x2="116" y2="215" stroke="#ffffff" stroke-width="4" stroke-linecap="round" opacity="0.6"/>
    </g>
  `),

  // SP004: La Vie 500ml
  SP004: svgWrapper(['#e8f5e9', '#f5f5f5'], `
    <g filter="url(#shadow)">
      <!-- Cap -->
      <rect x="131" y="42" width="18" height="14" rx="3" fill="#2e7d32"/>
      <!-- Bottle body -->
      <path d="M110 95 L110 215 Q110 230 125 230 L155 230 Q170 230 170 215 L170 95 Q170 80 152 75 L128 75 Q110 80 110 95 Z" fill="#e8f5e9" opacity="0.8" stroke="#c8e6c9" stroke-width="1.5"/>
      <!-- Label -->
      <rect x="108" y="125" width="64" height="60" rx="3" fill="#0288d1"/>
      <path d="M108 140 Q140 130 172 140 L172 170 Q140 180 108 170 Z" fill="#e53935" opacity="0.85"/>
      <text x="140" y="157" font-family="'Georgia', serif" font-size="14" font-weight="bold" fill="#ffffff" text-anchor="middle" font-style="italic">La Vie</text>
      <text x="140" y="172" font-family="sans-serif" font-size="7" font-weight="bold" fill="#ffffff" text-anchor="middle">KHOÁNG THIÊN NHIÊN</text>
      <!-- Reflections -->
      <line x1="116" y1="95" x2="116" y2="215" stroke="#ffffff" stroke-width="4" stroke-linecap="round" opacity="0.7"/>
    </g>
  `),

  // SP005: Mì Hảo Hảo tôm chua cay
  SP005: svgWrapper(['#fce4ec', '#f5f5f5'], `
    <g filter="url(#shadow)">
      <!-- Package -->
      <rect x="75" y="70" width="130" height="150" rx="10" fill="#e91e63"/>
      <!-- Crimped edges top & bottom -->
      <path d="M75 70 L205 70 L200 64 L75 64 Z" fill="#c2185b"/>
      <path d="M75 220 L205 220 L205 226 L75 226 Z" fill="#c2185b"/>
      <!-- Inner card -->
      <rect x="85" y="80" width="110" height="130" rx="6" fill="#fff9c4"/>
      <!-- Noodle Bowl -->
      <ellipse cx="140" cy="170" rx="42" ry="20" fill="#d32f2f"/>
      <ellipse cx="140" cy="166" rx="38" ry="15" fill="#fbc02d"/>
      <!-- Shrimp -->
      <path d="M130 160 Q145 150 155 162" stroke="#e64a19" stroke-width="5" stroke-linecap="round" fill="none"/>
      <!-- Text -->
      <text x="140" y="105" font-family="'Arial Black', sans-serif" font-size="18" font-weight="900" fill="#d32f2f" text-anchor="middle">HẢO HẢO</text>
      <rect x="95" y="114" width="90" height="18" rx="4" fill="#d32f2f"/>
      <text x="140" y="127" font-family="sans-serif" font-size="9" font-weight="bold" fill="#ffffff" text-anchor="middle">TÔM CHUA CAY</text>
      <text x="140" y="202" font-family="sans-serif" font-size="8" font-weight="bold" fill="#795548" text-anchor="middle">Khối lượng: 75g</text>
    </g>
  `),

  // SP006: Mì Omachi sườn hầm ngũ quả
  SP006: svgWrapper(['#fff3e0', '#f5f5f5'], `
    <g filter="url(#shadow)">
      <!-- Package (Dark luxury) -->
      <rect x="75" y="70" width="130" height="150" rx="10" fill="#212121"/>
      <rect x="75" y="64" width="130" height="6" fill="#b71c1c"/>
      <rect x="75" y="220" width="130" height="6" fill="#b71c1c"/>
      <!-- Gold banner -->
      <rect x="85" y="80" width="110" height="60" rx="5" fill="#d32f2f"/>
      <text x="140" y="108" font-family="'Arial Black', sans-serif" font-size="20" font-weight="900" fill="#ffd54f" text-anchor="middle">omachi</text>
      <text x="140" y="125" font-family="sans-serif" font-size="9" font-weight="bold" fill="#ffffff" text-anchor="middle">SƯỜN HẦM NGŨ QUẢ</text>
      <!-- Potato graphic badge -->
      <circle cx="140" cy="175" r="28" fill="#ffd54f"/>
      <text x="140" y="172" font-family="sans-serif" font-size="8" font-weight="bold" fill="#212121" text-anchor="middle">100% TỪ</text>
      <text x="140" y="184" font-family="'Arial Black', sans-serif" font-size="9" font-weight="900" fill="#b71c1c" text-anchor="middle">KHOAI TÂY</text>
    </g>
  `),

  // SP007: Xúc xích tiệt trùng 35g
  SP007: svgWrapper(['#fbe9e7', '#f5f5f5'], `
    <g filter="url(#shadow)">
      <!-- 3 sausages -->
      <g transform="translate(100, 60)">
        <rect x="0" y="0" width="22" height="150" rx="11" fill="#c62828"/>
        <rect x="2" y="-3" width="18" height="5" rx="2" fill="url(#metal)"/>
        <rect x="2" y="148" width="18" height="5" rx="2" fill="url(#metal)"/>
        <line x1="6" y1="10" x2="6" y2="140" stroke="#ffffff" stroke-width="2" opacity="0.4"/>
      </g>
      <g transform="translate(129, 50)">
        <rect x="0" y="0" width="22" height="160" rx="11" fill="#e53935"/>
        <rect x="2" y="-3" width="18" height="5" rx="2" fill="url(#metal)"/>
        <rect x="2" y="158" width="18" height="5" rx="2" fill="url(#metal)"/>
        <line x1="6" y1="10" x2="6" y2="150" stroke="#ffffff" stroke-width="2" opacity="0.4"/>
        <!-- Label band -->
        <rect x="-2" y="60" width="26" height="35" fill="#fbc02d"/>
        <text x="11" y="78" font-family="sans-serif" font-size="7" font-weight="900" fill="#c62828" text-anchor="middle">XÚC</text>
        <text x="11" y="88" font-family="sans-serif" font-size="7" font-weight="900" fill="#c62828" text-anchor="middle">XÍCH</text>
      </g>
      <g transform="translate(158, 60)">
        <rect x="0" y="0" width="22" height="150" rx="11" fill="#c62828"/>
        <rect x="2" y="-3" width="18" height="5" rx="2" fill="url(#metal)"/>
        <rect x="2" y="148" width="18" height="5" rx="2" fill="url(#metal)"/>
        <line x1="6" y1="10" x2="6" y2="140" stroke="#ffffff" stroke-width="2" opacity="0.4"/>
      </g>
    </g>
  `),

  // SP008: Bánh quy Oreo vani 133g
  SP008: svgWrapper(['#e8eaf6', '#f5f5f5'], `
    <g filter="url(#shadow)">
      <!-- Package body -->
      <rect x="65" y="85" width="150" height="110" rx="8" fill="#0d47a1"/>
      <path d="M65 85 L215 85 L215 78 L65 78 Z" fill="#0a3880"/>
      <path d="M65 195 L215 195 L215 202 L65 202 Z" fill="#0a3880"/>
      <!-- Milk splash -->
      <path d="M65 160 Q100 135 140 155 Q180 135 215 160 L215 195 L65 195 Z" fill="#ffffff" opacity="0.9"/>
      <!-- Cookie -->
      <circle cx="105" cy="140" r="26" fill="#212121"/>
      <circle cx="105" cy="140" r="24" fill="#37474f" stroke="#212121" stroke-width="2"/>
      <circle cx="105" cy="140" r="18" fill="none" stroke="#cfd8dc" stroke-width="1.5" stroke-dasharray="3,3"/>
      <circle cx="105" cy="140" r="8" fill="#ffffff"/>
      <text x="105" y="143" font-family="'Arial Black', sans-serif" font-size="5" font-weight="900" fill="#212121" text-anchor="middle">OREO</text>
      <!-- Text -->
      <text x="165" y="125" font-family="'Arial Black', sans-serif" font-size="20" font-weight="900" fill="#ffffff" text-anchor="middle" font-style="italic">OREO</text>
      <text x="165" y="142" font-family="sans-serif" font-size="9" font-weight="bold" fill="#90caf9" text-anchor="middle">VANILLA</text>
      <text x="165" y="175" font-family="sans-serif" font-size="8" font-weight="bold" fill="#0d47a1" text-anchor="middle">133g</text>
    </g>
  `),

  // SP009: Bánh ChocoPie hộp 12 cái
  SP009: svgWrapper(['#ffebee', '#f5f5f5'], `
    <g filter="url(#shadow)">
      <!-- Red Box -->
      <rect x="65" y="75" width="150" height="130" rx="8" fill="#c62828"/>
      <!-- Gold corner ribbon -->
      <polygon points="65,75 105,75 65,115" fill="#fbc02d"/>
      <text x="78" y="93" font-family="sans-serif" font-size="7" font-weight="bold" fill="#c62828" transform="rotate(-45 78 93)">12 CÁI</text>
      <!-- Chocopie cake graphic -->
      <ellipse cx="140" cy="155" rx="36" ry="16" fill="#3e2723"/>
      <ellipse cx="140" cy="151" rx="34" ry="13" fill="#ffffff"/>
      <ellipse cx="140" cy="147" rx="36" ry="15" fill="#4e342e"/>
      <!-- Brand Text -->
      <text x="140" y="112" font-family="'Brush Script MT', cursive, 'Arial Black', sans-serif" font-size="22" font-weight="bold" fill="#ffffff" text-anchor="middle">ChocoPie</text>
      <text x="140" y="126" font-family="sans-serif" font-size="8" font-weight="bold" fill="#ffd54f" text-anchor="middle" letter-spacing="2">ORION</text>
    </g>
  `),

  // SP010: Bánh quy Cosy Marie 240g
  SP010: svgWrapper(['#fffde7', '#f5f5f5'], `
    <g filter="url(#shadow)">
      <!-- Yellow pack -->
      <rect x="70" y="75" width="140" height="130" rx="8" fill="#fbc02d"/>
      <rect x="70" y="70" width="140" height="6" fill="#e65100"/>
      <rect x="70" y="204" width="140" height="6" fill="#e65100"/>
      <!-- Biscuit round -->
      <circle cx="140" cy="150" r="30" fill="#ffe082" stroke="#ffb300" stroke-width="2"/>
      <circle cx="140" cy="150" r="22" fill="none" stroke="#ffa000" stroke-width="1.5" stroke-dasharray="4,3"/>
      <text x="140" y="154" font-family="'Georgia', serif" font-size="9" font-weight="bold" fill="#bf360c" text-anchor="middle">MARIE</text>
      <!-- Brand -->
      <rect x="90" y="90" width="100" height="24" rx="4" fill="#d32f2f"/>
      <text x="140" y="107" font-family="'Arial Black', sans-serif" font-size="16" font-weight="900" fill="#ffffff" text-anchor="middle">COSY</text>
      <text x="140" y="196" font-family="sans-serif" font-size="8" font-weight="bold" fill="#5d4037" text-anchor="middle">240g</text>
    </g>
  `),

  // SP011: Sữa tươi Vinamilk có đường 180ml
  SP011: svgWrapper(['#e8f5e9', '#f5f5f5'], `
    <g filter="url(#shadow)">
      <!-- Milk carton -->
      <polygon points="105,75 140,55 175,75 175,225 105,225" fill="#ffffff" stroke="#c8e6c9" stroke-width="1.5"/>
      <polygon points="105,75 140,55 140,48 105,68" fill="#e0e0e0"/>
      <polygon points="140,55 175,75 175,68 140,48" fill="#eeeeee"/>
      <!-- Green grass pasture -->
      <path d="M105 160 Q140 145 175 160 L175 225 L105 225 Z" fill="#43a047"/>
      <!-- Blue sky band -->
      <rect x="105" y="75" width="70" height="50" fill="#0288d1"/>
      <text x="140" y="98" font-family="'Arial Black', sans-serif" font-size="11" font-weight="900" fill="#ffffff" text-anchor="middle">VINAMILK</text>
      <text x="140" y="112" font-family="sans-serif" font-size="8" font-weight="bold" fill="#ffffff" text-anchor="middle">100% SỮA TƯƠI</text>
      <!-- Cow badge -->
      <ellipse cx="140" cy="148" rx="16" ry="10" fill="#ffffff"/>
      <circle cx="134" cy="146" r="3" fill="#212121"/>
      <circle cx="144" cy="149" r="4" fill="#212121"/>
      <text x="140" y="195" font-family="sans-serif" font-size="9" font-weight="bold" fill="#ffffff" text-anchor="middle">CÓ ĐƯỜNG</text>
      <text x="140" y="212" font-family="sans-serif" font-size="8" fill="#ffffff" text-anchor="middle">180 ml</text>
    </g>
  `),

  // SP012: Sữa tươi TH true MILK 180ml
  SP012: svgWrapper(['#e1f5fe', '#f5f5f5'], `
    <g filter="url(#shadow)">
      <!-- Pure clean carton -->
      <polygon points="105,75 140,55 175,75 175,225 105,225" fill="#ffffff" stroke="#b3e5fc" stroke-width="1.5"/>
      <!-- Sky blue roof -->
      <polygon points="105,75 140,55 175,75" fill="#0288d1"/>
      <!-- TH logo style -->
      <text x="140" y="105" font-family="'Arial Black', sans-serif" font-size="18" font-weight="900" fill="#01579b" text-anchor="middle">TH</text>
      <text x="140" y="122" font-family="'Georgia', serif" font-size="11" font-weight="bold" fill="#0288d1" text-anchor="middle" font-style="italic">true MILK</text>
      <line x1="120" y1="130" x2="160" y2="130" stroke="#0288d1" stroke-width="1.5"/>
      <text x="140" y="150" font-family="sans-serif" font-size="8" font-weight="bold" fill="#546e7a" text-anchor="middle">SỮA TƯƠI TIỆT TRÙNG</text>
      <rect x="115" y="165" width="50" height="20" rx="4" fill="#e1f5fe"/>
      <text x="140" y="179" font-family="sans-serif" font-size="9" font-weight="bold" fill="#0288d1" text-anchor="middle">Ít đường</text>
      <text x="140" y="210" font-family="sans-serif" font-size="8" font-weight="bold" fill="#78909c" text-anchor="middle">180 ml</text>
    </g>
  `),

  // SP013: Sữa đặc Ông Thọ 380g
  SP013: svgWrapper(['#fff8e1', '#f5f5f5'], `
    <g filter="url(#shadow)">
      <!-- Can body -->
      <rect x="95" y="70" width="90" height="150" rx="10" fill="#0277bd"/>
      <rect x="98" y="65" width="84" height="8" rx="3" fill="url(#metal)"/>
      <ellipse cx="140" cy="65" rx="40" ry="6" fill="#cccccc"/>
      <rect x="98" y="217" width="84" height="6" rx="2" fill="url(#metal)"/>
      <!-- Label white area -->
      <rect x="95" y="90" width="90" height="105" fill="#fff9c4"/>
      <!-- Portrait circle -->
      <circle cx="140" cy="125" r="22" fill="#d32f2f"/>
      <circle cx="140" cy="125" r="19" fill="#ffe082"/>
      <!-- Beard figure placeholder -->
      <circle cx="140" cy="120" r="7" fill="#d32f2f"/>
      <path d="M133 125 Q140 138 147 125 Z" fill="#ffffff"/>
      <!-- Text -->
      <text x="140" y="162" font-family="'Arial Black', sans-serif" font-size="12" font-weight="900" fill="#d32f2f" text-anchor="middle">ÔNG THỌ</text>
      <text x="140" y="174" font-family="sans-serif" font-size="7" font-weight="bold" fill="#0277bd" text-anchor="middle">SỮA ĐẶC CÓ ĐƯỜNG</text>
      <rect x="118" y="180" width="44" height="12" rx="3" fill="#d32f2f"/>
      <text x="140" y="189" font-family="sans-serif" font-size="7" font-weight="bold" fill="#ffffff" text-anchor="middle">380g</text>
    </g>
  `),

  // SP014: Nước mắm Nam Ngư 750ml
  SP014: svgWrapper(['#fff3e0', '#f5f5f5'], `
    <g filter="url(#shadow)">
      <!-- Bottle neck & cap -->
      <rect x="133" y="35" width="14" height="18" rx="3" fill="#d32f2f"/>
      <path d="M130 53 L115 100 L165 100 L150 53 Z" fill="#e65100" opacity="0.85"/>
      <!-- Bottle body (Amber) -->
      <rect x="112" y="100" width="56" height="130" rx="8" fill="#e65100" opacity="0.9"/>
      <!-- Label -->
      <rect x="110" y="125" width="60" height="70" rx="3" fill="#b71c1c"/>
      <!-- Golden fish symbol -->
      <ellipse cx="140" cy="145" rx="14" ry="7" fill="#ffd54f"/>
      <polygon points="126,145 120,139 120,151" fill="#ffd54f"/>
      <circle cx="148" cy="143" r="1.5" fill="#b71c1c"/>
      <text x="140" y="168" font-family="'Arial Black', sans-serif" font-size="10" font-weight="900" fill="#ffffff" text-anchor="middle">NAM NGƯ</text>
      <text x="140" y="179" font-family="sans-serif" font-size="7" font-weight="bold" fill="#ffd54f" text-anchor="middle">ĐỆ NHỊ · 750ml</text>
      <!-- Glass shine -->
      <line x1="117" y1="102" x2="117" y2="225" stroke="#ffffff" stroke-width="3" opacity="0.5"/>
    </g>
  `),

  // SP015: Dầu ăn Tường An 1 lít
  SP015: svgWrapper(['#fffde7', '#f5f5f5'], `
    <g filter="url(#shadow)">
      <!-- Red Cap -->
      <rect x="131" y="38" width="18" height="15" rx="3" fill="#d32f2f"/>
      <path d="M128 53 L110 88 L170 88 L152 53 Z" fill="#fbc02d" opacity="0.9"/>
      <!-- Bottle (Golden Oil) -->
      <rect x="106" y="88" width="68" height="142" rx="10" fill="#fbc02d" opacity="0.95"/>
      <!-- Label -->
      <rect x="104" y="118" width="72" height="75" rx="4" fill="#ffffff"/>
      <!-- Sunflower badge -->
      <circle cx="140" cy="142" r="14" fill="#f57f17"/>
      <circle cx="140" cy="142" r="8" fill="#5d4037"/>
      <text x="140" y="167" font-family="'Arial Black', sans-serif" font-size="9" font-weight="900" fill="#d32f2f" text-anchor="middle">TƯỜNG AN</text>
      <text x="140" y="177" font-family="sans-serif" font-size="7" font-weight="bold" fill="#388e3c" text-anchor="middle">DẦU ĐẬU NÀNH</text>
      <rect x="123" y="181" width="34" height="9" rx="3" fill="#d32f2f"/>
      <text x="140" y="188" font-family="sans-serif" font-size="6.5" font-weight="bold" fill="#ffffff" text-anchor="middle">1 LÍT</text>
      <!-- Bottle highlight -->
      <line x1="112" y1="92" x2="112" y2="222" stroke="#ffffff" stroke-width="4" stroke-linecap="round" opacity="0.6"/>
    </g>
  `),

  // SP016: Bột ngọt Ajinomoto 454g
  SP016: svgWrapper(['#ffebee', '#f5f5f5'], `
    <g filter="url(#shadow)">
      <!-- Package bag -->
      <path d="M85 70 L195 70 L205 220 L75 220 Z" fill="#ffffff" stroke="#e0e0e0" stroke-width="1.5"/>
      <!-- Red top banner -->
      <path d="M85 70 L195 70 L197 105 L83 105 Z" fill="#d32f2f"/>
      <!-- Red trademark bowl symbol -->
      <ellipse cx="140" cy="140" rx="22" ry="14" fill="#d32f2f"/>
      <ellipse cx="140" cy="136" rx="19" ry="10" fill="#ffffff"/>
      <text x="140" y="172" font-family="'Arial Black', sans-serif" font-size="11" font-weight="900" fill="#d32f2f" text-anchor="middle">AJI-NO-MOTO</text>
      <text x="140" y="185" font-family="sans-serif" font-size="8" font-weight="bold" fill="#424242" text-anchor="middle">BỘT NGỌT CHÍNH HIỆU</text>
      <rect x="115" y="193" width="50" height="15" rx="4" fill="#d32f2f"/>
      <text x="140" y="204" font-family="sans-serif" font-size="8" font-weight="bold" fill="#ffffff" text-anchor="middle">454 g</text>
    </g>
  `),

  // SP017: Kem đánh răng P/S 180g
  SP017: svgWrapper(['#e0f2f1', '#f5f5f5'], `
    <g filter="url(#shadow)">
      <!-- Cap -->
      <rect x="80" y="125" width="20" height="30" rx="3" fill="#ffffff" stroke="#b2dfdb" stroke-width="1.5"/>
      <!-- Tube horizontal -->
      <path d="M100 128 L215 110 L215 170 L100 152 Z" fill="#00897b"/>
      <!-- White smile stripe -->
      <path d="M100 135 Q160 120 215 130 L215 150 Q160 140 100 148 Z" fill="#ffffff"/>
      <!-- Brand Text -->
      <text x="155" y="145" font-family="'Arial Black', sans-serif" font-size="20" font-weight="900" fill="#d32f2f" text-anchor="middle">P/S</text>
      <text x="155" y="162" font-family="sans-serif" font-size="7" font-weight="bold" fill="#ffffff" text-anchor="middle">BẢO VỆ 123 · 180g</text>
      <!-- Mint leaf -->
      <path d="M185 125 Q195 115 205 125 Q195 135 185 125 Z" fill="#76ff03"/>
    </g>
  `),

  // SP018: Xà phòng Lifebuoy 90g
  SP018: svgWrapper(['#ffebee', '#f5f5f5'], `
    <g filter="url(#shadow)">
      <!-- Soap bar with rounded ergonomic shape -->
      <rect x="80" y="95" width="120" height="90" rx="25" fill="#d32f2f"/>
      <rect x="85" y="100" width="110" height="80" rx="20" fill="#e53935"/>
      <!-- White Cross badge -->
      <g transform="translate(140, 130)">
        <circle cx="0" cy="0" r="16" fill="#ffffff"/>
        <rect x="-3" y="-10" width="6" height="20" rx="1" fill="#d32f2f"/>
        <rect x="-10" y="-3" width="20" height="6" rx="1" fill="#d32f2f"/>
      </g>
      <text x="140" y="162" font-family="'Arial Black', sans-serif" font-size="12" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="1">Lifebuoy</text>
      <text x="140" y="174" font-family="sans-serif" font-size="7" font-weight="bold" fill="#ffcdd2" text-anchor="middle">BẢO VỆ KHỎI VI KHUẨN · 90g</text>
      <!-- Fresh soap bubble bubbles -->
      <circle cx="190" cy="88" r="8" fill="#ffffff" opacity="0.4"/>
      <circle cx="178" cy="78" r="5" fill="#ffffff" opacity="0.5"/>
    </g>
  `),

  // SP019: Dầu gội Clear 630g
  SP019: svgWrapper(['#e3f2fd', '#f5f5f5'], `
    <g filter="url(#shadow)">
      <!-- Pump Head -->
      <rect x="135" y="35" width="10" height="20" fill="url(#metal)"/>
      <path d="M125 35 L155 35 L150 42 L130 42 Z" fill="#003366"/>
      <!-- Bottle Body (Deep Cobalt Blue) -->
      <path d="M105 75 L110 225 Q110 230 120 230 L160 230 Q170 230 170 225 L175 75 Q175 65 160 62 L120 62 Q105 65 105 75 Z" fill="#0d47a1"/>
      <!-- Metallic Ice Silver slash -->
      <polygon points="106,120 174,105 173,125 107,140" fill="#e0f7fa" opacity="0.85"/>
      <!-- Text -->
      <text x="140" y="128" font-family="'Arial Black', sans-serif" font-size="16" font-weight="900" fill="#0d47a1" text-anchor="middle" letter-spacing="1">CLEAR</text>
      <text x="140" y="165" font-family="sans-serif" font-size="8" font-weight="bold" fill="#80deea" text-anchor="middle">SẠCH GÀU BẠC HÀ</text>
      <text x="140" y="180" font-family="sans-serif" font-size="7" fill="#ffffff" text-anchor="middle">CÔNG THỨC MÁT LẠNH</text>
      <rect x="120" y="195" width="40" height="14" rx="4" fill="#002171"/>
      <text x="140" y="205" font-family="sans-serif" font-size="8" font-weight="bold" fill="#ffffff" text-anchor="middle">630 g</text>
      <!-- Bottle highlight -->
      <line x1="114" y1="80" x2="116" y2="220" stroke="#ffffff" stroke-width="4" stroke-linecap="round" opacity="0.4"/>
    </g>
  `),

  // SP020: Khăn giấy bỏ túi Bless You
  SP020: svgWrapper(['#fce4ec', '#f5f5f5'], `
    <g filter="url(#shadow)">
      <!-- Soft Tissue Pack -->
      <rect x="75" y="85" width="130" height="110" rx="14" fill="#f8bbd0"/>
      <rect x="80" y="90" width="120" height="100" rx="10" fill="#ffffff"/>
      <!-- Flap opening -->
      <path d="M100 90 Q140 120 180 90" stroke="#f06292" stroke-width="2" fill="none" stroke-dasharray="4,3"/>
      <!-- Tissue peeking out -->
      <path d="M115 90 Q130 65 145 90 Q160 70 170 90 Z" fill="#ffffff" stroke="#e0e0e0" stroke-width="1"/>
      <!-- Brand Text -->
      <text x="140" y="132" font-family="'Brush Script MT', cursive, serif" font-size="20" font-weight="bold" fill="#c2185b" text-anchor="middle">Bless You</text>
      <text x="140" y="148" font-family="sans-serif" font-size="8" font-weight="bold" fill="#880e4f" text-anchor="middle">À La Vie</text>
      <text x="140" y="168" font-family="sans-serif" font-size="7" fill="#ad1457" text-anchor="middle">Khăn giấy lụa cao cấp</text>
    </g>
  `)
};

for (const [code, svg] of Object.entries(products)) {
  const filePath = path.join(outDir, `${code}.svg`);
  fs.writeFileSync(filePath, svg.trim(), 'utf8');
}

console.log(`Generated ${Object.keys(products).length} product images in ${outDir}`);
