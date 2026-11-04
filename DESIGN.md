# Just Right

## The pitch

**Not too hot, not too cold: hold, let go, and get everything just right before the three bears come home.**

**The goal in one look:** Goldi at the bears' stove, a brass thermometer beside the pot with a green band, and "Hold to heat".
Fill it, stop it in the green.

One verb for the whole game: **hold** (Space, the mouse button, or a finger anywhere on the screen) and **let go**. Every page
of the story is a 4-8 second moment in the bears' cottage with one thing to heat, lower, fluff, pour, push or swing and one green
band. How close you stop to the middle of the band is your score. In a story with others, everyone's marks then land on one giant
gauge in the parlour: the reveal is the laugh.

The game is a 3D dollhouse: the bears' cottage cut open at the front (kitchen, dining room, parlour, bedroom), a garden with a
pond, a well and a bell tower, and the woods around it. The camera glides from room to room like a picture book turning its
pages.

## The first 60 seconds

| Time | Screen | What happens |
|---|---|---|
| 0 s | Title | The cottage from the front path at golden hour; Goldi waves at the door; the name is a red rubber stamp. It shows only while the game loads. |
| ~3 s | The bears' table (lobby) | Once loaded, the camera glides through the front into the dining room: everyone here sits at the bears' long table in their own look and hat. Before the Bears, the Daily, the Storybook and the Wardrobe are one tap away; the platform's Ready strip is below. |
| ~6 s | Countdown | Ready (alone, a story starts with the woodland folk): the platform's 3-2-1 over the table, the bears growling along. |
| ~9 s | Page 1 | Always **Porridge**, gentle. The camera swings into the kitchen; "Page 1 of 12" and "Porridge" slam in; "Hold to heat" with the Space key or a fingertip. |
| ~10 s | Play | Hold: the flame grows, the pot rattles and bubbles faster, the mercury climbs, a tone rises and chimes inside the band, the camera leans in. |
| ~13 s | Verdict | Let go: in the green Goldi nods and **JUST RIGHT!** is stamped with a hit-stop and sparkles; too long and the pot boils over (TOO HOT!, foam and steam), too short and she shivers (TOO COLD!). |
| ~14 s | Reveal | The camera glides to the parlour, where a giant thermometer hangs over the fire: every player's face drops onto it from the worst to the best, the closest gets the crown, the standings deal in below. |
| ~18 s | Page 2 | The next room: Baby Bear's chair (lower her onto it; too far and it snaps and she goes over backwards), the pillow, the toast... |

## Controls

| | Keyboard and mouse | Phone and tablet |
|---|---|---|
| The action | Hold **Space** (or the left mouse button anywhere) and let go | Hold a finger **anywhere** on the game and lift it |
| Menus | Click; **R** for Again on a solo run's end; **Esc** goes back from a solo screen and pauses a solo run (Enter is the platform's Ready) | Tap |

- No platform stick or buttons: `ow.controls.set(null)` everywhere (the whole screen is the button).
- One hold per page. A key repeat (`event.repeat`) is ignored; a second press after letting go does nothing.
- The hold is timed from the input events' own `timeStamp`s (pointerdown/keydown to pointerup/keyup), never from frames, so 30 and
  120 fps play the same. A blur, `pointercancel` or hidden page while holding lets go at that moment.
- Holding when a page's play begins counts from the moment play begins (players can hold through the intro to be ready); a tap
  that ends inside the intro is forgiven.
- Touch: `touch-action: none`, no text selection, no long-press menu or callout (`-webkit-touch-callout: none`, `contextmenu`
  and `selectstart` prevented), pointer capture on the canvas, so a long hold on a phone is just a hold.
- `controls` in onceworlds.json: `Space` / `Click` / `Tap`: "Hold, then let go in the green"; `R`: "Again"; `Esc`: "Back, pause a solo run".

## The core loop and where mastery comes from

**Loop:** see the page (1.5 s) → hold (when you choose; the page waits up to its window) → let go → see your verdict → see
everyone's → next page. A page takes about 8-10 s in a match (less when everyone lets go early and taps through the reveal),
5-7 s alone.

**The rule that keeps it honest:** the band's position is different every time (seeded per page), so nobody can memorise a
duration. You learn each object's **motion**, not a number.

**Twelve pages, each with a motion of its own** (the "feel" is what the player learns; e = seconds held × speed):

