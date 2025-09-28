import styles from '@/styles/Modal.module.css';

const Modal = ({ show, onClose, title, children, style }) => {
  if (!show) {
    return null;
  }

  const modalClassName = style ?? styles.modalContent;

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={modalClassName} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h4 className={styles.modalTitle}>{title}</h4>
          <button onClick={onClose} className={styles.closeButton} aria-label="Close modal">&times;</button>
        </div>
        <div className={styles.modalBody}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;