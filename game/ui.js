// The real buttons over the canvas: stamp-shaped Play / Again / Lobby / Back / Resume, and invisible buttons over the things in
// the scene you can tap (the clock, the calendar, the bowls, the books), so a keyboard and a screen reader reach them too.
// set(specs) keeps the DOM in step with what the screen wants, and only touches what changed.

/**
 * spec: { id, label, kind: 'main' | 'alt' | 'hot', cx, cy (centre) or x, y, w, h, key (a key hint), aria, onClick, disabled }
 */
export function createUi(root) {
  const nodes = new Map();
  let lastSig = '';

  function apply(b, s) {
    b.className = `btn ${s.kind ?? 'main'}`;
    if (s.kind === 'hot') {
      b.textContent = '';
      b.setAttribute('aria-label', s.aria ?? s.label ?? '');
      b.style.left = `${Math.round(s.x)}px`;
      b.style.top = `${Math.round(s.y)}px`;
      b.style.width = `${Math.round(s.w)}px`;
      b.style.height = `${Math.round(s.h)}px`;
      b.style.transform = '';
    } else {
      b.textContent = '';
      const t = document.createElement('span');
      t.textContent = s.label;
      b.append(t);
      if (s.key) {
        const k = document.createElement('kbd');
        k.textContent = s.key;
        b.append(k);
      }
      b.removeAttribute('aria-label');
      b.style.left = `${Math.round(s.cx)}px`;
      b.style.top = `${Math.round(s.cy)}px`;
      b.style.width = s.w ? `${Math.round(s.w)}px` : '';
      b.style.height = '';
      b.style.transform = 'translate(-50%, -50%)';
    }
    b.disabled = !!s.disabled;
  }

  return {
    set(specs) {
      const sig = JSON.stringify(specs.map((s) => [s.id, s.label, s.kind, s.cx, s.cy, s.x, s.y, s.w, s.h, s.key, s.disabled].map((v) => (typeof v === 'number' ? Math.round(v) : v))));
      for (const s of specs) {
        const b = nodes.get(s.id);
        if (b) b._spec = s;
      }
      if (sig === lastSig) return;
      lastSig = sig;
      const keep = new Set();
      for (const s of specs) {
        keep.add(s.id);
        let b = nodes.get(s.id);
        if (!b) {
          b = document.createElement('button');
          b.type = 'button';
          b.addEventListener('pointerdown', (e) => e.stopPropagation());
          b.addEventListener('click', (e) => {
            e.stopPropagation();
            try {
              b._spec?.onClick?.();
            } catch (err) {
              console.error('[just-right] button', err);
            }
          });
          root.append(b);
          nodes.set(s.id, b);
        }
        b._spec = s;
        apply(b, s);
      }
      for (const [id, b] of nodes) {
        if (!keep.has(id)) {
          b.remove();
          nodes.delete(id);
        }
      }
    },
    /** The screen's main button (Enter presses it). */
    main() {
      for (const b of nodes.values()) if (b._spec?.kind === 'main' && !b.disabled) return b._spec;
      return null;
    },
    get(id) {
      return nodes.get(id)?._spec ?? null;
    },
  };
}