| # | id | Page | Cue | How it moves while held | Band centres | Too little / too much |
|---|---|---|---|---|---|---|
| 1 | `porridge` | Porridge | Hold to heat | Speeds up: v = (e / 3.2)^1.6 | 0.50-0.72 | TOO COLD / TOO HOT |
| 2 | `chair` | Little Chair | Hold to sit | Falls like gravity, v = (e / 2.6)², at half speed inside the band (the cushion) | 0.55-0.75 | TOO HIGH / CRACK! |
| 3 | `pillow` | Pillow | Hold to fluff | In pumps: every 0.4 s a pump adds 0.10, eased over 0.28 s | 0.40-0.70 (on a pump) | TOO FLAT / TOO FLUFFY |
| 4 | `toast` | Toast | Hold to toast | Slow and steady: v = e / 4.4 (the bread goes pale → golden → brown → black) | 0.45-0.70 | TOO PALE / BURNT! |
| 5 | `balloon` | Balloon | Hold to pump | Fast then slow: v = 1 − (1 − e/3)²; **pops** at the band's edge + 0.03 (0 points) | 0.50-0.70 | TOO SMALL / TOO BIG / POP! |
| 6 | `cake` | Cake | Hold to slice | Fast and steady: the knife crosses the cake in 2.2 s (the gauge runs sideways under it) | 0.40-0.60 | TOO SHORT / TOO FAR |
| 7 | `spoon` | Cool the Spoon | Hold to blow | Falls fast then slow: v = (1 − e/3)² (the gauge goes **down**) | 0.28-0.50 | TOO COLD / TOO HOT |
| 8 | `milk` | Milk | Hold to pour | Starts 0.25 s late, then v = (e − 0.25) / 3; after letting go the milk in the air still lands (+0.06) | 0.45-0.75 | TOO LITTLE / SPILLED! |
| 9 | `bowl` | Bowl Slide | Hold to push | Speeds up while pushed (0.06·e²) and glides on after letting go: it stops at 0.105·e² | 0.45-0.80 | TOO SHORT / TOO FAR (OFF THE EDGE! past the end) |
| 10 | `jar` | Honey Jar | Hold to swing | A pendulum over the floor: x = 0.5 − 0.42·cos(2πe / 4); letting go drops the jar straight down onto the crate (or the floor) | 0.24-0.76 | TOO LEFT / TOO RIGHT |
| 11 | `bell` | Bell | Hold to swing | A strength test: the puck rises 0 → 1 in 2 s, falls back in 2 s, again; letting go rings the bell beside the band | 0.70-0.86 | TOO WEAK / TOO HARD |
| 12 | `swing` | Rope Swing | Hold to swing | Growing swings, highest at e = 1, 3, 5 s (tops 0.40, 0.65, 0.90); letting go flies her to that distance; the dock sits just short of one top | 0.36-0.90 | SPLASH! / TOO FAR |

The value is one number from `evaluate(page, h, t)` in a pure module; the drawing only shows it. "Too little" is always blue with
a ▼, "too much" red with a ▲, the band green with a ✓ notch (colour plus shape everywhere).

**Easy set** (pages 1-3 of a match and the first pages of a run): porridge, chair, pillow, toast, balloon. Milk and bowl (the
"it keeps going" pages) and the swinging pages (jar, bell, swing) never come before page 4.

**Every page reads in under a second:** the object, its band and "Hold" are on screen together from the first frame; the only
words are the page's name, its 1-3 word cue and the twist's card. Two pages from the plan (Door, Honey Scale) were cut because
they needed explaining.

**Speed and the band** (a "level" sets both): speed multiplies the motion (time scales by 1/speed); the band's half-width `w`
shrinks. **Twists** (one at a time, named on the intro card with a big icon, from the middle of a match):

| Twist | Card | What changes | Pages it suits |
|---|---|---|---|
| Moving | **It moves!** | The band drifts: c(t) = c₀ + 0.10·sin(2πt·speed / 2.6 + φ) (less near the ends), t from the page's start | porridge, toast, cake, spoon, milk, bowl, jar, bell |
| Foggy | **Foggy!** | While you hold, a cloud rolls over the gauge and the object: the band stays painted on the cloud, a ghost of the needle shows through, and the holding tone still rises with the fill and turns sweet in the band. Judgeable by ear and by the ghost, never a guess | porridge, chair, pillow, toast, spoon, milk |
| Wobbly | **Wobbly!** | The value shivers: v + 0.025·sin(2πe / 0.33) (the pot rattles, the chair rocks) | porridge, chair, toast, cake, spoon, milk |

