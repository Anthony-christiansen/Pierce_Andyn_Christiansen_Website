/* ============================================
   Pierce's Website — Gallery & Lightbox
   js/gallery.js

   Handles:
   - Lightbox (full-screen photo viewer)
   - Keyboard navigation (arrow keys, Escape)
   - Touch/swipe support for mobile
   - Year filter buttons on gallery.html
   - Lazy loading trigger for gallery images
   - initGallery() — call on gallery.html
   - initLightbox() — call on any page with
     lightbox-able images (mosaic, year pages)
   ============================================ */


/* ============================================
   LIGHTBOX
   ============================================
   
   Usage: add data-lightbox to any <img> or
   its parent container to make it clickable.
   
   Optional attributes on the trigger element:
     data-lightbox-caption="Caption text"
     data-lightbox-group="group-name"  ← enables prev/next within a group
   
   Examples:
     <img src="photo.jpg" data-lightbox data-lightbox-caption="Pierce at the lake">
     <div data-lightbox data-lightbox-caption="Roomba time">
       <img src="photo.jpg">
     </div>
============================================ */

var LightboxState = {
    overlay: null,
    imgEl: null,
    captionEl: null,
    currentGroup: [],
    currentIndex: 0,
    touchStartX: 0,
    touchStartY: 0
};


/**
 * Build the lightbox DOM once and append to body.
 */
function buildLightboxDOM() {
    if (document.getElementById('lightbox-overlay')) return; // Already built

    var overlay = document.createElement('div');
    overlay.id = 'lightbox-overlay';
    overlay.className = 'lightbox-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Photo viewer');

    overlay.innerHTML = [
        '<div class="lightbox-inner" id="lightbox-inner">',
        '  <button class="lightbox-close" id="lightbox-close" aria-label="Close photo viewer">&#x2715;</button>',
        '  <button class="lightbox-nav prev" id="lightbox-prev" aria-label="Previous photo">&#8249;</button>',
        '  <img class="lightbox-img" id="lightbox-img" src="" alt="Photo" loading="eager">',
        '  <button class="lightbox-nav next" id="lightbox-next" aria-label="Next photo">&#8250;</button>',
        '  <div class="lightbox-caption" id="lightbox-caption"></div>',
        '</div>'
    ].join('');

    document.body.appendChild(overlay);

    LightboxState.overlay = overlay;
    LightboxState.imgEl = document.getElementById('lightbox-img');
    LightboxState.captionEl = document.getElementById('lightbox-caption');

    // Close on overlay background click
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) closeLightbox();
    });

    // Close button
    document.getElementById('lightbox-close').addEventListener('click', closeLightbox);

    // Prev / Next buttons
    document.getElementById('lightbox-prev').addEventListener('click', function(e) {
        e.stopPropagation();
        lightboxNavigate(-1);
    });

    document.getElementById('lightbox-next').addEventListener('click', function(e) {
        e.stopPropagation();
        lightboxNavigate(1);
    });

    // Keyboard navigation
    document.addEventListener('keydown', function(e) {
        if (!LightboxState.overlay.classList.contains('open')) return;
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowLeft') lightboxNavigate(-1);
        if (e.key === 'ArrowRight') lightboxNavigate(1);
    });

    // Touch swipe support
    overlay.addEventListener('touchstart', function(e) {
        LightboxState.touchStartX = e.changedTouches[0].clientX;
        LightboxState.touchStartY = e.changedTouches[0].clientY;
    }, { passive: true });

    overlay.addEventListener('touchend', function(e) {
        var dx = e.changedTouches[0].clientX - LightboxState.touchStartX;
        var dy = e.changedTouches[0].clientY - LightboxState.touchStartY;

        // Only register horizontal swipe if it's more horizontal than vertical
        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
            lightboxNavigate(dx < 0 ? 1 : -1);
        }
    }, { passive: true });
}


/**
 * Open the lightbox with a given image src and optional caption.
 * If groupName is provided, prev/next will cycle through that group.
 */
function openLightbox(src, caption, groupName, triggerEl) {
    buildLightboxDOM();

    // Build the group for navigation
    if (groupName) {
        var groupItems = document.querySelectorAll('[data-lightbox-group="' + groupName + '"]');
        LightboxState.currentGroup = Array.from(groupItems);
        LightboxState.currentIndex = triggerEl ? LightboxState.currentGroup.indexOf(triggerEl) : 0;
    } else {
        LightboxState.currentGroup = triggerEl ? [triggerEl] : [];
        LightboxState.currentIndex = 0;
    }

    // Show/hide nav arrows based on group size
    var prevBtn = document.getElementById('lightbox-prev');
    var nextBtn = document.getElementById('lightbox-next');
    var hasMultiple = LightboxState.currentGroup.length > 1;
    prevBtn.style.display = hasMultiple ? '' : 'none';
    nextBtn.style.display = hasMultiple ? '' : 'none';

    setLightboxContent(src, caption);

    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    // Show overlay
    LightboxState.overlay.style.display = 'flex';
    requestAnimationFrame(function() {
        LightboxState.overlay.classList.add('open');
    });

    // Focus the close button for accessibility
    setTimeout(function() {
        var closeBtn = document.getElementById('lightbox-close');
        if (closeBtn) closeBtn.focus();
    }, 100);
}


