import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop ensures that whenever navigation occurs between pages,
 * routes, or sections, the scroll position starts at the top (0, 0)
 * rather than carrying over the previous section's scroll offset.
 */
export const ScrollToTop: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '');
      const el = document.getElementById(id);
      if (el) {
        const headerOffset = 80;
        const elementPosition = el.getBoundingClientRect().top;
        const offsetPosition = Math.max(0, elementPosition + window.scrollY - headerOffset);
        window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
        return;
      }
    }

    // Reset window and document scroll position to the top of the new section/page
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (document.documentElement) {
      document.documentElement.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
    if (document.body) {
      document.body.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }, [location.pathname, location.search, location.hash, location.key]);

  return null;
};

export default ScrollToTop;
