/**
 * main.js — rendering + interactions for the ReState project page.
 * ---------------------------------------------------------------------------
 * You normally do NOT need to edit this file:
 *   - numbers / cases / tables  -> data.js
 *   - wording of sections       -> index.html
 *   - colors / fonts / spacing  -> style.css (:root variables; charts read them too)
 *
 * Functions (called in order at the bottom):
 *   initParadigmToggle()  01  stage-centric / state-centric switch
 *   initEvidence()        01  "vs Direct SFT" delta matrices, computed from MAIN
 *   initURSM()            02  φ / R+ / R− tabs   (texts in URSM_TEXT below)
 *   initPool()            02  CRSL history-pool FIFO demo (capacity 2)
 *   initDemo()            03  case tabs + round timeline + autoplay (CASES)
 *   initDomains()         04  8 domain cards (DOMAINS)
 *   initDomainTable()     05  per-domain table with backbone switch (DOMAIN)
 *   initAblationTable()   05  break-down ablation with dataset switch (ABLATION)
 *   initGallery()         06  qualitative comparison cards (COMPARE)
 *   fitBanner()               keeps each line of the hero title from wrapping
 *   initBrand()               top-left robot / word hover animations, robot blinking
 *   initSketch()              starts sketch.js (stick figures + rough.js frames)
 *   initMisc()                BibTeX copy, lightbox, scroll reveal, nav highlight
 *   initCharts()              Chart.js: main, iterations, leaderboard, state ablation,
 *                             CoT quality, generalization, option counts
 *
 * Depends on data.js (loaded first) and Chart.js 4 (CDN). If Chart.js is unavailable,
 * charts are replaced by a short notice and everything else still works.
 */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* Colors are read from style.css :root so changing a CSS variable re-themes the charts. */
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const C = {};
function loadColors() {
  Object.assign(C, {
    stage: css('--stage'), state: css('--state'), ink: css('--ink'), dim: css('--dim'), rule: css('--rule'),
    mind: css('--mind'), ok: css('--ok'), err: css('--err'),
    gray: css('--chart-gray'), grayDark: css('--chart-gray-dark'),
  });
}
const fmt = (v, d = 2) => (v > 0 ? '+' : '') + v.toFixed(d);

/* ---------- 01 paradigm toggle ---------- */
function initParadigmToggle() {
  $$('.tg').forEach(b => b.addEventListener('click', () => {
    $$('.tg').forEach(x => x.classList.toggle('on', x === b));
    $$('.pd').forEach(p => p.classList.toggle('on', p.dataset.panel === b.dataset.mode));
  }));
}

/* ---------- 01 evidence matrices ---------- */
function initEvidence() {
  const dsKeys = ['versacot', 'scienceqa', 'm3cot'], dsLab = ['VersaCoT', 'SciQA', 'M³CoT'];
  const short = ['7B', '8B', '9B'];
  const build = (id, mi) => {
    let h = '<tr><th></th>' + short.map(s => `<th>${s}</th>`).join('') + '</tr>';
    dsKeys.forEach((k, i) => {
      h += `<tr><th>${dsLab[i]}</th>` + MAIN[k].map(r => {
        const d = r[mi] - r[0];
        return `<td class="${d >= 0 ? 'up' : 'down'}" style="--a:${Math.min(1, Math.abs(d) / 6).toFixed(2)}">${fmt(d)}</td>`;
      }).join('') + '</tr>';
    });
    $(id).innerHTML = h;
  };
  build('#mat-mcot', 1);
  build('#mat-restate', 3);
}

