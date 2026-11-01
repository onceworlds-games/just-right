# Just Right

## The pitch

**Not too hot, not too cold: hold, let go, and get everything just right before the three bears come home.**

**The goal in one look:** a pot of porridge, a big thermometer beside it with a green band stamped *just right*, and a
pulsing "Hold". Fill it, stop it in the green.

One verb for the whole game: **hold** (Space, the mouse button, or a finger anywhere on the screen) and **let go**. Every page
of the story is a 4-8 second microgame with one thing to fill, raise, heat, pour or swing and one green band. How close you stop
to the middle of the band is your score. Then everyone's marks land on the same gauge at once: the reveal is the laugh.

## The first 60 seconds

| Time | Screen | What happens | Words on screen |
|---|---|---|---|
| 0 s | Title | The bears' kitchen, alive: Goldilocks heats the porridge on her own (the bot brain plays), the thermometer climbs into the green, a red **JUST RIGHT!** stamp thumps down. Next she sits on the little chair: CRACK. Then the balloon, the toast, the milk, the rope swing. The name is stamped big across the top third. | "Just Right" (the stamp), **Play** (a red stamp-shaped button), "Best 1,840" under it once there is one |
| ~3 s | Lobby | Play (tap, click, Space, Enter) starts the sound and the lobby slides in: the bears' long table. You sit at it (your avatar head on a small storybook body); the empty chairs hold the woodland rivals who would play (a fox, a hare, an owl...). Three bowls on the shelf are the match length; on the wall a cuckoo clock (Before the Bears), a calendar (Daily) and a bookshelf (Practice). The platform's Ready strip sits along the bottom. | First visit only: "Ready to play" with an arrow to the strip. Object labels: "Before the Bears", "Daily", "Practice", "Pages" |
| ~6 s | Countdown | You press Ready (alone in a server, a match starts with bots). The game's own 3-2-1 over the table: Papa Bear's head pops up with **3**, Mama's with **2**, Baby's with **1**, each with a growl. | 3, 2, 1 |
| ~9 s | Page 1 intro (1.5 s) | Always **Porridge**, gentle (speed 0.85, the widest band). The page's name slams in at the top with the page number under it, like a chapter heading; the band, the pot and "Hold" are all on screen from the first frame. | "Porridge", "Page 1 of 12", "Hold to heat" |
| ~10.5 s | Play | A hand and a Space key pulse under the pot. You hold: the flame grows, the porridge bubbles faster, the mercury climbs, a rising tone follows it and turns sweet inside the band. First page ever: when the mercury enters the band, "Let go!" pops beside it. | "Hold" (until pressed), "Let go!" (first time only) |
| ~13 s | Your result | At release the scene answers within a frame: in the band the spoon dips and **JUST RIGHT!** is stamped (+100), or the pot boils over (**TOO HOT!**, red, steam blast) or grows a cold skin (**TOO COLD!**, blue, frost). The other players' heads along the top tick off as they let go. | The verdict stamp and "+87" |
| ~14.5 s | Reveal (3.4 s) | A cream page slides over the scene with the gauge zoomed on the band. Everyone's markers (avatar heads) drop beside it, farthest first, closest last, each on a leader line to its true place; the closest gets the crown (and the stamp where there's room); points tick into the standings beside it (below it on a phone). A tap skips it once everyone has tapped. | Names, "+100", "+64" |
| ~18.5 s | Page 2 | The bears take a step along the path. **Little Chair**: hold to lower Goldilocks onto Baby Bear's chair; let go too late and it cracks (shake, splinters, a laugh). | "Little Chair", "Hold to sit" |
| ~28-60 s | Pages 3-5 | From the easy set (Pillow, Toast, Balloon): a balloon can POP (gasp), toast can burn. Each new page shows its cue ("Hold to pump") the first two times a player meets it, then just "Hold". | "Hold to pump", "Hold to toast"... |

## Controls

| | Keyboard and mouse | Phone and tablet |
|---|---|---|
| The action | Hold **Space** (or the left mouse button anywhere) and let go | Hold a finger **anywhere** on the game and lift it |
| Menus | Click; **Enter** for the main button (Play, Again); **Esc** goes back from a solo screen and pauses a solo run | Tap |

