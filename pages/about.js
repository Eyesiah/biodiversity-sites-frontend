
import Head from 'next/head';

export default function About() {
  return (
    <div className="container">
      <Head>
        <title>About</title>
      </Head>
      <main className="main">
        <h1 className="title">About</h1>
        <p>This is the about page.</p>
      </main>
    </div>
  );
}
