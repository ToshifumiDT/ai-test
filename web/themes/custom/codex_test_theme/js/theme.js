/**
 * @file
 * Progressive interactions for Codex Test Theme.
 */

(function (Drupal, once) {
  Drupal.behaviors.codexTestTheme = {
    attach(context) {
      document.documentElement.classList.add('codex-js');

      once('codex-menu-toggle', '.site-menu-toggle', context).forEach((button) => {
        const navId = button.getAttribute('aria-controls');
        const nav = navId ? document.getElementById(navId) : null;
        const media = window.matchMedia('(max-width: 699px)');

        if (!nav) {
          return;
        }

        const setExpanded = (expanded) => {
          button.setAttribute('aria-expanded', expanded ? 'true' : 'false');
          nav.hidden = media.matches ? !expanded : false;
          nav.dataset.expanded = expanded ? 'true' : 'false';
        };

        const syncNavigation = () => {
          const expanded = button.getAttribute('aria-expanded') === 'true';
          nav.hidden = media.matches ? !expanded : false;
        };

        button.addEventListener('click', () => {
          setExpanded(button.getAttribute('aria-expanded') !== 'true');
        });

        if (typeof media.addEventListener === 'function') {
          media.addEventListener('change', syncNavigation);
        }
        else {
          media.addListener(syncNavigation);
        }

        setExpanded(false);
      });

      once('codex-reveal', '[data-codex-reveal]', context).forEach((element) => {
        if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          element.classList.add('is-visible');
          return;
        }

        const observer = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible');
              observer.unobserve(entry.target);
            }
          });
        }, {
          rootMargin: '0px 0px -8% 0px',
          threshold: 0.12,
        });

        observer.observe(element);
      });
    },
  };
})(Drupal, once);