- No platform stick or buttons: `ow.controls.set(null)` everywhere (the whole screen is the button).
- One hold per page. A key repeat (`event.repeat`) is ignored; a second press after letting go does nothing.
- The hold is timed from the input events' own `timeStamp`s (pointerdown/keydown to pointerup/keyup), never from frames, so 30 and
  120 fps play the same. A blur, `pointercancel` or hidden page while holding lets go at that moment.
- Holding when a page's play begins counts from the moment play begins (players can hold through the intro to be ready); a tap
  that ends inside the intro is forgiven.
- Touch: `touch-action: none`, no text selection, no long-press menu or callout (`-webkit-touch-callout: none`, `contextmenu`
  and `selectstart` prevented), pointer capture on the canvas, so a long hold on a phone is just a hold.
- `controls` in onceworlds.json: `Space` / `Click` / `Tap`: "Hold, then let go in the green"; `Enter`: "Play, again"; `Esc`: "Back, pause a solo run".

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

## Solo

Alone in the lobby, everything is one tap away (all of it ends when a match starts, banking what was scored):

- **A match with bots.** Ready on the platform strip: the same story as multiplayer against five woodland rivals (8, 12 or 16
  pages, 1.5-3 min).
- **Before the Bears** (the cuckoo clock): endless pages, faster and faster, **three bears = three lives**. The rule is one line:
  **stop in the green, or a bear comes home.** A miss (outside the band, or asleep) sends a bear through the door ("Somebody's
  been eating my porridge!"); the third catches you: run over. Score per page = accuracy × streak multiplier (×1, +1 for each
  perfect in a row, up to ×5; any non-perfect resets it). Level = pages cleared / 5: speed 1 + 0.12·level (cap 2.0),
  w = max(0.035, 0.075 − 0.005·level); twists from level 2 (25% chance, +10% a level, cap 70%). Pages come from a shuffle bag
  (no repeats until all twelve were played). A run lasts 1-2 min for a beginner, 5+ for an expert. Personal best on the clock's face;
  leaderboard `before-the-bears`.
- **Daily Porridge** (the calendar): ten pages fixed for everyone today (pages, band centres and twists from the UTC date's
  seed), rising from level 0 to 4, no lives, score out of 1,000. Unlimited tries; the calendar shows today's best and your
  streak of days. (Platform leaderboards never reset, so the daily has no board: today's best and the streak are the reward.)
- **Practice** (the bookshelf): a book for every page you've met (blank spines for the rest), each with 0-3 stars (★ 70+,
  ★★ 90+, ★★★ a perfect). Tap one: play it again and again at speed 1 with a new band each go. Esc or Back returns.

## Multiplayer

- **Public game**, `rooms.join({ maxPlayers: 8, minPlayers: 1, lobby: 'bar', ownCountdown: true, settings: [{ id: 'pages',
  label: 'Pages', options: [8, 12, 16], default: 12 }] })`. Friends get private servers from the platform. Joined once, on load.
