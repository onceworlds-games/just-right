// The game's own UI in the DOM, over the 3D cottage: the title, the lobby's cards, the play HUD (page path, score plaque,
// honey jar, bears home, charms, heads), the stamp and floating points, the charm pick, the run and daily results, the
// Storybook, the Wardrobe, the reveal's standings and the podium. Screens rebuild only when what they show changes; every
// button calls back through data-act. Text from players goes in as text, never as HTML.
import './ui.css';
import { jar, drop, bearHead, BEAR_COLORS, star, pillowIcon, tap, medal, charmIcon, hatIcon, inkIcon, modeArt, lockIcon } from './art.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const commas = (n) => Math.round(n || 0).toLocaleString('en-US');
export const ordinal = (n) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
};

/** A grain mask for the stamp's ink (made once). */
function grainUrl() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="260" height="260"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.3 1.5"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

export function createUi(root, { reduced = () => false, sound = () => {} } = {}) {
  root.innerHTML = '';
  document.documentElement.style.setProperty('--grain', grainUrl());
  const layer = (cls) => {
    const d = document.createElement('div');
    d.className = `layer ${cls}`;
    root.appendChild(d);
    return d;
  };
  const screens = {
    title: layer('screen title'),
    lobby: layer('screen lobby'),
    tags: layer('screen tags'),
    hud: layer('hud'),
    reveal: layer('screen reveal'),
    podium: layer('screen podium'),
    pick: layer('screen pick'),
    over: layer('screen over'),
    book: layer('screen book'),
    wardrobe: layer('screen wardrobe'),
    pause: layer('screen pause'),
    closed: layer('screen closed'),
  };
  const fx = layer('fx');
  const toasts = layer('toasts');
  for (const s of Object.values(screens)) s.hidden = true;
  const keys = new Map();
  const acts = new Map();

  // One click handler for every button: data-act names the callback.
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b || b.disabled) return;
    const fn = acts.get(b.dataset.act);
    if (fn) {
      e.stopPropagation();
      fn(b.dataset.arg ?? null, b);
    }
  });
  root.addEventListener('pointerover', (e) => {
    const b = e.target.closest('[data-act]');
    if (b && !b.disabled && e.pointerType === 'mouse' && b !== lastHover) {
      lastHover = b;
      sound('hover');
    }
  });
  let lastHover = null;
  // Buttons keep the hold off the page beneath.
  root.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.hit, [data-act], .btn')) e.stopPropagation();
  });

  /** Fill a screen when its key changes. */
  function put(name, key, html, handlers = {}) {
    const el = screens[name];
    for (const [k, fn] of Object.entries(handlers)) acts.set(k, fn);
    if (keys.get(name) === key) return el;
    keys.set(name, key);
    el.innerHTML = html;
    return el;
  }

  let shown = new Set();
  /** Show exactly these screens (and hide the rest). */
  function show(...names) {
    shown = new Set(names);
    for (const [n, el] of Object.entries(screens)) {
      const on = shown.has(n);
      if (el.hidden === on) el.hidden = !on;
    }
    document.body.classList.toggle('reduced', reduced());
  }

  // ---------------------------------------------------------------- insets (the platform's own UI)
  /** Edges (top, right, bottom, left) and corners (tlx, tly, trx, try, blx, bly, brx, bry) the platform's UI covers. */
  function setInsets(v) {
    const s = document.documentElement.style;
    const map = { top: '--rt', right: '--rr', bottom: '--rb', left: '--rl', tlx: '--tlx', tly: '--tly', trx: '--trx', try: '--try', blx: '--blx', bly: '--bly', brx: '--brx', bry: '--bry' };
    for (const [k, css] of Object.entries(map)) s.setProperty(css, `${Math.round(v[k] ?? 0)}px`);
  }

  // ---------------------------------------------------------------- title
  /** Shows only while the game loads: it has nothing to press. */
  function title({ loading = 1 }) {
    const pct = Math.round(Math.max(0, Math.min(1, loading)) * 100);
    put(
      'title',
      `t:${pct}`,
      `<div class="logo"><div class="stamp slam">Just Right</div><div class="tag">Before the bears come home</div></div>
<div class="play">${loading < 1 ? `<button class="btn loading" disabled style="--k:${pct}%">${pct}%</button>` : ''}</div>`,
    );
  }

  // ---------------------------------------------------------------- lobby
  function lobby(d) {
    const el = screens.lobby;
    el.classList.toggle('wide', d.wide);
    el.classList.toggle('tall', !d.wide);
    const r = d.rank;
    const card = (id, cls, label, chip, art, ribbon = '') =>
      `<button class="mode ${cls}" data-act="mode" data-arg="${id}" ${d.soloOk || id === 'wardrobe' || id === 'book' ? '' : 'disabled'} style="--bg:${d.colors[id]}"><div class="art">${art}</div><div class="lab">${label}</div><div class="chip">${chip}</div>${ribbon ? `<div class="ribbon">${ribbon}</div>` : ''}</button>`;
    const tasks = d.tasks
      .map(
        (t) =>
          `<div class="task ${t.done ? 'done' : ''}"><div class="box"></div><div class="tx">${esc(t.text)}${!t.done && t.n > 1 ? `<span class="prog">${t.count}/${t.n}</span>` : ''}</div><div class="pay">+${t.honey}</div></div>`,
      )
      .join('');
    const pages = d.pages
      ? `<div class="pages"><span class="lbl">Pages</span>${[8, 12, 16]
          .map((n) => `<button class="btn small ${d.pages.n === n ? 'on' : 'alt'}" data-act="pages" data-arg="${n}" ${d.pages.host ? '' : 'disabled'}>${n}</button>`)
          .join('')}</div>`
      : '';
    const html = `<div class="me hit"><div class="rank">${medal(r.i)}<div><div class="nm">${esc(r.name)}</div><div class="bar"><i style="width:${Math.round(r.k * 100)}%"></i></div></div></div>
<div class="jar">${jar(Math.min(1, d.honey / 500))}<span>${commas(d.honey)}</span></div></div>
${d.woods ? `<div class="woods"><b>${commas(d.woods)}</b> perfects in the woods today</div>` : ''}
<div class="tasks hit"><h4>Today <span>Honey jobs</span></h4>${tasks}</div>
<div class="modes l">${card('run', 'run', 'Before the Bears', d.best > 0 ? `Best <b>${commas(d.best)}</b>` : 'Endless run', modeArt.bears(), d.bossNew ? 'Boss!' : '')}${card('daily', 'daily', 'Daily Porridge', d.daily.played ? `Today <b>${commas(d.daily.best)}</b>` : d.daily.streak > 0 ? `Streak <b>${d.daily.streak}</b>` : '10 pages', modeArt.daily(), d.daily.played ? '' : 'New')}</div>
<div class="modes r">${card('book', 'book', 'Storybook', `<b>${d.stars}</b> / 36 stars`, modeArt.book())}${card('wardrobe', 'wardrobe', 'Wardrobe', `<b>${commas(d.honey)}</b> honey`, modeArt.wardrobe())}</div>
${pages}`;
    put('lobby', JSON.stringify(d), html, { mode: (id) => d.onMode?.(id), pages: (n) => d.onPages?.(Number(n)) });
  }

  /** Name tags over the people at the table (screen positions from the 3D world). */
  const tagEls = [];
  function nametags(list) {
    const el = screens.tags;
    while (tagEls.length < list.length) {
      const t = document.createElement('div');
      t.className = 'nametag';
      el.appendChild(t);
      tagEls.push(t);
    }
    tagEls.forEach((t, i) => {
      const p = list[i];
      if (!p) {
        t.hidden = true;
        return;
      }
      t.hidden = false;
      if (t.textContent !== p.name) t.textContent = p.name;
      t.className = `nametag${p.me ? ' me' : ''}${p.host ? ' host' : ''}`;
      t.style.left = `${p.x}px`;
      t.style.top = `${p.y}px`;
    });
  }

  // ---------------------------------------------------------------- HUD
  const hudEl = screens.hud;
  hudEl.innerHTML = `<div class="tl"><button class="btn small alt back" data-act="hudback" hidden>Storybook</button><div class="path"></div><div class="charmrow"></div></div><div class="tc"><div class="heads"></div></div><div class="tr"><div class="plaque"><span class="n">0</span><span class="sub"></span><div class="mult" hidden></div></div><div class="jar" hidden></div></div><div class="bl"><div class="bears"></div><div class="shields"></div></div><div class="prompt"></div><div class="intro" hidden></div>`;
  const H = {
    back: hudEl.querySelector('.back'),
    path: hudEl.querySelector('.path'),
    charms: hudEl.querySelector('.charmrow'),
    heads: hudEl.querySelector('.heads'),
    plaque: hudEl.querySelector('.plaque'),
    score: hudEl.querySelector('.plaque .n'),
    sub: hudEl.querySelector('.plaque .sub'),
    mult: hudEl.querySelector('.mult'),
    jar: hudEl.querySelector('.tr .jar'),
    bears: hudEl.querySelector('.bears'),
    shields: hudEl.querySelector('.shields'),
    prompt: hudEl.querySelector('.prompt'),
    intro: hudEl.querySelector('.intro'),
  };
  const last = {};
  const changed = (k, v) => {
    const s = typeof v === 'string' ? v : JSON.stringify(v);
    if (last[k] === s) return false;
    last[k] = s;
    return true;
  };

  /**
   * d: { path: { label, marks: ['p'|'g'|'m'|''...], now (index), total, x2 }, score, sub, mult, hot, honey (null hides),
   *      bears (null hides, else home 0-3), shields, charms: [id], heads: [{ id, name, img, color, me, hold, done, away }] }
   */
  function hud(d) {
    if (d.onBack) acts.set('hudback', d.onBack);
    if (changed('back', !!d.onBack)) H.back.hidden = !d.onBack;
    if (changed('path', d.path)) {
      const p = d.path;
      if (!p) H.path.hidden = true;
      else {
        H.path.hidden = false;
        let dots = '';
        const total = p.total ?? p.marks.length;
        if (total > 0 && total <= 20) for (let i = 0; i < total; i++) dots += `<i class="${p.marks[i] ?? ''}${i === p.now ? ' now' : ''}${p.x2 && i === total - 1 ? ' x2' : ''}"></i>`;
        H.path.innerHTML = `<span class="lbl">${esc(p.label)}</span>${dots}`;
      }
    }
    if (changed('score', d.score)) {
      H.score.textContent = commas(d.score);
      H.plaque.classList.remove('bump');
      void H.plaque.offsetWidth;
      if (d.score > 0) H.plaque.classList.add('bump');
    }
    if (changed('sub', d.sub ?? '')) H.sub.textContent = d.sub ?? '';
    if (changed('mult', `${d.mult}:${d.hot}`)) {
      H.mult.hidden = !(d.mult > 1);
      H.mult.textContent = `×${d.mult}`;
      H.mult.classList.toggle('hot', !!d.hot);
    }
    if (changed('honey', d.honey ?? null)) {
      H.jar.hidden = d.honey === null || d.honey === undefined;
      if (!H.jar.hidden) H.jar.innerHTML = `${jar(Math.min(1, (d.honey % 200) / 200 + 0.08))}<span>${commas(d.honey)}</span>`;
    }
    if (changed('bears', d.bears ?? null)) {
      H.bears.hidden = d.bears === null || d.bears === undefined;
      if (!H.bears.hidden) {
        const prev = Number(H.bears.dataset.home ?? 0);
        H.bears.innerHTML = BEAR_COLORS.map(([f, m], i) => bearHead(f, m, [40, 34, 28][i]).replace('<svg ', `<svg class="${i < d.bears ? 'home' : ''}" `)).join('');
        H.bears.dataset.home = String(d.bears);
        void prev;
      }
    }
    if (changed('shields', d.shields ?? 0)) H.shields.innerHTML = Array.from({ length: d.shields ?? 0 }, () => pillowIcon()).join('');
    if (changed('charms', d.charms ?? [])) H.charms.innerHTML = (d.charms ?? []).map((id) => `<div class="c" title="${esc(id)}">${charmIcon(id)}</div>`).join('');
    if (changed('heads', d.heads ?? null)) {
      H.heads.parentElement.hidden = !d.heads || d.heads.length === 0;
      if (d.heads) H.heads.innerHTML = d.heads.map((h) => headHtml(h)).join('');
    }
  }
  const headHtml = (h) =>
    `<div class="head${h.me ? ' me' : ''}${h.hold ? ' hold' : ''}${h.done ? ' done' : ''}${h.away ? ' away' : ''}" style="${h.img ? `background-image:url('${esc(h.img)}')` : `background-color:${esc(h.color ?? '#8a97ac')}`}">${h.img ? '' : esc((h.name || '?').slice(0, 1).toUpperCase())}</div>`;

  /** The prompt: { label, key ('Space' | null), touch, watch (seconds left | null), letgo, go } */
  function prompt(d) {
    if (!changed('prompt', d)) return;
    if (!d || !d.label) {
      H.prompt.hidden = true;
      return;
    }
    H.prompt.hidden = false;
    H.prompt.className = `prompt${d.letgo ? ' letgo' : d.go ? ' go' : ''}`;
    H.prompt.innerHTML = `${d.watch !== null && d.watch !== undefined ? `<span class="watch">${Math.ceil(d.watch)}</span>` : ''}${d.touch ? tap() : ''}<span>${esc(d.label)}</span>${d.key ? `<span class="key">${esc(d.key)}</span>` : ''}`;
  }

  /** The page's name card: { pg, name, twist, x2, hint, boss } or null to send it off. */
  let introKey = '';
  function intro(d) {
    const k = d ? JSON.stringify(d) : '';
    if (k === introKey) return;
    introKey = k;
    if (!d) {
      if (!H.intro.hidden) {
        H.intro.className = 'intro out';
        setTimeout(() => {
          if (!introKey) H.intro.hidden = true;
        }, 340);
      }
      return;
    }
    H.intro.hidden = false;
    H.intro.className = `intro in${d.boss ? ' boss' : ''}`;
    H.intro.innerHTML = `${d.pg ? `<div class="pg">${esc(d.pg)}</div>` : ''}<div class="nm">${esc(d.name)}</div>${d.twist ? `<div class="tw${d.x2 ? ' x2' : ''}">${esc(d.twist)}</div>` : ''}${d.hint ? `<span class="hint">${esc(d.hint)}</span>` : ''}`;
  }

  // ---------------------------------------------------------------- the stamp, points, honey
  function stamp(word, { color = null, size = 'big', x = 0.5, y = 0.3, rot = null, life = 1500, onLand } = {}) {
    const s = document.createElement('div');
    s.className = `stamp ${size} slam`;
    s.textContent = word;
    s.style.left = `${x * 100}%`;
    s.style.top = `${y * 100}%`;
    s.style.setProperty('--rot', `${rot ?? (Math.random() - 0.5) * 12}deg`);
    if (color) s.style.setProperty('--ink-c', color);
    fx.appendChild(s);
    // Ink flecks when it lands.
    setTimeout(() => {
      onLand?.();
      if (reduced()) return;
      const r = s.getBoundingClientRect();
      for (let i = 0; i < 7; i++) {
        const f = document.createElement('div');
        f.className = 'ink-splat';
        f.style.left = `${r.left + r.width * (0.1 + Math.random() * 0.8)}px`;
        f.style.top = `${r.top + (Math.random() < 0.5 ? 0 : r.height)}px`;
        f.style.setProperty('--dx', `${(Math.random() - 0.5) * 60}px`);
        f.style.setProperty('--dy', `${(Math.random() - 0.5) * 50}px`);
        if (color) f.style.background = color;
        const sz = 6 + Math.random() * 10;
        f.style.width = f.style.height = `${sz}px`;
        fx.appendChild(f);
        setTimeout(() => f.remove(), 650);
      }
    }, reduced() ? 0 : 170);
    setTimeout(() => {
      s.classList.remove('slam');
      s.classList.add('out');
      setTimeout(() => s.remove(), 520);
    }, life);
    return s;
  }

  /** Send every stamp on screen off (a new page). */
  function clearStamps() {
    for (const s of fx.querySelectorAll('.stamp.slam')) {
      s.classList.remove('slam');
      s.classList.add('out');
      setTimeout(() => s.remove(), 520);
    }
  }

  function float(text, { x = 0.5, y = 0.42, perfect = false, sub = '' } = {}) {
    const f = document.createElement('div');
    f.className = `float${perfect ? ' perfect' : ''}`;
    f.style.left = `${x * 100}%`;
    f.style.top = `${y * 100}%`;
    f.textContent = text;
    if (sub) {
      const s = document.createElement('small');
      s.textContent = sub;
      f.appendChild(s);
    }
    fx.appendChild(f);
    setTimeout(() => f.remove(), 1350);
  }

  /** Honey drops that fly from a spot to the jar in the corner. */
  function honeyFly(n, { x = 0.5, y = 0.4 } = {}, onEach) {
    const target = H.jar.hidden ? null : H.jar.getBoundingClientRect();
    if (!target) return;
    const W = window.innerWidth;
    const Hh = window.innerHeight;
    const count = Math.min(10, Math.max(1, Math.round(n / 3)));
    for (let i = 0; i < count; i++) {
      const d = document.createElement('div');
      d.className = 'drop';
      d.innerHTML = '';
      const sx = x * W + (Math.random() - 0.5) * 60;
      const sy = y * Hh + (Math.random() - 0.5) * 30;
      d.style.left = `${sx}px`;
      d.style.top = `${sy}px`;
      fx.appendChild(d);
      const tx = target.left + 18;
      const ty = target.top + target.height / 2;
      const delay = 120 + i * 70;
      const anim = d.animate(
        [
          { transform: 'translate(-50%, -50%) scale(0.4)', opacity: 0 },
          { transform: `translate(calc(-50% + ${(Math.random() - 0.5) * 80}px), calc(-50% - ${40 + Math.random() * 40}px)) scale(1.1)`, opacity: 1, offset: 0.3 },
          { transform: `translate(calc(-50% + ${tx - sx}px), calc(-50% + ${ty - sy}px)) scale(0.6)`, opacity: 1 },
        ],
        { duration: reduced() ? 300 : 750, delay, easing: 'cubic-bezier(0.5, 0, 0.6, 1)', fill: 'forwards' },
      );
      anim.onfinish = () => {
        d.remove();
        onEach?.(i, count);
        H.jar.classList.remove('bump');
        void H.jar.offsetWidth;
        H.jar.classList.add('bump');
      };
    }
  }

  // ---------------------------------------------------------------- the charm pick
  function pick({ offer, title: t = 'The Bears’ Cupboard', sub = 'Pick one', onPick }) {
    const cards = offer
      .map(
        (c) =>
          `<button class="charm${c.risky ? ' risky' : ''}" data-act="charm" data-arg="${esc(c.id)}">${c.fresh ? '<span class="new">New</span>' : ''}<div class="ico">${charmIcon(c.id)}</div><div class="nm">${esc(c.name)}</div><div class="tx">${esc(c.text)}</div></button>`,
      )
      .join('');
    put('pick', `p:${offer.map((c) => c.id).join(',')}:${t}`, `<div class="scrim"></div><div class="center"><h2>${esc(t)}</h2><div class="sub">${esc(sub)}</div><div class="charms">${cards}</div></div>`, {
      charm: (id, el) => {
        el.classList.add('down');
        onPick?.(id);
      },
    });
  }

  // ---------------------------------------------------------------- results cards
  const rankLine = (r) =>
    r
      ? `<div class="rankline"><div class="lbl"><span>${esc(r.name)}</span><span>${r.next ? `${commas(r.xp)} / ${commas(r.next)}` : 'Top rank'}</span></div><div class="bar"><i data-w="${Math.round(r.k * 100)}"></i></div></div>`
      : '';
  function grow(el) {
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        for (const i of el.querySelectorAll('.bar i[data-w]')) i.style.width = `${i.dataset.w}%`;
      }),
    );
  }
  /** d: { kind: 'run'|'daily', title, score, stats: [[value, label]], honey, rank, newBest, board: [{ n, name, score, me }], touch, onAgain, onLobby } */
  function over(d) {
    const stats = d.stats.map(([v, l]) => `<div class="stat"><b>${esc(v)}</b><span>${esc(l)}</span></div>`).join('');
    const board = d.board && d.board.length ? `<div class="board">${d.board.map((r) => `<div class="r${r.me ? ' me' : ''}"><i>${r.n}</i><span>${esc(r.name)}</span><b>${commas(r.score)}</b></div>`).join('')}</div>` : '';
    const el = put(
      'over',
      JSON.stringify({ ...d, onAgain: 0, onLobby: 0 }),
      `<div class="scrim"></div><div class="center"><div class="card">${d.newBest ? '<div class="stamp slam">New best!</div>' : ''}<h2>${esc(d.title)}</h2><div class="big">${commas(d.score)}</div><div class="row">${stats}</div>${d.honey > 0 ? `<div class="gain">${drop()} +${commas(d.honey)} honey</div>` : ''}${rankLine(d.rank)}${board}<div class="btns"><button class="btn" data-act="again">Again${d.touch ? '' : ' <span class="key">Enter</span>'}</button><button class="btn alt" data-act="lobby">Lobby</button></div></div></div>`,
      { again: () => d.onAgain?.(), lobby: () => d.onLobby?.() },
    );
    grow(el);
  }

  function pause({ onResume, onLobby, touch }) {
    put('pause', `pause:${touch}`, `<div class="scrim"></div><div class="center"><div class="card"><h2>Paused</h2><div class="btns"><button class="btn" data-act="resume">Resume${touch ? '' : ' <span class="key">Esc</span>'}</button><button class="btn alt" data-act="quit">Lobby</button></div></div></div>`, {
      resume: () => onResume?.(),
      quit: () => onLobby?.(),
    });
  }

  function closed({ msg, label, onClick }) {
    put('closed', `c:${msg}`, `<div class="scrim"></div><div class="center"><div class="card"><h2>${esc(msg)}</h2><div class="btns"><button class="btn" data-act="rejoin">${esc(label)}</button></div></div></div>`, { rejoin: () => onClick?.() });
  }

  // ---------------------------------------------------------------- Storybook
  /** d: { pages: [{ id, name, stars, met, img }], stars, onPage(id), onBack } */
  function book(d) {
    const cards = d.pages
      .map(
        (p) =>
          `<button class="pagecard${p.met ? '' : ' locked'}" data-act="page" data-arg="${p.id}" ${p.met ? '' : 'disabled'} style="${p.img ? `background-image:url('${p.img}')` : ''}"><div class="stars">${[0, 1, 2].map((i) => star(i < p.stars)).join('')}</div><div class="nm">${esc(p.met ? p.name : '???')}</div></button>`,
      )
      .join('');
    put(
      'book',
      JSON.stringify({ ...d, onPage: 0, onBack: 0 }),
      `<div class="scrim"></div><div class="panel"><h2>Storybook</h2><div class="tally">${d.stars} / 36 stars · practice any page you've met</div><div class="grid">${cards}</div><div class="foot"><button class="btn alt" data-act="bookback">Lobby${d.touch ? '' : ' <span class="key">Esc</span>'}</button></div></div>`,
      { page: (id) => d.onPage?.(id), bookback: () => d.onBack?.() },
    );
  }

  // ---------------------------------------------------------------- Wardrobe
  /** d: { wide, tab, honey, items: [{ id, name, owned, wearing, price, why, pic (svg|img url) }], onTab, onItem, onBack } */
  function wardrobe(d) {
    const el = screens.wardrobe;
    el.classList.toggle('tall', !d.wide);
    const items = d.items
      .map((it) => {
        const price = it.owned ? (it.wearing ? 'Wearing' : 'Wear') : it.why === 'rank' ? `${lockIcon()} Rank ${it.need}` : it.why === 'wins' ? `${lockIcon()} ${it.need} wins` : `${drop()} ${commas(it.price)}`;
        const pic = it.img ? `<div class="pic" style="background-image:url('${it.img}')"></div>` : `<div class="pic">${it.svg ?? ''}</div>`;
        return `<button class="item${it.wearing ? ' on' : ''}${!it.owned && it.why !== 'ok' ? ' cant' : ''}" data-act="item" data-arg="${esc(it.id)}">${pic}<div class="nm">${esc(it.name)}</div><div class="price${it.owned ? '' : it.why === 'ok' ? '' : ' locked'}">${price}</div></button>`;
      })
      .join('');
    put(
      'wardrobe',
      JSON.stringify({ ...d, onTab: 0, onItem: 0, onBack: 0 }),
      `<div class="panel"><h2>Wardrobe <span class="jar">${jar(Math.min(1, d.honey / 500))}<span>${commas(d.honey)}</span></span></h2><div class="tabs">${['char', 'hat', 'ink']
        .map((t) => `<button class="btn small ${d.tab === t ? 'on' : 'alt'}" data-act="tab" data-arg="${t}">${{ char: 'Characters', hat: 'Hats', ink: 'Stamps' }[t]}</button>`)
        .join('')}</div><div class="items">${items}</div><div class="foot"><button class="btn alt" data-act="wback">Lobby${d.touch ? '' : ' <span class="key">Esc</span>'}</button></div></div>`,
      { tab: (t) => d.onTab?.(t), item: (id) => d.onItem?.(id), wback: () => d.onBack?.() },
    );
  }

  // ---------------------------------------------------------------- reveal, podium
  /** d: { title, rows: [{ id, name, img, color, place, points, gain, me }] } */
  function reveal(d) {
    const rows = d.rows
      .map((r, i) => `<div class="s${r.me ? ' me' : ''}" style="animation-delay:${0.05 * i}s">${headHtml(r)}<span class="pl">${ordinal(r.place)}</span><span>${esc(r.name)}</span><b>${commas(r.points)}</b>${r.gain > 0 ? `<span class="gn">+${r.gain}</span>` : ''}</div>`)
      .join('');
    put('reveal', JSON.stringify(d), `<div class="revtitle">${esc(d.title)}</div><div class="revfoot"><div class="standings">${rows}</div></div>`);
  }

  function podium(d) {
    const rows = d.rows.map((r, i) => `<div class="s${r.me ? ' me' : ''}" style="animation-delay:${0.08 * i}s">${headHtml(r)}<span class="pl">${ordinal(r.place)}</span><span>${esc(r.name)}</span><b>${commas(r.points)}</b></div>`).join('');
    put('podium', JSON.stringify(d), `<div class="winner"><div class="stamp slam">Just right</div><div class="who">${esc(d.winner ?? '')}</div></div><div class="standings">${rows}</div>`);
  }

  // ---------------------------------------------------------------- toasts
  function toast({ icon = '', text, sub = '', ms = 2600 }) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = `<div class="ic">${icon}</div><div></div>`;
    const body = t.lastChild;
    body.textContent = text;
    if (sub) {
      const s = document.createElement('small');
      s.textContent = sub;
      body.appendChild(s);
    }
    toasts.appendChild(t);
    setTimeout(() => {
      t.classList.add('out');
      setTimeout(() => t.remove(), 360);
    }, ms);
  }

  return {
    root,
    show,
    get shown() {
      return shown;
    },
    setInsets,
    title,
    lobby,
    nametags,
    hud,
    prompt,
    intro,
    stamp,
    clearStamps,
    float,
    honeyFly,
    pick,
    over,
    pause,
    closed,
    book,
    wardrobe,
    reveal,
    podium,
    toast,
    icons: { jar, drop, star, medal, charmIcon, hatIcon, inkIcon },
    /** Forget what a screen showed (rebuild it next time). */
    reset(name) {
      keys.delete(name);
    },
  };
}