**Scoring a page** (d = distance from the band's centre, w = half-width, p = perfect radius = min(0.02, w / 2)):
- d ≤ p: **100**, the **JUST RIGHT!** stamp.
- p < d ≤ w: 100 → 70 in a straight line: **Almost!** (green).
- d > w: 60 → 0 over the next 0.20: the page's too little / too much word.
- Balloon above its pop line, or never pressed (**Asleep**, zZz): 0.

**A beginner** holds until the band and lets go when they see the green: they're late by their reaction time (≈ 200 ms) on the
fast pages, late on the "keeps going" pages, and fooled by the chair's cushion and the swing's tops. Scores 50-75.
**An expert** knows each motion: lets go *before* the green on milk and bowl, counts pumps on the pillow, rides the chair's
cushion, picks the slowest crossing of the honey jar (near the ends, not the middle), lets go on the rise of the bell, waits for
the right top on the swing, plays fog by ear, and times the wobble's trough. Scores 85-100, and chases perfect streaks.

## Multiplayer

- **Public game**, `rooms.join({ maxPlayers: 8, minPlayers: 1, lobby: 'bar', settings: [{ id: 'pages',
  label: 'Pages', options: [8, 12, 16], default: 12 }] })`. Friends get private servers from the platform. Joined once, on load.
- **Lobby** (the bears' table in 3D, the platform's Ready/Start strip below): everyone who's here sits at the long table in
  their own look and hat, a name tag over each; Pages (8, 12, 16) for the host (`room.setSetting`, the room clears ready
  flags); empty places offer `ow.ui.showInvite()` in a private server. Public servers start
  on the room's countdown once everyone is ready; private ones wait for the host's Start (`room.canStart`). Joining never starts
  anything. The strip stays up on every screen of the lobby phase.
- **Bots** (`createBots`, `fill: 6`, thinking on the host only) fill seats up to six; up to eight real players. Bots are the
  woodland folk, each a name, a face and a habit: **Ottoline** (sharp, steady), **Fen** (good, a little early), **Corvin** (steady),
  **Hazel** (presses at once, erratic), **Sorrel** (jittery), **Prickle** (eager: lets go early), **Burdock** (slow: late),
  **Moss** (clumsy: the odd blunder). Each is one of the cast in their own colours, with a portrait for the HUD.
- **Match:** `createMatch` with `introSeconds: 0` (the page's 1.5 s intro is the start of its round, so the page is dealt and
  drawn from the first frame), `roundSeconds: 12` (a safety net), `roundEndSeconds: 3.4` (the reveal), `resultsSeconds: 12`
  (the podium), `admit: 'next'`. Page 1 is always gentle Porridge; pages in the first third
  play at speed 1.0 with w 0.075, the middle third at 1.15 with w 0.06 and a 30% twist chance, the last third at 1.3 with w 0.05
  and always a twist. **The last page is worth double** (the bears are at the door): a player behind can still catch up.
  12 pages ≈ 2 min 10 s with the podium; 8 ≈ 1 min 30; 16 ≈ 2 min 50.
- **A seated player reloading mid-story** goes straight into the story. **Latecomers** watch ("Watching" where the cue would be) and see every reveal. **Leavers** keep their
  seat and points (greyed); an away player scores 0 on the pages they miss and plays on when back. **Host change** carries on from
  the match record (`createMatch`); bots re-plan on the new host.
- **Netcode (who does what):**
  - The host's `startRound` writes the page into `match.data`: `{ g: page id, c: band centre ×1000, w: half-width ×1000, sp:
    speed ×100, tw: twist, ph: twist phase ×1000, n: page number, x2: last page, marks: {}, done: {}, seen: {} }`, from the
    match's seed, so a new host would deal the same page.
  - **Every page simulates its own hold locally** (no network while holding) and, on letting go, calls the rpc
    **`mark({ r: round, h: held ms, t: release ms since the page began })`** once. The host checks it (the page is playing, `r` is
    this round, the sender has a seat and no mark yet, h ≤ win + 500, h − 300 ≤ t ≤ elapsed + 1500, at most 4 a second),
    runs the same pure `evaluate(page, h, t)`, and writes `marks[seat] = { v, d, s, k }` and `done[seat] = 1`. A page can't send
    a score, only what it did.
  - The page shows its own verdict at once from the same `evaluate`; the host's copy is what the reveal and the points use.
  - **Presence** is only `{ k: round id, s: 0 waiting | 1 holding | 2 let go }`, for the heads along the top that wiggle while a
    player holds. Validated, and ignored when `k` isn't the current round.
  - The host's `onTick` ends the page when every present seat has a mark, or at `win` + 0.8 s; `score` returns
    `{ seat: points }` (doubled on the last page). Bots plan a press delay and a hold when the page begins and call `mark` through
    `host.callAs` once their virtual release time has passed (their `h` is the planned one, so the 200 ms think rate costs nothing).
  - The reveal can be skipped: a tap during it calls the rpc `seen({ r })`; once every present player has tapped (and at least
    1.4 s have passed), the host calls `match.skip()`.
  - Whoever reads anything from the room checks its shape and range first (page id in the list, numbers in their bounds, at most
    8 + 6 seats); names are drawn as canvas text only.

## Before the Bears (the run)

The main solo mode, and the one that keeps people coming back. Endless pages, faster and narrower as you go, **three bears =
three lives**: stop outside the green (or fall asleep) and a bear bangs through the front door and stays in the room, watching
from the edge of the picture; the third ends the run.

- **Points:** the page's score × the streak multiplier (×1, +1 for each perfect in a row, up to ×5; any non-perfect resets it).
  A perfect streak turns the whole picture golden and the band in the music joins in.
- **The Bears' Cupboard:** every fifth page, pick one of three **charms** (seeded per run): Big Spoon (wider green), Slow Clock
  (slower pages), Golden Notch (bigger perfect), Spare Pillow (forgive a miss, stacks), Honey Pot (honey ×2), and as your rank
  rises Steady Paws (no twists), Crystal Ball (see where it will land), Hot Streak (streak to ×8), Honey Trail (a bear goes back
  out), and the risky ones: Tiny Spoon (thin green, points ×1.5), Quick Paws (faster, ×1.4), Lucky Star (perfects +50). Every
  run is a different build.
- **The Three Bowls (boss):** every tenth page Papa and Mama Bear sit at the table with Goldi and three bowls: three holds in a
  row, one page number, each bowl its own band. Clean them all for 60 honey and the Three Bowls badge; a missed bowl costs a
  bear, but the run goes on.
- Pages come from a shuffle bag; level = pages cleared / 5 sets speed and band width; twists from level 2.
- **Run over:** the bears in the doorway, the score, pages and best streak, honey earned, the rank bar filling, the
  `before-the-bears` board, **Again** and **Lobby**.

## Daily Porridge, the Storybook

- **Daily Porridge:** ten pages fixed for everyone today (pages, bands and twists from the UTC date's seed), rising from level 0
  to 4, no lives, score out of 1,000. Unlimited tries; today's best and a day streak. Every score goes on the shared `daily`
  list, so the end screen shows **today's board** of everyone who played it.
- **The Storybook** (practice): a page for every scene, each with its picture (rendered from the game), 0-3 stars (★ 70+,
  ★★ 90+, ★★★ a perfect) and a lock until you've met it. Tap one: play it again and again at speed 1 with a new band each go.

## Progression and reasons to come back

- **Honey** is earned everywhere (a drop per 40 points, two more per perfect, more from tasks and bosses) and spent in the
  **Wardrobe**: seven characters (Goldi, Rosie, Bramble, Sky, Pepper, and two bears, Cub and Bao), seven hats (bow, party hat,
  beret, acorn cap, chef hat, sun hat, and the crown for ten stories won) and six stamp inks (the colour of your own JUST RIGHT!
  stamp; Gold Leaf shines). Some open with a rank. Goldi turns by the parlour fire to show each one off.
- **Ranks** from points (xp): Lost in the Woods → Porridge Taster → Chair Tester → Pillow Fluffer → Honey Finder → Bear Friend
  → Cottage Regular → Just Right. Ranks open new charms and Wardrobe items.
- **Three tasks a day**, the same for everyone (perfects, a page done just right, a long run, a streak, the daily, a story, the
  boss, or a mishap like "Pop the balloon"), paid in honey.
- **Perfects in the woods today:** one shared counter (`ow.data`, resets daily) everyone adds their perfects to, on the title.
- **Leaderboards:** `before-the-bears` (best run), `perfect-streak` (longest run of perfects), `stories-won`.
- **Saves** (`ow.save`, key `profile`, cleaned on load): honey, xp, pages met and stars, perfects, bests, wins, the daily
  streak, what you own and wear, today's tasks, charms seen.
- **Badges** (12, medals with a brass rim):

| id | Name | Earned by |
|---|---|---|
| `just-right` | Just Right | Your first perfect |
| `perfect-streak` | Perfect Streak | Five perfects in a row |
| `too-hot` | Too Hot | Boil the porridge over |
| `broke-the-chair` | Broke the Chair | Crack the little chair |
| `porridge-pro` | Porridge Pro | Ten perfect porridges |
| `before-the-bears` | Before the Bears | Score 2,500 in one run |
| `daily-porridge` | Daily Porridge | Finish a daily |
| `every-story` | Every Story | Play all twelve pages |
| `happily-ever-after` | Happily Ever After | Win a story with three or more at the table |
| `three-bowls` | Three Bowls | Beat the Three Bowls in Before the Bears |
| `all-dressed-up` | All Dressed Up | Buy something in the Wardrobe |
| `cottage-regular` | Cottage Regular | Reach the rank Cottage Regular |

## Art direction

- **A golden-hour dollhouse.** The cottage is built in code around CC0 models (see CREDITS.md): four rooms cut open at the
  front with timber frames, wainscot, patterned wallpaper per room (kitchen tiles, dining stripes, parlour damask, bedroom
  stars), plank floors, round rugs, curtains, shelves full of jars and books, a fireplace, a front door that swings open when a
  bear comes home. Outside: a garden path, flowers and grass, a pond with a raft and a rope swing, a well, a honey crane by the front door, a
  strength tester with a bell, and layered woods.
- **Light:** a low warm sun with soft shadows aimed at the room in view, a sky light, a room environment for the brass and
  glass; post: bloom, ACES, a colour grade (warm highlights, cool shadows, and a golden mode for streaks), tilt-shift for the
  miniature feel, vignette, SMAA. Low quality drops the post and the shadows, not the look.
- **Palette:** cream `#F7E8CB`, honey `#F2B33D`, cottage red `#C8442F`, moss `#5E8C3A`, the green band `#3FA34D`, cold blue
  `#5FA8D8`, ink `#1D2440`, wood `#C98A4E`. Too little is always blue with ▼, too much red with ▲, the band green with a ✓.
