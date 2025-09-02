
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
      <button className={styles.hamburger} onClick={toggleMenu}>
        &#9776;
      </button>
      <div className={`${styles.menu} ${isOpen ? styles.open : ''}`}>
        <Link href="/about" className={styles.link} onClick={closeMenu}>About</Link>
        <Link href="/sites" className={styles.link} onClick={closeMenu}>Site List</Link>
        <Link href="/habitat-summary" className={styles.link} onClick={closeMenu}>Habitat Summary</Link>
      </div>
    </nav>
  );
}
