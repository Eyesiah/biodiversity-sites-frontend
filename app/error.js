'use client'; // Error components must be Client Components

import { useEffect } from 'react';

export default function Error({ error, reset }) {
  useEffect(() => {
    // Log the error to an error reporting service
    // Note: In production, the error object is sanitized and won't contain the full details.
    // The full error is only available in the server logs (CloudWatch).
    console.error(error);
  }, [error]);

  return (
    <div style={{ textAlign: 'center', padding: '4rem' }}>
      <h2>Something went wrong!</h2>
      <p style={{ color: '#aaa', margin: '1rem 0' }}>
        We&apos;ve been notified of the issue. Please try again.
      </p>
      <button
        onClick={() => reset()} // Attempt to recover by re-rendering the segment
        style={{
          padding: '0.5rem 1rem',
          fontSize: '1rem',
          cursor: 'pointer',
          backgroundColor: '#3498db',
          color: 'white',
          border: 'none',
          borderRadius: '5px'
        }}
      >
        Try again
      </button>
    </div>
  );
}