- **The cast:** Quaternius' chibi characters with 30 animations, recoloured in code: Goldi (blond, a blue jacket), the
  woodland folk, and the three bears (Papa in green, Mama in cream with a red band, Baby in red), all with hats from the
  Wardrobe.
- **The gauge is a brass thermometer** standing beside each station (glass with a fresnel rim, mercury that wobbles, the band
  painted on, a ✓ notch), or lying under the sideways pages.
- **Type:** **Fraunces** Black for the name, page titles and numbers; **Barlow Condensed** ExtraBold for labels and the stamp.
  Self-hosted woff2 with their OFL licences.
- **The signature: the red rubber stamp.** JUST RIGHT!, TOO HOT!, and the winner are slammed down with a hit-stop
  and a thump, inked onto a worn paper label so they read over any scene; perfects use the player's own ink.

## Animation and feel

- **Every page is a small scene that acts:** Goldi works the stove under a rattling pot; lowers herself onto Baby Bear's chair as the
  gauge fills (the sit-down clip follows the gauge) and goes over backwards when it snaps, the pieces bursting out; pumps a
  balloon until it pops; fluffs and flops onto the pillow; blows on a spoon; pours milk from a jug held in both hands while
  standing on a stool; pushes a bowl down the table; swings a honey jar on a crane; hits a strength tester to ring the bell;
  swings from the rope over the pond onto the raft (or into the water).
