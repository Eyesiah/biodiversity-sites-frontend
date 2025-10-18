'use client'

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import ExternalLink from './ExternalLink';
import Modal from '@/components/Modal'
import modalStyles from '@/styles/Modal.module.css';
import Tooltip from '@/components/Tooltip';
import { WFS_URL } from '@/config'
import { ColorModeButton } from './ui/color-mode'
import { 
  Box, 
  Flex, 
  Text, 
  Button, 
  Menu,
  IconButton,
  useBreakpointValue
} from '@chakra-ui/react';
import { HiChevronDown, HiMenu } from 'react-icons/hi';

// Style-templating components
const NavContainer = ({ children, ...props }) => (
  <Box
    as="nav"
    position="sticky"
    top="0"
    zIndex="1000"
    bg="midnight"
    px="1rem"
    py="0.1rem"
    boxShadow="0 2px 5px rgba(0, 0, 0, 0.2)"
    borderBottom="2px solid"
    borderColor="charcoal"
    display="flex"
    alignItems="center"
    justifyContent="space-between"
    {...props}
  >
    {children}
  </Box>
);

const NavSection = ({ children, ...props }) => (
  <Flex
    alignItems="center"
    gap="1rem"
    {...props}
  >
    {children}
  </Flex>
);

const PageTitle = ({ children, ...props }) => (
  <Text
    as="h1"
    color="clouds"
    fontSize="2.5rem"
    fontWeight="500"
    margin="0"
    {...props}
  >
    {children}
  </Text>
);

const LogoImage = ({ src, alt, ...props }) => (
  <Image
    src={src}
    alt={alt}
    width={45}
    height={45}
    style={{
      borderRadius: '50%',
      display: 'block',
      filter: 'invert(32%) sepia(20%) saturate(1278%) hue-rotate(45deg) brightness(94%) contrast(84%)'
    }}
    {...props}
  />
);

const NavLink = ({ children, href, onClick, ...props }) => (
  <Button
    as={href ? Link : 'button'}
    href={href}
    onClick={onClick}
    variant="ghost"
    color="clouds"
    fontSize="1.3rem"
    fontWeight="500"
    padding="1rem"
    _hover={{
      color: "brand.emphasis",
      bg: "transparent"
    }}
    _active={{
      bg: "transparent"
    }}
    {...props}
  >
    {children}
  </Button>
);

const DropdownMenu = ({ category, children, ...props }) => {
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useBreakpointValue({ base: true, md: false });
  
  return (
    <Box
      position="relative"
      onMouseEnter={() => !isMobile && setIsOpen(true)}
      onMouseLeave={() => !isMobile && setIsOpen(false)}
      onClick={() => isMobile && setIsOpen(!isOpen)}
      {...props}
    >
      <Button
        variant="ghost"
        color="clouds"
        fontSize="1.3rem"
        fontWeight="500"
        padding="1rem"
        width={isMobile ? "100%" : "auto"}
        textAlign={isMobile ? "center" : "left"}
        _hover={{
          color: "brand.emphasis",
          bg: "charcoal"
        }}
        _active={{
          bg: "charcoal"
        }}
      >
        {category} <Text as="span" fontSize="0.8em" marginLeft="0.5rem">▼</Text>
      </Button>
      {isOpen && (
        <Box
          position={isMobile ? "static" : "absolute"}
          top={isMobile ? "auto" : "100%"}
          right={isMobile ? "auto" : "0"}
          bg={isMobile ? "rgba(58, 64, 73, 0.8)" : "charcoal"}
          borderColor="charcoal"
          boxShadow={isMobile ? "none" : "0px 8px 16px 0px rgba(0,0,0,0.2)"}
          minW={isMobile ? "100%" : "160px"}
          width={isMobile ? "100%" : "auto"}
          zIndex="1000"
          marginTop={isMobile ? "0" : "0"}
          borderRadius={isMobile ? "none" : "md"}
          border={isMobile ? "none" : "1px solid"}
          overflow="hidden"
          padding={isMobile ? "0.5rem 0" : "0"}
        >
          {children}
        </Box>
      )}
    </Box>
  );
};

const DropdownMenuItem = ({ children, href, onClick, ...props }) => (
  <Box
    as={href ? Link : 'button'}
    href={href}
    onClick={onClick}
    color="clouds"
    fontSize="1.3rem"
    fontWeight="500"
    padding="12px 16px"
    display="block"
    width="100%"
    textAlign="left"
    textDecoration="none"
    border="none"
    background="transparent"
    cursor="pointer"
    _hover={{
      color: "brand.emphasis",
      bg: "charcoal"
    }}
    _focus={{
      color: "brand.emphasis",
      bg: "charcoal"
    }}
    {...props}
  >
    {children}
  </Box>
);

