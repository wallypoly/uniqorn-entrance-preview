/**
 * Cursor dot — a quiet companion to the system cursor.
 *
 * What this is NOT
 * ----------------
 * - Not a replacement for the system cursor. The OS cursor stays visible at
 *   every moment. A reader who needs it can find it, a11y tools see it, and
 *   touch input has nothing to lose.
 * - Not a hover-reveal halo. Hover behaviour is explicit and load-bearing
 *   (it shows the entry's label), not decorative.
 *
 * What this is
 * ------------
 * An 8px rose dot that rides along the cursor, so the pointer itself carries
 * the anchor — the point in the heart, which is what the brand is named for.
 * Hovering anything marked [data-cursor] opens it into an indigo pill with a
 * rose rim: the dot becomes a vessel, and what it holds is a two-line cue for
 * what pressing here actually does — "进入 / Enter" on the cover, "抽一张 /
 * Draw" on a door inside a space. Four characters of Chinese at most, two or
 * three words of English.
 *
 * Conforms to `uniqorn-taste` v1.0 §7 (Custom Cursor override): system cursor
 * is preserved, this is a companion, not a replacement.
 *
 * Reduced-motion users get the dot at full opacity but no easing; the dot
 * sits exactly under the pointer.
 */
(() => {
  'use strict';

  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)');
  const COARSE  = window.matchMedia('(pointer: coarse)');

  /*
   * Touch / stylus devices: no dot at all. There is no cursor to ride, and
   * a fixed overlay positioned under a non-existent pointer reads as a bug.
   */
  if (COARSE.matches) {
    return;
  }

  /*
   * The dot.
   *
   * One DOM node, kept on body so the paint never crosses a stacking context
   * that might already be clipping something we need (modals, drawers).
   * `position: fixed` pins it to the viewport; transform handles movement so
   * the GPU does the work and reflow never fires.
   */
  const dot = document.createElement('span');
  dot.className = 'cursor-dot';
  dot.setAttribute('aria-hidden', 'true');

  /*
   * The hover cue: a Chinese line over an English one, both inside a wrapper
   * that only exists to stack them. Built once, never recreated — `setCue`
   * rewrites the two texts in place.
   */
  const label = document.createElement('span');
  label.className = 'cursor-dot__label';

  const cue = document.createElement('span');
  cue.className = 'cursor-dot__cue';

  const en = document.createElement('span');
  en.className = 'cursor-dot__en';

  label.appendChild(cue);
  label.appendChild(en);
  dot.appendChild(label);

  document.body.appendChild(dot);

  /*
   * Only now is it safe to take the OS cursor away: the node exists and is
   * already positioned. cursor.css keys `cursor: none` off this class, so a
   * visitor whose JS never ran keeps the real pointer instead of ending up
   * with none at all.
   */
  document.documentElement.classList.add('has-cursor');

  /*
   * State lives on `document.documentElement` rather than a JS object so
   * the CSS rule reads from one source of truth. `data-cursor="hover"` is
   * toggled, and CSS handles size, color and label visibility from there.
   */
  let hoverTarget = null;
  let rafQueued = false;
  let pendingX = 0;
  let pendingY = 0;

  const writePosition = () => {
    rafQueued = false;
    /*
     * `translate3d` keeps the dot on the compositor. The dot's TOP-LEFT
     * sits at the OS cursor's hotspot; CSS handles the rest:
     *   rest:  translate: -4px -4px → 8px dot centered under cursor
     *   hover: translate: 16px -50px → 24px dot above the link label
     * Anything more here would fight the CSS hover transition.
     */
    dot.style.transform = `translate3d(${pendingX}px, ${pendingY}px, 0)`;
  };

  const queue = (x, y) => {
    pendingX = x;
    pendingY = y;
    if (rafQueued) return;
    rafQueued = true;
    requestAnimationFrame(writePosition);
  };

  /*
   * The pointer listener lives on window so nothing can stop propagation
   * and starve us. passive: true lets the browser scroll without waiting
   * for the dot to move.
   */
  window.addEventListener('pointermove', (e) => {
    queue(e.clientX, e.clientY);
  }, { passive: true });

  /*
   * The dot appears immediately at (0,0), then walks to the first real
   * position. That avoids a fade-in that would otherwise need its own
   * animation, which would push past MOTION_INTENSITY=4.
   */
  queue(0, 0);

  /*
   * Hover targets: anything with [data-cursor].
   *
   * The label text comes from data-cursor-label (defaults to "查看"). The
   * scale comes from data-cursor-scale (defaults to 3, i.e. 8 → 24px).
   *
   * We do NOT touch `cursor` on the underlying link. The OS cursor stays
   * as `pointer`; the dot rides alongside.
   */
  /*
   * Anything the visitor can actually press is a target. An explicit
   * [data-cursor] wins because it carries its own cue and size; after that,
   * any link or button. Extending it this far is what makes the cues uniform
   * — a workshop added next month says 了解 without anyone writing it.
   */
  const CLICKABLE = 'a[href], button, [role="button"], input[type="submit"]';

  const findTarget = (el) => {
    while (el && el !== document.body && el !== document.documentElement) {
      /*
       * `data-cursor` is declared without a value (`<a data-cursor>`), so the
       * attribute is present but `dataset.cursor` is the empty string. Check
       * for the attribute itself, not for a truthy dataset value.
       *
       * <html> is excluded because we set dataset.cursor='hover' on it as a
       * stylesheet hook, which would otherwise make it the hover target.
       */
      if (el.dataset && 'cursor' in el.dataset) return el;
      if (el.matches && el.matches(CLICKABLE)) return el;
      el = el.parentElement;
    }
    return null;
  };

  /*
   * The cue for a kind of thing, not for a thing.
   *
   * What the visitor needs on hover is not the item's name — that is already
   * printed on the screen underneath — but what pressing it does. 了解 to
   * find out, 选择 to pick one, 去 to be taken somewhere. Four characters at
   * most, so the pill stays small enough not to be a wall.
   *
   * `size` keeps the header and the two side edges small: they are thin
   * targets and a 64px pill beside them would shout over the whole page.
   *
   * An element's own data-cursor-cue always wins over this table.
   */
  const CUES = [
    /* ---- chrome. Thin targets, so the small step. ---- */
    ['.wordmark',           '回首页', 'Home',   'small'],
    /* `.draw-back` is the same act in a second place: the reading's way back
       to the space it belongs to. Two words for one act is how a vocabulary
       starts drifting, so they share the line. */
    ['.space-id-name, .draw-back', '回主页', 'Home',   'small'],
    ['.space-edges .edge',  '换空间', 'Next',   'small'],
    ['.site-header a, .menu a, .skip-link', '去', 'Go', 'small'],
    ['.archive-filter-link, .filter a, .facet a', '筛选', 'Filter', 'small'],
    ['.modal-close, .draw-close, [data-close]',   '关闭', 'Close',  'small'],

    /* ---- content. ---- */
    ['.workshop-card-item a, .workshop-detail a', '了解', 'Know',   'mid'],
    /* `.archive-link` is what the archive actually renders; `.archive-list a`
       was the shape it looked like from the template and matches nothing. */
    ['.archive-link, .archive-list a, .article-card a', '阅读', 'Read', 'mid'],
    ['.draw-deck-card, .deck-card', '翻开', 'Flip', 'mid'],

    /* ---- things you can take home ----
       No crystal listing exists yet. These selectors are the shapes it will
       plausibly take, so the day it lands the cue arrives with it and nobody
       has to remember this file. 想要 rather than 加购物车 on purpose: there
       is no cart, and the door is a conversation — that is what 看中就问
       means. If a cart ever exists, this is the one line to change. */
    ['.crystal-item a, .crystal-card a, .product a, .product-card a, .shop-item a, .gallery a',
     '想要', 'Want', 'mid'],

    /* ---- forms. ---- */
    ['button[type="submit"], input[type="submit"], .btn-primary, .booking-submit',
     '确认', 'Confirm', 'mid'],
  ];

  const FALLBACK = ['查看', 'View', 'small'];

  const cueFor = (el) => {
    if (el.dataset.cursorCue) {
      return [el.dataset.cursorCue, el.dataset.cursorEn || '', el.dataset.cursorSize || ''];
    }
    for (const [selector, cue, en, size] of CUES) {
      if (el.closest(selector)) return [cue, en, size];
    }
    return FALLBACK;
  };

  /*
   * The cue is what pressing this target does, not what the target is — the
   * name is already on the screen underneath, and repeating it would waste
   * the only four characters we have.
   */
  const setCue = (cueText, enText) => {
    cue.textContent = cueText || '';
    en.textContent = enText || '';
  };

  const onOver = (e) => {
    const t = findTarget(e.target);
    if (window.UQ_CURSOR_DEBUG) {
      try { console.log('[cursor] over target=', t && t.tagName, t && t.dataset.cursorLabel); } catch (_) {}
    }
    if (!t) return;
    const [cueText, enText, size] = cueFor(t);
    hoverTarget = t;
    document.documentElement.dataset.cursor = 'hover';
    dot.dataset.size = size;
    setCue(cueText, enText);
  };

  const onOut = (e) => {
    const t = findTarget(e.target);
    if (!t) return;
    if (t !== hoverTarget) return;
    /*
     * relatedTarget is the element we are entering. If it is still inside
     * the same hover target, we have not actually left it.
     */
    const next = e.relatedTarget;
    if (next && (t.contains(next) || next === t)) return;
    hoverTarget = null;
    document.documentElement.dataset.cursor = '';
    delete dot.dataset.size;
    setCue('', '');
  };

  /*
   * pointerover is the standard event for "the pointer entered this element",
   * but some assistive tech shims and synthetic input only dispatch mouseover.
   * The site already requires pointer events (touch is opted out at the top
   * of this file), so we use pointerover with mouseover as a safety net.
   */
  const onOverBoth = (e) => onOver(e);
  document.addEventListener('pointerover', onOverBoth, { passive: true });
  document.addEventListener('mouseover',  onOverBoth, { passive: true });
  document.addEventListener('pointerout',  onOut,  { passive: true });
  document.addEventListener('mouseout',    onOut,  { passive: true });

  /*
   * Hide the dot while the user is typing in a form field. The OS cursor
   * already does this on its own; mirroring it here keeps the dot from
   * feeling like it is fighting the system.
   */
  document.addEventListener('focusin', (e) => {
    if (e.target.matches('input, textarea, select, [contenteditable]')) {
      dot.dataset.state = 'text';
    }
  });
  document.addEventListener('focusout', (e) => {
    if (e.target.matches('input, textarea, select, [contenteditable]')) {
      delete dot.dataset.state;
    }
  });

  /*
   * On reduced-motion, snap the dot to the pointer with no easing. The
   * class is on body so CSS can also disable the transition globally.
   */
  if (REDUCED.matches) {
    document.body.classList.add('is-cursor-reduced');
  }
})();