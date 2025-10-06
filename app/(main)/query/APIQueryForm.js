"use client"

import { useState, useEffect } from 'react';
import Link from 'next/link';

function SubmitButton({ pending }) {
  return (
    <button type="submit" disabled={pending}>
      {pending ? 'Downloading...' : 'Download'}
    </button>
  );
}

export default function APIQueryForm({ }) {
  const [query, setQuery] = useState('sites');
  const [format, setFormat] = useState('csv');
  const [isLoading, setIsLoading] = useState(false);
  const [fullUrl, setFullUrl] = useState('');

  useEffect(() => {
    const newUrl = `${window.location.origin}/api/query/${query}/${format}`;
    setFullUrl(newUrl);
  }, [query, format]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch(`/api/query/${query}/${format}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `${query}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      a.remove();
    } catch (error) {
      console.error("Could not fetch or download the file:", error);
      // Handle error state in UI, maybe show a message
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <table className="site-table">
        <tbody>
          <tr>
            <td>Query</td>
            <td>
              <select name="query" value={query} onChange={(e) => setQuery(e.target.value)}>
                <option value="sites">All BGS Sites Summary</option>
              </select>
            </td>
          </tr>
          <tr>
            <td>Format</td>
            <td>
              <select name="format" value={format} onChange={(e) => setFormat(e.target.value)}>
                <option value="csv">CSV</option>
                <option value="json">JSON</option>
                <option value="xml">XML</option>
              </select>
            </td>
          </tr>
          <tr>
            <td><SubmitButton pending={isLoading} /></td>
          </tr>
          <tr>
            <td><p>API URL: <Link href={`/api/query/${query}/${format}`} target="_blank"><code>{fullUrl}</code></Link></p></td>
          </tr>
        </tbody>
      </table>
    </form>
  )
}