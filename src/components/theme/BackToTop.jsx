'use client';

import { useEffect, useState } from 'react';

const VISIBILITY_OFFSET = 300;

export default function BackToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsVisible(window.scrollY > VISIBILITY_OFFSET);

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <svg width="0" height="0" className="hidden" aria-hidden="true" focusable="false">
        <symbol xmlns="http://www.w3.org/2000/svg" viewBox="0 0 653.38 859.99" id="arrow-up">
          <path d="M317.68.47C303.92,2.15,287.92,9,276.8,18.07c-3.2,2.56-62.88,61.84-132.72,131.76C6.8,287.27,11.84,281.91,5.76,296.63,1.36,307.19-.08,314.79,0,327.27c0,9.52.32,12.4,2.16,19.2a78.27,78.27,0,0,0,118.56,45.84c5.12-3.28,17.68-15.44,66.88-64.56l60.64-60.4.24,263.12.16,263.2,1.76,6.4c9,33.36,35.28,56.16,68.4,59.52a78,78,0,0,0,85-66.32c1-6.48,1.2-44.48,1.2-266.8V267.27l60.64,60.56c64.64,64.56,65.6,65.44,79,71,11.2,4.72,17.2,5.92,30,6,15.6.08,26.4-2.56,39-9.6,40.56-22.64,52.16-75.2,25.2-113.92C635,275.67,386.32,26.15,377,18.47,371.2,13.67,359.6,7,353.68,5,341.12.71,328.32-.89,317.68.47Z" />
        </symbol>
      </svg>

      <button
        type="button"
        className={`back-to-top${isVisible ? ' active' : ''}`}
        aria-hidden={!isVisible}
        tabIndex={isVisible ? 0 : -1}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      >
        <span className="arrow">
          <svg className="arrow-up" aria-hidden="true" focusable="false">
            <use xlinkHref="#arrow-up" />
          </svg>
        </span>
        <span className="text">Back to top</span>
      </button>
    </>
  );
}
