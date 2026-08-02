# PopTimes curriculum: ladders, focus, and promotion gates

This is the agreed progression for both games (Loader and Quiz). The code
follows this table directly — each mode's ladder in `stats.js` (`LADDERS`)
is a definitions table whose rows carry the rung's focus tables, question
mode, and promotion gate. Change the curriculum by editing that table, not
logic.

## Fact sets (a partition of the 78 distinct facts)

- **Easy facts** (45) — Beginner's whole world: any fact involving 1, 2,
  10 or 11, plus the easy squares. "Easy 4s" = 4×1, 4×2, 4×10, 4×11.
- **Tricky facts** (33) — Expert's whole world: the pairs among
  {3,4,5,6,7,8,9,12} plus 10×11, 10×12, 11×11, 11×12, 12×12.
- **Regular** = the union: all 144 (78 distinct). "Full Ns" = a table's
  easy half + tricky half.

## How rungs work (no unlocking, no review mechanic)

- Every fact in a mode's set is available from rung 1. A rung's focus
  tables bias ~60% of its questions; the rest roam the whole set.
- Within any pool: never-asked facts come first, then weakness-weighted
  practice (mastered facts appear only as occasional retention checks).
  So a player arriving with prior progress is automatically steered to
  what they haven't mastered — same ladder, personalized questions.
- All three skill levels are open from the start; nothing is locked.
- **Student-facing names**: the skill levels are shown as **Student**
  (beginner), **Scholar** (regular) and **Master** (expert) — named
  after the title you hold while playing them. Everyone starts as a
  Student; completing a ladder earns the next title: Scholar, Master,
  and finally **Professor** (Expert ladder). Storage keys keep the
  internal names beginner/regular/expert.
- Question modes: **mult** = multiplying (factors given, pick the
  product), **fact** = factoring (product given, pick the factors).

## Promotion gates

A level is completed by loading the ship (Loader) or finishing the test
(Quiz) — celebrated regardless. **Advancing** requires the rung's gate:
accuracy% / quick% of that level's answers (rounded), where *quick* =
answered before the order wobbles (Loader) / before options start
dropping (Quiz). Three wrong in a row always ends the level as a fail.

Gates chain across modes — each mode ramps from its base to the next
mode's base (60/10 → 70/20 → 80/30), and the game's single summit,
100/85, is Expert rung 12. Beyond rung 12 (endless play), the final
gate holds. Both games use the same level length — Beginner 10,
Regular 15, Expert 20 questions. In the Loader the ship fills one equal
step per question and is exactly full on the last one, so its cargo is a
progress bar; the block count of any single crate is decorative only.

## The ladder table

| Rung | Beginner (easy facts) | mode | gate | Regular (all 144) | mode | gate | Expert (tricky facts) | mode | gate |
|---|---|---|---|---|---|---|---|---|---|
| 1 | easy 2s | mult | 60/10 | full 2s & 3s | mult | 70/20 | all tricky | mult | 80/30 |
| 2 | easy 5s | mult | 60/10 | full 4s & 5s | mult | 70/20 | all tricky | fact | 82/35 |
| 3 | easy 3s | mult | 60/10 | full 2s–5s | fact | 70/20 | all tricky | mult | 84/40 |
| 4 | easy 4s | mult | 60/10 | full 6s | mult | 70/20 | all tricky | fact | 85/45 |
| 5 | easy 1s, 10s & 11s | mult | 60/10 | full 7s | mult | 70/20 | all tricky | mult | 87/50 |
| 6 | all easy | fact | 62/12 | full 6s & 7s | fact | 70/20 | all tricky | fact | 89/55 |
| 7 | all easy | mult | 63/13 | full 8s | mult | 70/20 | all tricky | mult | 91/60 |
| 8 | all easy | fact | 65/15 | full 9s | mult | 70/20 | all tricky | fact | 93/65 |
| 9 | all easy | mult | 66/16 | full 8s & 9s | fact | 70/20 | all tricky | mult | 95/70 |
| 10 | all easy | fact | 68/18 | full 12s | mult | 70/20 | all tricky | fact | 96/75 |
| 11 | all easy | mult | 69/19 | all 144 | fact | 75/25 | all tricky | mult | 98/80 |
| 12 | all easy | fact | **70/20** | all 144 | mult | **80/30** | all tricky | fact | **100/85** |

Design rationale, in brief:
- **Content and performance ramps are sequenced, not superimposed**:
  new-to-the-mode content always enters at the mode's base gate;
  performance demands rise only on familiar material.
- Regular's rhythm is *learn A → learn B → consolidate A+B as factoring*.
- Expert introduces nothing (its facts are Regular's tricky half); it is
  pure consolidation and speed, alternating modes every rung.
- Regular rung 10 is the 12s only: the other 10s/11s facts are easy-set
  material, and the four tricky stragglers (10×11, 11×11, 10×12, 11×12)
  are swept up by 12s focus and the rung 11–12 mixes.
