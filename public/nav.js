// ==========================================================
// ROBILLIONAIR UNIVERSAL STICKY NAVIGATION & MOBILE DRAWER
// ==========================================================

(() => {
  function initNav() {
    const header = document.querySelector('.site-header, .universal-header');
    const toggleBtn = document.getElementById('mobile-menu-toggle');
    const drawer = document.getElementById('mobile-nav-drawer');

    if (!header) return;

    // --- Sticky Scroll Detection ---
    const updateScroll = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop || (document.getElementById('splash-screen')?.scrollTop || 0);
      header.classList.toggle('is-scrolled', scrollY > 20);
    };

    window.addEventListener('scroll', updateScroll, { passive: true });
    const splashScreen = document.getElementById('splash-screen');
    if (splashScreen) {
      splashScreen.addEventListener('scroll', updateScroll, { passive: true });
    }
    updateScroll();

    // --- Mobile Drawer Toggle Logic ---
    if (toggleBtn && drawer) {
      const openDrawer = () => {
        drawer.classList.add('is-open');
        toggleBtn.classList.add('is-active');
        toggleBtn.setAttribute('aria-expanded', 'true');
        document.body.classList.add('mobile-menu-active');
      };

      const closeDrawer = () => {
        drawer.classList.remove('is-open');
        toggleBtn.classList.remove('is-active');
        toggleBtn.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('mobile-menu-active');
      };

      toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = drawer.classList.contains('is-open');
        if (isOpen) {
          closeDrawer();
        } else {
          openDrawer();
        }
      });

      // Close on clicking any link inside the drawer
      drawer.querySelectorAll('a').forEach((link) => {
        link.addEventListener('click', () => {
          closeDrawer();
        });
      });

      // Close on Escape key press
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && drawer.classList.contains('is-open')) {
          closeDrawer();
        }
      });

      // Close on clicking outside drawer content
      drawer.addEventListener('click', (e) => {
        if (e.target === drawer) {
          closeDrawer();
        }
      });
    }

    // --- Active Link Highlighting ---
    const currentPath = window.location.pathname.replace(/\/$/, '') || '/';
    const navLinks = document.querySelectorAll('.site-nav a, .mobile-nav-link');
    navLinks.forEach((link) => {
      const href = link.getAttribute('href');
      if (!href) return;
      const cleanHref = href.split('#')[0].replace(/\/$/, '') || '/';
      if (cleanHref === currentPath && !href.includes('#')) {
        link.classList.add('active');
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNav);
  } else {
    initNav();
  }
})();
