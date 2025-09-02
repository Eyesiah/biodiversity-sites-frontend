
import Link from 'next/link';
import { useState } from 'react';
import styles from '../styles/Navigation.module.css';

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const closeMenu = () => {
    setIsOpen(false);
  };

  return (
    <nav className={styles.nav}>
      <button
        className={styles.hamburger}
        onClick={toggleMenu}
        aria-label="Toggle menu"
        aria-expanded={isOpen}
        aria-controls="navigation-menu"
      >
        &#9776;
      </button>
      <div id="navigation-menu" className={`${styles.menu} ${isOpen ? styles.open : ''}`}>
        <Link href="/about" className={styles.link} onClick={closeMenu}>About</Link>
        <Link href="/sites" className={styles.link} onClick={closeMenu}>BGS Site List</Link>
        <Link href="/habitat-summary" className={styles.link} onClick={closeMenu}>BGS Habitat Summary</Link>
      </div>
    </nav>
  );
}