- **Characters** blend their clips (crossfades), look at what they're doing, blink now and then (sometimes twice), and react: a
  yes, a no, a stumble, a cheer. Their faces act too: eyes shut in a smile (^ ^) for the green, on the podium and in the
  Wardrobe; screwed shut (> <) for a miss or when a bear bangs through the door; closed if you never pressed.
- **Juice:** hit-stop on stamps and cracks, directional shake, pooled particles (sparkles, crumbs, foam, steam, splashes,
  feathers, splinters, confetti), the camera leaning in while you hold and punching in on a perfect, slow glides with an arc from
  room to room, the reveal tokens dropping in one by one, counts ticking, buttons pressing.
- **Feel:** the hold is timed from the input events, never from frames; the scene answers in the same frame; 60 fps with
  pooled effects and shaders compiled up front; the platform's quality setting picks high, medium or low. Reduced motion: no shake, push or
  flash.

## Sound

All made with Web Audio: the holding tone (its pitch is the gauge; it chimes inside the band), each station's own layered
noises (bubbles, creaks and a CRACK, pumps and a POP, glugs, a toaster ding, a bell, a splash), verdicts, the bears' growls and
the door bang, and a folk band that builds with the run (bass and plucks, then the fiddle, then claps and a glockenspiel, the
whole band on a streak), ducked while you hold.

