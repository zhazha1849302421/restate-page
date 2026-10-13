/* ============================================================
   intro.js — opening animation (≈12 s), inspired by the OpenGame landing page
   ------------------------------------------------------------
   Loaded right after the <div id="intro"> block at the top of <body>, so the
   dark overlay covers the page from the very first frame.

   What it does
     - splitType()  wraps every character of .in-type lines in a <span class="in-ch">
                    with its own animation-delay:  data-t + index * data-s  (seconds)
     - exit()       the dark background dissolves while the intro title flies
                    (translate + scale) exactly onto the chalkboard title; then the
                    board title takes over, the overlay is removed, scrolling is
                    restored, the board's "States" flares once and 'intro:done' is
                    dispatched (sketch.js: the teacher figure cheers)
     - skip         "Skip ›" button, any click, Esc / Enter / Space, mouse wheel or
                    touch swipe -> exit() right away (shorter flight)

   Edit
     - texts and per-line start times: the intro block in index.html
     - other timings: intro.css (search "t=")
     - END = when the exit starts; FLY / FLY_SKIP = exit durations (ms)
   Not played when the system asks for reduced motion.
   ============================================================ */
(function () {
  var el = document.getElementById('intro');
  if (!el) return;
  var root = document.documentElement;
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) { el.remove(); return; }

  var END = 10.9;         // seconds: automatic exit
  var FLY = 1100;         // ms: exit duration after the full intro
  var FLY_SKIP = 750;     // ms: exit duration when skipped

  root.classList.add('intro-on');
  var t0 = performance.now();

  function splitType(line) {
    var t = parseFloat(line.dataset.t) || 0, s = parseFloat(line.dataset.s) || 0.03, i = 0;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (c) {
        if (c.nodeType === 3) {
          var frag = document.createDocumentFragment();
          Array.from(c.textContent).forEach(function (ch) {
            var sp = document.createElement('span');
            sp.className = 'in-ch'; sp.textContent = ch;
            sp.style.animationDelay = (t + i++ * s).toFixed(3) + 's';
            frag.appendChild(sp);
          });
          c.replaceWith(frag);
        } else if (c.nodeType === 1) walk(c);
      });
    })(line);
  }
  Array.prototype.forEach.call(el.querySelectorAll('.in-type'), splitType);

  var done = false, timer = setTimeout(exit, END * 1000);
  function exit() {
    if (done) return;
    done = true; clearTimeout(timer);
    ['keydown', 'wheel', 'touchmove'].forEach(function (ev) { removeEventListener(ev, onKey, { capture: true }); });
    var fly = performance.now() - t0 < END * 1000 - 50 ? FLY_SKIP : FLY;
    el.style.setProperty('--fly', fly + 'ms');
    el.classList.add('in-exit');

    var title = el.querySelector('.in-title');
    var board = document.querySelector('.title-board'), target = board && board.querySelector('.title');
    // frame 1: freeze the title in place (animations off) and arm the transition
    requestAnimationFrame(function () {
      title.getBoundingClientRect();
      title.style.transition = 'transform ' + fly + 'ms cubic-bezier(.65, 0, .35, 1), opacity .35s ease';
      // frame 2: map the centre/width of line 1 onto the board's line 1
      requestAnimationFrame(function () {
        var a1 = title.querySelector('.in-tl'), b1 = target && target.querySelector('.t-line');
        if (!a1 || !b1) return;
        var A = a1.getBoundingClientRect(), B = b1.getBoundingClientRect(), O = title.getBoundingClientRect();
        if (!A.width || !B.width) return;
        var k = B.width / A.width;
        var ox = O.left + O.width / 2, oy = O.top + O.height / 2;
        var ax = A.left + A.width / 2, ay = A.top + A.height / 2, bx = B.left + B.width / 2, by = B.top + B.height / 2;
        var dx = bx - ox - (ax - ox) * k, dy = by - oy - (ay - oy) * k;
        title.style.transform = 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px) scale(' + k.toFixed(4) + ')';
      });
    });
    // hand over to the real title just before landing
    setTimeout(function () { root.classList.remove('intro-on'); title.style.opacity = '0'; }, fly - 180);
    setTimeout(function () {
      el.remove();
      if (board) board.classList.add('lit');
      document.dispatchEvent(new CustomEvent('intro:done'));
    }, fly + 250);
  }
  function onKey(e) {
    if (e.type !== 'keydown' || ['Escape', 'Enter', ' ', 'Spacebar'].indexOf(e.key) >= 0) { e.preventDefault(); exit(); }
  }
  el.addEventListener('click', exit);
  addEventListener('keydown', onKey, { capture: true });
  addEventListener('wheel', onKey, { capture: true, passive: false });
  addEventListener('touchmove', onKey, { capture: true, passive: false });
})();
