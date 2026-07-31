# Brief: shared progression and stats across both games

Follow-up work, to be done after the Loader changes are tested and
accepted. Direction (decided): the quiz is upgraded so that every element
of the stats page is earnable in either game, and both games render **one
shared progress page** from **one shared store**. Progress belongs to the
student, not to whichever game they opened.

## Architecture
- Extract the shared logic into a new **`stats.js`** included by both
  `loader.html` and `times-tables.html` (first shared code file in the
  repo): the fact store, window/tier/mastery math, records, badge
  definitions, the tier-weighted question picker, and the entire progress
  page (DOM + CSS can stay per-file or move with it — avoid divergence).
- **Single store**: the Loader's `ml-stats-v2` format is the master
  database. Fact windows (last 10 outcomes, `q`/`c`/`w`), level history
  entries `{d,c,n,q,lv,m}`, records `{streak,fast,days}`, and the
  per-mode ladder bests `ml-best-*`.
- **Migration**: crash-safety only. The quiz's old `poptimes-v3` data may
  simply be discarded; `ml-stats-v2` wins wherever both exist.

## Quiz gains level ladders (the structural upgrade)
- The quiz adopts the same three ladders and focus tables as the Loader
  (Beginner 9 / Regular 20 / Expert 12 rungs; same table sequences).
- A quiz **level = one test drawn from that rung's tables** using the
  shared picker (unseen first, tier weights, ~40% roaming the mode pool).
- **Level length scales with skill level**, mirroring the Loader's ship
  capacities: shorter Beginner tests (~10 questions), Regular ~15,
  Expert ~20.
- **Pass/fail, in fairness with the Loader**: pass = ≥90% correct
  (rounded); and mirroring the Loader's conveyor breakdown, **3 wrong in
  a row ends the test immediately as a fail**. A failed level repeats;
  a passed level advances the shared ladder best.
- **Shared bests mean either game advances the same journey** — clearing
  level 8 in the quiz or the Loader is the same level 8. Runs still start
  at best − 2 in both games.

## Stats page (shared, identical in both games)
Sections, top to bottom: Your journey (3 ladder bars) → Records →
Badges (family rows) → Multiplication facts mastered meter → quantized
grid → Clear my history.
- **Records**: Longest streak (consecutive correct answers, spanning both
  games) and Fastest level (Loader ship time or quiz test time — same
  record).
- **Badges** all become earnable in either game:
  - Perfect ×1/5/25 — levels with every answer correct
  - Lightning ×1/5/25 — levels with every answer quick
  - Hot Streak 10/25/50 — correct answers in a row
  - Journey row: Explorer (78 questions tried) + Graduates (sequential
    Beginner → Regular → Expert), Explorer floating asynchronously
  - Champion 20/40/60/78 — multiplication facts mastered
  - Day Streak 3/7/30 — days played (either game counts)
  - NYT-style rendering: every tier its own medal; per-family rows with
    the next unearned medal (grey, progress meter "x / y") on the left
    and earned medals (gold) shelving right, newest first; a fully earned
    family shows no left target.
- **Grid**: 4 quantized tiers + dashed "not asked". Palette (approved):
  brick red **#b4503c** → orange **#dd8b33** → yellow **#e2c94f** →
  grass green **#6cb043**; the grass green is the single
  mastered/complete color everywhere (cells, axis ✓ chips, band frames,
  meter fills, checkmarks, menu bars). Legend: 4 wordless pills between
  **"Still practicing"** and **"Mastered"**.
- Table mastery: green ✓ axis chip + band frame when all 12 facts of a
  table are mastered.

## Mastery model (already live in the Loader; quiz adopts identically)
- Last-10 window per fact; tiers at <1/3, <2/3, <5/6; **mastered = quick
  on ≥5/6 of ≥6 attempts** (5/6, 6/7, 7/8, 8/9, 9/10 qualify).
- **Quick** in the quiz = its existing "instant" (answered before options
  start dropping); in the Loader = before the order wobbles. Quantized,
  never timed.

## Terminology (student-facing, both games)
- **"questions" / "answers"** for play events (badges, tooltips, streaks);
  the full phrase **"multiplication facts"** for the knowledge inventory
  (mastery meter, Champion). Never bare "facts". No naval/skin language
  on the stats page — "level", not "ship".

## Quiz-specific keepers
- The per-test recap of missed questions stays (it's the quiz's
  equivalent of the Loader's reveal animation), reworked to fit the
  level structure (shown on pass and fail alike).
- The quiz's mode selector stays, gaining the Loader-style ladder
  progress bars (green + ✓ when complete) on its mode buttons.
