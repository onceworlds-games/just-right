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
| 0 s | Title | The bears' kitchen, alive: Goldilocks heats the porridge on her own (the bot brain plays), the thermometer climbs into the green, a red **JUST RIGHT!** stamp thumps down. Next she sits on the little chair: CRACK. The three bears walk past the round window in the woods. The name is stamped big across the top third. | "Just Right" (the stamp), **Play** (a red stamp-shaped button), "Best 1,840" under it once there is one |
| ~3 s | Lobby | Play (tap, click, Space, Enter) starts the sound and the lobby slides in: the bears' long table. You sit at it (your avatar head on a small storybook body); the empty chairs hold the woodland rivals who would play (a fox, a hare, an owl...). Three bowls on the shelf are the match length; on the wall a cuckoo clock (Before the Bears), a calendar (Daily) and a bookshelf (Practice). The platform's Ready strip sits along the bottom. | First visit only: "Ready to play" with an arrow to the strip. Object labels: "Before the Bears", "Daily", "Practice", "Pages" |
| ~6 s | Countdown | You press Ready (alone in a server, a match starts with bots). The game's own 3-2-1: Papa Bear's head pops up with **3**, Mama's with **2**, Baby's with **1**, each with a growl-pop; then the three walk out of the door onto the path at the top of the screen. | 3, 2, 1 |
| ~9 s | Page 1 intro (1.5 s) | Always **Porridge**, gentle (speed 0.85, the widest band). The page's name slams in, the green band shimmers once. Page number at the bottom like a book. | "Porridge", "Hold to heat", "Page 1 of 12" |
| ~10.5 s | Play | A hand and a Space key pulse under the pot. You hold: the flame grows, the porridge bubbles faster, the mercury climbs, a rising tone follows it and turns sweet inside the band. First page ever: when the mercury enters the band, "Let go!" pops beside it. | "Hold" (until pressed), "Let go!" (first time only) |
| ~13 s | Your result | At release the scene answers within a frame: in the band the spoon dips and **JUST RIGHT!** is stamped (+100), or the pot boils over (**TOO HOT!**, red, steam blast) or grows a cold skin (**TOO COLD!**, blue, frost). The other players' heads along the top tick off as they let go. | The verdict stamp and "+87" |
| ~14.5 s | Reveal (≤ 4 s) | The thermometer slides to the middle, big. Everyone's markers (avatar heads on spoons) drop onto it, farthest first, closest last; the closest gets the crown and the stamp; points fly to the standings beside it. | Names, "+100", "+64", verdict words |
| ~18.5 s | Page 2 | The bears take a step along the path. **Little Chair**: hold to lower Goldilocks onto Baby Bear's chair; let go too late and it cracks (shake, splinters, a laugh). | "Little Chair", "Hold to sit" |
| ~28-60 s | Pages 3-5 | From the easy set (Pillow, Toast, Balloon): a balloon can POP (gasp), toast can burn. Each new page shows its two-word verb the first two times a player meets it. | "Hold to pump", "Hold to toast"... |

## Controls

| | Keyboard and mouse | Phone and tablet |
|---|---|---|
| The action | Hold **Space** (or the left mouse button anywhere) and let go | Hold a finger **anywhere** on the game and lift it |
| Menus | Click; **Enter** for the main button (Play, Again); **Esc** goes back from a solo screen and pauses a solo run | Tap |

- No platform stick or buttons: `ow.controls.set(null)` everywhere (the whole screen is the button).
- One hold per page. A key repeat (`event.repeat`) is ignored; a second press after letting go does nothing.
- The hold is timed from the input events' own `timeStamp`s (pointerdown/keydown to pointerup/keyup), never from frames, so 30 and
  120 fps play the same. A blur, `pointercancel` or hidden page while holding lets go at that moment.
- Holding when a page's play begins counts from the moment play begins (players can hold through the intro to be ready).
- `controls` in onceworlds.json: `Space` / `Click` / `Tap`: "Hold, then let go in the green"; `Enter`: "Play, again"; `Esc`: "Back, pause a solo run".

## The core loop and where mastery comes from

**Loop:** see the page (1.5 s) → hold (when you choose; the page waits up to its window) → let go → see your verdict → see
everyone's → next page. A page takes about 9-10 s in a match, 5-7 s alone.

