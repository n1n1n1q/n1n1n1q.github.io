(function () {
  'use strict';

  document.documentElement.classList.add('js');

  function onReady(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  function revealOnScroll() {
    const items = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('is-visible'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
    items.forEach((el) => io.observe(el));
  }

  /* Highlight the nav link for the section currently in view. */
  function navSpy() {
    const links = Array.prototype.slice.call(document.querySelectorAll('.site-nav-inner a[href^="#"]'));
    if (!links.length || !('IntersectionObserver' in window)) return;
    const byId = {};
    links.forEach((a) => { byId[a.getAttribute('href').slice(1)] = a; });

    function activate(id) {
      links.forEach((a) => {
        const on = a === byId[id];
        a.classList.toggle('is-active', on);
        if (on) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
    }

    // The hero and the About section both belong to the "About" link.
    const targets = [];
    const hero = document.querySelector('.hero');
    if (hero) targets.push([hero, 'top']);
    // A section without its own nav link keeps the link of the section above it.
    let lastLinked = 'top';
    document.querySelectorAll('.section[id]').forEach((sec) => {
      if (byId[sec.id]) lastLinked = sec.id;
      targets.push([sec, lastLinked]);
    });

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const hit = targets.filter((t) => t[0] === entry.target)[0];
        if (hit) activate(hit[1]);
      });
    }, { rootMargin: '-35% 0px -60% 0px' });
    targets.forEach((t) => io.observe(t[0]));
  }

  /* ---------- Hero backdrop: graph paper under a loupe ----------
     Faint notebook graph paper that bulges under the cursor like a
     magnifying glass, and settles flat again when the pointer leaves. */
  function heroBackdrop() {
    const hero = document.querySelector('.hero');
    if (!hero) return;
    const canvas = document.createElement('canvas');
    canvas.className = 'hero-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    hero.prepend(canvas);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const INK = '#9cc9ff';
    const GAP = 51;              // grid pitch in px; every 5th line is a major line
    const MINOR_ALPHA = 0.18, MAJOR_ALPHA = 0.42, LINE_WIDTH = 1.9;
    const LENS_SIGMA = 156;      // loupe radius (gaussian sigma) in px
    const LENS_POWER = 0.5;      // how far points push out at the loupe's centre

    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const pointer = { x: 0, y: 0, active: false };
    let width = 0, height = 0, ratio = 1;
    let strength = 0, lensX = 0, lensY = 0;
    let frame = 0, previous = 0, visible = true;

    function draw() {
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, width, height);
      const amp = LENS_POWER * strength * strength * (3 - 2 * strength);
      const sigma2 = 2 * LENS_SIGMA * LENS_SIGMA;
      const minor = new Path2D(), major = new Path2D();
      const plot = (path, x, y, first) => {
        let px = x, py = y;
        if (amp > 0) {
          const dx = x - lensX, dy = y - lensY;
          const f = amp * Math.exp(-(dx * dx + dy * dy) / sigma2);
          px += dx * f; py += dy * f;
        }
        first ? path.moveTo(px, py) : path.lineTo(px, py);
      };
      const offsetX = (width / 2) % GAP;
      for (let i = -1; i * GAP < height + GAP; i++) {
        const path = i % 5 === 0 ? major : minor;
        for (let x = -10; x <= width + 10; x += 10) plot(path, x, i * GAP, x === -10);
      }
      for (let j = -1; j * GAP < width + GAP; j++) {
        const path = j % 5 === 0 ? major : minor;
        for (let y = -10; y <= height + 10; y += 10) plot(path, j * GAP + offsetX, y, y === -10);
      }
      ctx.strokeStyle = INK;
      ctx.lineWidth = LINE_WIDTH;
      ctx.globalAlpha = MINOR_ALPHA; ctx.stroke(minor);
      ctx.globalAlpha = MAJOR_ALPHA; ctx.stroke(major);
      ctx.globalAlpha = 1;
    }

    function tick(now) {
      frame = 0;
      const dt = Math.min((now - previous) / 1000, 0.04);
      previous = now;
      const target = pointer.active ? 1 : 0;
      const k = 1 - Math.exp(-dt * (target > strength ? 6 : 3));
      strength += (target - strength) * k;
      if (Math.abs(target - strength) < 0.002) strength = target;
      draw();
      if (strength !== target && visible && !document.hidden && !motion.matches) {
        frame = requestAnimationFrame(tick);
      }
    }

    function wake() {
      if (frame || !visible || document.hidden || motion.matches) return;
      previous = performance.now();
      frame = requestAnimationFrame(tick);
    }

    function build() {
      const bounds = hero.getBoundingClientRect();
      width = bounds.width;
      height = bounds.height;
      if (!width || !height) return;
      ratio = Math.min(devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      draw();
    }

    hero.addEventListener('pointermove', event => {
      if (motion.matches) return;
      const bounds = hero.getBoundingClientRect();
      pointer.x = lensX = event.clientX - bounds.left;
      pointer.y = lensY = event.clientY - bounds.top;
      pointer.active = true;
      if (!frame) draw();
      wake();
    }, { passive: true });

    function release() { pointer.active = false; wake(); }
    hero.addEventListener('pointerleave', release);
    hero.addEventListener('pointercancel', release);
    hero.addEventListener('pointerup', event => {
      if (event.pointerType !== 'mouse') release();
    });
    window.addEventListener('blur', release);
    document.addEventListener('visibilitychange', () => {
      pointer.active = false;
      if (!document.hidden) wake();
    });
    motion.addEventListener('change', () => {
      cancelAnimationFrame(frame);
      frame = 0;
      pointer.active = false;
      strength = 0;
      build();
    });
    new ResizeObserver(build).observe(hero);
    new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      if (visible) wake();
    }).observe(hero);
    build();
  }

  onReady(() => {
    revealOnScroll();
    navSpy();
    heroBackdrop();
  });
})();
