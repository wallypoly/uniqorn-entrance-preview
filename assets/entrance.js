/**
 * Homepage entrance.
 *
 * The line and the mist are atmosphere; every entrance stays a real link.
 * JavaScript only adds the focus response and the click-to-white transition.
 * Routing never depends on this file.
 */
(() => {
  'use strict';

  /*
   * The threshold, retiring itself.
   *
   * header.php armed `html.js-threshold` before first paint; the CSS keyframes
   * carry the whole sequence and settle on the finished cover. This only takes
   * the class back off once the walk is over, so the page returns to its
   * ordinary state and nothing is left holding an animation.
   *
   * If this never runs, the keyframes have already run to `forwards` and the
   * page is the finished cover anyway. Nothing here is load-bearing.
   */
  const root = document.documentElement;
  if (root.classList.contains('js-threshold')) {
    let done = false;
    const threshold = document.querySelector('.entrance-threshold');
    const canvas = document.querySelector('.entrance-ink');
    const drawing = document.querySelector('.entrance-drawing');
    const painting = document.querySelector('.entrance-threshold img');
    const seatThreshold = () => {
      if (!threshold) return;
      const anchor = document.querySelector('.entrance-anchor');
      const nav = document.querySelector('.entrance-paths');
      if (!anchor || !nav) return;
      let x;
      let y;
      const mobile = getComputedStyle(anchor).display === 'none';
      if (mobile) {
        const rect = nav.getBoundingClientRect();
        x = rect.left + (parseFloat(getComputedStyle(nav, '::before').left) || 5);
        y = rect.top + 6;
      } else {
        const rect = anchor.getBoundingClientRect();
        x = rect.left + rect.width / 2;
        y = rect.top + rect.height / 2;
      }
      threshold.style.setProperty('--anchor-x', x + 'px');
      threshold.style.setProperty('--anchor-y', y + 'px');
      threshold.style.setProperty('--art-x', x + 'px');
      threshold.style.setProperty('--art-y', y + 'px');
    };
    seatThreshold();
    /* The painting stays hidden until its star has been seated on the cover
       point. Otherwise the first painted frame appears at the CSS default
       centre and visibly jumps when these coordinates arrive. */
    root.classList.add('threshold-seated');
    window.addEventListener('resize', seatThreshold);
    if (canvas && painting) {
      Promise.resolve(painting.decode ? painting.decode() : null)
        .then(() => {
          if (done) return;
          const box = painting.getBoundingClientRect();
          if (drawing) {
            drawing.width = painting.naturalWidth;
            drawing.height = painting.naturalHeight;
            const drawCtx = drawing.getContext('2d', { willReadFrequently: true });
            if (drawCtx) {
              const dw = drawing.width;
              const dh = drawing.height;
              drawCtx.drawImage(painting, 0, 0, dw, dh);
              const original = drawCtx.getImageData(0, 0, dw, dh).data;
              const revealed = drawCtx.createImageData(dw, dh);
              const marks = [];
              const order = new Float32Array(dw * dh);
              for (let y = 0; y < dh; y++) for (let x = 0; x < dw; x++) {
                const i = y * dw + x;
                const j = i * 4;
                if (original[j + 3] === 0) continue;
                marks.push(i);
                revealed.data[j] = original[j];
                revealed.data[j + 1] = original[j + 1];
                revealed.data[j + 2] = original[j + 2];
                const nx = x / dw;
                const ny = y / dh;
                order[i] = .02 + .46 * ny
                  + .08 * Math.sin(nx * 9 + ny * 7)
                  + .03 * Math.sin(nx * 27 - ny * 19);
              }
              const drawStart = performance.now();
              const paint = now => {
                if (done) return;
                const progress = Math.max(0, Math.min(1, (now - drawStart) / 1100));
                for (const i of marks) {
                  const j = i * 4;
                  const arrival = Math.max(0, Math.min(1, (progress - order[i]) / .12));
                  revealed.data[j + 3] = original[j + 3] * arrival;
                }
                drawCtx.putImageData(revealed, 0, 0);
                if (progress < 1) requestAnimationFrame(paint);
              };
              paint(drawStart);
              root.classList.add('painting-ready');
            }
          }
          const scale = 2;
          const w = canvas.width = Math.ceil(innerWidth / scale);
          const h = canvas.height = Math.ceil(innerHeight / scale);
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (!ctx) return;
          ctx.drawImage(painting, box.left / scale, box.top / scale,
            box.width / scale, box.height / scale);
          const source = ctx.getImageData(0, 0, w, h).data;
          const distance = new Float32Array(w * h);
          const diagonal = Math.SQRT2;
          for (let i = 0; i < distance.length; i++) {
            distance[i] = source[i * 4 + 3] > 20 ? 0 : 10000;
          }
          for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
            const i = y * w + x;
            if (x) distance[i] = Math.min(distance[i], distance[i - 1] + 1);
            if (y) distance[i] = Math.min(distance[i], distance[i - w] + 1);
            if (x && y) distance[i] = Math.min(distance[i], distance[i - w - 1] + diagonal);
            if (x + 1 < w && y) distance[i] = Math.min(distance[i], distance[i - w + 1] + diagonal);
          }
          let farthest = 0;
          for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) {
            const i = y * w + x;
            if (x + 1 < w) distance[i] = Math.min(distance[i], distance[i + 1] + 1);
            if (y + 1 < h) distance[i] = Math.min(distance[i], distance[i + w] + 1);
            if (x + 1 < w && y + 1 < h) distance[i] = Math.min(distance[i], distance[i + w + 1] + diagonal);
            if (x && y + 1 < h) distance[i] = Math.min(distance[i], distance[i + w - 1] + diagonal);
            farthest = Math.max(farthest, distance[i]);
          }
          const frame = ctx.createImageData(w, h);
          const tide = new Float32Array(w * h);
          const pooling = new Float32Array(w * h);
          const grain = new Float32Array(w * h);
          for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
            const i = y * w + x;
            tide[i] = 8 * Math.sin(x * .055 + Math.sin(y * .04))
              + 5 * Math.sin(y * .09 + Math.sin(x * .035));
            pooling[i] = .06 * Math.sin(x * .028 + Math.sin(y * .041))
              + .04 * Math.sin(y * .053 - x * .017);
            grain[i] = ((((x * 73 + y * 151) % 23) - 11) / 11) * .025;
          }
          const start = performance.now() + 860;
          const render = now => {
            if (done) return;
            const progress = Math.max(0, Math.min(1, (now - start) / 1700));
            const reach = (1 - Math.pow(1 - progress, 2.2)) * (farthest + 100);
            const pixels = frame.data;
            for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
              const i = y * w + x;
              const j = i * 4;
              const wet = reach - distance[i] + tide[i];
              const front = Math.max(0, Math.min(1, (wet + 25) / 50));
              const settled = Math.max(0, Math.min(1, (wet - 5) / 80));
              const rim = .07 * Math.max(0, 1 - Math.abs(wet - 16) / 20);
              const depth = Math.max(0, Math.min(1, .12 + .82 * settled + pooling[i] + rim + grain[i]));
              pixels[j] = 120 - 91 * depth;
              pixels[j + 1] = 155 - 103 * depth;
              pixels[j + 2] = 201 - 117 * depth;
              pixels[j + 3] = front * (.42 + .58 * settled) * 255;
            }
            ctx.putImageData(frame, 0, 0);
            if (progress < 1) requestAnimationFrame(render);
          };
          requestAnimationFrame(render);
        })
        .catch(() => { /* the white layer retires and the homepage remains usable */ });
    }
    const retire = () => {
      if (done) return;
      done = true;
      root.classList.remove('js-threshold', 'painting-ready', 'threshold-seated');
    };
    window.setTimeout(retire, 4000);
    window.addEventListener('keydown', event => {
      if (event.key === 'Escape') retire();
    });
  }

  const entrance = document.querySelector('.entrance');
  if (!entrance) return;

  const layer = document.querySelector('.white-transition');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const paths = Array.from(entrance.querySelectorAll('.path[data-path]'));

  let navigating = false;
  let timer;

  /* the matching line answers while an entrance is considered */
  paths.forEach(path => {
    const link = path.querySelector('.path-link');
    if (!link) return;
    const on = () => entrance.setAttribute('data-focus', path.dataset.path);
    const off = () => entrance.removeAttribute('data-focus');
    link.addEventListener('mouseenter', on);
    link.addEventListener('focus', on);
    link.addEventListener('mouseleave', off);
    link.addEventListener('blur', off);
  });

  const reset = () => {
    window.clearTimeout(timer);
    navigating = false;
    document.body.classList.remove('is-leaving');
    entrance.removeAttribute('data-focus');
    entrance.querySelectorAll('.is-selected').forEach(el => el.classList.remove('is-selected'));
  };
  window.addEventListener('pageshow', reset);

  /* ---- the line: measure it, then draw it --------------------------------

     The dash pattern has to be given in screen pixels. `pathLength="100"`
     normalises a path in its own user units, but a non-scaling stroke is
     resolved in the outermost coordinate system, and the browser then reads
     the dash pattern in screen pixels too — so the normalised length is
     ignored and `stroke-dasharray: 100` means "100px on, 100px off". That is
     what turned the line into a dashed cable.

     The svg is stretched over the box (`viewBox="0 0 100 100"` with
     `preserveAspectRatio="none"`), so a user-space point maps onto the box by
     a plain ratio. Sampling the path and summing in those terms gives the real
     screen length, which is what the dash needs. */
  const svg = entrance.querySelector('.entrance-lines');
  const lines = svg ? Array.from(svg.querySelectorAll('.line')) : [];

  /* ---- seat the strands on the names -------------------------------------

     The strands and the names are laid out in two different coordinate
     systems and they cannot be reconciled in CSS.

     The strands are percentages of the entrance box: the box is
     `100svh - header`, and the strands are stretched over it with
     `preserveAspectRatio="none"`. The names are laid out by the grid, and
     their rhythm is a mix of vw (`.path-zh` is `clamp(20px, 2.3vw, 31px)`) and
     vh (`--path-gap` is `clamp(28px, 5.5vh, 62px)`) inside a centred,
     padded container. No single unit describes both, so they agree at exactly
     one viewport and drift apart everywhere else.

     Measured before this pass, with the generator's targets already corrected
     to the reference viewport: strand a missed its name by -18 to +16px
     vertically and strand c by -14 to +13px, and horizontally the air between
     the tip and the first glyph ranged from -53px (the tip past the glyph) to
     +50px. The first strand used to be 45px *below* its name at 1440x900 —
     the whole fan sat one row too low, which is what "the lines are in very
     strange places" described.

     So the generator draws the shape and this places it. Each strand is
     scaled about its own start point — which is the red anchor, so the anchor
     stays pinned and the departure bundle keeps its shape — until its far end
     lands on the centre line of the name it belongs to, a fixed `AIR` short
     of the first glyph. The endpoint is then exact at every viewport; the
     curve between is stretched by the ratio of two distances that differ by a
     few percent, so the distortion is a few percent too.

     Runs on load, on resize, and once the webfonts have settled — the names'
     metrics change when the display face swaps in, and the seat has to move
     with them. It is deliberately outside the `reduced.matches` gate below:
     reduced motion is about animation, not about geometry, and a visitor who
     asked for no motion should still get a line that points at the right
     word. */
  const AIR = 26;

  const seat = () => {
    if (!svg) return;
    const box = svg.getBoundingClientRect();
    if (!box.width || !box.height) return;
    const names = entrance.querySelectorAll('.entrance-paths .path-zh');

    ['a', 'b', 'c'].forEach((key, i) => {
      const rows = svg.querySelectorAll('.line--' + key);
      const name = names[i];
      if (!rows.length || !name) return;

      const rect = name.getBoundingClientRect();
      if (!rect.width) return;
      const targetY = ((rect.top + rect.height / 2 - box.top) / box.height) * 100;

      const probe = rows[0];
      const start = probe.getPointAtLength(0);
      const end = probe.getPointAtLength(probe.getTotalLength());
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      if (!dx || !dy) return;

      /*
       * Which edge the air comes off depends on which way the strand runs.
       * A leftward strand reaches its name from the right; taking the air off
       * the left edge makes it walk the tip through the glyphs to get there.
       */
      const edge = dx < 0 ? rect.right + AIR : rect.left - AIR;
      const targetX = ((edge - box.left) / box.width) * 100;

      const sx = (targetX - start.x) / dx;
      const sy = (targetY - start.y) / dy;
      if (!isFinite(sx) || !isFinite(sy)) return;

      const matrix = 'matrix(' + sx.toFixed(5) + ' 0 0 ' + sy.toFixed(5) + ' ' +
        (start.x * (1 - sx)).toFixed(4) + ' ' + (start.y * (1 - sy)).toFixed(4) + ')';
      rows.forEach(row => row.setAttribute('transform', matrix));
    });
  };

  const screenLength = path => {
    /* The path's own CTM, so a strand that has been re-seated is measured
       where it actually is. The svg's CTM would ignore the element's own
       transform and report the length before the correction. */
    const ctm = path.getScreenCTM();
    if (!ctm) return 0;
    const at = t => {
      const p = path.getPointAtLength(t);
      return new DOMPoint(p.x, p.y).matrixTransform(ctm);
    };
    const total = path.getTotalLength();
    const steps = 64;
    let length = 0;
    let prev = at(0);
    for (let i = 1; i <= steps; i++) {
      const point = at((total * i) / steps);
      length += Math.hypot(point.x - prev.x, point.y - prev.y);
      prev = point;
    }
    return length;
  };

  const measure = () => {
    lines.forEach(path => {
      if (path.dataset.drawn) return;
      path.style.setProperty('--line-len', screenLength(path).toFixed(1) + 'px');
    });
  };

  seat();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(seat);

  /* `.is-live` is what starts every entrance animation. Without it the line
     and the anchor are already in their finished state, so a visitor with no
     JavaScript — or with reduced motion asked for — sees a complete drawing
     rather than one caught mid-stroke. */
  if (svg && !reduced.matches) {
    measure();
    if (root.classList.contains('js-threshold')) {
      window.setTimeout(() => entrance.classList.add('is-live'), 3800);
    } else {
      entrance.classList.add('is-live');
    }

    /* Once drawn, drop the dash entirely. A stale length left on the element
       would otherwise re-cut the line into dashes after a resize. */
    lines.forEach(path => {
      path.addEventListener('animationend', () => {
        path.style.strokeDasharray = 'none';
        path.style.strokeDashoffset = '0';
        path.dataset.drawn = '1';
      }, { once: true });
    });

    let resizeTimer;
    window.addEventListener('resize', () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => { seat(); measure(); }, 200);
    });
  } else if (svg) {
    /* reduced motion: no animation, but the geometry still has to follow the
       layout when the window changes */
    let resizeTimer;
    window.addEventListener('resize', () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(seat, 200);
    });
  }

  if (!layer) return;

  entrance.addEventListener('click', event => {
    const link = event.target.closest('a[data-entrance]');
    if (!link || event.defaultPrevented || event.button !== 0 ||
        event.metaKey || event.ctrlKey || event.shiftKey || event.altKey ||
        link.target || link.hasAttribute('download')) return;

    const url = new URL(link.href, window.location.href);
    if (url.origin !== window.location.origin || reduced.matches) return;

    if (navigating) {
      event.preventDefault();
      return;
    }
    event.preventDefault();
    navigating = true;

    const rect = link.getBoundingClientRect();
    const x = event.detail ? event.clientX : rect.left + rect.width / 2;
    const y = event.detail ? event.clientY : rect.top + rect.height / 2;
    layer.style.setProperty('--origin-x', x + 'px');
    layer.style.setProperty('--origin-y', y + 'px');

    const path = link.closest('.path');
    if (path) path.classList.add('is-selected');
    document.body.classList.add('is-leaving');

    // Bounded fallback: routing never depends on transitionend.
    // 1000ms, not the 430ms this used to be. The wash takes 1500ms to reach
    // full size, and leaving at 430ms cut it off at roughly a third — the
    // page changed while the ink was still opening. A full white screen held
    // much past a second reads as a stall, so this is the balance point.
    timer = window.setTimeout(() => window.location.assign(url.href), 1000);
  });
})();
