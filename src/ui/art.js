// Small drawings for the UI as SVG: the honey jar, bear heads, the charms, stars, rank medals, hats and inks, and the big
// pictures on the lobby's cards. Thick ink outlines and flat fills with one highlight, to sit with the stamp and the plaque.
const INK = '#1D2440';
const W = 'stroke="#1D2440" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"';
const w2 = 'stroke="#1D2440" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"';

export const jar = (fill = 1) => {
  const h = Math.round(30 * Math.max(0, Math.min(1, fill)));
  return `<svg viewBox="0 0 40 44"><defs><clipPath id="jc"><path d="M8 14 Q6 16 6 22 L6 36 Q6 41 12 41 L28 41 Q34 41 34 36 L34 22 Q34 16 32 14 Z"/></clipPath></defs>
<path d="M8 14 Q6 16 6 22 L6 36 Q6 41 12 41 L28 41 Q34 41 34 36 L34 22 Q34 16 32 14 Z" fill="#fff6dc" ${w2}/>
<rect x="4" y="${41 - h}" width="32" height="${h}" fill="#F2B33D" clip-path="url(#jc)"/>
<path d="M11 24 Q11 20 14 19" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.8"/>
<path d="M8 14 Q6 16 6 22 L6 36 Q6 41 12 41 L28 41 Q34 41 34 36 L34 22 Q34 16 32 14 Z" fill="none" ${w2}/>
<rect x="7" y="7" width="26" height="8" rx="3" fill="#C8442F" ${w2}/></svg>`;
};

export const drop = () => `<svg viewBox="0 0 20 24"><path d="M10 2 Q18 13 18 16 A8 8 0 0 1 2 16 Q2 13 10 2 Z" fill="#F2B33D" ${w2}/><path d="M7 15 Q7 12 9 11" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>`;

export const bearHead = (fur, face, size = 34) =>
  `<svg viewBox="0 0 48 44" width="${size}" height="${Math.round(size * 0.92)}"><circle cx="10" cy="11" r="8" fill="${fur}" ${w2}/><circle cx="38" cy="11" r="8" fill="${fur}" ${w2}/><circle cx="10" cy="11" r="3.5" fill="${face}"/><circle cx="38" cy="11" r="3.5" fill="${face}"/>
<ellipse cx="24" cy="25" rx="18" ry="16" fill="${fur}" ${w2}/><ellipse cx="24" cy="31" rx="9" ry="7" fill="${face}" ${w2}/><ellipse cx="24" cy="28" rx="3.5" ry="2.5" fill="${INK}"/><circle cx="16.5" cy="21" r="2.6" fill="${INK}"/><circle cx="31.5" cy="21" r="2.6" fill="${INK}"/></svg>`;
export const BEAR_COLORS = [
  ['#5a3620', '#c79a6c'],
  ['#8a5634', '#e2bd8f'],
  ['#a8703f', '#efcfa2'],
];

export const star = (on = true) => `<svg viewBox="0 0 24 24"><path d="M12 2 L14.9 8.6 L22 9.3 L16.6 14 L18.2 21 L12 17.3 L5.8 21 L7.4 14 L2 9.3 L9.1 8.6 Z" fill="${on ? '#F2B33D' : '#ffffff'}" fill-opacity="${on ? 1 : 0.55}" ${w2}/></svg>`;

export const pillowIcon = () => `<svg viewBox="0 0 40 30" width="30" height="24"><path d="M5 8 Q20 2 35 8 Q38 15 35 22 Q20 28 5 22 Q2 15 5 8 Z" fill="#fbf7f0" ${w2}/><path d="M12 13 Q20 10 28 13" stroke="#d9c7a8" stroke-width="2.5" fill="none"/></svg>`;

export const tap = () => `<svg viewBox="0 0 48 48" class="tapico"><circle cx="24" cy="16" r="10" fill="none" stroke="#F7E8CB" stroke-width="3" opacity="0.8"/><path d="M20 44 L16 30 Q15 26 18 26 Q20 26 21 29 L22 31 L22 14 Q22 11 25 11 Q28 11 28 14 L28 25 L34 26 Q38 27 37 32 L35 44 Z" fill="#F7E8CB" ${w2}/></svg>`;

