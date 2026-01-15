import { useEffect } from 'react';

/**
 * Custom hook to remove Spline watermark badges from the DOM
 * Uses MutationObserver to catch watermarks as soon as they're injected by the Spline runtime
 */
export function useSplineWatermarkRemoval() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const processedElements = new WeakSet<HTMLElement>();

    const disablePointerEvents = () => {
      const canvases = document.querySelectorAll('canvas');
      canvases.forEach((canvas) => {
        if (canvas.style.pointerEvents !== 'none') {
          canvas.style.pointerEvents = 'none';
        }
      });
    };

    const removeWatermark = () => {
      // Check all possible elements that could be the watermark
      const selectors = [
        'a[href*="spline.design"]',
        'a[href*="splinetool"]',
        'a[href*="spline"]',
      ];

      let removedCount = 0;

      // Check links by selector
      selectors.forEach((selector) => {
        try {
          const links = document.querySelectorAll<HTMLAnchorElement>(selector);
          links.forEach((link) => {
            if (processedElements.has(link)) return;

            const text = link.textContent?.toLowerCase().trim() || '';
            const href = link.getAttribute('href') || link.href || '';
            const hrefLower = href.toLowerCase();

            if (
              hrefLower.includes('spline.design') ||
              hrefLower.includes('splinetool') ||
              text.includes('built with spline') ||
              text.includes('built with')
            ) {
              removedCount++;
              processedElements.add(link);
              // Completely remove from DOM
              link.remove();
            }
          });
        } catch (e) {
          // Ignore selector errors
        }
      });

      // Also check all links in the document as a fallback
      const allLinks = document.querySelectorAll<HTMLAnchorElement>('a');
      allLinks.forEach((link) => {
        if (processedElements.has(link)) return;

        const text = link.textContent?.toLowerCase().trim() || '';
        const href = link.getAttribute('href') || link.href || '';
        const hrefLower = href.toLowerCase();

        if (
          hrefLower.includes('spline.design') ||
          hrefLower.includes('splinetool') ||
          (text.includes('built with') && hrefLower.includes('spline'))
        ) {
          removedCount++;
          processedElements.add(link);
          link.remove();
        }
      });

      if (removedCount > 0) {
        console.log(
          `Removed ${removedCount} Spline watermark badge(s) from DOM`
        );
      }
    };

    // Use MutationObserver to catch watermark as soon as it's injected
    const observer = new MutationObserver((mutations) => {
      // Check mutations immediately
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as HTMLElement;
            // Check if the added node or its children contain watermark
            const links = element.querySelectorAll
              ? element.querySelectorAll<HTMLAnchorElement>('a')
              : [];
            links.forEach((link) => removeWatermark());
            if (element.tagName === 'A') {
              removeWatermark();
            }
          }
        });
      });
      removeWatermark();
      disablePointerEvents();
    });

    // Start observing the entire document for new elements
    const target = document.body || document.documentElement;
    if (target) {
      observer.observe(target, {
        childList: true,
        subtree: true,
        attributes: false,
      });
    }

    // Run immediately and frequently as backup
    const runRemoval = () => {
      removeWatermark();
      disablePointerEvents();
    };

    // Run immediately
    runRemoval();

    // Use requestAnimationFrame for immediate checks
    let rafId: number;
    const checkWithRAF = () => {
      runRemoval();
      rafId = requestAnimationFrame(checkWithRAF);
    };
    rafId = requestAnimationFrame(checkWithRAF);

    // Also use interval as backup
    const interval = setInterval(runRemoval, 50);

    return () => {
      observer.disconnect();
      clearInterval(interval);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);
}
