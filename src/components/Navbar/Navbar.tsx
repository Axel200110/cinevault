"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import styles from './Navbar.module.css';
import ProfileModal from './ProfileModal';
import NotificationBell from './NotificationBell';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMounted(true);
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Real-time search logic
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.trim().length > 1) {
        setIsSearching(true);
        try {
          const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
          if (!response.ok) throw new Error("Search failed");
          const data = await response.json();
          const results = data.results || [];
          setSearchResults(results.slice(0, 5));
        } catch (error) {
          console.error("Search error:", error);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (moreRef.current && !moreRef.current.contains(event.target as Node)) {
        setMoreOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchResults([]);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchResults([]);
      setIsOpen(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setDropdownOpen(false);
    router.refresh();
  };

  const handleDeleteProfile = async () => {
    if (confirm("Are you sure you want to delete your profile? This action is permanent.")) {
      alert("Profile deletion requested. (In a real app, this would trigger a secure deletion process).");
      await handleLogout();
    }
  };

  if (!mounted) return null; // Avoid hydration mismatch

  return (
    <>
      <nav className={`${styles.navbar} ${scrolled ? styles.navbarScrolled : ''}`}>
        <Link href="/" className={styles.logo}>
          <div className={styles.logoIcon}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--primary)">
              <path d="M5 3l14 9-14 9V3z"></path>
            </svg>
          </div>
          CINEVAULT
        </Link>
        
        {/* Desktop Links - Centered */}
        <div className={styles.navMain}>
          <div className={styles.links}>
            <Link href="/browse" className={`${styles.link} ${pathname === '/browse' ? styles.activeLink : ''}`}>Browse</Link>
            <Link href="/series" className={`${styles.link} ${pathname === '/series' ? styles.activeLink : ''}`}>Series</Link>
            <Link href="/trending" className={`${styles.link} ${pathname === '/trending' ? styles.activeLink : ''}`}>Trending</Link>
            <Link href="/request" className={`${styles.link} ${pathname === '/request' ? styles.activeLink : ''}`}>Request</Link>

            {/* More Dropdown */}
            <div className={styles.moreContainer} ref={moreRef}>
              <button 
                className={`${styles.link} ${styles.moreBtn} ${moreOpen ? styles.moreActiveLink : ''}`}
                onClick={() => setMoreOpen(!moreOpen)}
              >
                More
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ transform: moreOpen ? 'rotate(180deg)' : 'none', transition: '0.3s' }}>
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>

              {moreOpen && (
                <div className={styles.moreDropdown}>
                  <Link href="/watchlist" className={styles.dropdownItem} onClick={() => setMoreOpen(false)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                    </svg>
                    Watchlist
                  </Link>
                  <Link href="/admin" className={styles.dropdownItem} onClick={() => setMoreOpen(false)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="3" y1="9" x2="21" y2="9"></line>
                      <line x1="9" y1="21" x2="9" y2="9"></line>
                    </svg>
                    Admin Panel
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Search + Profile */}
        <div className={styles.navRight}>
          <form onSubmit={handleSearch} className={styles.searchContainer} ref={searchRef}>
            <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input 
              type="text" 
              placeholder="Search titles..." 
              className={styles.searchBox}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery.length > 1 && setIsSearching(true)}
            />
            
            {/* Real-time Results */}
            {(searchResults.length > 0 || isSearching) && (
              <div className={styles.searchDropdown}>
                {isSearching ? (
                  <div className={styles.searchLoading}>Searching...</div>
                ) : (
                  searchResults.map((result) => (
                    <Link 
                      key={result.id} 
                      href={`/title/${result.media_type || 'movie'}/${result.id}`}
                      className={styles.searchResultItem}
                      onClick={() => setSearchResults([])}
                    >
                      {result.poster_path ? (
                        <img src={`https://image.tmdb.org/t/p/w92${result.poster_path}`} alt="" />
                      ) : (
                        <div className={styles.searchResultPlaceholder}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                            <circle cx="8.5" cy="8.5" r="1.5"></circle>
                            <polyline points="21 15 16 10 5 21"></polyline>
                          </svg>
                        </div>
                      )}
                      <div className={styles.searchResultInfo}>
                        <span className={styles.searchResultTitle}>{result.title || result.name}</span>
                        <span className={styles.searchResultMeta}>{result.release_date?.split('-')[0] || result.first_air_date?.split('-')[0] || 'N/A'}</span>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            )}
          </form>

          {user && <NotificationBell userId={user.id} />}

          <div className={styles.profileContainer} ref={dropdownRef}>
            <button 
              className={styles.profileBtn} 
              onClick={() => user ? setDropdownOpen(!dropdownOpen) : router.push('/auth')}
              title={user ? "Profile Settings" : "Login"}
            >
              {user?.user_metadata?.avatar_url ? (
                user.user_metadata.avatar_url.includes('://') ? (
                  <img src={user.user_metadata.avatar_url} alt="" className={styles.navProfileImg} />
                ) : (
                  <span className={styles.navProfileEmoji}>{user.user_metadata.avatar_url}</span>
                )
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              )}
            </button>

            {dropdownOpen && user && (
              <div className={styles.dropdown}>
                <div className={styles.dropdownHeader}>
                  <div className={styles.avatarGlow}></div>
                  <div className={styles.userAvatar}>
                    {user.user_metadata?.avatar_url ? (
                      user.user_metadata.avatar_url.includes('://') ? (
                        <img src={user.user_metadata.avatar_url} alt="" className={styles.avatarImg} />
                      ) : (
                        <span className={styles.avatarEmoji}>{user.user_metadata.avatar_url}</span>
                      )
                    ) : (
                      <span className={styles.avatarEmoji}>👤</span>
                    )}
                  </div>
                  <div className={styles.userInfo}>
                    <span className={styles.userName}>{user.user_metadata?.username || 'Commander'}</span>
                    <span className={styles.userEmail}>{user.email}</span>
                  </div>
                </div>
                
                <div className={styles.dropdownMenu}>
                  <Link href="/watchlist" className={styles.menuItem} onClick={() => setDropdownOpen(false)}>
                    <div className={styles.menuIcon}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                      </svg>
                    </div>
                    <span>My Watchlist</span>
                  </Link>
                  
                  <button className={styles.menuItem} onClick={() => { setDropdownOpen(false); setIsProfileOpen(true); }}>
                    <div className={styles.menuIcon}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                      </svg>
                    </div>
                    <span>Personalize Profile</span>
                  </button>

                  <div className={styles.menuDivider}></div>
                  
                  <button onClick={handleLogout} className={`${styles.menuItem} ${styles.logoutAction}`}>
                    <div className={styles.menuIcon}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                        <polyline points="16 17 21 12 16 7"></polyline>
                        <line x1="21" y1="12" x2="9" y2="12"></line>
                      </svg>
                    </div>
                    <span>Terminate Session</span>
                  </button>

                  <button onClick={handleDeleteProfile} className={`${styles.menuItem} ${styles.dangerAction}`}>
                    <div className={styles.menuIcon}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                    </div>
                    <span>Wipe Data Vault</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Hamburger Button for Mobile */}
          <button 
            className={`${styles.hamburger} ${isOpen ? styles.hamburgerActive : ''}`}
            onClick={() => setIsOpen(!isOpen)}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      <div className={`${styles.mobileMenu} ${isOpen ? styles.mobileActive : ''}`}>
        <button className={styles.closeBtn} onClick={() => setIsOpen(false)}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        <div className={styles.mobileContent}>
          {/* Mobile Search */}
          <form onSubmit={handleSearch} className={styles.mobileSearchContainer}>
            <div className={styles.mobileSearchInputWrapper}>
              <svg className={styles.mobileInputIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input 
                type="text" 
                placeholder="Search titles..." 
                className={styles.mobileSearchBox}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button type="submit" className={styles.mobileSearchBtn}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </button>
          </form>

          <Link href="/browse" className={styles.mobileLink} style={{ transitionDelay: '0.1s' }} onClick={() => setIsOpen(false)}>
            <div className={styles.mobileLinkContent}>
              <div className={styles.mobileLinkIcon}>🎬</div>
              <span>Browse Library</span>
            </div>
          </Link>
          <Link href="/series" className={styles.mobileLink} style={{ transitionDelay: '0.15s' }} onClick={() => setIsOpen(false)}>
            <div className={styles.mobileLinkContent}>
              <div className={styles.mobileLinkIcon}>📺</div>
              <span>Series & Shows</span>
            </div>
          </Link>
          <Link href="/trending" className={styles.mobileLink} style={{ transitionDelay: '0.2s' }} onClick={() => setIsOpen(false)}>
            <div className={styles.mobileLinkContent}>
              <div className={styles.mobileLinkIcon}>🔥</div>
              <span>Trending Now</span>
            </div>
          </Link>
          <Link href="/request" className={styles.mobileLink} style={{ transitionDelay: '0.25s' }} onClick={() => setIsOpen(false)}>
            <div className={styles.mobileLinkContent}>
              <div className={styles.mobileLinkIcon}>💎</div>
              <span>Request Content</span>
            </div>
          </Link>
          <Link href="/watchlist" className={styles.mobileLink} style={{ transitionDelay: '0.3s' }} onClick={() => setIsOpen(false)}>
            <div className={styles.mobileLinkContent}>
              <div className={styles.mobileLinkIcon}>🔖</div>
              <span>My Watchlist</span>
            </div>
          </Link>
          <Link href="/admin" className={styles.mobileLink} style={{ transitionDelay: '0.35s' }} onClick={() => setIsOpen(false)}>
            <div className={styles.mobileLinkContent}>
              <div className={styles.mobileLinkIcon}>⚡</div>
              <span>Admin Dashboard</span>
            </div>
          </Link>
          
          <div className={styles.mobileFooter}>
            {user ? (
              <div className={styles.mobileUser}>
                <div className={styles.mobileUserHeader}>
                  <div className={styles.mobileAvatar}>
                    {user.user_metadata?.avatar_url && user.user_metadata.avatar_url.includes('://') ? (
                      <img src={user.user_metadata.avatar_url} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      user.user_metadata?.avatar_url || (user.user_metadata?.username?.[0] || user.email?.[0]).toUpperCase()
                    )}
                  </div>
                  <p className={styles.mobileEmail}>{user.email}</p>
                </div>
                <button onClick={handleLogout} className={styles.mobileAuthBtn}>Sign Out</button>
              </div>
            ) : (
              <Link href="/auth" className={styles.mobileAuthBtn} onClick={() => setIsOpen(false)}>
                Login / Sign Up
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Backdrop */}
      {isOpen && <div className={styles.backdrop} onClick={() => setIsOpen(false)}></div>}

      {/* Profile Editing Modal */}
      {isProfileOpen && (
        <ProfileModal 
          user={user} 
          onClose={() => setIsProfileOpen(false)} 
        />
      )}
    </>
  );
};

export default Navbar;
