# Loader skins — idea list

The Loader's mechanics (conveyor of questions, unit-truthful cargo,
capacity-based levels) are theme-independent. The stats page already
avoids naval language ("level", not "ship") so any skin can plug in.
A skin re-themes the conveyor, the blocks, the container, the payoff,
and the failure hazard. This file collects the ideas.

## Live

- **Cargo dock** (current) — shipping manifests ride the conveyor;
  correct answers shatter into unit crates that pour into a container
  ship's hold; ship full = level complete, and it sails while a new
  ship docks. Hazard: crates fall in the sea.

## Ideas

| Theme | Orders | Blocks | Container | Payoff | Hazard |
|---|---|---|---|---|---|
| Passengers boarding | Boarding calls | Little people (person icons / happy-face heads) | Airplane, ferry, bus, train — vehicles of different shapes | Vehicle full, departs | Passengers miss the ride |
| Marble workshop | Customer tickets | Marble trays | Glass jar | Jar sealed and shelved | Marbles spill down a drain |
| Bakery | Bake orders | Muffin trays | Delivery van | Van drives off | Bakes drop in the reject bin |
| Brick yard | Build plans | Brick pallets | House wall | Roof goes on | Bricks crumble |
| Aquarium | Shipment slips | Fish crates | Tank | Tank teems, lights up | Fish flop away |
| Candy factory | Sweet orders | Candy molds | Gift box | Box ribboned and stacked | Sweets melt |

Notes:
- The passengers skin's different vehicle shapes naturally vary the
  "hold" geometry the way ship capacity does today.
- Design principles that hold across every skin: urgency stays
  physical and spatial (no countdown clocks or HUD clutter), quantity
  is always read as structure or label (no counting tasks), one tap
  resolves one question, and the container is a meter, not a Tetris
  board.
