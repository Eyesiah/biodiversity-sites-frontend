'use client'

import { useState } from 'react';
import Modal from '@/components/Modal';
import styles from '@/styles/Modal.module.css';

const ChartModalButton = ({ url, title, buttonText, style, className }) => {
  const [isModalVisible, setIsModalVisible] = useState(false);

  const openModal = () => setIsModalVisible(true);
  const closeModal = () => setIsModalVisible(false);

  return (
    <>
      <button onClick={openModal} className={className} style={style}>
        {buttonText}
      </button>
      <Modal show={isModalVisible} onClose={closeModal} title={title} style={styles.modalContentLarge}>
        <iframe
          src={url}
          style={{ width: '100%', height: '60vh', border: 'none' }}
          title={title}
        />
      </Modal>
    </>
  );
};

export default ChartModalButton;