'use client'

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import ExternalLink from './ExternalLink';
import styles from '@/styles/Navigation.module.css';
import Modal from '@/components/Modal'
import modalStyles from '@/styles/Modal.module.css';

const Dropdown = ({ category, children }) => {
  return (
    <div className={styles.dropdown}>
      <button className={styles.dropbtn}>
        {category} <span className={styles.arrow}>&#9662;</span>
      </button>
      <div className={styles.dropdownContent}>
        {children}
      </div>
    </div>
  );
};

const AboutModalButton = () => {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        className={styles.dropdownItem}
        onClick={() => setShowModal(true)}
      >
        About
      </button>

      <Modal 
        show={showModal} 
        onClose={() => setShowModal(false)} 
        title="About this site"
        style={modalStyles.modalContentLarge}
      >
        <iframe 
          src="/about"
          style={{ width: '100%', height: '80vh', border: 'none' }}
          title="About page content"
        />
      </Modal>
    </>
  );
};

const GlossarytModalButton = () => {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        className={styles.dropdownItem}
        onClick={() => setShowModal(true)}
      >
        Glossary
      </button>

      <Modal 
        show={showModal} 
        onClose={() => setShowModal(false)} 
        title="Glossary of BGS terms"
        style={modalStyles.modalContentLarge}
      >
        <iframe 
          src="/glossary"
          style={{ width: '100%', height: '80vh', border: 'none' }}
          title="Glossary of BGS terms"
        />
      </Modal>
    </>
  );
};

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [pageTitle, setPageTitle] = useState('');
  const pathname = usePathname();

  useEffect(() => {
    // Titles are often set after a small delay, so we'll wait a moment
    setTimeout(() => {
      setPageTitle(document.title);
    }, 100);
  }, [pathname]);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const closeMenu = () => {
    setIsOpen(false);
  };

  const DropdownLink = ({href, label}) => {
    return (
      <Link key={href} href={href} className={styles.dropdownItem} onClick={closeMenu}>
        {label}
      </Link>
    )
  }
  
  return (
    <nav className={styles.nav}>
      <div className={styles.leftNav}>
        <ExternalLink href="https://bristoltrees.space/Tree/" className={styles.imageLink}>
          <Image
            src="/TreesofBristolLogo_white.png"
            alt="ToB Logo"
            width={45}
            height={45}
            className={styles.logo}
          />
        </ExternalLink>
        <h1 className={styles.pageTitle}>{pageTitle}</h1>
      </div>
      
      <button
        className={styles.hamburger}
        onClick={toggleMenu}
        aria-label="Toggle menu"
        aria-expanded={isOpen}
        aria-controls="navigation-menu"
      >
        &#9776;
      </button>

      <div className={styles.rightNav}>
        <div id="navigation-menu" className={`${styles.menu} ${isOpen ? styles.open : ''}`}>
          <Link href="/sites" className={`${styles.link} ${styles.dropbtn}`} onClick={closeMenu}>
            BGS sites list
          </Link>
          <Dropdown category="BGS insights">
            <DropdownLink href='/habitat-summary' label='BGS habitat finder' />
            <DropdownLink href='/habitat-analysis' label='BGS habitat analysis' />
            <DropdownLink href='/all-allocations' label='BGS habitat allocations' />
          </Dropdown>
          <Dropdown category="BGS bodies">
            <DropdownLink href='/responsible-bodies' label='Responsible Bodies' />
            <DropdownLink href='/local-planning-authorities' label='Local Planning Authorities' />
            <DropdownLink href='/national-character-areas' label='National Character Areas' />
            <DropdownLink href='/lnrs' label='Local Nature Recovery Strategies' />
          </Dropdown>
          <Dropdown category="Stats & more...">
            <DropdownLink href='/statistics' label='Register statistics' />
            <DropdownLink href='/HU-calculator' label='Habitat unit calculator' />
            <AboutModalButton/>
            <GlossarytModalButton/>
          </Dropdown>
        </div>        
      </div>
    </nav>
  );
}