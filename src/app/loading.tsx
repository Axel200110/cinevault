import React from 'react';
import styles from './loading.module.css';

export default function Loading() {
  return (
    <div className={styles.loadingOverlay}>
      <div className={styles.loader}>
        <div className={styles.loaderRing}></div>
        <div className={styles.loaderText}>
          <span className={styles.logoText}>CINEVAULT</span>
          <span className={styles.pulsingDot}></span>
        </div>
      </div>
    </div>
  );
}
