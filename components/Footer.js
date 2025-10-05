import ExternalLink from '@/components/ExternalLink';
import Link from 'next/link'

export default function Footer({ lastUpdated }) {
  return (
    <footer style={{ textAlign: 'center', padding: '1rem', fontSize: '0.8rem', color: '#aaa', backgroundColor: '#282c34' }}>
     
     <p>Designed by <ExternalLink href="https://bristoltreeforum.org/"><b>Bristol Tree Forum</b></ExternalLink> | <Link href="/about#privacy-policy" target="_blank">Privacy Policy</Link></p>

     {lastUpdated && (  
        <p>
          Page last updated: {new Date(lastUpdated).toLocaleString('en-GB', { timeZone: 'UTC' })} UTC
        </p>
      )}
      <p>
        Version: {process.env.APP_VERSION}-{process.env.GIT_COMMIT_HASH}
      </p>
    </footer>
  );
}