- **Lobby** (drawn by the game, the platform's Ready/Start strip below): who's here at the table, the three bowls for the
  length (Baby's = 8, Mama's = 12, Papa's = 16: the host taps one, `room.setSetting`, and the room clears ready flags), a READY
  stamp on each ready player's place card, empty chairs that offer `ow.ui.showInvite()` in a private server. Public servers start
  on the room's countdown once everyone is ready; private ones wait for the host's Start (`room.canStart`). Joining never starts
  anything. The title and solo screens call `room.hideLobby()`.
- **Bots** (`createBots`, `fill: 6`, thinking on the host only) fill seats up to six; up to eight real players. Bots are the
  woodland folk, each a name, a face and a habit: **Ottoline** the owl (sharp, steady), **Fen** the fox (good, a little early),
  **Corvin** the crow (steady), **Hazel** the hare (presses at once, erratic), **Sorrel** the squirrel (jittery), **Prickle** the
  hedgehog (eager: lets go early), **Burdock** the badger (slow: late), **Moss** the mole (clumsy: the odd blunder).
- **Match:** `createMatch` with `introSeconds: 0` (the page's 1.5 s intro is the start of its round, so the page is dealt and
  drawn from the first frame), `roundSeconds: 12` (a safety net), `roundEndSeconds: 3.4` (the reveal), `resultsSeconds: 12`
  (the podium), `admit: 'next'`. Page 1 is always gentle Porridge; pages in the first third
  play at speed 1.0 with w 0.075, the middle third at 1.15 with w 0.06 and a 30% twist chance, the last third at 1.3 with w 0.05
  and always a twist. **The last page is worth double** (the bears are at the door): a player behind can still catch up.
  12 pages ≈ 2 min 10 s with the podium; 8 ≈ 1 min 30; 16 ≈ 2 min 50.
- **A seated player on the title** (a reload mid-story, or the host started while they were there) goes straight into the
  story. **Latecomers** watch ("Watching" where the cue would be) and see every reveal. **Leavers** keep their
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

## Progression and reasons to come back

- **Saves** (`ow.save`, key `profile`): pages met (count per page), stars per page, total perfects, perfect porridges, best run,
  best perfect streak, match wins, daily `{ day, best, streak, lastDay }`, first-time flags for hints.
- **Personal bests** on the title (best run), on the cuckoo clock, on the calendar and on every results screen ("New best!" stamp).
- **Leaderboards:** `before-the-bears` (best run score), `perfect-streak` (longest run of perfects, any mode but Practice),
  `stories-won` (match wins so far).
- **Unlocks:** Practice books appear as you meet pages; stars fill them. Nothing that changes play.
- **Badges** (9; stamps on coloured discs):

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
| `happily-ever-after` | Happily Ever After | Win a story (first place, three or more seats) |

## Balance and timing (the numbers)

| | Value |
|---|---|
| Intro card | 1.5 s (match), 1.0 s (solo) |
| Window to play a page | clamp(time to fill at this speed + 2.0 s, 4.5, 8) s; jar and bell 6 s; the swing max(6, 5 / speed + 1.7) s. A pocket watch appears only when 3 s are left and the player hasn't pressed |
| Reveal | 3.4 s (markers 0.12 s apart from 0.3 s, then the crown, then points); skippable after 1.4 s once everyone has tapped |
| Solo verdict | 1.3 s in the band, 1.9 s when a bear comes home |
| Perfect radius | ±0.02 of the gauge (≤ half the band) |
| Band half-width | 0.08 (page 1 of a match) → 0.075 → 0.06 → 0.05; solo 0.075 → 0.035 |
| Speed | 0.85 (page 1) → 1.0 → 1.15 → 1.3; solo 1.0 → 2.0 |
| Match | 8 / 12 / 16 pages, ≈ 8-10 s each; last page ×2 |
| Bot timing | press delay per character (0.15-1.4 s); hold error N(bias, σ) with σ = 170 − 130·skill ms (×1.5 in fog; the "keeps going" pages add a late bias of up to 0.04 for the less skilled); blunder chance 0.05·(1 − skill)·habit (±300-700 ms, or a quarter of the time forgetting to press) |
| Bot skills | Ottoline 0.82, Fen 0.72 (−20 ms), Corvin 0.65, Hazel 0.55 (presses at once), Sorrel 0.5, Prickle 0.45 (−50 ms), Burdock 0.4 (+60 ms, slow to press), Moss 0.3 (clumsy) |

**How it's checked (`npm test`, 30 node tests through the pure modules and a fake room):**
- Every page: v stays in [0, 1] with no NaN at every speed and twist; the filling pages only go one way; the keeps-going pages end
  further than they showed; every band is reachable inside the window with time to spare at every tier; the pop line, the spoon's
  fall, the chair's cushion, the pillow's pumps, the swing's tops and the moving band behave.
- Scoring at the edges (perfect, the band edge, outside, asleep, a pop); `readPage` refuses garbage.
- The stage (the hold clock): timed from event timestamps, capped by the window and the travel; holding to the end lets go by
  itself; nobody pressing sleeps; the swinging pages let go when the window closes.
- Plans: a match is deterministic, gentle porridge first, no late page early, no page twice in a row, the last page double; the
  daily is the same today for everyone and different tomorrow; Before the Bears speeds up and narrows.
- Bots: always a legal hold inside the window, better with skill; seeded matches among the folk have no runaway leader and pages
  end in the designed time; a Before the Bears run ends, and 2,500 takes skill.
- The room, through a fake hub running the platform's own match helpers: a whole story with the folk, a mark taken once and
  checked, the host reloading and a player dropping mid-page, a latecomer who watches then plays, the reveal skipped once everyone
  taps.

## Every screen

All screens are the cottage; the world fills the screen at every size. The top-left 150×70 (or `ow.ui.reserved`) stays clear.

- **Title:** the kitchen in attract mode (the bot brain plays porridge, chair, balloon, toast, milk and the swing in a loop with
  real stamps), "Just Right" slammed across the top third, Play (red stamp-button) in the lower middle, the best run under the
  name. Nothing else.
- **Lobby:** the long table seen from the front, chairs in a row (8 on a wide screen; two rows of 4 on a phone held upright).
  Each seat: avatar head on a storybook body, the name on a place card, a READY stamp when ready, a small crown on the host. The
  three bowls on a shelf with 8 / 12 / 16 under them; the host's choice steams and gets a green dot. On the wall: the cuckoo
  clock "Before the Bears" (best on its face), the calendar "Daily" (today's date and best), the bookshelf "Practice" (2×2 on an
  upright phone, where they take the window's place). After a match, the last winner's face is framed on the wall. Bottom 88 px
  left for the Ready strip. In a private server with friends waiting, the host's solo objects are dimmed.
- **Countdown:** the bear heads 3-2-1 over the lobby (Papa, Mama, Baby), the only countdown (`ownCountdown: true`).
- **Page intro:** the page's scene, its name slammed in at the top, "PAGE 4 OF 12" under it, the twist's stamp, a first-time
  hint ("It keeps pouring!") in red.
- **Play HUD:** top strip: the woodland path with a stepping stone per page and the three bears walking along it (multiplayer) or
  the three bears in the woods vs at the door (solo lives); the other players' heads in a row under it (wiggle = holding, ✓ stamp
  = done); your total and place on a hanging wooden sign top right (solo: score and ×multiplier). Bottom: the cue with the Space
  keycap or a fingertip. The object centre-left, its gauge big beside it; the sideways pages (cake, bowl, jar, swing) put the gauge
  under the object. On an upright phone the scene keeps its proportions a little below the middle, the gauge on the right.
- **Reveal:** a cream page over the scene: the gauge zoomed on the band, every marker (avatar head, name and points beside it,
  spread in one dimension with leader lines so 8 never overlap), the closest crowned, the JUST RIGHT! stamp beside it where there
  is room; standings on the right (wide) or below (upright, all eight rows), points ticking in.
- **Results / podium:** first place sits in Baby Bear's little chair (crowned, "1st" on its rail: the one that is just right),
  second in Mama's, third in Papa's, the rest along the bottom with places and points, the JUST RIGHT stamp, oats for confetti.
  Wide: the door on the back wall opens and the bears walk in; upright: they glare through the window. Baby Bear: "Someone's
  in my chair!". After 12 s the lobby returns with the winner framed.
- **Solo run:** the play HUD with lives; when caught: the bears in the doorway, the score huge, best, **Again** (Enter/Space/tap,
  64 px) and **Lobby**.
- **Daily end:** the calendar page with today's score /1000, best today, streak; **Again**, **Lobby**.
- **Practice shelf:** the bookshelf filling the screen, twelve spines with names and stars (a "?" until met); tap to play;
  **Lobby** (Back from a practice page returns to the shelf).
- **Pause** (solo only, on the platform's pause or a hidden page): the scene stops, a cream card with **Resume** and **Lobby**.
- **Room closed:** one message and one button: "You were removed" / Play, "Lost the connection" / Rejoin, "Playing in another
  tab" / Play here.

## Art direction

- **The world:** the three bears' cottage in the woods, as a mid-century picture book: flat geometric cut shapes in confident
  colour, crisp edges, no outlines on the set and a 3 px ink outline on characters and the thing you control (so they pop), soft
  offset shadows. Lollipop and triangle trees, timber beams, a round window to the woods, a checked red tablecloth, copper pans,
  three of everything in three sizes. Flat colour, no paper grain; the stamp is the only texture.
- **Palette:**
  - Cream `#F3E3C3`: walls, pages, light text
  - Ink blue `#1E2747`: outlines, night, dark text
  - Cottage red `#D2452B`: the stamp, "too much"
  - Mustard `#E8A92E`: porridge, honey, Goldilocks's hair, highlights
  - Forest green `#2F7A4E`: the just-right band
  - Cold blue `#4C8DC9`: "too little", frost
  - Bear brown `#7B4A2B`: wood, the bears
- **Type:** **Fraunces** (Black, a soft old-style serif like 1970s picture-book covers) for the name, page titles and big
  numbers; **Barlow Condensed** ExtraBold for stamps and labels (capitals only inside stamps). Self-hosted woff2 (latin, the
  weights used) with their OFL licences; canvas text waits for `document.fonts.load` with a 1.5 s timeout.
- **The signature: the red rubber stamp.** A double-ruled, slightly rotated rectangle with condensed capitals and an inked edge,
  slammed down with an 80 ms hit-stop and a thump: "JUST RIGHT!" on a perfect, the title, READY in the lobby, the winner's name,
  "New best!", the badges and the store art.
- **Light and camera:** 2D, layered planes with gentle parallax (woods through the window, back wall, furniture, the object);
  warm light shafts from the window and the stove's flicker. While you hold, the view pushes in by 4% (tension); cracks, pops and
  splashes shake it (trauma², smooth). Reduced motion: no push, shake or flash; stamps fade in.
- **Characters:** Goldilocks (golden curls, a mustard pinafore) acts in the scenes. Players are their **avatar heads**: on spoons
  in the reveal, on storybook bodies at the table and on the podium chairs; you get a mustard ring and a "You" arrow. The bears:
  Papa (big, dark brown, heavy brows, grumpy), Mama (middle, an apron, sweet), Baby (small, red overalls, sleepy). The woodland
  rivals: flat animal heads in the same style.
- **The HUD speaks the book:** the woodland path is the clock of the match and the bears are the lives, the score hangs on a
  wooden sign, the page number is a chapter heading, verdicts are stamps, the window's last seconds are a pocket watch.
  Words over the busy scene are cream on an ink band or ink with a cream outline.
- **Phones:** 390×844 and 844×390 both work; text ≥ 18 px; buttons ≥ 56 px; nothing under the platform's buttons.

## Sound

All synthesized (Web Audio), through one mixer.
- **The holding tone:** a soft triangle tone that rises with the gauge (220 → 880 Hz) and gains a chime layer inside the band:
  you can hear the green.
- **Pages:** porridge bubbles and a sizzle; chair creaks and a CRACK (noise burst + low thump); pillow whumps on every pump;
  milk glugs; toaster ticks and a pop-ding; balloon squeak and POP; knife scrape; jar clink (or crash); a big bell DING; bowl
  scrape and clatter; breath for the spoon; rope whoosh and a splash.
- **Verdicts:** perfect = bright ding + stamp thump; in the band = a pluck; a big miss = a sad trombone; the crown in the reveal = a
  little fanfare.
- **The bears:** growls on the countdown and when one comes home, footsteps on every step along the path, a roar at the door.
- **Music:** a folk-band polka from a small sequencer in G (oom-pah bass, plucked chords, a fiddle-like lead with vibrato,
  woodblock), 112 bpm, rising to 140 by the last page; only bass and plucks, quieter, in the lobby; ducked while you hold.

## Store art and the trailer

- **Cover** (thumb-1): the porridge pot steaming, the big thermometer with its green band, six players' markers clustered on
  it, the JUST RIGHT stamp, the three bears peering through the round window.
- **Action** (thumb-2): Goldilocks dropping as the little chair cracks (the heart-backed chair snapping, splinters), CRACK!
  stamped, the bears roaring at the window.
- **Win** (thumb-3): the podium: the winner crowned in Baby Bear's little chair, second and third in the bigger ones, places on
  the rails, the bears in the doorway ("Someone's in my chair!"), oats for confetti, the JUST RIGHT stamp.
- **Multi** (thumb-4): a reveal with eight markers on the gauge, the crown on the closest, the stamp, the standings.
- **Icon:** Goldilocks peeking over a red bowl of porridge on storybook blue, full bleed. No text.
- **Badges:** a symbol on a coloured disc each (a check, stars, a flame, a broken chair, a bowl with 10, Papa Bear's head, a
  calendar, an open book, a crown).
- **Trailer** (`store/trailer.mp4`, 23 s): real play captured with `?autoplay=1&pages=8` (the bot brain plays for the local
  player; `&clumsy=1` lets go late, for the misses), cut hard: the porridge held into the green and stamped JUST RIGHT! with
  its reveal, then TOO HOT, TOO FLUFFY and TOO HARD, the rope swing and its reveal, the podium, and the title's stamp.
- `?poster=<name>` draws one staged frame for the store art; `<name>.390x844` draws it at a phone's size, to check layouts
  (`lobby`, `runover`, `daily`, `shelf` exist for that, and `page-<id>` / `page-<id>-<gauge %>` for one page as in a match).

## Originality check

- **Resembles:** microgame collections (quick varied minigames), golf-style "stop the meter" bars, party-game minigame hubs.
- **What a player notices in the first minute that is different:** one verb for everything; no pass/fail: every page is scored
  by how close you got, and **everyone's marks land on the same gauge at once** (the reveal is the joke and the brag); every page
  is a different *motion* to learn (lagging milk, a gliding bowl, a cushioned chair, growing swings) rather than a different
  control; Goldilocks's "too hot / too cold / just right" is the scoring itself; the bears are the clock of the match and your
  lives alone; a mid-century picture-book look with a red stamp.

## Changes from the spec, and why

- **No "fake band" twist.** A decoy band breaks "understood in seconds". In its place: **Foggy!** (the gauge clouds over: play by
  rhythm), which tests the same mastery without lying to the player.
- **Twelve pages:** "Wind the music box" is out (its clicks felt like the pillow's pumps). "Stack the honey jars" became a
  pendulum drop onto a crate, and two motions were added: the gliding **Bowl Slide** and **Cool the Spoon** (the gauge falls).
  The Door and the springy Honey Scale were built on paper and cut: neither read in a second.
- **The intro is part of each round** (`introSeconds: 0`, 1.5 s into the round): the page is dealt before it's drawn, so the
  band, the object and "Hold" show together from the first frame.
- **The solo miss rule is one line:** outside the green (or asleep) = a bear comes home.
- **The Before the Bears badge is 2,500** (1,000 comes after about 12 pages for an average player). Final value set by the sims.
- **The last page of a match is worth double**, so a player behind can still catch up.
- **Bots fill to six seats** (up to eight real players): enough of a crowd for the reveal, quicker to read on a phone.
- **Goldilocks is drawn**; players are their avatar heads on spoons, at the table and on the podium (the spec left this open).
- **The daily has no leaderboard** (platform boards never reset): today's best and a day streak instead.

## Tech

Canvas 2D, plain ES modules in `game/` (`"dir": "game"`, no build), drawn at `ow.settings.pixelRatio(2)`. Pure modules (no
`window`, `document` or SDK at import), tested with `node --test`: `pages.js` (the twelve motions, `evaluate`), `plan.js` (match
pages, solo levels, the daily), `brain.js` (the folk and the attract/autoplay player), `stage.js` (the hold clock), `rng.js`.
Around them: `net.js` (join options, `createMatch`/`createHost`/`createBots` from `/__onceworlds/v1/`, marks and the skip),
`kit.js` (palette, type, shapes, Goldilocks, the bears, the folk, the stamp), `gauge.js`, `rooms.js` (the kitchen and the
clearing, cached per size), `scenes.js` (the twelve scenes and their bursts), `view.js` (one page on screen, shared by play, the
title and the posters), `fx.js` (pooled particles, stamps with hit-stop, trauma² shake), `layout.js` (HUD and stage around the
platform's reserved areas), `screens.js` (HUD, intro, prompt, reveal, countdown, lobby, podium, solo screens), `ui.js` (the real
buttons over the canvas), `audio.js` (synthesized sound and the polka), `poster.js`, `main.js`. Particles pooled (220, 80 on low
quality). Poster mode (`?poster=`) skips the SDK and draws one staged frame.

## Risks

- **"It's all the same button."** Each page's motion and consequence must be different and readable at a glance; two pages
  that didn't reach the bar were cut.
- **Input fairness across devices:** event timestamps, not frames; blur and cancel let go; the window is generous.
- **The "keeps going" pages feel unfair to beginners:** they never come before page 4, they carry a first-time hint ("It keeps
  pouring!", "It keeps sliding!"), and the reveal shows where the milk actually landed.
- **Eight markers on a phone gauge:** a 1D label layout fans names to both sides with leader lines; tested at 390×844.
- **Twelve scenes of art:** one shared kit (room, table, window, Goldilocks and bear rigs, gauges) so every page is one object
  and its motion, in one look.
- **Avatars that fail to load:** a coloured disc with the initial, same frame.
- **A player in a solo run when strangers ready up:** the run banks its score ("The bears are back!") and they watch the match.