## Every screen

The 3D world fills the screen at every size; the HTML UI floats over it. The camera frames each view inside the part of the
screen the menus leave free (beside the Wardrobe panel, above a phone's lobby cards). The top-left (or `ow.ui.reserved`) stays
clear.

- **Title:** the cottage from the front path, the stamp and the loading bar, only until the game has loaded.
- **The bears' table:** the lobby (above), with the solo modes beside it (below it on an upright phone).
- **Page:** "Page 4 of 12" and the page name slammed in, the twist's tag, the cue with the Space key or a fingertip. HUD: the
  page pips (coloured by how each went), the other players' faces (wiggle = holding), the score on a wooden sign, honey, the
  streak medallion, the bears home (paws, bottom left) and the charms held.
- **Reveal:** the giant thermometer over the parlour fire with everyone's face on it, standings below, "Space to go on".
- **Podium:** the winner crowned in Baby Bear's little chair, everyone around it waving, confetti, the bears walking in from
  the dining room.
- **The Bears' Cupboard, run over, daily over, the Storybook, the Wardrobe, pause, room closed.**
- Phones: 390×844 and 844×390 both work; nothing under the platform's buttons.

## Store art and the trailer

- `?poster=<name>` stages one deterministic frame with the game's own renderer: **cover** (Goldi at the three bowls with
  Papa Bear in the doorway and the stamp), **action** (Goldi in the air off the rope swing), **win** (the podium), **multi**
  (eight at the bears' table), **icon** (Goldi holding a steaming bowl, on a brass medal) and **badge-<id>** (a modelled
  subject on a coloured disc behind a brass rim). Rendered with `_tools/originals/posters.mjs`.
- `?poster=dev-…` draws development pictures (the cast, a page mid-hold or after its verdict, any camera, the portraits).
- **Trailer** (`store/trailer.mp4`): real play captured with `?autoplay=1` (the bot brain plays for the local player;
  `&clumsy=1` for misses, `&solo=run` for Before the Bears, `&from=9` to start a run at page 9, `&short=3` for a three-page
  story), with the game's own sound. These only work on a local host; `?debug=1` adds the numbers behind the picture.

## Tech

three.js 0.186 with postprocessing, built by Vite into `dist/` (`"dir": "dist"`). `src/core` is pure and tested with
`node --test`: `pages.js` (the twelve motions, `evaluate`), `plan.js` (match pages, levels, the daily), `run.js` (Before the
Bears), `charms.js`, `progress.js` (ranks, honey, the Wardrobe, profiles), `tasks.js`, `brain.js` (the folk and the
autoplay hand), `stage.js` (the hold clock), `net.js` (room, match, marks), `rng.js`. Around them: `gfx/` (renderer and post,
asset loading, the cast with its animation API, the camera rig, particles, palette), `world/` (the cottage, the twelve stations,
props made in code, the gauge, hats, textures), `play/world.js` (what's on show: pages, the table, the reveal, the podium, the
Wardrobe, the bears), `ui/` (HTML screens and the HUD), `audio/`, `dev/` (posters), `app.js` (the flow and input).
Models are merged by `tools/assets.mjs` into three meshopt-compressed GLBs (about 4 MB); the whole build is about 7.5 MB.

**Tests** (`npm test`): every page's motion, scoring edges and `readPage`; the stage; match, daily and run plans; bots and
balance simulations; Before the Bears runs, charms, the boss, ranks, profiles, the Wardrobe, honey and tasks; the room through a
fake hub running the platform's own match helpers; and that badges, store art, shared data keys and Wardrobe items match the
game.

## What the revamp changed

See REVAMP.md for the teardown. The flat 2D canvas version was replaced by the 3D cottage; Before the Bears became a run with
charms, a boss and lives you can see; ranks, honey, the Wardrobe, daily tasks, the shared woods counter and the daily board
were added; every page got a staged scene with real character animation, effects and its own sound.