/* ---------- 02 URSM tabs ---------- */
const URSM_TEXT = {
  empty: { title: 'Reasoning construction', cls: 's-empty', flow: ['φ', 'M<sub>θ</sub>', 'R<sup>+</sup>'],
    body: 'Given an empty state, the model builds an initial reasoning chain from the multimodal input — the familiar “generate a CoT” behavior.' },
  pos: { title: 'Correct-reasoning preservation', cls: 's-pos', flow: ['R<sup>+</sup>', 'M<sub>θ</sub>', 'R<sup>+</sup>'],
    body: 'Given a valid state, the model keeps the valid evidence while improving completeness and consistency — it learns <em>not</em> to break what already works.' },
  neg: { title: 'Erroneous-reasoning correction', cls: 's-neg', flow: ['R<sup>−</sup>', 'M<sub>θ</sub>', 'R<sup>+</sup>'],
    body: 'Given an erroneous state, the model revisits the original multimodal evidence and corrects the faulty part — self-correction without a separate critic.' },
};
function initURSM() {
  const body = $('#ursm-body');
  const render = k => {
    const t = URSM_TEXT[k];
    body.innerHTML = `<div class="ursm-flow"><span class="${t.cls}">${t.flow[0]}</span><i>→</i><span class="op">${t.flow[1]}</span><i>→</i><span class="pos">${t.flow[2]}</span></div>
      <p><b>${t.title}.</b> ${t.body}</p>`;
  };
  $$('.ut').forEach(b => b.addEventListener('click', () => {
    $$('.ut').forEach(x => x.classList.toggle('on', x === b)); render(b.dataset.s);
  }));
  render('empty');
}

/* ---------- 02 CRSL pool ---------- */
function initPool() {
  const pool = $('#pool'), log = $('#pool-log');
  let k = 0, items = [];
  $('#pool-btn').addEventListener('click', () => {
    k += 1;
    const evicted = items.length === 2 ? items.shift() : null;
    items.push(k);
    pool.innerHTML = [0, 1].map(i => items[i]
      ? `<div class="slot ${items[i] === k ? 'new' : ''}">Ŝ<sup>i</sup><sub>(${items[i]})</sub><small>round ${items[i]}</small></div>`
      : '<div class="slot empty">empty</div>').join('');
    log.innerHTML = `Round ${k}: the generated state Ŝ<sup>i</sup><sub>(${k})</sub> enters the pool` +
      (evicted ? `; the oldest, Ŝ<sup>i</sup><sub>(${evicted})</sub>, is evicted (FIFO).` : '.') +
      ' Pool states are fed back as training inputs <code>R<sup>h</sup></code>, so training sees the same kind of states as recursive inference.';
  });
}

