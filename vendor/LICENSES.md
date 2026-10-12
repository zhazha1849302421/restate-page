# Third-party files in this folder

Everything the page needs is bundled here, so it makes **no external requests**:
it renders identically offline, behind a firewall, and in regions where Google
Fonts or public CDNs are slow or blocked.

| File | Used by | Source | License |
|---|---|---|---|
| `rough.js` | `sketch.js` (hand-drawn frames) | Rough.js v4.6.6, bundled build — https://github.com/rough-stuff/rough | MIT (see `roughjs-LICENSE.txt`) |
| `chart.umd.min.js` | `main.js` (all charts) | Chart.js v4.4.1, UMD build — https://www.chartjs.org | MIT (see `chartjs-LICENSE.txt`) |
| `fonts.css` + `fonts/*.woff2` | every page style | Caveat, Patrick Hand, Inter — latin + latin-ext WebFont subsets as served by Google Fonts | SIL Open Font License 1.1 (see `fonts-OFL-LICENSE.txt`) |

Notes:
- `theme-sketch.css`, `sketch.js`, `intro.css`, `intro.js`: original code and stick-figure drawings for this page.
- The opening animation's timing and effects (per-character blur-in, zoom-out, title scale-in) are inspired by the OpenGame landing page; no code was copied from it.
- To refresh the fonts: fetch the CSS from `fonts.googleapis.com/css2?family=Caveat:wght@500;700&family=Inter:wght@400;500;600;700&family=Patrick+Hand&display=swap`, keep the `latin` and `latin-ext` `@font-face` blocks, save each `.woff2` into `fonts/`, and point the `src:` urls at those files.