**The rule that keeps it honest:** the band's position is different every time (seeded per page), so nobody can memorise a
duration. You learn each object's **motion**, not a number.

**Fourteen pages, each with a motion of its own** (the "feel" is what the player learns):

| # | id | Page | Verb hint | How it moves while held (v from 0 to 1, h = seconds held, at speed 1) | Band centre | Too little / too much |
|---|---|---|---|---|---|---|
| 1 | `porridge` | Porridge | Hold to heat | Speeds up: v = (h / 3.2)^1.6 | 0.50-0.72 | TOO COLD / TOO HOT |
| 2 | `chair` | Little Chair | Hold to sit | Falls like gravity, then the cushion slows it: v = (h / 2.6)², at half speed inside the band | 0.55-0.75 | TOO HIGH / CRACK! |
| 3 | `pillow` | Pillow | Hold to fluff | In pumps: every 0.45 s a pump adds 0.10, eased over 0.3 s | 0.40-0.75 | TOO FLAT / TOO FLUFFY |
| 4 | `toast` | Toast | Hold to toast | Slow and steady: v = h / 4.4 (colour goes pale → golden → brown → black) | 0.45-0.70 | TOO PALE / BURNT |
| 5 | `balloon` | Balloon | Hold to pump | Fast then slow: v = 1 − (1 − h/3.0)²; **pops** above band edge + 0.03 (0 points) | 0.50-0.70 | TOO SMALL / POP! |
| 6 | `milk` | Milk | Hold to pour | Starts 0.25 s late, then v = (h − 0.25) / 3.0; after letting go the milk in the air still lands (+0.06) | 0.45-0.75 | TOO LITTLE / SPILLED |
| 7 | `cake` | Cake | Hold to slice | Fast and steady: the knife crosses the board in 1.7 s | 0.40-0.60 | TOO SHORT / TOO FAR |
| 8 | `door` | Door | Hold to push | Steady (v = h / 3.2) with two sticky spots on the hinge: it stops 0.35 s, then lurches 0.06 | 0.35-0.65 | TOO NARROW / TOO WIDE |
| 9 | `jar` | Honey Jar | Hold to swing | A steady pendulum over the stack: x = 0.5 − 0.42·cos(2πh / 1.8); letting go drops the jar straight down | 0.30-0.70 | TOO LEFT / TOO RIGHT |
| 10 | `bell` | Bell | Hold to swing | Strength bounces up and down: 0 → 1 in 1.2 s, back to 0 in 1.2 s, again | 0.70-0.88 | TOO WEAK / TOO HARD |
| 11 | `swing` | Rope Swing | Hold to swing | Growing swings: v = min(1, 1.15·h / 4.2) · (0.5 − 0.5·cos(2πh / 1.4)); letting go flies her to that distance | 0.45-0.70 | SPLASH! / TOO FAR |
| 12 | `scale` | Honey Scale | Hold to pour | Honey weight grows steadily (h / 3.6, +0.02 drip after letting go), but the needle is a springy dial (ω 7.5 rad/s, ζ 0.3) that lags and overshoots the true weight | 0.40-0.75 | TOO LIGHT / TOO HEAVY |
| 13 | `bowl` | Bowl Slide | Hold to push | The bowl speeds up while pushed (at 0.06·h²) and glides on after letting go: it stops at 0.105·h² | 0.45-0.80 | TOO SHORT / OFF THE EDGE |
| 14 | `spoon` | Cool the Spoon | Hold to blow | Falls fast then slow: v = (1 − h/3.0)² (the gauge goes **down**) | 0.28-0.50 | TOO COLD (held too long) / TOO HOT |

The value is one number from `evaluate(page, h, t)` in a pure module; the drawing only shows it. "Too little" is always blue with
a ▼, "too much" red with a ▲, the band green with a ✓ notch (colour plus shape everywhere).

**Easy set** (pages 1-3 of a match and the first pages of a run): porridge, chair, pillow, toast, balloon. Milk, bowl and scale
(the "it keeps going" pages) and the oscillators (jar, bell, swing) never come before page 4.

**Speed and the band** (a "level" sets both): speed multiplies the motion (time scales by 1/speed); the band's half-width `w`
shrinks. **Twists** (one at a time, named on the intro card with a big icon, from the middle of a match):

