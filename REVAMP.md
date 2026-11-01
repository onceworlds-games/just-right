# Just Right: teardown and rebuild plan

Played headless (20 s of `?autoplay=1&pages=8`, frames read at 1280×720) on `main` at aa80ac4, against the games of its kind
that people replay: WarioWare (microgames that flow into each other, speed-ups, bosses, characters with attitude), rhythm games
(timing windows you can feel, combos, fever), Stack and Perfect Slices (one tap, a perfect is a physical, satisfying event),
Overcooked and Cooking Mama (a lived-in kitchen, every object reacts), Balatro and roguelite runs (a choice every few minutes
that changes the run).

## Teardown: everything that's cheap, stiff, unclear or boring

### Looks cheap
1. Flat clip art. Every page is the same empty room: a cream wall with a diamond wallpaper, a wainscot strip, a floor strip.
   No light, no shadow beyond flat offsets, no material, no depth. It reads as a vector template.
2. Objects are primitives: the toaster is a pale-blue rounded box, the cake a flat bar, the stove a navy box, the pot a red
   rectangle. Nothing has volume, weight or a surface you could touch.
3. The gauge is the hero of every screen. A UI thermometer the size of the scene sits beside a small object, so twelve pages
   look like one page with a different sticker.
4. A third of each frame is empty wall. The action is small; the eye goes to the HUD.
5. The HUD is a cluttered top strip (a thin path with tiny bears, a row of eight coins, a wooden sign); the reveal is a cream
   panel with a list, a spreadsheet look; the podium is three flat chairs.
6. The characters are paper dolls: Goldilocks has a couple of fixed poses, the bears are static stickers, the rivals are flat
   circles with faces.

### Moves stiffly, feels floaty
7. Hard cuts from page to page; objects pop in; nothing travels.
8. Holding has little build-up: the mercury rises and a tone climbs, but the world doesn't strain (no rumble, no push-in you
   can feel, no anticipation in a body).
9. Results land soft: a stamp and a few particles. A broken chair is some sticks; a popped balloon is a disc that disappears;
   burnt toast is a darker rectangle. No hit-stop, no slow motion, no camera that leans in.
10. Perfect, good and miss feel nearly the same. A streak of perfects changes nothing on screen.
11. One polka loop at one energy; menus and play sound alike.

### Reads unclear
12. Small captions ("PAGE 4 OF 8"), keycap hints, and a gauge whose band moves around a lot of empty tube.
13. The milk and the bowl keep going after you let go, but nothing shows where they will land, so a miss feels unfair.

### Boring after one round, no reason to come back
14. Each page is one hold with no decision. After one pass through twelve pages nothing new appears except speed and three twists.
15. Before the Bears is endless with three lives and nothing else: no build-up, no choices, no milestones, no boss.
16. Nothing carries over between sessions: no levels, no unlocks, no characters, no cosmetics. Practice stars are the only
    collection, and they unlock nothing.
17. The daily is a fixed sequence with nobody to compare with.
18. In a match, points are pure accuracy, so the leader rarely changes and there are few stories. Results give nothing.

## The rebuild

### Look: a golden-hour dollhouse, in 3D
- **three.js** (Vite build). The bears' cottage as a cutaway dollhouse in a forest clearing at golden hour: kitchen, parlour and
  bedroom side by side under a cut-away roof, a garden with a pond and a rope swing, the forest path the bears walk home on.
  Low warm sun through the windows, long soft shadows, cool forest fill, ACES tone mapping, bloom on fire and glass, a warm
  grade, fog in the woods.
- **One cast in one style, rigged and animated:** the Quaternius chibi cast (CC0) on one shared rig with 30 animations
  (idle, walk, run, jump, sit, eat, hold, wave, yes, no, hit, fall). Goldilocks is a golden-haired bunny; the three bears are
  recoloured from the panda (big, middle and small, each with its own outfit); the rivals are the bunny family, each with
  its own colours. Recoloured to one palette at load (vertex colours from the atlas, then a palette map).
- **Props** from Kenney's Food and Furniture kits and Quaternius's kitchen and nature packs (CC0), recoloured to the palette.
- **The meter lives in the world:** a brass-and-glass gauge beside each object with a glowing green band and a gold notch at
  its centre; the sideways pages get a brass ruler. A snowflake and a flame mark its two ends (shape as well as colour).
- **The red rubber stamp** stays the signature: JUST RIGHT!, verdicts, READY, NEW BEST, the title.

### Animation and feel
- Every page is a staged little scene with a character acting it out (scrubbed sit-down, pumps, blowing, pushing, swinging),
  crossfaded skeletal animation, physical reactions (the chair snaps into pieces, the balloon shreds, the bowl smashes, the
  porridge boils over, toast flips out of the toaster).
- The camera glides between stations (eased, with a little overshoot), pushes in while you hold, punches in on a perfect,
  shakes on cracks and pops (trauma², off with reduced motion), and goes to slow motion on the winning moment.
- Hit-stop on stamps, pooled particles (steam, sparks, feathers, crumbs, splashes, confetti, ink), rumble and glow that build
  while holding, a golden "streak" grade when you're on fire.
- 60 fps target: fixed pages, pooled objects, shaders warmed at load, shadow map sized by quality, post only above low.

### Depth and the reason to come back
- **Mastery stays the core:** twelve motions to learn, a perfect window of ±2%, the "keeps going" pages shown with a ghost of
  where they'll land once you've learned them (a charm), twists from mid-match.
- **Short term:** perfect streaks multiply (×2 … ×5) and turn the scene golden; every page drops honey that flies to your jar.
- **Before the Bears becomes a run:** every five pages a choice of three charms from the bears' cupboard (wider green,
  perfects ×2, forgive one miss, slower pages, a ghost of the landing, a bear sent back home, risky high-score charms…);
  every tenth page a boss page, **The Three Bowls** (three quick holds in a row while Papa Bear watches).
- **Mid term:** the Storybook (each page with three stars), daily tasks (three a day, honey rewards), charms unlocked by playing.
- **Long term:** honey buys characters, outfits, hats, stamp inks and trails in the Wardrobe; a rank from total score; badges
  that mean something; the Daily Porridge with a shared board for today (`ow.data`) and a day streak.
- **Multiplayer stories:** everyone's spoon drops onto one giant gauge in the reveal, the closest takes a crown and a bonus, the
  last page counts double while the bears come through the door; your character and outfit sit at the lobby table for everyone
  to see.

### Order of work
1. Vite + three.js skeleton, asset pipeline (download, recolour, compress), the cast on the rig, light and post, one page
   (porridge) end to end with the meter, judged from headless frames.
2. The cottage and all twelve stations, each with its acting, reactions and sound.
3. The flow: title (attract mode in the cottage), lobby at the bears' table, countdown, play HUD, the 3D reveal, the podium,
   solo runs with charms and the boss, the daily, the Storybook, the Wardrobe.
4. Progression, saves, badges, leaderboards, daily board; tests for every new rule.
5. Music and sound pass; phones in both orientations; performance pass.
6. Fresh footage, critical look, iterate. Then store art, trailer, DESIGN.md, README, onceworlds.json.
