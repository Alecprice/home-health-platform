import { Link } from 'react-router-dom';
export function NotFoundPage() {
  return <div className="page"><section className="panel"><h1>Page not found</h1><p>The requested demo screen does not exist.</p><Link className="button primary" to="/">Return to Today</Link></section></div>;
}