const MobileMenuButton = ({ isOpen, onToggle, ...props }) => (
  <Button
    display={{ base: "block", md: "none" }}
    variant="ghost"
    color="clouds"
    fontSize="1.8rem"
    onClick={onToggle}
    aria-label="Toggle menu"
    aria-expanded={isOpen}
    aria-controls="navigation-menu"
    background="none"
    border="none"
    cursor="pointer"
    padding="0.5rem"
    _hover={{
      bg: "rgba(255, 255, 255, 0.1)"
    }}
    _active={{
      bg: "rgba(255, 255, 255, 0.2)"
    }}
    {...props}
  >
    ☰
  </Button>
);

const MobileMenu = ({ isOpen, children, ...props }) => {
  const isMobile = useBreakpointValue({ base: true, md: false });
  
  if (!isMobile) {
    return (
      <Flex gap="1rem" position="relative">
        {children}
      </Flex>
    );
  }
  
  return (
    <Box
      id="navigation-menu"
      display={isOpen ? "flex" : "none"}
      position="absolute"
      top="100%"
      left="0"
      width="100vw"
      bg="charcoal"
      flexDirection="column"
      alignItems="stretch"
      padding="1rem 0"
      boxShadow="0 2px 5px rgba(0, 0, 0, 0.2)"
      zIndex="1000"
      minHeight="50vh"
      gap="0.5rem"
      {...props}
    >
      {children}
    </Box>
  );
};


const ModalButton = ({ 
  label, 
  title, 
  src, 
  iframeTitle, 
  buttonComponent = 'DropdownMenuItem',
  modalStyle = modalStyles.modalContentLarge 
}) => {
  const [showModal, setShowModal] = useState(false);

  const ButtonComponent = buttonComponent === 'NavLink' ? NavLink : DropdownMenuItem;

  return (
    <>
      <ButtonComponent onClick={() => setShowModal(true)}>
        {label}
      </ButtonComponent>

      <Modal 
        show={showModal} 
        onClose={() => setShowModal(false)} 
        title={title}
        style={modalStyle}
      >
        <iframe 
          src={src}
          style={{ width: '100%', height: '80vh', border: 'none' }}
          title={iframeTitle}
        />
      </Modal>
    </>
  );
};

const CopyWfsLinkButton = () => {
  const [buttonText, setButtonText] = useState('Copy WFS Link');

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(WFS_URL).then(() => {
        setButtonText('Link copied!');
        setTimeout(() => {
          setButtonText('Copy WFS Link');
        }, 2000);
      }).catch(err => {
        console.error('Failed to copy text: ', err);
      });
    }
  };

  return (
    <DropdownMenuItem onClick={handleCopy}>
      {buttonText}
    </DropdownMenuItem>
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
      <DropdownMenuItem key={href} href={href} onClick={closeMenu}>
        {label}
      </DropdownMenuItem>
    )
  }
  
  return (
    <NavContainer>
      <NavSection>
        <ExternalLink href="https://bristoltreeforum.org/" showIcon={false}>
          <LogoImage
            src="/BTF_Logodefault_white.png"
            alt="Bristol Tree Forum Logo"
          />
        </ExternalLink>
        <Tooltip text={pageDesc}>
          <PageTitle>{pageTitle}</PageTitle>
        </Tooltip>
      </NavSection>
      
      <MobileMenuButton isOpen={isOpen} onToggle={toggleMenu} />

      <NavSection>
        <MobileMenu isOpen={isOpen}>
          <NavLink href="/sites" onClick={closeMenu}>
            BGS Sites List
          </NavLink>
          <DropdownMenu category="BGS Insights">
            <DropdownLink href='/habitat-summary' label='BGS Habitat Finder' />
            <DropdownLink href='/habitat-analysis' label='BGS Habitat Analysis' />
            <DropdownLink href='/all-allocations' label='BGS Habitat Allocations' />
          </DropdownMenu>
          <DropdownMenu category="BGS Bodies">
            <DropdownLink href='/responsible-bodies' label='Responsible Bodies' />
            <DropdownLink href='/local-planning-authorities' label='Local Planning Authorities' />
            <DropdownLink href='/national-character-areas' label='National Character Areas' />
            <DropdownLink href='/lnrs' label='Local Nature Recovery Strategies' />
          </DropdownMenu>
          <DropdownMenu category="Stats & More">
            <DropdownLink href='/statistics' label='BGS Statistics' />
            <DropdownLink href='/HU-calculator' label='Habitat Unit Calculator' />
            <DropdownLink href='/query' label='API Query & Export' />
            <CopyWfsLinkButton />
            <ModalButton 
              label="About"
              title="About this site"
              src="/about"
              iframeTitle="About page content"
            />
            <ModalButton 
              label="Glossary"
              title="Glossary of BGS Terms"
              src="/glossary"
              iframeTitle="Glossary of BGS terms"
            />
          </DropdownMenu>
          <ModalButton 
            label="Feedback"
            title="Give Feedback"
            src="/feedback"
            iframeTitle="Give Feedback"
            buttonComponent="NavLink"
            modalStyle={modalStyles.modalContent}
          />
        </MobileMenu>   
        <ColorModeButton />     
      </NavSection>
    </NavContainer>
  );
}