/* ---------- 03 demo ---------- */
function markup(s) {
  return s.replace(/<e>/g, '<mark class="err">').replace(/<\/e>/g, '</mark>')
          .replace(/<f>/g, '<mark class="fix">').replace(/<\/f>/g, '</mark>')
          .replace(/<w>/g, '<mark class="warnm">').replace(/<\/w>/g, '</mark>');
}
const FROM_LABEL = {
  empty: ['Construct', 'from empty state φ'],
  neg: ['Correct', 'from a state with an error'],
  pos: ['Preserve', 'from an already-correct state'],
};
function initDemo() {
  const tabs = $('#case-tabs');
  let ci = 0, ri = 0, timer = null;

  tabs.innerHTML = CASES.map((c, i) => `<button data-i="${i}" class="${i === 0 ? 'on' : ''}">${c.label}</button>`).join('');
  $$('button', tabs).forEach(b => b.addEventListener('click', () => { stop(); loadCase(+b.dataset.i); }));

  function loadCase(i) {
    ci = i; ri = 0;
    $$('button', tabs).forEach((b, j) => b.classList.toggle('on', j === i));
    const c = CASES[i];
    $('#q-meta').textContent = `${c.tag} · ${c.fig}`;
    $('#q-img').src = c.img;
    $('#q-text').textContent = c.question;
    $('#q-opts').innerHTML = c.options.map((o, j) => `<li class="${j === c.answer ? 'gt' : ''}">${o}${j === c.answer ? '<em>ground truth</em>' : ''}</li>`).join('');
    $('#q-ref').textContent = c.ref;
    renderTimeline(); renderRound();
  }

  function renderTimeline() {
    const c = CASES[ci];
    const nodes = ['<button class="tnode empty" disabled>S<sub>0</sub>=φ</button>'];
    c.rounds.forEach((r, j) => {
      nodes.push(`<span class="tline ${j <= ri ? 'lit' : ''}"></span>`);
      nodes.push(`<button class="tnode ${r.ok ? 'ok' : 'bad'} ${j === ri ? 'cur' : ''} ${j > ri ? 'future' : ''}" data-j="${j}">S<sub>${j + 1}</sub></button>`);
    });
    $('#timeline').innerHTML = nodes.join('');
    $$('.tnode[data-j]').forEach(n => n.addEventListener('click', () => { stop(); ri = +n.dataset.j; renderTimeline(); renderRound(); }));
  }

  function renderRound() {
    const c = CASES[ci], r = c.rounds[ri], [verb, sub] = FROM_LABEL[r.from];
    const last = ri === c.rounds.length - 1;
    $('#r-card').innerHTML = `
      <div class="r-head">
        <span class="r-round">Round ${ri + 1}</span>
        <span class="r-verb v-${r.from}">${verb}</span>
        <span class="r-sub">${sub} → S<sub>${ri + 1}</sub></span>
      </div>
      <p class="r-cot">${markup(r.cot)}</p>
      <div class="r-choice ${r.ok ? 'ok' : 'bad'}">
        <span>Model choice</span><b>${c.options[r.choice]}</b><em>${r.ok ? '✓ correct' : '✗ wrong'}</em>
      </div>
      ${ri === 0 ? `<p class="r-note">${c.note}</p>` : ''}
      ${last ? '<p class="r-note">Later rounds (Round-N) keep the same answer — the state has converged.</p>' : ''}`;
    $('#r-card').classList.remove('flash'); void $('#r-card').offsetWidth; $('#r-card').classList.add('flash');
  }

  const step = d => { const n = CASES[ci].rounds.length; ri = (ri + d + n) % n; renderTimeline(); renderRound(); };
  function stop() { clearInterval(timer); timer = null; $('#r-play').textContent = '▶ Play'; }
  $('#r-prev').addEventListener('click', () => { stop(); step(-1); });
  $('#r-next').addEventListener('click', () => { stop(); step(1); });
  $('#r-play').addEventListener('click', () => {
    if (timer) return stop();
    $('#r-play').textContent = '❚❚ Pause';
    if (ri === CASES[ci].rounds.length - 1) { ri = -1; step(1); }
    timer = setInterval(() => { if (ri >= CASES[ci].rounds.length - 1) return stop(); step(1); }, 3200);
  });
  loadCase(0);
}

/* ---------- 04 domains ---------- */
function initDomains() {
  $('#domains').innerHTML = DOMAINS.map(d => `
    <div class="dom"><b>${d.name}</b><span>${d.desc}</span><small>${d.src} · 1,250</small></div>`).join('');
}

/* ---------- 05 tables ---------- */
function initDomainTable() {
  const tbl = $('#domain-table');
  const render = bb => {
    const rows = DOMAIN[bb], names = Object.keys(rows);
    const ft = names.filter(n => n !== 'Zero-shot');
    const best = DOMAIN_COLS.map((_, j) => Math.max(...ft.map(n => rows[n][j])));
    tbl.innerHTML = `<thead><tr><th>${BACKBONES[bb]}</th>${DOMAIN_COLS.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>` +
      names.map(n => `<tr class="${n.startsWith('ReState') ? 'hl' : ''} ${n === 'Zero-shot' ? 'zs' : ''}"><td>${n}</td>${rows[n].map((v, j) =>
        `<td class="${n !== 'Zero-shot' && v === best[j] ? 'best' : ''}">${v.toFixed(2)}</td>`).join('')}</tr>`).join('') + '</tbody>';
  };
  segment('#bb-seg', b => render(+b.dataset.bb));
  render(2);
}