const medalColors = ['#b88a5a', '#c98a4e', '#9fb3c8', '#d9b14a', '#e3c25a', '#f2b33d', '#ffcb4a', '#ffe08a'];
export const medal = (i) => {
  const c = medalColors[Math.max(0, Math.min(medalColors.length - 1, i))];
  return `<svg viewBox="0 0 48 48" class="medal"><path d="M14 2 L22 18 L26 18 L18 2 Z" fill="#C8442F" ${w2}/><path d="M34 2 L26 18 L22 18 L30 2 Z" fill="#2f4f8f" ${w2}/><circle cx="24" cy="30" r="15" fill="${c}" ${W}/><circle cx="24" cy="30" r="9" fill="none" stroke="#fff" stroke-width="2.5" opacity="0.6"/><text x="24" y="36" text-anchor="middle" font-family="Barlow Condensed" font-weight="800" font-size="17" fill="${INK}">${i + 1}</text></svg>`;
};

// ---------------------------------------------------------------- charms
const CH = {
  bigspoon: `<ellipse cx="30" cy="20" rx="16" ry="12" fill="#e9d3a8" ${W}/><ellipse cx="30" cy="19" rx="10" ry="6" fill="#f9efd8"/><path d="M28 31 L22 56" ${W} stroke-width="7"/><path d="M28 31 L22 56" stroke="#e9d3a8" stroke-width="3"/>`,
  slowclock: `<circle cx="30" cy="32" r="22" fill="#fbf7f0" ${W}/><path d="M30 32 L30 18 M30 32 L40 38" ${W}/><path d="M8 12 L16 6 M52 12 L44 6" ${W}/><circle cx="30" cy="32" r="3" fill="${INK}"/>`,
  goldnotch: `<rect x="20" y="4" width="20" height="52" rx="10" fill="#fbf7f0" ${W}/><rect x="20" y="24" width="20" height="14" fill="#3FA34D" ${w2}/><path d="M12 31 L20 31 M40 31 L48 31" ${W} stroke="#d4a640" stroke-width="6"/><path d="M12 31 L20 31 M40 31 L48 31" stroke="#ffcb4a" stroke-width="3"/>`,
  pillow: `<path d="M8 18 Q30 8 52 18 Q57 30 52 42 Q30 52 8 42 Q3 30 8 18 Z" fill="#fbf7f0" ${W}/><path d="M18 28 Q30 23 42 28" stroke="#d9c7a8" stroke-width="3" fill="none"/><circle cx="46" cy="14" r="7" fill="#C8442F" ${w2}/><path d="M43 14 L49 14 M46 11 L46 17" stroke="#fff" stroke-width="2.5"/>`,
  honeypot: `<path d="M14 22 Q10 26 10 34 L10 48 Q10 54 18 54 L42 54 Q50 54 50 48 L50 34 Q50 26 46 22 Z" fill="#F2B33D" ${W}/><rect x="12" y="12" width="36" height="11" rx="4" fill="#C8442F" ${W}/><text x="30" y="45" text-anchor="middle" font-family="Barlow Condensed" font-weight="800" font-size="18" fill="${INK}">×2</text>`,
  steady: `<path d="M12 40 Q12 22 30 22 Q48 22 48 40 Q48 52 30 52 Q12 52 12 40 Z" fill="#f6efe6" ${W}/><circle cx="18" cy="16" r="6" fill="#f6efe6" ${w2}/><circle cx="30" cy="11" r="6" fill="#f6efe6" ${w2}/><circle cx="42" cy="16" r="6" fill="#f6efe6" ${w2}/><path d="M22 40 L38 40" ${W}/>`,
  crystal: `<path d="M16 50 L44 50 L40 56 L20 56 Z" fill="#7A4A2A" ${W}/><circle cx="30" cy="28" r="20" fill="#bfe0f5" ${W}/><path d="M20 22 Q22 14 30 12" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M22 34 L38 34" stroke="#3FA34D" stroke-width="5" stroke-dasharray="3 3"/>`,
  hotstreak: `<path d="M30 4 Q42 18 40 30 Q46 26 46 20 Q54 32 50 42 Q46 56 30 56 Q14 56 10 42 Q8 30 18 22 Q18 30 24 32 Q20 16 30 4 Z" fill="#e0582e" ${W}/><path d="M30 26 Q38 36 36 44 Q34 50 30 50 Q24 50 23 44 Q22 36 30 26 Z" fill="#ffcb4a"/><text x="30" y="49" text-anchor="middle" font-family="Barlow Condensed" font-weight="800" font-size="15" fill="${INK}">×8</text>`,
  honeytrail: `<path d="M8 50 Q20 40 30 44 Q40 48 52 38" stroke="#F2B33D" stroke-width="7" fill="none" stroke-linecap="round"/><circle cx="14" cy="47" r="3" fill="${INK}"/><circle cx="32" cy="45" r="3" fill="${INK}"/><circle cx="48" cy="41" r="3" fill="${INK}"/><g transform="translate(14 4) scale(0.68)">${'<circle cx="10" cy="11" r="8" fill="#8a5634" stroke="#1D2440" stroke-width="4"/><circle cx="38" cy="11" r="8" fill="#8a5634" stroke="#1D2440" stroke-width="4"/><ellipse cx="24" cy="25" rx="18" ry="16" fill="#8a5634" stroke="#1D2440" stroke-width="4"/><ellipse cx="24" cy="31" rx="9" ry="7" fill="#e2bd8f"/><circle cx="16.5" cy="21" r="2.6" fill="#1D2440"/><circle cx="31.5" cy="21" r="2.6" fill="#1D2440"/>'}</g>`,
  tinyspoon: `<ellipse cx="30" cy="22" rx="7" ry="5" fill="#e9d3a8" ${W}/><path d="M30 27 L30 52" ${W} stroke-width="6"/><path d="M30 27 L30 52" stroke="#e9d3a8" stroke-width="2"/><text x="46" y="20" text-anchor="middle" font-family="Barlow Condensed" font-weight="800" font-size="15" fill="#C8442F">×1.5</text>`,
  quickpaws: `<path d="M6 22 L20 22 M2 32 L18 32 M6 42 L20 42" ${W}/><path d="M24 40 Q24 26 38 26 Q52 26 52 40 Q52 50 38 50 Q24 50 24 40 Z" fill="#f6efe6" ${W}/><circle cx="30" cy="18" r="5" fill="#f6efe6" ${w2}/><circle cx="40" cy="14" r="5" fill="#f6efe6" ${w2}/><circle cx="50" cy="18" r="5" fill="#f6efe6" ${w2}/>`,
  luckystar: `<path d="M30 4 L36.5 21 L54 22 L40.5 33 L45 50 L30 40.5 L15 50 L19.5 33 L6 22 L23.5 21 Z" fill="#ffcb4a" ${W}/><text x="30" y="34" text-anchor="middle" font-family="Barlow Condensed" font-weight="800" font-size="13" fill="${INK}">+50</text>`,
};
export const charmIcon = (id) => `<svg viewBox="0 0 60 60">${CH[id] ?? CH.luckystar}</svg>`;

