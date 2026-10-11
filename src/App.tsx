import { databaseStatus } from './lib/databaseStatus'

// This is your start page. Change the heading to your product name in session 4.
// Then replace this page, one story at a time.
export default function App() {
  const database = databaseStatus(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
  )

  return (
    <main>
      <h1>Our product</h1>
      <p className="lead">It works. Your app is running.</p>

      <ul className="checks">
        <li>
          <strong>Next step:</strong> open <code>docs/SETUP.md</code> and follow it.
        </li>
        <li>
          <strong>Database:</strong>{' '}
          {database === 'connected'
            ? 'connected.'
            : 'not connected. That is fine. You add one later, only if your product needs to save data.'}
        </li>
      </ul>
    </main>
  )
}