function initAblationTable() {
  const tbl = $('#abl-table'), mk = v => v ? '<span class="yes">✓</span>' : '<span class="no">✗</span>';
  const render = ds => {
    const rows = ABLATION[ds];
    tbl.innerHTML = '<thead><tr><th>Scheme</th><th>URSM</th><th>SHS</th><th>ISR</th>' + BACKBONES.map(b => `<th>${b.replace('Qwen', 'Q')}</th>`).join('') + '</tr></thead><tbody>' +
      rows.map((r, i) => `<tr class="${i === rows.length - 1 ? 'hl' : ''}"><td>${r[0]}</td><td>${mk(r[1])}</td><td>${mk(r[2])}</td><td>${mk(r[3])}</td>` +
        r[4].map((v, j) => `<td>${v.toFixed(2)}${i ? `<small class="dl">${fmt(v - rows[0][4][j])}</small>` : ''}</td>`).join('') + '</tr>').join('') + '</tbody>';
  };
  segment('#abl-seg', b => render(b.dataset.ds));
  render('versacot');
}

/* ---------- 06 gallery ---------- */
function initGallery() {
  $('#gallery').innerHTML = COMPARE.map(c => `
    <figure class="gcard">
      <div class="gthumb"><img class="zoom" src="${c.img}" alt="${c.title}" loading="lazy" /></div>
      <figcaption><span class="gds">${c.ds} · ${c.fig}</span><b>${c.title}</b><p>${c.gist}</p></figcaption>
    </figure>`).join('');
}

