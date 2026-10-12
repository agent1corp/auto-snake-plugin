# dsh-auto-snake

**v0.0.1** — an autonomous neon Snake game for the DeepSeek Harness right sidebar. Let the agent play while you watch, or take the wheel and tune the solver live from chat.

## What it is

A DSH client bundle that adds a Snake panel to the right sidebar. The snake can be driven three ways:

- **Auto-play** — the built-in solver steers every tick and restarts itself on death, so you can lean back and watch.
- **Manual** — arrow keys or WASD, plus an on-screen d-pad for touch.
- **Hybrid** — the AI drives until you press a key, which hands control back to you.

## The solver

It is deliberately simple to reason about, because the interesting part is watching it fail or succeed as you move the sliders:

1. Enumerate every legal move (no 180° reversal, no wall, no body — except the tail tip, which vacates this tick).
2. For each candidate, simulate the resulting body and measure:
   - **reachable free space** from the new head, by flood fill;
   - whether the **tail is still reachable** from the new head;
   - the **shortest path length** to the food.
3. A move is *safe* when reachable space ≥ body length + margin, and (optionally) the tail is reachable.
4. Prefer the shortest safe route to the food; tie-break on more free space.

That geometric criterion — not the pathfinding — is what keeps it alive. A plain shortest-path bot walls itself in within a few dozen gems; requiring room to manoeuvre is what took the reference Python build to length 31 without dying.

## Live tuning

Three knobs are exposed in the panel:

| Knob | What it does |
|------|--------------|
| **Safety margin** | Demands the move leave this many more free cells than the body length. Higher plays cautiously and takes long routes; at `0` it is greedy and eventually traps itself. |
| **Step delay** | Time between steps in ms, 18–220. Lower is faster; below ~40 it is genuinely hard to follow. The live steps-per-second rate is shown in the footer. |
| **Tail lookahead** | Also require a path back to the tail. Turning it off is instructive: the snake immediately starts sealing itself in. |

The slider is labelled **Step delay** because that is what it is — a delay in milliseconds. Labelling it "speed" reads backwards, since a higher number means slower play.

The panel also tracks AI runs, peak score, and deaths split by cause (wall vs self), so you can see a tuning change actually move the numbers.

## Install

```bash
dsh plugin --profile web add /home/dev/A1Corp/myprojects/dsh-plugins/auto-snake-plugin
```

Then restart `dsh web`. The bundle is addressed by package name in `cordis.patch.yml` — an entry named by `file://` URL has no package to read, so no browser bundle is emitted.

To open the panel: expand the right sidebar and pick **Auto Snake** on the guide/add page.

## Layout

```
package.json        manifest; dsh.bundle + dsh.client blocks
cordis.patch.yml    Loader row, addressed by package name
index.js            Host half (deliberately empty — all UI is client-side)
client.js           the whole game: engine, solver, canvas renderer, React panel,
                    plus both locale dictionaries (en/zh)
```

## Languages

All UI copy — the panel, the HUD, the tuning knobs, the settings row, and the dock's
guide entry — is bilingual, following the framework locale service:

- `en` is the default and the framework's fallback locale.
- `zh` (简体中文) is selected automatically when the app language is Chinese.

Switch languages from **Settings → General → Language**; the panel and its guide entry
update live, with no reload and no re-registration. Both dictionaries are inline in
`client.js` and carry identical key sets, so a missing key can never surface as a raw
key name. `{name}` placeholders are filled by the local `fill()` helper, since the
framework's `t()` returns templates verbatim.

## Controls

| Input | Action |
|-------|--------|
| Arrows / WASD | Steer (takes the wheel from the AI) |
| Space | Pause / resume |
| R | Restart |
| Auto-play button | Toggle the solver |

## Status

The game, solver and panel are complete and unit-tested against a mock Cordis context. The tab is opened through the right sidebar's own two-stage registration: `ctx.sidebarRightTabs.register(…)` declares the type (which is what lists **Auto Snake** on the dock's add/guide page and makes `openTab('auto-snake')` legal), and the keyed `sidebar.right.pane.tab` seat supplies its body under that type's `id`.

Open the panel from the right dock's **+ / guide** page, or programmatically with `sidebarRight.openTab('auto-snake')`.

## License

MIT
