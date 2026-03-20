/* ============================================
   Pierce's Website — Main JavaScript
   js/main.js

   Handles:
   - Mobile hamburger menu toggle
   - Click-outside-to-close menu
   - Active nav link highlighting
   - Scroll reveal animations
   - Dynamic age calculation
   - Birthday countdown
   ============================================ */


/**
 * Initialize mobile navigation.
 */
function initMobileNav() {
    var navHamburger = document.getElementById('nav-hamburger');
    var navLinks = document.getElementById('nav-links');

    if (!navHamburger || !navLinks) return;

    // Toggle menu open/closed
    navHamburger.addEventListener('click', function() {
        navLinks.classList.toggle('open');
    });

    // Close menu when a link is clicked
    navLinks.querySelectorAll('a').forEach(function(link) {
        link.addEventListener('click', function() {
            navLinks.classList.remove('open');
        });
    });

    // Close menu when clicking outside the nav
    document.addEventListener('click', function(e) {
        if (navLinks.classList.contains('open') && !e.target.closest('.site-nav')) {
            navLinks.classList.remove('open');
        }
    });
}


/**
 * Set the active nav link based on current page path.
 */
function setActiveNavLink() {
    var path = window.location.pathname;
    var navLinks = document.querySelectorAll('.nav-links a');

    navLinks.forEach(function(link) {
        link.classList.remove('active');
        var href = link.getAttribute('href');

        if (path === href || (href !== '/' && path.startsWith(href))) {
            link.classList.add('active');
        }
    });
}


/**
 * Initialize scroll-triggered reveal animations.
 * Elements with class "reveal" fade in when scrolled into view.
 */
function initScrollReveal() {
    var reveals = document.querySelectorAll('.reveal');
    if (!reveals.length) return;

    var observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    reveals.forEach(function(el) {
        observer.observe(el);
    });
}


/**
 * Calculate and display Pierce's current age.
 * Looks for an element with id="pierce-age".
 */
function updateAge() {
    var el = document.getElementById('pierce-age');
    if (!el) return;

    var bday = new Date(2023, 2, 29); // March 29, 2023
    var today = new Date();
    var years = today.getFullYear() - bday.getFullYear();
    var m = today.getMonth() - bday.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < bday.getDate())) years--;

    el.textContent = years + (years === 1 ? ' year old' : ' years old');
}


/**
 * Birthday countdown.
 * Looks for id="birthday-section" and id="birthday-countdown".
 * Automatically hides the banner a week after the birthday.
 */
function updateBirthdayCountdown() {
    var section = document.getElementById('birthday-section');
    var el = document.getElementById('birthday-countdown');
    if (!el) return;

    // Next upcoming birthday — update this each year
    var bday = new Date(2026, 2, 29, 15, 0, 0); // March 29, 2026 3:00 PM
    var now = new Date();

    if (now > bday) {
        if (now - bday < 86400000 * 7) {
            // Within a week after — celebrate!
            el.textContent = '🎉 Happy 3rd Birthday, Pierce! 🎉';
        } else {
            // Past the celebration window — hide banner
            if (section) section.style.display = 'none';
        }
        return;
    }

    var diff = bday - now;
    var days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
        el.textContent = '🎉 TODAY IS THE DAY! 🎉';
    } else if (days === 1) {
        el.textContent = 'Tomorrow!';
    } else {
        el.textContent = days + ' days to go!';
    }
}


/**
 * Initialize everything when the DOM is ready.
 */
function initPage() {
    initMobileNav();
    setActiveNavLink();
    initScrollReveal();
    updateAge();
    updateBirthdayCountdown();

    // Update countdown every minute
    if (document.getElementById('birthday-countdown')) {
        setInterval(updateBirthdayCountdown, 60000);
    }
}


// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPage);
} else {
    initPage();
}
