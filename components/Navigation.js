'use client'

import Link from 'next/link';
import { useState } from 'react';
import Image from 'next/image';
import ExternalLink from './ExternalLink';
import styles from '@/styles/Navigation.module.css';

const Dropdown = ({ category, links, closeMenu }) => {
  return (
    <div className={styles.dropdown}>
      <button className={styles.dropbtn}>
        {category} <span className={styles.arrow}>&#9662;</span>
      </button>
      <div className={styles.dropdownContent}>
        {links.map((link) => (
          <Link key={link.href} href={link.href} className={styles.link} onClick={closeMenu}>
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
};

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const closeMenu = () => {
    setIsOpen(false);
  };

  const siteInsightsLinks = [
    { href: '/habitat-summary', label: 'BGS Habitat Summary' },
    { href: '/habitat-analysis', label: 'BGS Habitat Analysis' },
    { href: '/all-allocations', label: 'All BGS Allocations' },
  ];

  const bodiesLinks = [
    { href: '/responsible-bodies', label: 'Responsible Bodies' },
    { href: '/local-planning-authorities', label: 'Local Planning Authorities' },
    { href: '/national-character-areas', label: 'National Character Areas' },
    { href: '/lnrs', label: 'Local Nature Recovery Strategies' },
  ];

  const metaLinks = [
    { href: '/statistics', label: 'Statistics' },
    { href: '/about', label: 'About' },
  ];

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
        <Link href="/sites" className={`${styles.link} ${styles.dropbtn}`} onClick={closeMenu}>
          BGS Sites List
        </Link>
        <Dropdown category="Site Insights" links={siteInsightsLinks} closeMenu={closeMenu} />
        <Dropdown category="Bodies" links={bodiesLinks} closeMenu={closeMenu} />
        <Dropdown category="Meta" links={metaLinks} closeMenu={closeMenu} />
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
