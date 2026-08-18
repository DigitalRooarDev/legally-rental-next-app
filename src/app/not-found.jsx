import Link from 'next/link';

export const metadata = { title: 'Page not found' };

export default function NotFound() {
  return (
    <main className="container">
      <div className="empty-state text-center">
        <h1 className="empty-state-title">404</h1>
        <h5>Page Not Found</h5>
        <p className="empty-state-message">
          We're sorry. the page you requested could not be found. Please go back to the home page.
        </p>
        <Link className="btn btn-primary mt-3" href="/">
          Back to home
        </Link>
      </div>
    </main>
  );
}