/**
 * Set the image and caption in the lightbox.
 */
function setLightboxContent(src, caption) {
    var img = LightboxState.imgEl;
    var cap = LightboxState.captionEl;

    // Fade out current image
    img.style.opacity = '0';
    img.style.transition = 'opacity 0.2s ease';

    img.onload = function() {
        img.style.opacity = '1';
    };

    img.src = src;
    img.alt = caption || 'Photo of Pierce';
    cap.textContent = caption || '';
}


/**
 * Navigate prev (-1) or next (+1) within the current group.
 */
function lightboxNavigate(direction) {
    if (LightboxState.currentGroup.length < 2) return;

    LightboxState.currentIndex = (LightboxState.currentIndex + direction + LightboxState.currentGroup.length) % LightboxState.currentGroup.length;

    var target = LightboxState.currentGroup[LightboxState.currentIndex];
    var src = getLightboxSrc(target);
    var caption = target.getAttribute('data-lightbox-caption') || '';

    setLightboxContent(src, caption);
}


/**
 * Extract the image src from a trigger element.
 * If the element is an <img>, use its src.
 * If it's a container, find the first <img> inside it.
 */
function getLightboxSrc(el) {
    if (el.tagName === 'IMG') return el.src;
    var img = el.querySelector('img');
    return img ? img.src : '';
}


/**
 * Close the lightbox.
 */
function closeLightbox() {
    if (!LightboxState.overlay) return;
    LightboxState.overlay.classList.remove('open');
    document.body.style.overflow = '';

    // Hide after transition
    setTimeout(function() {
        if (LightboxState.overlay) {
            LightboxState.overlay.style.display = 'none';
        }
    }, 300);
}


/**
 * Attach lightbox click handlers to all [data-lightbox] elements on the page.
 * Call this after any dynamic content is added to the page.
 */
function initLightbox() {
    buildLightboxDOM();

    var triggers = document.querySelectorAll('[data-lightbox]');

    triggers.forEach(function(el) {
        // Avoid double-binding
        if (el.dataset.lightboxBound) return;
        el.dataset.lightboxBound = 'true';

        el.style.cursor = 'zoom-in';

        el.addEventListener('click', function() {
            var src = getLightboxSrc(el);
            if (!src) return;

            var caption = el.getAttribute('data-lightbox-caption') || '';
            var group = el.getAttribute('data-lightbox-group') || null;

            openLightbox(src, caption, group, el);
        });

        // Keyboard support (Enter / Space)
        if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
        el.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                el.click();
            }
        });
    });
}


/* ============================================
   GALLERY PAGE — Filter + Grid
   ============================================
   
   Expects gallery.html to have:
   - Filter buttons with data-filter="2023" (or "all")
   - Gallery items with data-year="2023"
   - Each item has data-lightbox on the element
     or its img child
============================================ */

/**
 * Initialize the gallery page:
 * - Sets up year filter buttons
 * - Attaches lightbox to all gallery items
 * - Loads gallery items from data/gallery.json if available
 */
function initGallery() {
    // Initialize lightbox for any hard-coded items in the HTML
    initLightbox();

    // Set up filter buttons
    initGalleryFilters();

    // Load from JSON if the grid is empty (data-driven gallery)
    var grid = document.getElementById('gallery-grid');
    if (grid && grid.children.length === 0) {
        loadGalleryFromJSON(grid);
    }
}


/**
 * Set up gallery filter buttons.
 * Buttons: data-filter="all" | "2023" | "2024" | "2025" | "2026"
 * Items: data-year="2023"
 */
function initGalleryFilters() {
    var filterBtns = document.querySelectorAll('[data-filter]');
    var galleryItems = document.querySelectorAll('[data-year]');

    if (!filterBtns.length) return;

    filterBtns.forEach(function(btn) {
        btn.addEventListener('click', function() {
            var filter = btn.getAttribute('data-filter');

            // Update active state
            filterBtns.forEach(function(b) { b.classList.remove('active'); });
            btn.classList.add('active');

            // Show/hide items
            galleryItems.forEach(function(item) {
                if (filter === 'all' || item.getAttribute('data-year') === filter) {
                    item.style.display = '';
                    // Trigger a small fade-in
                    item.style.opacity = '0';
                    requestAnimationFrame(function() {
                        item.style.transition = 'opacity 0.35s ease';
                        item.style.opacity = '1';
                    });
                } else {
                    item.style.display = 'none';
                }
            });
        });
    });

    // Default: activate "all" button
    var allBtn = document.querySelector('[data-filter="all"]');
    if (allBtn) allBtn.classList.add('active');
}


