// Boot: posters (store art and layout checks) or the game.
import { createGfx } from './gfx/renderer.js';
import { loadAssets } from './gfx/assets.js';

const params = new URLSearchParams(location.search);

export async function boot() {
  const poster = params.get('poster');
  const cv = document.getElementById('cv');
  const gfx = createGfx(cv, { poster: !!poster });
  const size = () => gfx.resize(window.innerWidth, window.innerHeight, poster ? 1 : Math.min(2, window.devicePixelRatio || 1));
  size();
  window.addEventListener('resize', size);
  gfx.setQuality(params.get('quality') || 'high');
  const assets = await loadAssets('./models/');
  if (poster && poster.startsWith('dev')) {
    const { devScene } = await import('./dev/dev.js');
    await devScene(poster, gfx, assets);
    return;
  }
}
