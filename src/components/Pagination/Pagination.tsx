import React from 'react';
import Link from 'next/link';
import styles from './Pagination.module.css';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  baseUrl: string;
}

export default function Pagination({ currentPage, totalPages, baseUrl }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = [];
  const maxVisiblePages = 5;
  
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
  
  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  return (
    <div className={styles.pagination}>
      {currentPage > 1 && (
        <Link href={`${baseUrl}?page=${currentPage - 1}`} className={styles.pageBtn}>
          &laquo; Prev
        </Link>
      )}
      
      {pages.map(page => (
        <Link 
          key={page} 
          href={`${baseUrl}?page=${page}`} 
          className={`${styles.pageBtn} ${page === currentPage ? styles.active : ''}`}
        >
          {page}
        </Link>
      ))}
      
      {currentPage < totalPages && (
        <Link href={`${baseUrl}?page=${currentPage + 1}`} className={styles.pageBtn}>
          Next &raquo;
        </Link>
      )}
    </div>
  );
}
