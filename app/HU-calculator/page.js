"use client"

import { formatNumber } from '@/lib/format';
import Head from 'next/head';
import { useState, useTransition } from 'react';
import styles from '@/styles/SiteDetails.module.css';
import { calcHU } from './actions';

export default function HUCalculatorPage({}) {

  let [result, setResult] = useState('');
  let [isPending, startTransition] = useTransition();

  const actionWithTransition = (formData) => {
    startTransition(async () => {
      const res = await calcHU(formData)
      setResult(`${formatNumber(res.HU)} HU`);
    });
  };

  return (
   <div className="container">
      <Head>
        <title>Local Nature Recovery Strategy Sites</title>
      </Head>
      <main className="main">
        
        <section className={styles.card}>
          <form action={actionWithTransition}>
            <table className="site-table">
              <tbody>
                <tr>
                  <td>Size</td>
                  <td><input name="size" /></td>
                </tr>
                <tr>
                  <td>Habitat</td>
                  <td><input name="habitat" /></td>
                </tr>
                <tr>
                  <td>Condition</td>
                  <td><input name="condition" /></td>
                </tr>
                <tr>
                  <td>Improvement Type</td>
                  <td><select name="improvementType">
                    <option value="none">None</option>
                    <option value="creation">Creation</option>
                    <option value="improvement">Improvement</option>
                  </select></td>
                </tr>
              </tbody>
            </table>
            <button type="submit" disabled={isPending}>{isPending ? 'Calculating...' : 'Calculate'}</button>
          </form>
          <p>{result}</p>
        </section>
      </main>
    </div>
  )
}