// ---------------------------------------------------------------- hats and inks (Wardrobe tiles)
const HATS = {
  '': `<circle cx="32" cy="34" r="18" fill="none" stroke="#1D2440" stroke-width="4" stroke-dasharray="6 6"/>`,
  bow: `<path d="M32 32 L12 20 L12 44 Z M32 32 L52 20 L52 44 Z" fill="#e2577a" ${W}/><circle cx="32" cy="32" r="6" fill="#e2577a" ${W}/>`,
  party: `<path d="M32 6 L48 52 L16 52 Z" fill="#5FA8D8" ${W}/><path d="M24 30 L40 30 M20 42 L44 42" stroke="#F2B33D" stroke-width="5"/><circle cx="32" cy="6" r="5" fill="#C8442F" ${w2}/>`,
  beret: `<ellipse cx="32" cy="36" rx="24" ry="10" fill="#C8442F" ${W}/><path d="M10 34 Q32 10 54 34" fill="#C8442F" ${W}/><path d="M32 14 L32 8" ${W}/>`,
  acorn: `<path d="M12 34 Q12 12 32 12 Q52 12 52 34 Z" fill="#8a5530" ${W}/><path d="M18 26 L46 26 M16 32 L48 32" stroke="#5a3620" stroke-width="2.5"/><path d="M32 12 L34 4" ${W}/>`,
  chef: `<rect x="18" y="38" width="28" height="12" rx="3" fill="#fbf8f2" ${W}/><path d="M18 40 Q6 34 12 22 Q16 12 26 16 Q30 6 40 12 Q50 10 52 22 Q58 34 46 40 Z" fill="#fbf8f2" ${W}/>`,
  straw: `<ellipse cx="32" cy="40" rx="28" ry="9" fill="#e8c87a" ${W}/><path d="M18 40 Q18 18 32 18 Q46 18 46 40" fill="#e8c87a" ${W}/><path d="M18 34 L46 34" stroke="#C8442F" stroke-width="5"/>`,
  crown: `<path d="M10 46 L12 20 L22 32 L32 14 L42 32 L52 20 L54 46 Z" fill="#ffcb4a" ${W}/><circle cx="22" cy="40" r="3" fill="#C8442F"/><circle cx="32" cy="40" r="3" fill="#3f6fd8"/><circle cx="42" cy="40" r="3" fill="#C8442F"/>`,
};
export const hatIcon = (id) => `<svg viewBox="0 0 64 64">${HATS[id] ?? HATS['']}</svg>`;
export const inkIcon = (color) =>
  `<svg viewBox="0 0 64 64"><rect x="8" y="34" width="48" height="20" rx="4" fill="${color}" ${W}/><rect x="22" y="10" width="20" height="24" rx="6" fill="#7A4A2A" ${W}/><path d="M14 44 L50 44" stroke="#fff" stroke-width="3" opacity="0.45"/></svg>`;

