"use client";

import React from 'react';
import styles from './MaintenanceScreen.module.css';

export default function MaintenanceScreen() {
  return (
    <div className={styles.overlay}>
      <div className={styles.glow}></div>
      <div className={styles.content}>
        <div className={styles.iconContainer}>
          <div className={styles.wrench}>🔧</div>
          <div className={styles.gear}>⚙️</div>
        </div>
        <h1 className={styles.title}>CineVault is Undergoing Refinement</h1>
        <p className={styles.subtitle}>
          We're currently polishing our cinematic experience to bring you something even better. 
          We'll be back shortly!
        </p>
        <div className={styles.progressBar}>
          <div className={styles.progressFill}></div>
        </div>
        <div className={styles.footer}>
          <span>Estimated uptime: Very soon</span>
          <span className={styles.dot}>•</span>
          <span>Admin Team</span>
        </div>
      </div>
    </div>
  );
}
