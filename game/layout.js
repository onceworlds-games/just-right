// Where everything goes on this screen, around the platform's own buttons (ow.ui.reserved): the HUD along the top (the path,
// the heads, the score sign), the page's object and its gauge, the Hold prompt and the page number at the bottom.

/** What the platform covers: px to keep clear at the top left / top right, and at the bottom (the lobby strip). */
export function clearAreas(W, H, reserved) {
  const out = { left: 0, right: 0, bottom: 0, top: 0 };
  if (!Array.isArray(reserved)) {
    out.left = 160;
    out.top = 70;
    return out;
  }
  for (const r of reserved) {
    if (!r || typeof r.x !== 'number') continue;
    if (r.kind === 'lobby') out.bottom = Math.max(out.bottom, H - r.y);
    else if (r.kind === 'menu') {
      if (r.y + r.h < H * 0.5) {
        out.top = Math.max(out.top, r.y + r.h);
        if (r.x + r.w / 2 < W / 2) out.left = Math.max(out.left, r.x + r.w + 8);
        else out.right = Math.max(out.right, W - r.x + 8);
      } else out.bottom = Math.max(out.bottom, H - r.y);
    }
  }
  return out;
}

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

/** The HUD along the top: the path (the match's clock or the solo lives), the heads, the score sign. */
export function hudLayout(W, H, reserved) {
  const A = clearAreas(W, H, reserved);
  const portrait = H > W * 1.1;
  const small = Math.min(W, H) < 500;
  const signW = small ? 104 : 140;
  const signH = small ? 50 : 62;
  const pad = small ? 8 : 14;
  const sign = { x: W - A.right - signW - pad, y: pad + 12, w: signW, h: signH };
  const pathH = small ? 40 : 54;
  const headR = small ? 15 : 19;
  let path;
  let heads;
  if (portrait) {
    path = { x: pad, y: Math.max(sign.y + signH + 8, A.top + 4), w: W - pad * 2, h: pathH };
    heads = { x: pad, y: path.y + pathH + 4, w: W - pad * 2, h: headR * 2 + 10 };
  } else {
    const x = Math.max(A.left, pad);
    path = { x, y: pad, w: Math.max(120, sign.x - x - pad), h: pathH };
    heads = { x, y: path.y + pathH + 2, w: path.w, h: headR * 2 + 10 };
  }
  return { portrait, small, sign, path, heads, headR, bottom: Math.max(heads.y + heads.h, sign.y + sign.h) + 4, clear: A };
}

/**
 * The page on screen: its object's box, the gauge beside it (or under it, for the pages that move sideways), the floor, the
 * unit everything is sized by, the Hold prompt and the page number.
 */
export function stageLayout(W, H, top, axis, { bottomClear = 0 } = {}) {
  const portrait = H > W * 1.1;
  const small = Math.min(W, H) < 500;
  const promptH = small ? 54 : 70;
  const bottom = H - Math.max(promptH, bottomClear + 8);
  const stageH = Math.max(120, bottom - top - 8);
  const T = Math.round(clamp(Math.min(W, H) * 0.075, 30, 56));
  const capR = T * 0.36;
  const prompt = { x: W / 2, y: H - promptH / 2 - (small ? 4 : 8) - Math.max(0, bottomClear) };
  let box;
  let g;
  if (axis === 'right') {
    const gaugeBlock = T + capR * 2.2 + 12;
    const cw = Math.min(W - 32 - capR * 4.6, stageH * 2.3);
    const x = (W - cw) / 2;
    // On a tall screen the scene doesn't stretch up: it sits a little below the middle of the space.
    const h = Math.min(stageH - gaugeBlock, Math.max(cw * 0.95, (stageH - gaugeBlock) * 0.5));
    const y = top + (stageH - gaugeBlock - h) * 0.6;
    box = { x, y, w: cw, h };
    g = { x: x + capR * 0.4, y: y + h + capR * 0.9 + 4, w: cw - capR * 0.8, h: T };
  } else {
    const gaugeW = T * (portrait ? 2.7 : 3.4);
    const cw = Math.min(W - 24, Math.max(stageH * 1.25, Math.min(stageH * 1.9, W - 24)));
    const x = (W - cw) / 2;
    const h = portrait ? Math.min(stageH, Math.max((cw - gaugeW) * 1.3, stageH * 0.5)) : stageH;
    const y = top + (stageH - h) * 0.6;
    box = { x, y, w: cw - gaugeW, h };
    const gy = y + capR * 2.3 + 2;
    g = { x: x + cw - gaugeW + T * (portrait ? 0.9 : 1.3), y: gy, w: T, h: h - capR * 4.6 - 4 };
  }
  const u = Math.max(8, Math.min(box.w / 8.5, box.h / 6.6));
  const floor = axis === 'right' ? box.y + box.h - u * 0.2 : box.y + box.h - u * 0.15;
  return { portrait, small, box, g, T, u, floor, prompt, top, bottom };
}
