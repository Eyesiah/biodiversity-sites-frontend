import clientPromise from '../../lib/mongodb';
import styles from '../../styles/SiteDetails.module.css';

export async function getServerSideProps(context) {
  if (!clientPromise) {
    return {
      props: {
        disabled: true,
        events: [],
        totalEvents: 0,
      },
    };
  }

  try {
    const client = await clientPromise;
    const dbName = process.env.NODE_ENV === 'development' ? 'analytics-dev' : 'analytics';
    const db = client.db(dbName);

    const events = await db
      .collection('events')
      .find({})
      .sort({ timestamp: -1 })
      .limit(100)
      .toArray();

    const totalEvents = await db.collection('events').countDocuments();

    return {
      props: {
        disabled: false,
        events: JSON.parse(JSON.stringify(events)),
        totalEvents,
      },
    };
  } catch (e) {
    console.error(e);
    return {
      props: {
        disabled: true,
        events: [],
        totalEvents: 0,
        error: e.message,
      },
    };
  }
}

export default function AnalyticsDashboard({ disabled, events, totalEvents, error }) {
  if (disabled) {
    return (
        <main className={styles.container}>
            <div className={styles.header}>
                <h1>Analytics Dashboard</h1>
            </div>
            <section className={styles.card}>
                <h3>Analytics Disabled</h3>
                <p>
                    Analytics is currently disabled. Please ensure the <code>MONGODB_URI</code>{
                        ' '}
                    is set correctly in your <code>.env.local</code> file.
                </p>
                {error && (
                    <>
                        <p>Error details:</p>
                        <pre>{error}</pre>
                    </>
                )}
            </section>
        </main>
    );
  }

  return (
    <main className={styles.container}>
      <div className={styles.header}>
        <h1>Analytics Dashboard</h1>
      </div>

      <section className={styles.card}>
        <h3>Summary</h3>
        <p>Total Events: {totalEvents}</p>
      </section>

      <section className={styles.card}>
        <h3>Recent Events (Last 100)</h3>
        <div style={{ overflowX: 'auto' }}>
            <table className={styles.table}>
            <thead>
                <tr>
                <th>Timestamp</th>
                <th>Path</th>
                <th>User Agent</th>
                <th>IP Hash</th>
                <th>Location</th>
                </tr>
            </thead>
            <tbody>
                {events.map((event) => (
                <tr key={event._id}>
                    <td>{new Date(event.timestamp).toLocaleString('en-GB')}</td>
                    <td>{event.pathname}</td>
                    <td style={{maxWidth: "300px", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap"}}>{event.userAgent}</td>
                    <td style={{ fontFamily: 'monospace' }}>{event.ip_hash?.substring(0, 12)}...</td>
                    <td>{JSON.stringify(event.geo)}</td>
                </tr>
                ))}
            </tbody>
            </table>
        </div>
      </section>
    </main>
  );
}