/* ---------- charts ---------- */
function initCharts() {
  if (typeof Chart === 'undefined') { $$('.chart-box').forEach(b => b.innerHTML = '<p class="note">Charts need network access to load Chart.js.</p>'); return; }
  Chart.defaults.font.family = css('--f-sans');
  Chart.defaults.color = C.dim;
  Chart.defaults.borderColor = C.rule;
  Chart.defaults.plugins.legend.labels.boxWidth = 12;
  const fitY = (chart, vals, lo = 2, hi = 1) => { chart.options.scales.y.min = Math.floor(Math.min(...vals) - lo); chart.options.scales.y.max = Math.ceil(Math.max(...vals) + hi); };

  // main comparison
  const methodColors = [C.gray, C.grayDark, C.mind, C.state];
  const mainChart = new Chart($('#main-chart'), {
    type: 'bar',
    data: { labels: BACKBONES, datasets: METHODS.map((m, i) => ({ label: m, data: [], backgroundColor: methodColors[i], borderRadius: 4, maxBarThickness: 46 })) },
    options: { maintainAspectRatio: false, plugins: { tooltip: { callbacks: { label: c => `${c.dataset.label}: ${c.raw.toFixed(2)}%` } } },
      scales: { y: { title: { display: true, text: 'Accuracy (%)' } }, x: { grid: { display: false } } } },
  });
  const setMain = ds => {
    const d = MAIN[ds];
    mainChart.data.datasets.forEach((s, i) => s.data = d.map(r => r[i]));
    fitY(mainChart, d.flat()); mainChart.update();
    const gains = [0, 1, 2].map(m => d.map(r => r[3] - r[m]));
    const rng = g => `${Math.min(...g).toFixed(2)}–${Math.max(...g).toFixed(2)}`;
    $('#main-note').innerHTML = `ReState gain: <b>${rng(gains[0])}</b> over Direct SFT, <b>${rng(gains[1])}</b> over Multimodal-CoT, <b>${rng(gains[2])}</b> over MIND (pts, across backbones).`;
  };
  segment('#ds-seg', b => setMain(b.dataset.ds)); setMain('versacot');

  // iterations
  const bbColors = [C.stage, C.mind, C.state];
  const iterChart = new Chart($('#iter-chart'), {
    type: 'line',
    data: { labels: [...Array(10).keys()], datasets: BACKBONES.map((b, i) => ({ label: b, data: [], borderColor: bbColors[i], backgroundColor: bbColors[i], tension: .3, pointRadius: 3 })) },
    options: { maintainAspectRatio: false, scales: { x: { title: { display: true, text: 'Self-refinement round' } }, y: { title: { display: true, text: 'Accuracy (%)' } } } },
  });
  const setIter = ds => { iterChart.data.datasets.forEach((s, i) => s.data = ITER[ds][i]); iterChart.update(); };
  segment('#iter-seg', b => setIter(b.dataset.ds)); setIter('versacot');

  // leaderboard
  const kindColor = { human: '#d1d5db', closed: '#c9cdd6', open: '#aeb6c4', ft: C.mind, ours: C.state };
  new Chart($('#board-chart'), {
    type: 'bar',
    data: { labels: BOARD.map(b => b[0]), datasets: [{ data: BOARD.map(b => b[1]), backgroundColor: BOARD.map(b => kindColor[b[2]]), borderRadius: 3 }] },
    options: { indexAxis: 'y', maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => `${c.raw.toFixed(2)}%` } } },
      scales: { x: { min: 70, max: 90 }, y: { grid: { display: false },
        ticks: { autoSkip: false, font: ctx => ({ size: 11, weight: BOARD[ctx.index][2] === 'ours' ? '600' : '400' }), color: ctx => BOARD[ctx.index][2] === 'ours' ? C.state : C.dim } } } },
  });

  // state ablation
  new Chart($('#state-chart'), {
    type: 'bar',
    data: { labels: BACKBONES, datasets: STATE_ABL.map((r, i) => ({ label: r[0], data: r[1], borderRadius: 3, maxBarThickness: 22,
      backgroundColor: i === 0 ? C.state : ['#c3c7cf', '#9fcfa6', '#f0b0a8', '#bdb8ee'][i - 1] })) },
    options: { maintainAspectRatio: false, scales: { x: { grid: { display: false } }, y: { min: 74, max: 83, title: { display: true, text: 'Accuracy (%)' } } } },
  });

  // CoT quality
  const cotNames = Object.keys(COT_QUALITY[0]);
  const cotColors = ['#d9dce3', C.gray, C.grayDark, C.mind, C.state];
  const cotChart = new Chart($('#cot-chart'), {
    type: 'bar',
    data: { labels: COT_COLS, datasets: cotNames.map((n, i) => ({ label: n, data: [], backgroundColor: cotColors[i], borderRadius: 3, maxBarThickness: 18 })) },
    options: { maintainAspectRatio: false, scales: { x: { grid: { display: false } }, y: { min: 5, max: 10, title: { display: true, text: 'Judge score (0–10)' } } } },
  });
  const setCot = bb => { cotChart.data.datasets.forEach(s => s.data = COT_QUALITY[bb][s.label]); cotChart.update(); };
  segment('#cot-seg', b => setCot(+b.dataset.bb)); setCot(2);

  // generalization
  const genColors = [C.gray, C.grayDark, C.state];
  const genChart = new Chart($('#gen-chart'), {
    type: 'bar',
    data: { labels: BACKBONES, datasets: ['Original', 'Direct SFT', 'ReState'].map((m, i) => ({ label: m === 'Original' ? 'Original (no SFT)' : m, key: m, data: [], backgroundColor: genColors[i], borderRadius: 4, maxBarThickness: 40 })) },
    options: { maintainAspectRatio: false, scales: { x: { grid: { display: false } }, y: { title: { display: true, text: 'Accuracy (%)' } } } },
  });
  const setGen = ds => { const g = GEN[ds]; genChart.data.datasets.forEach(s => s.data = g[s.key]); fitY(genChart, Object.values(g).flat()); genChart.update(); };
  segment('#gen-seg', b => setGen(b.dataset.ds)); setGen('m3cot');

  // option counts
  new Chart($('#opt-chart'), {
    type: 'bar',
    data: { labels: OPTIONS.labels, datasets: [{ data: OPTIONS.counts, backgroundColor: OPTIONS.labels.map(l => l === '4' ? C.state : C.stage), borderRadius: 3 }] },
    options: { maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => `${c.raw.toLocaleString()} samples (${(c.raw / 100).toFixed(2)}%)` } } },
      scales: { x: { title: { display: true, text: 'Number of options' }, grid: { display: false } }, y: { title: { display: true, text: 'Samples' } } } },
  });
}

/* segmented control helper: toggles .on and calls cb(button) */
function segment(sel, cb) {
  $$(`${sel} button`).forEach(b => b.addEventListener('click', () => {
    $$(`${sel} button`).forEach(x => x.classList.toggle('on', x === b)); cb(b);
  }));
}

