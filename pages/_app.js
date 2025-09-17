import Navigation from '@/components/Navigation';
import 'styles/globals.css';
import Head from 'next/head';
import Script from 'next/script';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';

function MyApp({ Component, pageProps }) {
  const [isLoading, setIsLoading] = useState(false);

  const umamiWebsiteId =
    process.env.NODE_ENV === 'production'
      ? '4b0b86b1-e0ca-46d3-9439-936cdad532a5'
      : 'b718ac79-8ca2-494a-a398-47adf5e8188a';

  const router = useRouter();

  useEffect(() => {
    const handleStart = (url) => {
      setIsLoading(true);
      NProgress.start();
    };
    const handleStop = () => {
      setIsLoading(false);
      NProgress.done();
    };

    router.events.on('routeChangeStart', handleStart);
    router.events.on('routeChangeComplete', handleStop);
    router.events.on('routeChangeError', handleStop);

    return () => {
      router.events.off('routeChangeStart', handleStart);
      router.events.off('routeChangeComplete', handleStop);
      router.events.off('routeChangeError', handleStop);
    };
  }, [router]);

  const isChartPage = 
    router.pathname === '/allocated-habitats' ||
    router.pathname === '/improvement-habitats' ||
    router.pathname === '/baseline-area-habitats' ||
    router.pathname === '/baseline-hedgerow-habitats' ||
    router.pathname === '/baseline-watercourse-habitats' ||
    router.pathname === '/improvement-hedgerows' ||
    router.pathname === '/improvement-watercourses' ||
    router.pathname === '/hedgerow-allocations' ||
    router.pathname === '/watercourse-allocations' ||
    router.pathname === '/imd-decile-distribution';

  return (
    <>
      <Head>
        <title>BGS Register</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="Biodiversity Gain Sites Register" />
        <link rel="apple-touch-icon" href="/ToBlogo192.png" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Script
        strategy="afterInteractive"
        src="/api/umami/script"
        data-website-id={umamiWebsiteId}
      />
      {!isChartPage && <Navigation />}
      {isLoading && isChartPage ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <div className="loader"></div>
        </div>
      ) : (
        <Component {...pageProps} />
      )}
      <footer style={{ textAlign: 'center', padding: '1rem', fontSize: '0.8rem', color: '#aaa' }}>
        {pageProps.lastUpdated && (
          <p>
            Page last updated: {new Date(pageProps.lastUpdated).toLocaleString('en-GB')}
          </p>
        )}
        <p>
          Version: {process.env.APP_VERSION}-{process.env.GIT_COMMIT_HASH}
        </p>
      </footer>
    </>
  );
}

export default MyApp;
