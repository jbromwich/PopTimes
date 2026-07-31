# Brief: align the Times Tables quiz with the Loader's stats system

Follow-up work for `times-tables.html`, to be done after the Loader changes
are tested and accepted. The goal is one consistent mental model across both
games. Reference implementation for all of this is `loader.html`.

## Terminology
- Objects: **factors** (the "a × b" card) and **product** (the quantity).
- Skill levels: Beginner / Regular / Expert (already shared).

## Mastery model (replace the quiz's lifetime formula)
- Per fact, keep only the **last 10 attempts** as a window of outcomes:
  `q` = correct & quick, `c` = correct but slow, `w` = wrong/timed out.
- **Quick** in the quiz should map to its existing "instant" concept
  (answered before options start dropping) — quantized, not timed.
- Tiers: never asked · <1/3 quick · <2/3 · <5/6 · **mastered = ≥5/6 quick
  over ≥6 attempts** (5/6, 6/7, 7/8, 8/9, 9/10 all qualify).
- Migration from the quiz's lifetime counters: seed windows proportionally;
  crash-safety matters, numeric fidelity does not.

## Progress screen (mirror the Loader's)
- Quantize the mastery grid to the 4 tier colors + dashed "not asked";
  legend is 4 discrete pills with end labels **"Still practicing"** /
  **"Mastered"** (no per-pill labels).
- Table mastery shown on the grid: green ✓ axis chip + subtle band frame
  when all 12 facts of a table are mastered.
- Add "Facts mastered: X / 78" meter above the grid.
- Remove/replace the smoothed line chart ("Improvement") with the shared
  badge concept if desired, or drop it.
- Keep quiz-specific bits that still make sense (per-test recap of missed
  facts is fine — it's the quiz's equivalent of the reveal animation).

## Question selection
- Replace lifetime least-asked + time-weighted picking with the Loader's
  tier weighting: unseen facts first; then Still-practicing ≈ 8,
  amber ≈ 5, nearly ≈ 4, mastered ≈ 0.5 (retention checks), with a ×1.3
  nudge for facts short of the 6-attempt mastery floor.

## Stats separation by skill level
- Per-mode records where relevant (the quiz currently merges test history
  across modes; decide whether its test-score history needs per-mode
  separation or can stay merged like the Loader's grid).

## Shared-storage question (decide at implementation time)
- Consider pointing both games at one localStorage fact store so mastery
  reflects combined practice. Requires agreeing a shared key and identical
  window/outcome encoding (the Loader's `ml-stats-v2` format is suitable).
