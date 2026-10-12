# Planet 4 — "Glacia" · Level Design

> All numbers live in `src/level4.js`; the systems are in `src/frost.js`. Play it with `game.html?level=4`, or walk through Umbra's portal.

## 1. Purpose

After Umbra's fights, Glacia is about **the environment as the enemy**. There's no combat. The blaster becomes a **tool** that melts ice, and three new pressures stack up:

| New idea | How it works |
|---|---|
| **Cold** | A warmth meter drains outside (1/s, 2.2/s in the caves, 1.6/s on the peak). Lanterns, warm vents and the thawed station refill it fast (+30/s). At 0 you freeze, and you're sent back to the drop point (the start of the level), with your progress kept |
| **Ice** | On Mirror Lake you slide: speeding up and stopping take longer (traction 0.22, about a 3 m glide at full speed) |
| **Melting** | Blaster bolts (orange on this planet) melt ice shells and ice walls. Some walls are too thick, and only an event opens them |
| **Thin ice** | Dark cracked patches on the lake break if you stand on them for 1 s. You fall in, climb out at the shore and lose 35 warmth. Not a death |

**Story:** Umbra's portal drops you on an ice moon and closes behind you. A distress signal comes from an abandoned research station. The crew's log says they ran before they could light the beacon, and warns that the peak's snow is unstable.

## 2. Route

| Zone | What you do |
|---|---|
| **Drop Point** (N pole) | Arrival cutscene: the portal closes and you're stranded |
| **Frostfall Station** (hub) | Melt the ice off the heater, so the whole station becomes warm. Read the crew log on the computer (cutscene) |
| **Mirror Lake** | Three levers frozen on snow islands: melt each one and pull it (E). Thin ice lies between them, and you slide. All three open the cave gate |
| **Crystal Caves** | A ring of ice cliffs with a gate on each side. Melt the beacon core free, then the far ice wall. You **can't shoot while carrying**, so melt the wall first. Warm vents along the way |
| **Beacon Peak** | Mountains all around. Put the core in the socket and the cutscene plays: the beacon lights, the ship lands at the station, and an avalanche starts |
| **The escape** | The old trail (sealed by an ice cliff until now) runs 68 m downhill to the station. Run! |

## 3. Avalanche numbers

| | |
|---|---|
| Your speed | 8 m/s |
| Avalanche | 0 → 11.2 m/s (acceleration 6 m/s²), starts 16 m behind you after a 0.6 s pause |
| A clean run | You arrive about 6 m ahead of it (tested: 5.9 m) |
| Stopping for 1.5 s | Caught (tested) |
| Caught | Restarts **from the top of the peak**, not the start of the level. This is the one exception to "death = restart the level", because otherwise a failed escape would cost the whole level |
| Safe | Once you're inside the station zone, the avalanche slows and stops at the windbreak |

Warmth doesn't drain during the escape, so you only have one thing to worry about.

## 4. Gating

- Station → lake: open.
- Lake → caves: the **lake gate** (too thick to melt) opens when all three levers are pulled.
- Caves → peak: an ice wall you melt yourself.
- Peak → station: the **ice cliff** opens only when the avalanche starts.
- The caves and the peak are each enclosed by an invisible ring wall behind their cliffs and mountains, so you can't walk around the gates.

## 5. Made in code

Icicles, ice arches, ice walls, ice shells, levers, snow islands, thin-ice patches, warm vents, the heater, the beacon mast, the curved frozen-lake surface (a section of a sphere, so it never cuts into the ground), snowfall, the aurora, the frost on the screen edges, and the avalanche.

## 6. Ideas / next steps

- Sound, especially for the avalanche rumble, ice cracking and wind.
- A friendly snow creature (a penguin or seal type) waddling around the station.
- Planet 5: the ship is finally heading home. Maybe a space station or a derelict ship as a finale.
