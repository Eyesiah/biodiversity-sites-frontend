'use client'

import Link from 'next/link';
import { useState } from 'react';
import Image from 'next/image';
import ExternalLink from './ExternalLink';
import styles from '@/styles/Navigation.module.css';

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
       <ExternalLink href="https://bristoltreeforum.org/" className={styles.imageLink}>
        <Image
          src="/BTFLogodefault.jpg"
          alt="BTF Logo"
          width={45}
          height={45}
          className={styles.logo}
        />
      </ExternalLink>
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
        <Link href="/sites" className={styles.link} onClick={closeMenu}>BGS Sites List</Link>
        <Link href="/habitat-summary" className={styles.link} onClick={closeMenu}>BGS Habitat Summary</Link>
        <Link href="/habitat-analysis" className={styles.link} onClick={closeMenu}>BGS Habitat Analysis</Link>
        <Link href="/all-allocations" className={styles.link} onClick={closeMenu}>All BGS Allocations</Link>
        <Link href="/responsible-bodies" className={styles.link} onClick={closeMenu}>Responsible Bodies</Link>
        <Link href="/local-planning-authorities" className={styles.link} onClick={closeMenu}>Local Planning Authorities</Link>
        <Link href="/national-character-areas" className={styles.link} onClick={closeMenu}>National Character Areas</Link>        
        <Link href="/lnrs" className={styles.link} onClick={closeMenu}>Local Nature Recovery Strategies</Link>
        <Link href="/statistics" className={styles.link} onClick={closeMenu}>Register Statistics</Link>
      </div>
      <div className={styles.rightLogoLink}>
        <ExternalLink href="https://bristoltrees.space/Tree/" className={styles.imageLink}>
            <Image
                src="/ToBlogo192.jpg"
                alt="ToB Logo"
                width={45}
                height={45}
            />
        </ExternalLink>
      </div>
    </nav>
  );
}