/**
 * Load gallery items from data/gallery.json.
 * Populates the #gallery-grid element with rendered items.
 * Falls back gracefully if the JSON doesn't exist yet.
 */
function loadGalleryFromJSON(grid) {
    // Depth check: gallery.html is at /pages/gallery.html
    // so the path to data/gallery.json from root is /data/gallery.json
    fetch('/data/gallery.json')
        .then(function(res) {
            if (!res.ok) throw new Error('gallery.json not found');
            return res.json();
        })
        .then(function(data) {
            if (!data.photos || !data.photos.length) {
                renderGalleryEmpty(grid);
                return;
            }

            // Render each photo
            data.photos.forEach(function(photo, i) {
                var item = document.createElement('div');
                item.className = 'gallery-item reveal';
                item.setAttribute('data-year', photo.year || '');
                item.setAttribute('data-lightbox', '');
                item.setAttribute('data-lightbox-caption', photo.caption || '');
                item.setAttribute('data-lightbox-group', 'gallery');

                var img = document.createElement('img');
                img.src = '/' + photo.src;
                img.alt = photo.caption || 'Photo of Pierce';
                img.loading = 'lazy';

                var cap = document.createElement('div');
                cap.className = 'gallery-item-caption';
                cap.textContent = photo.caption || '';

                item.appendChild(img);
                if (photo.caption) item.appendChild(cap);
                grid.appendChild(item);
            });

            // Re-initialize lightbox for dynamically added items
            initLightbox();

            // Re-run scroll reveal for new items
            if (typeof initScrollReveal === 'function') initScrollReveal();

            // Re-run filters (items now have data-year)
            initGalleryFilters();
        })
        .catch(function() {
            // gallery.json doesn't exist yet — show placeholder state
            renderGalleryEmpty(grid);
        });
}


/**
 * Render a friendly empty state in the gallery grid.
 */
function renderGalleryEmpty(grid) {
    grid.innerHTML = [
        '<div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: var(--text-light);">',
        '  <div style="font-size: 3rem; margin-bottom: 12px;">📷</div>',
        '  <p style="font-family: \'Caveat\', cursive; font-size: 1.3rem; margin-bottom: 6px;">Photos coming soon!</p>',
        '  <p style="font-size: 0.9rem;">Add photos to <code>images/gallery/</code> and update <code>data/gallery.json</code></p>',
        '</div>'
    ].join('');
}


/* ============================================
   MOSAIC + YEAR PAGE LIGHTBOX HELPERS
   ============================================
   
   The homepage mosaic and year pages use
   .mosaic-item elements with images inside.
   Call initMosaicLightbox() on those pages.
============================================ */

/**
 * Attach lightbox to all .mosaic-item elements that contain an img.
 * Skips video items (those use native video controls).
 */
function initMosaicLightbox() {
    var mosaicItems = document.querySelectorAll('.mosaic-item');

    mosaicItems.forEach(function(item) {
        var img = item.querySelector('img');
        if (!img) return; // Skip video items and placeholders

        // Only bind if not already a data-lightbox trigger
        if (!item.hasAttribute('data-lightbox') && !item.dataset.lightboxBound) {
            item.setAttribute('data-lightbox', '');
            item.setAttribute('data-lightbox-caption',
                item.querySelector('.mosaic-caption') ?
                item.querySelector('.mosaic-caption').textContent.trim() : '');
            item.setAttribute('data-lightbox-group', 'mosaic');
        }
    });

    initLightbox();
}


/* ============================================
   POLAROID LIGHTBOX HELPERS
   ============================================ */

/**
 * Attach lightbox to all .polaroid elements that contain a real img.
 */
function initPolaroidLightbox() {
    var polaroids = document.querySelectorAll('.polaroid');

    polaroids.forEach(function(polaroid) {
        var img = polaroid.querySelector('img.polaroid-img');
        if (!img) return;

        if (!polaroid.dataset.lightboxBound) {
            polaroid.setAttribute('data-lightbox', '');
            var label = polaroid.querySelector('.polaroid-label');
            polaroid.setAttribute('data-lightbox-caption', label ? label.textContent.trim() : '');
            polaroid.setAttribute('data-lightbox-group', 'polaroids');
        }
    });

    initLightbox();
}


/* ============================================
   PUBLIC API — what pages should call
   ============================================
   
   gallery.html     → initGallery()
   home.html        → initMosaicLightbox() + initPolaroidLightbox()
   year pages       → initMosaicLightbox()
   any page         → initLightbox() for [data-lightbox] elements
============================================ */
