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

      // Create slider handle
      const handle = document.createElement('div');
      handle.classList.add('compare-handle');
      container.appendChild(handle);

      let pct = 50;
      overlay.style.width = pct + '%';
      handle.style.left = pct + '%';

      // Set dimensions of the after-image to match parent container width
      function resize() {
        afterImg.style.width = container.offsetWidth + 'px';
        afterImg.style.height = container.offsetHeight + 'px';
      }

      // Run on init and window resize
      resize();
      window.addEventListener('resize', resize);

      // Drag mechanics
      let isDragging = false;

      function startDragging(e) {
        isDragging = true;
        drag(e);
        container.style.cursor = 'ew-resize';
      }

      function stopDragging() {
        isDragging = false;
        container.style.cursor = '';
      }

      function drag(e) {
        if (!isDragging) return;
        
        // Support mouse and touch
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const rect = container.getBoundingClientRect();
        
        let position = ((clientX - rect.left) / rect.width) * 100;
        
        if (position < 0) position = 0;
        if (position > 100) position = 100;

        overlay.style.width = position + '%';
        handle.style.left = position + '%';
      }

      // Mouse Listeners
      handle.addEventListener('mousedown', startDragging);
      window.addEventListener('mouseup', stopDragging);
      window.addEventListener('mousemove', drag);

      // Touch Listeners
      handle.addEventListener('touchstart', startDragging, { passive: true });
      window.addEventListener('touchend', stopDragging);
      window.addEventListener('touchmove', drag, { passive: true });
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
      prevBtn.className = 'carousel-btn carousel-prev';
      prevBtn.innerHTML = '&larr;';
      prevBtn.setAttribute('aria-label', 'Previous slide');

      const nextBtn = document.createElement('button');
      nextBtn.className = 'carousel-btn carousel-next';
      nextBtn.innerHTML = '&rarr;';
      nextBtn.setAttribute('aria-label', 'Next slide');

      carousel.appendChild(prevBtn);
      carousel.appendChild(nextBtn);

      // Add pagination dots
      const dotsContainer = document.createElement('div');
      dotsContainer.className = 'carousel-dots';
      
      slides.forEach((_, index) => {
        const dot = document.createElement('span');
        dot.className = 'carousel-dot' + (index === 0 ? ' active' : '');
        dot.addEventListener('click', () => goToSlide(index));
        dotsContainer.appendChild(dot);
      });
      carousel.appendChild(dotsContainer);

      function update() {
        track.style.transform = `translateX(-${currentIndex * 100}%)`;
        
        const dots = dotsContainer.querySelectorAll('.carousel-dot');
        dots.forEach((dot, index) => {
          dot.classList.toggle('active', index === currentIndex);
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
          btn.innerText = 'Copied!';
          btn.style.color = 'var(--accent-2)';
          btn.style.borderColor = 'var(--accent-2)';
          
          setTimeout(() => {
            btn.innerText = originalLabel;
            btn.style.color = '';
            btn.style.borderColor = '';
          }, 2000);
        }).catch(err => {
          console.error('Could not copy BibTeX:', err);
        });
      });
    });
  }

  // --- INITIALIZE ALL ---
  onReady(() => {
    initCompareSliders();
    initCarousels();
    initCopyButtons();
  });
})();
