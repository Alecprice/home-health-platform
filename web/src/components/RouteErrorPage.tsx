import { Link, isRouteErrorResponse, useRouteError } from 'react-router-dom';

export function RouteErrorPage() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : import.meta.env.DEV && error instanceof Error ? error.message : 'An unexpected screen error occurred.';
  return <div className="page"><section className="panel"><p className="eyebrow">Recovery</p><h1>This screen could not load</h1><p>{message}</p><p className="helper">Unsaved clinical data should remain in device storage if it was already auto-saved.</p><Link className="button primary" to="/">Return to Today</Link></section></div>;
}
