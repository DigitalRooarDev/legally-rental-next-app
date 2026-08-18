'use client';

import { useEffect } from 'react';

export default function GlobalRouteError({ error, reset }) {
  useEffect(() => {
    console.error('[route-error]', error);
  }, [error]);

  return (
    <main className="container">
      <div className="empty-state text-center">
        <h5>Something went wrong</h5>
        <p className="empty-state-message">
          We could not load this page. Please try again in a moment.
        </p>
        <button type="button" className="btn btn-primary mt-3" onClick={reset}>
          Try again
        </button>
      </div>
    </main>
  );
}