| Twist | Card | What changes | Pages it suits |
|---|---|---|---|
| Moving | **It moves!** | The band drifts: c(t) = c₀ + 0.10·sin(2πt / 2.6 + φ), t from the page's start | All |
| Foggy | **Foggy!** | A cloud rolls over the gauge once v passes 0.25: play by rhythm (the band stays painted on the cloud) | porridge, chair, pillow, toast, milk, door, scale, spoon |
| Wobbly | **Wobbly!** | The value shivers: v + 0.025·sin(2πh / 0.33) (the pot rattles, the chair rocks) | porridge, chair, pillow, toast, balloon, milk, cake, door, spoon |

**Scoring a page** (d = distance from the band's centre, w = half-width, p = perfect radius = min(0.02, w / 2)):
- d ≤ p: **100**, the **JUST RIGHT!** stamp.
- p < d ≤ w: 100 → 70 in a straight line: **Almost!** (green).
- d > w: 60 → 0 over the next 0.20: the page's too little / too much word.
- Balloon above its pop line, or never pressed (**Asleep**, zZz): 0.

**A beginner** holds until the band and lets go when they see the green: they're late by their reaction time (≈ 200 ms) on the
fast pages, early on the "keeps going" pages, and fooled by the springy needle and the sticky door. Scores 50-75.
**An expert** knows each motion: lets go *before* the green on milk and bowl, counts pumps on the pillow, reads the needle's
swing on the scale, picks the slowest crossing of the honey jar (near the ends, not the middle), lets go on the rise of the bell,
plays fog by rhythm, and times the wobble's trough. Scores 85-100, and chases perfect streaks.

## Solo

Alone in the lobby, everything is one tap away (all of it ends when a match starts, banking what was scored):

- **A match with bots.** Ready on the platform strip: the same story as multiplayer against five woodland rivals (8, 12 or 16
  pages, 1.5-3 min).
- **Before the Bears** (the cuckoo clock): endless pages, faster and faster, **three bears = three lives**. The rule is one line:
  **stop in the green, or a bear comes home.** A miss (outside the band, or asleep) sends a bear through the door ("Somebody's
  been eating my porridge!"); the third catches you: run over. Score per page = accuracy × streak multiplier (×1, +1 for each
  perfect in a row, up to ×5; any non-perfect resets it). Level = pages cleared / 5: speed 1 + 0.12·level (cap 2.0),
  w = max(0.035, 0.075 − 0.005·level); twists from level 2 (25% chance, +10% a level, cap 70%). Pages come from a shuffle bag
  (no repeats until all 14 were played). A run lasts 1-2 min for a beginner, 5+ for an expert. Personal best on the clock's face;
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
- **Match:** `createMatch` with `rounds: 'pages'`, `introSeconds: 1.5`, `roundSeconds: 12` (a safety net), `roundEndSeconds: 4`
  (the reveal), `resultsSeconds: 12` (the podium), `admit: 'next'`. Page 1 is always gentle Porridge; pages in the first third
  play at speed 1.0 with w 0.075, the middle third at 1.15 with w 0.06 and a 30% twist chance, the last third at 1.3 with w 0.05
  and always a twist. **The last page is worth double** (the bears are at the door): a player behind can still catch up.
  12 pages ≈ 2 min 10 s with the podium; 8 ≈ 1 min 30; 16 ≈ 2 min 50.
- **Latecomers** watch with "Watching · next story is yours" in the caption band and see every reveal. **Leavers** keep their
  seat and points (greyed); an away player scores 0 on the pages they miss and plays on when back. **Host change** carries on from
  the match record (`createMatch`); bots re-plan on the new host.
- **Netcode (who does what):**
  - The host's `startRound` writes the page into `match.data`: `{ g: page id, c: band centre ×1000, w: half-width ×1000, sp:
    speed ×100, tw: twist, ph: twist phase, sticky: [door spots], win: window ms, x2: last page, marks: {}, done: {} }`, all
    drawn from `match.random(page key)`, so a new host would deal the same page.
  - **Every page simulates its own hold locally** (no network while holding) and, on letting go, calls the rpc
    **`mark({ r: round, h: held ms, t: release ms since the page began })`** once. The host checks it (the page is playing, `r` is
    this round, the sender has a seat and no mark yet, 50 ≤ h ≤ win + 500, h − 200 ≤ t ≤ elapsed + 1500), runs the same pure
    `evaluate(page, h, t)`, and writes `marks[seat] = { v, s }` and `done[seat] = 1`. A page can't send a score, only what it did.
  - The page shows its own verdict at once from the same `evaluate`; the host's copy is what the reveal and the points use.
  - **Presence** is only `{ k: round id, s: 0 waiting | 1 holding | 2 let go }`, for the heads along the top that wiggle while a
    player holds. Validated, and ignored when `k` isn't the current round.
  - The host's `onTick` ends the page when every present seat has a mark, or at `win` + 0.8 s; `score` returns
    `{ seat: points }` (doubled on the last page). Bots plan a press delay and a hold when the page begins and call `mark` through
    `host.callAs` once their virtual release time has passed (their `h` is the planned one, so the 200 ms think rate costs nothing).
  - The reveal can be skipped: a tap during it calls the rpc `seen({ r })`; once every present player has tapped (and at least
    1.8 s have passed), the host calls `match.skip()`.
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
| `every-story` | Every Story | Play all fourteen pages |
| `happily-ever-after` | Happily Ever After | Win a story (first place, three or more seats) |

## Balance and timing (the numbers)

| | Value |
|---|---|
| Intro card | 1.5 s (match), 1.0 s (solo) |
| Window to play a page | clamp(time to fill at this speed + 2.0 s, 4.5, 8) s; the oscillating pages (jar, bell, swing) 6 s. A pocket watch appears only when 3 s are left and the player hasn't pressed |
| Reveal | up to 4 s (markers 0.15 s apart, then the stamp, then points) |
| Solo verdict | 1.3 s in the band, 1.9 s when a bear comes home |
| Perfect radius | ±0.02 of the gauge (≤ half the band) |
| Band half-width | 0.08 (page 1 of a match) → 0.075 → 0.06 → 0.05; solo 0.075 → 0.035 |
| Speed | 0.85 (page 1) → 1.0 → 1.15 → 1.3; solo 1.0 → 2.0 |
| Match | 8 / 12 / 16 pages, ≈ 9.5 s each; last page ×2 |
| Bot timing | press delay 0.35-1.2 s; hold error N(bias, σ) with σ = 170 − 130·skill ms (×1.5 in fog; the "keeps going" pages add a late bias of up to 0.04 for the less skilled); blunder chance 0.05·(1 − skill) (±300-700 ms or forgetting to press) |
| Bot skills | Ottoline 0.82, Fen 0.72, Corvin 0.65, Hazel 0.55, Sorrel 0.5, Prickle 0.45 (bias −50 ms), Burdock 0.4 (+60 ms), Moss 0.3 |

**How it's checked (node tests, through the pure modules):**
- Every page: v stays in [0, 1], no NaN, monotonic where it should be, and for every seeded band centre at every speed there is a
  hold inside the window that lands in the band with at least 1 s to spare; the pop line, the sticky spots and the needle behave.
- Scoring at the edges (exactly p, exactly w, the pop line, asleep, the double last page).
- Bots: mean accuracy by skill (0.3 → 50-65, 0.8 → 82-92), always a legal mark inside the window, never perfect every time.
- 500 seeded matches of 8/12/16 pages through a fake room: they end, last 1:15-3:00, no NaN or exception; the leader at half time
  doesn't win more than ~80% of the time.
- Solo runs with simulated players (σ 120, 90, 60 ms): median run length and score in the targets (σ 90: 15-25 pages, about
  1,500; σ 60: 35+ pages); 2,500 is reachable but takes skill.
- The daily: the same ten pages for the same date on every page, different on the next day.
- The room flow in a fake room: host reload mid-page, a leaver, a latecomer who watches, a garbage `mark`, a mark for an old round.

## Every screen

All screens are the cottage; the world fills the screen at every size. The top-left 150×70 (or `ow.ui.reserved`) stays clear.

- **Title:** the kitchen in attract mode (the bot brain plays porridge, chair, balloon in a loop with real stamps and sounds), the
  bears passing the round window. "Just Right" stamped across the top third, Play (red stamp-button, 64 px tall) in the lower
  middle, the best run in Fraunces under it. Nothing else.
- **Lobby:** the long table seen from the front, chairs in a row (8 on a wide screen; two rows of 4 on a phone held upright).
  Each seat: avatar head on a storybook body, the name on a place card, a READY stamp when ready, a small crown on the host. The
  three bowls on a shelf (top centre) with 8 / 12 / 16 painted on them; the host's choice steams. On the wall, left to right: the
  cuckoo clock "Before the Bears" (best on its face), the calendar "Daily" (today's date, best, streak), the bookshelf "Practice".
  After a match, a framed picture of the last winner hangs on the wall with the top three. Bottom 88 px left for the Ready strip.
- **Countdown:** the three bear heads 3-2-1 over the table, then they walk out of the door.
- **Page intro:** the page's scene, its name big in the middle, its verb (first two times), the twist card with an icon, the
  page number at the bottom.
- **Play HUD:** top strip: the woodland path with a stepping stone per page and the three bears walking along it (multiplayer) or
  the three bears in the woods vs at the door (solo lives); the other players' heads in a row under it (wiggle = holding, ✓ stamp
  = done); your total and place on a hanging wooden sign top right (solo: score and ×multiplier stamp). Bottom: "Page 4 of 12".
  The object centre-left, its gauge big beside it (portrait: object above, gauge beside it on the right).
- **Reveal:** the gauge big in the middle with every marker (avatar head on a spoon, name beside it, leader lines fanned so 8
  never overlap), the closest crowned; standings on the right (landscape) or below (portrait), rows re-sorting as points fly in.
- **Results / podium:** the door bursts open, the bears walk in; first place sits in Baby Bear's chair (JUST RIGHT stamp), second
  in Mama's, third in Papa's, the rest listed with points; Baby Bear: "Someone's in my chair!". "New best!" or badge stamps if
  earned. After 12 s the lobby returns with the framed picture.
- **Solo run:** the play HUD with lives; when caught: the bears in the doorway, the score huge, best, **Again** (Enter/Space/tap,
  64 px) and **Lobby**.
- **Daily end:** the calendar page with today's score /1000, best today, streak; **Again**, **Lobby**.
- **Practice shelf:** the bookshelf filling the screen, 14 spines with names and stars; tap to play; **Back**.
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
  wooden sign, the page number sits at the bottom of the page, verdicts are stamps, the window's last seconds are a pocket watch.
  Words over the busy scene are cream on an ink band or ink with a cream outline.
- **Phones:** 390×844 and 844×390 both work; text ≥ 18 px; buttons ≥ 56 px; nothing under the platform's buttons.

## Sound

All synthesized (Web Audio), through one mixer.
- **The holding tone:** a soft triangle tone that rises with the gauge (220 → 880 Hz) and gains a chime layer inside the band:
  you can hear the green.
- **Pages:** porridge bubbles (noise blips faster with heat) and a sizzle; chair creaks and a CRACK (noise burst + low thump);
  pillow whumps; milk glugs; toaster ticks and a pop-ding; balloon rubber squeak and POP; door creak (FM squeal); knife scrape;
  jar rope creak and a glass clink (or crash); ratchet and a big bell DING; scale boing; bowl scrape and clatter; breath for the spoon;
  rope whoosh and a splash.
- **Verdicts:** perfect = bright ding + stamp thump; in the band = a pluck; a big miss = a sad trombone; the crown in the reveal = a
  little fanfare.
- **The bears:** growls on the countdown and when one comes home, footsteps on every step along the path, a roar at the door.
- **Music:** a folk-band polka from a small sequencer in G (oom-pah bass, plucked chords, a fiddle-like lead with vibrato,
  woodblock), 112 bpm, rising to 140 by the last page; only bass and plucks, quieter, in the lobby; ducked while you hold.

## Store art and the trailer

- **Cover** (thumb-1): the porridge pot steaming, the huge thermometer with its green band, six players' markers clustered around
  it, the JUST RIGHT stamp, the three bears peering through the round window, the name once, big.
- **Action** (thumb-2): Goldilocks dropping onto the little chair as it cracks, splinters flying, the bears' shocked faces.
- **Win** (thumb-3): the winner in Baby Bear's chair with the stamp, the bears in the doorway, confetti of oats.
- **Multi** (thumb-4): a reveal with eight markers landing on the gauge, the crown on the closest.
- **Icon:** a steaming bowl of porridge with a thermometer standing in it, the mercury in the green, on a mustard disc. No text.
- **Badges:** each a stamp symbol (a flame, a broken chair, a calendar, a bowl...) on a coloured disc.
- **Trailer (~28 s):** 0-3 s the porridge climbs into the green, JUST RIGHT! slams (the goal); 3-9 s hard cuts: the chair
  cracks, the balloon pops, golden toast; 9-15 s a reveal, markers dropping, the crown; 15-21 s the swing landing, the bell DING,
  a perfect cake; 21-26 s the last page, the bears at the door, the podium; 26-28 s "Just Right" stamped over play.
  Captured with an `?autoplay=1` flag (only off production) that lets the bot brain play for the local player.

## Originality check

- **Resembles:** microgame collections (quick varied minigames), golf-style "stop the meter" bars, party-game minigame hubs.
- **What a player notices in the first minute that is different:** one verb for everything; no pass/fail: every page is scored
  by how close you got, and **everyone's marks land on the same gauge at once** (the reveal is the joke and the brag); every page
  is a different *motion* to learn (lagging milk, a springy needle, a sticky door, growing swings) rather than a different
  control; Goldilocks's "too hot / too cold / just right" is the scoring itself; the bears are the clock of the match and your
  lives alone; a mid-century picture-book look with a red stamp.

## Changes from the spec, and why

- **No "fake band" twist.** A decoy band breaks "understood in seconds". In its place: **Foggy!** (the gauge clouds over: play by
  rhythm), which tests the same mastery without lying to the player.
- **Fourteen pages:** "Wind the music box" is out (its clicks felt like the pillow's pumps). "Stack the honey jars" became a steady
  pendulum drop, and three motions were added: the springy **Honey Scale**, the gliding **Bowl Slide** and **Cool the Spoon**
  (the gauge falls).
- **The solo miss rule is one line:** outside the green (or asleep) = a bear comes home.
- **The Before the Bears badge is 2,500** (1,000 comes after about 12 pages for an average player). Final value set by the sims.
- **The last page of a match is worth double**, so a player behind can still catch up.
- **Bots fill to six seats** (up to eight real players): enough of a crowd for the reveal, quicker to read on a phone.
- **Goldilocks is drawn**; players are their avatar heads on spoons, at the table and on the podium (the spec left this open).
- **The daily has no leaderboard** (platform boards never reset): today's best and a day streak instead.

## Tech

Canvas 2D, plain ES modules in `game/` (`"dir": "game"`, no build), drawn at `ow.settings.pixelRatio(2)`. Pure modules (no
`window`, `document` or SDK at import), tested with `node --test`: `pages.js` (the fourteen motions, `evaluate`), `plan.js`
(match pages, solo levels, the daily), `brain.js` (bots and the attract/autoplay player), `score.js`, `rng.js`. Around them:
`net.js` (join, `createMatch`/`createHost`/`createBots` from `/__onceworlds/v1/`, a stub room outside the platform), `scenes/`
(one file per page on a shared kit: kitchen, table, Goldilocks rig, bears rig, gauges), `fx.js` (particles, stamps, shake),
`audio.js`, `ui.js`, `poster.js`, `main.js`. Static layers are cached on offscreen canvases per resize; particles pooled (200,
80 on low quality). Poster mode (`?poster=`) skips the SDK and draws one staged frame.

## Risks

- **"It's all the same button."** Each page's motion and consequence must be different and readable at a glance. Build order:
  porridge, chair, balloon, milk, cake, swing first (the store art and trailer pages) to the full bar, then the rest; a page that
  doesn't reach the bar is cut (twelve is the floor).
- **Input fairness across devices:** event timestamps, not frames; blur and cancel let go; the window is generous.
- **The "keeps going" pages feel unfair to beginners:** they never come before page 4, they carry a first-time hint ("It keeps
  pouring!", "It keeps sliding!", "Springy needle!"), and the reveal shows where the milk actually landed.
- **Eight markers on a phone gauge:** a 1D label layout fans names to both sides with leader lines; tested at 390×844.
- **Fourteen scenes of art:** one shared kit (room, table, window, Goldilocks and bear rigs, gauges) so every page is one object
  and its motion, in one look.
- **Avatars that fail to load:** a coloured disc with the initial, same frame.
- **A player in a solo run when strangers ready up:** the run banks its score ("The bears are back!") and they watch the match.