// ---------------------------------------------------------------- the lobby's cards
export const modeArt = {
  bears: () => `<svg viewBox="0 0 200 180" preserveAspectRatio="xMaxYMax meet">
<rect x="70" y="20" width="110" height="170" rx="55" fill="#4a2b18" ${W}/><rect x="80" y="30" width="90" height="160" rx="45" fill="#2a1a10"/>
<g transform="translate(64 66) scale(1.25)"><circle cx="10" cy="11" r="8" fill="#5a3620" ${w2}/><circle cx="38" cy="11" r="8" fill="#5a3620" ${w2}/><ellipse cx="24" cy="25" rx="18" ry="16" fill="#5a3620" ${w2}/><ellipse cx="24" cy="31" rx="9" ry="7" fill="#c79a6c" ${w2}/><ellipse cx="24" cy="28" rx="3.5" ry="2.5" fill="${INK}"/><circle cx="16.5" cy="21" r="2.6" fill="${INK}"/><circle cx="31.5" cy="21" r="2.6" fill="${INK}"/><path d="M12 15 L20 18 M36 15 L28 18" stroke="${INK}" stroke-width="2.5"/></g>
<g transform="translate(110 92) scale(1.0)"><circle cx="10" cy="11" r="8" fill="#8a5634" ${w2}/><circle cx="38" cy="11" r="8" fill="#8a5634" ${w2}/><ellipse cx="24" cy="25" rx="18" ry="16" fill="#8a5634" ${w2}/><ellipse cx="24" cy="31" rx="9" ry="7" fill="#e2bd8f" ${w2}/><ellipse cx="24" cy="28" rx="3.5" ry="2.5" fill="${INK}"/><circle cx="16.5" cy="21" r="2.6" fill="${INK}"/><circle cx="31.5" cy="21" r="2.6" fill="${INK}"/></g>
<g transform="translate(140 122) scale(0.8)"><circle cx="10" cy="11" r="8" fill="#a8703f" ${w2}/><circle cx="38" cy="11" r="8" fill="#a8703f" ${w2}/><ellipse cx="24" cy="25" rx="18" ry="16" fill="#a8703f" ${w2}/><ellipse cx="24" cy="31" rx="9" ry="7" fill="#efcfa2" ${w2}/><ellipse cx="24" cy="28" rx="3.5" ry="2.5" fill="${INK}"/><circle cx="16.5" cy="21" r="2.6" fill="${INK}"/><circle cx="31.5" cy="21" r="2.6" fill="${INK}"/></g>
<circle cx="40" cy="120" r="30" fill="#fbf7f0" ${W}/><path d="M40 120 L40 100 M40 120 L54 128" ${W}/><circle cx="40" cy="120" r="3" fill="${INK}"/></svg>`,
  daily: () => `<svg viewBox="0 0 200 180" preserveAspectRatio="xMaxYMax meet">
<path d="M70 60 Q70 50 80 50 L170 50 Q180 50 180 60 L180 150 L70 150 Z" fill="#fbf7f0" ${W}/><rect x="70" y="50" width="110" height="30" fill="#C8442F" ${W}/><circle cx="95" cy="50" r="6" fill="#fbf7f0" ${w2}/><circle cx="155" cy="50" r="6" fill="#fbf7f0" ${w2}/>
<path d="M30 120 Q30 170 85 170 Q140 170 140 120 Z" fill="#5FA8D8" ${W}/><ellipse cx="85" cy="120" rx="55" ry="12" fill="#f8efdc" ${W}/><circle cx="72" cy="117" r="5" fill="#F2B33D"/><circle cx="96" cy="121" r="4" fill="#F2B33D"/>
<path d="M60 100 Q52 88 60 78 Q68 68 60 58" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" opacity="0.9"/><path d="M90 98 Q82 86 90 76 Q98 66 90 56" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" opacity="0.9"/>
<path d="M150 136 L50 175" stroke="#7A4A2A" stroke-width="9" stroke-linecap="round"/><path d="M150 136 L50 175" ${w2} fill="none"/></svg>`,
  book: () => `<svg viewBox="0 0 200 180" preserveAspectRatio="xMaxYMax meet">
<path d="M20 60 Q60 44 100 62 Q140 44 180 60 L180 168 Q140 152 100 170 Q60 152 20 168 Z" fill="#7A4A2A" ${W}/>
<path d="M28 58 Q62 44 100 60 L100 160 Q62 146 28 158 Z" fill="#fbf3e2" ${W}/><path d="M172 58 Q138 44 100 60 L100 160 Q138 146 172 158 Z" fill="#fbf3e2" ${W}/>
<path d="M42 78 Q64 70 86 80 M42 92 Q64 84 86 94 M42 106 Q64 98 86 108" stroke="#c9b48c" stroke-width="4" fill="none" stroke-linecap="round"/>
<path d="M126 92 L132 104 L146 106 L136 116 L139 130 L126 123 L113 130 L116 116 L106 106 L120 104 Z" fill="#F2B33D" ${w2}/>
<path d="M150 20 L150 60" stroke="#C8442F" stroke-width="8"/></svg>`,
  wardrobe: () => `<svg viewBox="0 0 200 180" preserveAspectRatio="xMaxYMax meet">
<path d="M100 30 Q100 18 112 18 Q122 18 122 28 Q122 36 112 40 L100 46" ${W} fill="none"/><path d="M100 46 L30 92 L170 92 Z" fill="none" ${W}/>
<path d="M58 92 L58 160 Q100 176 142 160 L142 92 Z" fill="#2f4f8f" ${W}/><path d="M100 92 L86 116 L100 128 L114 116 Z" fill="#C8442F" ${w2}/>
<g transform="translate(118 100) rotate(14)"><path d="M0 50 L22 0 L44 50 Z" fill="#5FA8D8" ${W}/><circle cx="22" cy="0" r="7" fill="#C8442F" ${w2}/><path d="M10 30 L34 30" stroke="#F2B33D" stroke-width="5"/></g></svg>`,
};

export const lockIcon = () => `<svg viewBox="0 0 24 24" width="16" height="16"><rect x="4" y="10" width="16" height="12" rx="3" fill="#7A4A2A"/><path d="M8 10 V7 A4 4 0 0 1 16 7 V10" stroke="#7A4A2A" stroke-width="3" fill="none"/></svg>`;
