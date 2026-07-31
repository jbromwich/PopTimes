# Brief: align the Times Tables quiz with the Loader's stats system

Follow-up work for `times-tables.html`, to be done after the Loader changes
are tested and accepted. The goal is one consistent mental model across both
games. Reference implementation for all of this is `loader.html`.

## Terminology
- Objects: **factors** (the "a × b" card) and **product** (the quantity).
- Skill levels: Beginner / Regular / Expert (already shared).
- Student-facing wording: use **"questions" / "answers"** for play events
  (badge descriptions, tooltips, streaks) and the full phrase
  **"multiplication facts"** for the knowledge inventory (the mastery
  meter and Champion-style counts). Never bare "facts".

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
- Quantize the mastery grid to the 4 approved tier colors + dashed
  "not asked": **#b4503c → #dd8b33 → #e2c94f → #6cb043** (brick red,
  orange, yellow, grass green). The grass green #6cb043 is the single
  "mastered/complete" color everywhere (axis chips, band frames, meter
  fills, completion checks).
- Legend is 4 discrete pills with end labels **"Still practicing"** /
  **"Mastered"** (no per-pill labels).
- Table mastery shown on the grid: green ✓ axis chip + subtle band frame
  when all 12 facts of a table are mastered.
- Add "Multiplication facts mastered: X / 78" meter above the grid, with
  clear vertical space before the grid.
- Remove the smoothed line chart ("Improvement").
- Badges, if adopted in the quiz: use the Loader's NYT-style design —
  every tier is its own medal; one horizontal row per family with the
  next unearned medal (grey, progress meter + "x / y") on the left and
  earned medals (gold) shelving right, newest first; rows ordered by
  typical first-earn; a fully earned family shows no left target. Decide
  whether quiz results feed the same badge counters (see shared storage)
  or the quiz simply links to the Loader's progress page.
- Keep quiz-specific bits that still make sense (per-test recap of missed
  questions is fine — it's the quiz's equivalent of the reveal animation).

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
