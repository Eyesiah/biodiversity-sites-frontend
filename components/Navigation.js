'use client'

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import ExternalLink from './ExternalLink';
import styles from '@/styles/Navigation.module.css';
import Modal from '@/components/Modal'
import modalStyles from '@/styles/Modal.module.css';
import Tooltip from '@/components/Tooltip';

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
        title="Glossary of BGS Terms"
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

const FeedbackModalButton = () => {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        className={`${styles.link} ${styles.dropbtn}`}
        onClick={() => setShowModal(true)}
      >
        Feedback
      </button>

      <Modal 
        show={showModal} 
        onClose={() => setShowModal(false)} 
        title="Give Feedback"
        style={modalStyles.modalContent}
      >
        <iframe 
          src="/feedback"
          style={{ width: '100%', height: '80vh', border: 'none' }}
          title="Give Feedback"
        />
      </Modal>
    </>
  );
};

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [pageTitle, setPageTitle] = useState('');
  const [pageDesc, setPageDesc] = useState('');
  const pathname = usePathname();

  useEffect(() => {
    // Titles are often set after a small delay, so we'll wait a moment
    setTimeout(() => {
      setPageTitle(document.title);
      const description =
        document.querySelector('meta[name="description"]')?.content ?? "";
      setPageDesc(description);
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
        <ExternalLink href="https://bristoltreeforum.org/" className={styles.imageLink}>
          <Image
            src="/BTF Logodefault.png"
            alt="BFT Logo"
            width={45}
            height={45}
            className={styles.logo}
          />
        </ExternalLink>
        <Tooltip text={pageDesc}>
          <h1 className={styles.pageTitle}>{pageTitle}</h1>
        </Tooltip>
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
            BGS Sites List
          </Link>
          <Dropdown category="BGS Insights">
            <DropdownLink href='/habitat-summary' label='BGS Habitat Finder' />
            <DropdownLink href='/habitat-analysis' label='BGS Habitat Analysis' />
            <DropdownLink href='/all-allocations' label='BGS Habitat Allocations' />
          </Dropdown>
          <Dropdown category="BGS Bodies">
            <DropdownLink href='/responsible-bodies' label='Responsible Bodies' />
            <DropdownLink href='/local-planning-authorities' label='Local Planning Authorities' />
            <DropdownLink href='/national-character-areas' label='National Character Areas' />
            <DropdownLink href='/lnrs' label='Local Nature Recovery Strategies' />
          </Dropdown>
          <Dropdown category="Stats & More">
            <DropdownLink href='/statistics' label='BGS Statistics' />
            <DropdownLink href='/HU-calculator' label='Habitat Unit Calculator' />
            <DropdownLink href='/query' label='API Query & Export' />
            <AboutModalButton/>
            <GlossarytModalButton/>
          </Dropdown>
          <dropdown><FeedbackModalButton/></dropdown> 
        </div>        
      </div>
    </nav>
  );
}