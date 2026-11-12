/* =========================================================
   paper.js — Interactive elements for academic paper pages
   ========================================================= */

(function () {
  'use strict';

  function onReady(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  // --- IMAGE COMPARISON SLIDER ---
  function initCompareSliders() {
    const sliders = document.querySelectorAll('.image-compare');
    
    sliders.forEach(container => {
      // Check if already transformed or has too few images
      if (container.querySelector('.compare-overlay')) return;
      const images = container.querySelectorAll('img');
      if (images.length < 2) return;

      const beforeImg = images[0];
      const afterImg = images[1];

      // Add helper classes
      beforeImg.classList.add('compare-before');
      afterImg.classList.add('compare-after');

      // Create overlay div
      const overlay = document.createElement('div');
      overlay.classList.add('compare-overlay');
      container.appendChild(overlay);
      
      // Move afterImg into overlay
      overlay.appendChild(afterImg);

      // Create slider handle (keyboard-operable)
      const handle = document.createElement('div');
      handle.classList.add('compare-handle');
      handle.setAttribute('role', 'slider');
      handle.setAttribute('tabindex', '0');
      handle.setAttribute('aria-label', 'Comparison position');
      handle.setAttribute('aria-valuemin', '0');
      handle.setAttribute('aria-valuemax', '100');
      container.appendChild(handle);

      function setPosition(position) {
        position = Math.min(100, Math.max(0, position));
        overlay.style.width = position + '%';
        handle.style.left = position + '%';
        handle.setAttribute('aria-valuenow', String(Math.round(position)));
      }
      let pct = 50;
      setPosition(pct);

      // Set dimensions of the after-image to match parent container width
      function resize() {
        afterImg.style.width = container.offsetWidth + 'px';
        afterImg.style.height = container.offsetHeight + 'px';
      }
      resize();
      window.addEventListener('resize', resize);

      // Drag mechanics: start anywhere on the image
      let isDragging = false;

      function startDragging(e) {
        isDragging = true;
        drag(e);
      }

      function stopDragging() {
        isDragging = false;
      }

      function drag(e) {
        if (!isDragging) return;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const rect = container.getBoundingClientRect();
        pct = ((clientX - rect.left) / rect.width) * 100;
        setPosition(pct);
      }

      container.addEventListener('mousedown', startDragging);
      window.addEventListener('mouseup', stopDragging);
      window.addEventListener('mousemove', drag);

      container.addEventListener('touchstart', startDragging, { passive: true });
      window.addEventListener('touchend', stopDragging);
      window.addEventListener('touchmove', drag, { passive: true });

      // Keyboard: arrows step 5%, Home/End jump to the edges
      handle.addEventListener('keydown', e => {
        const steps = { ArrowLeft: -5, ArrowDown: -5, ArrowRight: 5, ArrowUp: 5 };
        if (e.key in steps) pct += steps[e.key];
        else if (e.key === 'Home') pct = 0;
        else if (e.key === 'End') pct = 100;
        else return;
        e.preventDefault();
        pct = Math.min(100, Math.max(0, pct));
        setPosition(pct);
      });
    });
  }

  // --- CAROUSEL ---
  function initCarousels() {
    const carousels = document.querySelectorAll('.paper-carousel');

    carousels.forEach(carousel => {
      const slides = Array.from(carousel.querySelectorAll('.carousel-slide'));
      if (slides.length === 0) return;

      // Restructure DOM: place slides inside track & viewport
      const viewport = document.createElement('div');
      viewport.classList.add('carousel-viewport');
      
      const track = document.createElement('div');
      track.classList.add('carousel-track');
      
      slides.forEach(slide => track.appendChild(slide));
      viewport.appendChild(track);
      carousel.appendChild(viewport);

      let currentIndex = 0;

      // Add navigation buttons
      const prevBtn = document.createElement('button');
      prevBtn.type = 'button';
      prevBtn.className = 'carousel-btn carousel-prev';
      prevBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>';
      prevBtn.setAttribute('aria-label', 'Previous slide');

      const nextBtn = document.createElement('button');
      nextBtn.type = 'button';
      nextBtn.className = 'carousel-btn carousel-next';
      nextBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>';
      nextBtn.setAttribute('aria-label', 'Next slide');

      carousel.appendChild(prevBtn);
      carousel.appendChild(nextBtn);

      // Add pagination dots
      const dotsContainer = document.createElement('div');
      dotsContainer.className = 'carousel-dots';
      
      slides.forEach((_, index) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'carousel-dot' + (index === 0 ? ' active' : '');
        dot.setAttribute('aria-label', `Slide ${index + 1} of ${slides.length}`);
        if (index === 0) dot.setAttribute('aria-current', 'true');
        dot.addEventListener('click', () => goToSlide(index));
        dotsContainer.appendChild(dot);
      });
      carousel.appendChild(dotsContainer);

      function update() {
        track.style.transform = `translateX(-${currentIndex * 100}%)`;
        
        const dots = dotsContainer.querySelectorAll('.carousel-dot');
        dots.forEach((dot, index) => {
          dot.classList.toggle('active', index === currentIndex);
          if (index === currentIndex) dot.setAttribute('aria-current', 'true');
          else dot.removeAttribute('aria-current');
        });
      }

      function goToSlide(index) {
        currentIndex = (index + slides.length) % slides.length;
        update();
      }

      prevBtn.addEventListener('click', () => goToSlide(currentIndex - 1));
      nextBtn.addEventListener('click', () => goToSlide(currentIndex + 1));

      // Swipe Gestures
      let startX = 0;
      let endX = 0;

      track.addEventListener('touchstart', e => {
        startX = e.changedTouches[0].screenX;
      }, { passive: true });

      track.addEventListener('touchend', e => {
        endX = e.changedTouches[0].screenX;
        handleSwipe();
      }, { passive: true });

      function handleSwipe() {
        const threshold = 50;
        if (startX - endX > threshold) {
          goToSlide(currentIndex + 1); // Swipe left -> next
        } else if (endX - startX > threshold) {
          goToSlide(currentIndex - 1); // Swipe right -> prev
        }
      }
    });
  }

  // --- BIBTEX COPY BUTTON ---
  function initCopyButtons() {
    const copyBtns = document.querySelectorAll('.copy-citation-btn');

    copyBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const citationBlock = btn.closest('.paper-citation');
        if (!citationBlock) return;

        const codeElement = citationBlock.querySelector('pre code') || citationBlock.querySelector('pre');
        if (!codeElement) return;

        const citationText = codeElement.innerText.trim();

        navigator.clipboard.writeText(citationText).then(() => {
          const originalLabel = btn.innerText;
          btn.innerText = 'Copied';
          btn.classList.add('is-copied');
          
          
          setTimeout(() => {
            btn.innerText = originalLabel;
            btn.classList.remove('is-copied');
            
          }, 2000);
        }).catch(err => {
          console.error('Could not copy BibTeX:', err);
        });
      });
    });
  }

  // --- THEME TOGGLE (same choice as the personal site, shared via localStorage) ---
  function initThemeToggle() {
    const root = document.documentElement;
    const button = document.querySelector('.theme-toggle');
    const system = matchMedia('(prefers-color-scheme: light)');
    function apply(theme) {
      root.dataset.theme = theme;
      if (button) button.setAttribute('aria-label', theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme');
    }
    apply(root.dataset.theme === 'light' ? 'light' : 'dark');
    if (button) button.addEventListener('click', () => {
      const next = root.dataset.theme === 'light' ? 'dark' : 'light';
      try { localStorage.setItem('theme', next); } catch (e) { /* private mode */ }
      apply(next);
    });
    system.addEventListener('change', () => {
      let saved = null;
      try { saved = localStorage.getItem('theme'); } catch (e) { /* private mode */ }
      if (!saved) apply(system.matches ? 'light' : 'dark');
    });
  }

  // --- INITIALIZE ALL ---
  onReady(() => {
    initThemeToggle();
    initCompareSliders();
    initCarousels();
    initCopyButtons();
  });
})();
