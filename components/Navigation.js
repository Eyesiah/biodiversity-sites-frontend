
import Link from 'next/link';
import { useState } from 'react';
import styles from '../styles/Navigation.module.css';

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <nav className={styles.nav}>
      <button className={styles.hamburger} onClick={toggleMenu}>
        &#9776;
      </button>
      <div className={`${styles.menu} ${isOpen ? styles.open : ''}`}>
        <Link href="/about" className={styles.link}>About</Link>
        <Link href="/sites" className={styles.link}>Site List</Link>
        <Link href="/habitat-summary" className={styles.link}>Habitat Summary</Link>
      </div>
    </nav>
  );
}
