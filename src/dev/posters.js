// Store art: ?poster=cover|action|win|multi|icon|badge-<id>, rendered from the game's own world.
export async function storePoster(name, gfx, assets) {
  void name;
  void assets;
  gfx.render(1 / 60);
  document.body.dataset.ready = '1';
}
