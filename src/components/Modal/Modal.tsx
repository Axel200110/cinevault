import React, { useEffect, useState } from 'react';
import styles from './Modal.module.css';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: (value?: string) => void;
  title: string;
  message: string;
  itemTitle?: string;
  posterUrl?: string;
  type?: 'info' | 'confirm' | 'prompt' | 'danger';
  defaultValue?: string;
  placeholder?: string;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  itemTitle,
  posterUrl,
  type = 'info',
  defaultValue = '',
  placeholder = ''
}) => {
  const [inputValue, setInputValue] = useState(defaultValue);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      setInputValue(defaultValue);
    } else {
      setTimeout(() => setIsAnimating(false), 300);
    }
  }, [isOpen, defaultValue]);

  if (!isOpen && !isAnimating) return null;

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm(type === 'prompt' ? inputValue : undefined);
    }
    onClose();
  };

  return (
    <div className={`${styles.overlay} ${isOpen ? styles.overlayVisible : ''}`} onClick={onClose}>
      <div 
        className={`${styles.modal} ${isOpen ? styles.modalVisible : ''} ${styles[type]}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <h3 className={styles.title}>{title}</h3>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        
        <div className={styles.content}>
          <p className={styles.message}>{message}</p>
          
          {(itemTitle || posterUrl) && (
            <div className={styles.itemPreview}>
              {posterUrl && <img src={posterUrl} alt="" className={styles.previewPoster} />}
              {itemTitle && <h4 className={styles.previewTitle}>{itemTitle}</h4>}
            </div>
          )}
          
          {type === 'prompt' && (
            <div className={styles.inputWrapper}>
              <input 
                type="text" 
                className={styles.input}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={placeholder}
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
              />
            </div>
          )}
        </div>
        
        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose}>
            Cancel
          </button>
          <button 
            className={`${styles.confirmBtn} ${type === 'danger' ? styles.dangerBtn : ''}`}
            onClick={handleConfirm}
          >
            {type === 'prompt' ? 'Submit' : type === 'danger' ? 'Delete' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Modal;