/* ---------- sketch theme hook ----------
   The page has a single look: the hand-drawn stick-figure notebook.
   All drawing lives in sketch.js (needs vendor/rough.js); here we only add the
   credit line and start it after the rest of DOMContentLoaded has built the page. */
/* title banner: every title line must stay on one line -> shrink the whole <h1> (both lines
   keep the same size) until the longest line fits */
function fitBanner() {
  const lines = $$('.title-board .title');
  const fit = () => lines.forEach(el => {
    el.style.fontSize = '';
    const over = el.scrollWidth / Math.max(1, el.clientWidth);
    if (over > 1) el.style.fontSize = (parseFloat(getComputedStyle(el).fontSize) / over * 0.98).toFixed(2) + 'px';
  });
  fit();
  addEventListener('resize', fit);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
}

/* top-left brand: robot and word react to hover independently.
   robot: head tilts + body bobs (CSS); after 1.5 s of hovering it starts blinking at random.
   touch screens: a tap plays the hover animation once (.poke). */
function initBrand() {
  const bot = $('.brand-bot'), word = $('.brand-word'); if (!bot) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let tm = 0;
  const blink = () => { bot.classList.add('blink'); setTimeout(() => bot.classList.remove('blink'), 140); };
  const loop = () => { blink(); if (Math.random() < 0.3) setTimeout(blink, 320); tm = setTimeout(loop, 2500 + Math.random() * 1500); };
  bot.addEventListener('mouseenter', () => { clearTimeout(tm); tm = setTimeout(loop, 1500); });
  bot.addEventListener('mouseleave', () => { clearTimeout(tm); bot.classList.remove('blink'); });
  const poke = el => () => { el.classList.add('poke'); clearTimeout(el._pk); el._pk = setTimeout(() => el.classList.remove('poke'), 900); };
  bot.addEventListener('touchstart', poke(bot), { passive: true });
  word.addEventListener('touchstart', poke(word), { passive: true });
}

function initSketch() {
  $('.foot').insertAdjacentHTML('beforeend', '<p class="dim credit">Hand-drawn lines: <a href="https://roughjs.com" target="_blank" rel="noopener">Rough.js</a> (MIT). Stick figures: original drawings for this page.</p>');
  requestAnimationFrame(() => window.Sketch && window.Sketch.init());
}

/* ---------- misc ---------- */
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toast._t); toast._t = setTimeout(() => t.hidden = true, 1800);
}
function initMisc() {
  $$('.copy').forEach(btn => btn.addEventListener('click', () => {
    const txt = document.getElementById(btn.dataset.target).innerText.trim();
    (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(
      () => { btn.textContent = 'Copied'; setTimeout(() => btn.textContent = 'Copy', 1400); },
      () => toast('Copy failed — select the text manually'));
  }));
  $$('[data-todo]').forEach(a => a.addEventListener('click', e => {
    if (a.getAttribute('href') === '#') { e.preventDefault(); toast(a.dataset.todo === 'code' ? 'Code will be released soon' : 'Link will be available soon'); }
  }));
  const lb = $('#lightbox');
  document.addEventListener('click', e => {
    const img = e.target.closest('img.zoom');
    if (img) { lb.querySelector('img').src = img.src; lb.hidden = false; }
    else if (e.target.closest('#lightbox')) lb.hidden = true;
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') lb.hidden = true; });
  const io = new IntersectionObserver(es => es.forEach(x => x.isIntersecting && x.target.classList.add('in')), { threshold: .05 });
  $$('.block, .tldr').forEach(el => io.observe(el));
  const links = $$('.nav a'), secs = links.map(a => $(a.getAttribute('href')));
  const nio = new IntersectionObserver(es => es.forEach(x => {
    if (x.isIntersecting) links.forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + x.target.id));
  }), { rootMargin: '-45% 0px -50% 0px' });
  secs.forEach(s => s && nio.observe(s));
}

document.addEventListener('DOMContentLoaded', () => {
  loadColors();
  fitBanner(); initBrand(); initSketch();
  initParadigmToggle(); initEvidence(); initURSM(); initPool(); initDemo(); initDomains();
  initDomainTable(); initAblationTable(); initGallery(); initMisc(); initCharts();
});
