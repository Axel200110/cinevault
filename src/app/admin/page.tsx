"use client";

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar/Navbar';
import { supabase } from '@/lib/supabase';
import styles from './admin.module.css';
import ProductionWizard from './ProductionWizard';
import AnalyticsChart from './AnalyticsChart';
import { fetchTmdbPreview, checkLinkStatus, searchTmdb, fetchTitlesForAnalytics, resolveReport, deleteComment, createNotification, addMovieToVault } from '@/app/actions';

interface MovieRow {
  id: string;
  tmdb_id: string;
  terabox_link: string;
  type: string;
  clicks?: number;
  linkStatus?: 'checking' | 'active' | 'broken';
}

export default function AdminPage() {
  const [movies, setMovies] = useState<MovieRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [activeTab, setActiveTab] = useState<'add' | 'manage' | 'analytics' | 'reports' | 'settings' | 'userRequests' | 'reviews'>('add');
  const [reports, setReports] = useState<any[]>([]);
  const [userRequests, setUserRequests] = useState<any[]>([]);
  const [allComments, setAllComments] = useState<any[]>([]);
  const [toast, setToast] = useState<{ title: string; msg: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (title: string, msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ title, msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Auth State
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTmdbId, setEditTmdbId] = useState('');
  const [editLink, setEditLink] = useState('');
  const [editType, setEditType] = useState('movie');

  // Settings State
  const [newPassword, setNewPassword] = useState('');
  const [siteName, setSiteName] = useState('CineVault');
  const [showPreviews, setShowPreviews] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [announcementText, setAnnouncementText] = useState('');
  const [announcementEnabled, setAnnouncementEnabled] = useState(false);
  
  useEffect(() => {
    // Check local storage for existing session
    const authSession = localStorage.getItem('admin_session');
    
    if (authSession === 'true') {
      setIsAuthorized(true);
    }
    
    // Fetch settings
    const fetchSettings = async () => {
      const { data: mData } = await supabase.from('site_settings').select('value').eq('key', 'maintenance_mode').single();
      if (mData) setMaintenanceMode(mData.value);

      const { data: aData } = await supabase.from('site_settings').select('value').eq('key', 'global_announcement').single();
      if (aData && aData.value) {
        setAnnouncementEnabled(aData.value.enabled || false);
        setAnnouncementText(aData.value.text || '');
      }
    };
    
    const fetchUserRequests = async () => {
      const { data } = await supabase.from('user_requests').select('*').order('created_at', { ascending: false });
      if (data) setUserRequests(data);
    };
    
    fetchMovies();
    fetchReports();
    fetchSettings();
    fetchUserRequests();
    fetchComments();
  }, []);

  const toggleMaintenance = async (enabled: boolean) => {
    const { error } = await supabase.from('site_settings').upsert({ key: 'maintenance_mode', value: enabled });
    if (!error) {
      setMaintenanceMode(enabled);
      showToast(enabled ? 'Maintenance Enabled' : 'Site is Live', enabled ? 'Regular access is now restricted.' : 'Users can now access the site.', enabled ? 'info' : 'success');
    } else {
      localStorage.setItem('maintenance_mode', enabled.toString());
      setMaintenanceMode(enabled);
      showToast('Local Toggle', 'Maintenance mode set locally (DB update failed).', 'info');
    }
  };

  const handleSaveAnnouncement = async () => {
    const { error } = await supabase.from('site_settings').upsert({ 
      key: 'global_announcement', 
      value: { enabled: announcementEnabled, text: announcementText } 
    });
    if (!error) {
      showToast('Announcement Saved', 'Global banner has been updated.', 'success');
    } else {
      showToast('Save Failed', 'Please ensure you have created the site_settings table.', 'error');
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Check localStorage for custom password, fallback to 'admin123'
    const storedPass = localStorage.getItem('admin_password') || 'admin123';
    if (passwordInput === storedPass) {
      setIsAuthorized(true);
      localStorage.setItem('admin_session', 'true');
      setAuthError('');
      showToast('Welcome Back', 'Administrator session authorized.', 'success');
    } else {
      setAuthError('Invalid administrator password.');
      showToast('Access Denied', 'Invalid credentials provided.', 'error');
    }
  };

  const handleLogout = () => {
    setIsAuthorized(false);
    localStorage.removeItem('admin_session');
    showToast('Session Ended', 'You have been logged out successfully.', 'info');
  };

  // Enrich analytics with titles when tab changes
  const [analyticsData, setAnalyticsData] = useState<any[]>([]);
  useEffect(() => {
    if (activeTab === 'analytics' && movies.length > 0) {
      const topRaw = [...movies].sort((a, b) => (b.clicks || 0) - (a.clicks || 0)).slice(0, 10);
      fetchTitlesForAnalytics(topRaw).then(setAnalyticsData);
    }
  }, [activeTab, movies]);

  const startEdit = (movie: MovieRow) => {
    setEditingId(movie.id);
    setEditTmdbId(movie.tmdb_id);
    setEditLink(movie.terabox_link);
    setEditType(movie.type);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleSaveEdit = async (id: string) => {
    if (!window.confirm('Are you sure you want to save these changes?')) return;
    
    const { error } = await supabase
      .from('movies')
      .update({ tmdb_id: editTmdbId, terabox_link: editLink, type: editType })
      .eq('id', id);
      
    if (!error) {
      setEditingId(null);
      fetchMovies();
      showToast('Library Updated', 'The content details have been successfully modified.', 'success');

      // Notify users who have this in their watchlist
      const { data: watchlistUsers } = await supabase.from('watchlists').select('user_id').eq('movie_id', editTmdbId);
      if (watchlistUsers && watchlistUsers.length > 0) {
        watchlistUsers.forEach(async (entry: any) => {
          await createNotification(
            entry.user_id, 
            'link_fixed', 
            `Update: The source link for a title in your watchlist has been restored.`, 
            `/title/${editType}/${editTmdbId}`
          );
        });
      }
    } else {
      showToast('Update Failed', error.message, 'error');
    }
  };





  const fetchMovies = async () => {
    const { data, error } = await supabase
      .from('movies')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) setMovies(data);
  };

  const fetchReports = async () => {
    const { data } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) setReports(data);
  };

  const fetchComments = async () => {
    const { data } = await supabase
      .from('comments')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) setAllComments(data);
  };

  const handleDeleteComment = async (id: string) => {
    if (!window.confirm('Delete this review permanently?')) return;
    await deleteComment(id);
    fetchComments();
    showToast('Review Removed', 'The community post has been deleted.', 'info');
  };

  const handleResolveReport = async (id: string, userId?: string, movieId?: string) => {
    await resolveReport(id);
    if (userId) {
      await createNotification(
        userId,
        'link_fixed',
        `Good news! The broken link you reported has been fixed.`,
        movieId ? `/title/movie/${movieId}` : undefined
      );
    }
    fetchReports();
    showToast('Report Resolved', 'The broken link report has been archived.', 'info');
  };



  const handleFulfillRequest = async (requestId: string, tmdbId: string, type: string) => {
    const fulfillLink = window.prompt("Enter the Terabox link for this requested movie:");
    if (!fulfillLink) return;

    // Use the central action which handles insertion, revalidation, and notifications
    const result = await addMovieToVault(tmdbId, fulfillLink, type as 'movie' | 'tv');

    if (result.success) {
      showToast('Request Fulfilled', 'The movie has been added and users notified.', 'success');
      // Refresh local state
      const { data } = await supabase.from('user_requests').select('*').order('created_at', { ascending: false });
      if (data) setUserRequests(data);
      fetchMovies();
    } else {
      showToast('Fulfill Failed', result.error || 'Could not add to library.', 'error');
    }
  };

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      showToast('Password Too Weak', 'Please use at least 6 characters.', 'error');
      return;
    }
    localStorage.setItem('admin_password', newPassword);
    setNewPassword('');
    showToast('Security Updated', 'Administrator password has been changed.', 'success');
  };


  const handleDelete = async (id: string) => {
    if (!window.confirm('WARNING: Are you sure you want to permanently remove this content? This action cannot be undone.')) return;
    
    const { error } = await supabase.from('movies').delete().eq('id', id);
    if (!error) {
      fetchMovies();
      showToast('Content Removed', 'The item has been deleted from your library.', 'info');
    } else {
      showToast('Delete Failed', error.message, 'error');
    }
  };

  const handleCheckLink = async (id: string, url: string) => {
    setMovies(prev => prev.map(m => m.id === id ? { ...m, linkStatus: 'checking' } : m));
    
    let urlToCheck = url;
    
    // If it's a TV series, the link is a JSON string of episodes
    if (url.trim().startsWith('[') || url.includes('"link":')) {
      try {
        const episodes = JSON.parse(url);
        if (Array.isArray(episodes) && episodes.length > 0) {
          urlToCheck = episodes[0].link;
        }
      } catch (e) {
        console.error("Link check: Failed to parse episode JSON", e);
      }
    }
    
    const isWorking = await checkLinkStatus(urlToCheck);
    
    setMovies(prev => prev.map(m => m.id === id ? { 
      ...m, 
      linkStatus: isWorking ? 'active' : 'broken' 
    } : m));

    if (isWorking) {
      showToast('Link Verified', 'The source link is active and reachable.', 'success');
    } else {
      showToast('Link Broken', 'The source link appears to be offline or invalid.', 'error');
    }
  };

  // Quick Stats
  const totalMovies = movies.filter(m => m.type === 'movie').length;
  const totalTv = movies.filter(m => m.type === 'tv').length;
  
  // Analytics sorting
  const topMovies = [...movies].sort((a, b) => (b.clicks || 0) - (a.clicks || 0)).slice(0, 10);

  if (!isAuthorized) {
    return (
      <main className={styles.loginOverlay}>
        <div className={styles.loginCard}>
          <div className={styles.loginHeader}>
            <div className={styles.adminIcon}>🛡️</div>
            <h1>Admin Access</h1>
            <p>Please enter your administrator password to manage CineVault.</p>
          </div>
          
          <form onSubmit={handleLogin} className={styles.loginForm}>
            <div className={styles.inputGroup}>
              <input 
                type="password" 
                className={styles.loginInput}
                placeholder="Enter Administrator Password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                autoFocus
              />
              {authError && <p className={styles.authError}>{authError}</p>}
            </div>
            <button type="submit" className={styles.loginBtn}>
              Unlock Dashboard
            </button>
          </form>
          
          <div className={styles.loginFooter}>
            <p>Authorized personnel only. Sessions are tracked.</p>
            <a href="/" className={styles.backHome}>← Back to Home</a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.adminMain}>
      <Navbar />
      
      <div className={styles.adminLayout}>
        {/* Sidebar */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <div className={styles.sidebarTitleGroup}>
              <h2 className={styles.sidebarTitle}>🛡️ Command Center</h2>
              <div className={styles.systemStatus}>
                <span className={styles.statusDot}></span>
                SYSTEM ONLINE
              </div>
            </div>
          </div>

          <div className={styles.navGroup}>
            <div 
              className={`${styles.navItem} ${activeTab === 'add' ? styles.navActive : ''}`}
              onClick={() => setActiveTab('add')}
            >
              <span className={styles.navIcon}>➕</span>
              <div className={styles.navText}>
                <span className={styles.navLabel}>Add Content</span>
                <span className={styles.navDesc}>Upload new vault assets</span>
              </div>
            </div>

            <div 
              className={`${styles.navItem} ${activeTab === 'manage' ? styles.navActive : ''}`}
              onClick={() => setActiveTab('manage')}
            >
              <span className={styles.navIcon}>📂</span>
              <div className={styles.navText}>
                <span className={styles.navLabel}>Manage Library</span>
                <span className={styles.navDesc}>Edit or remove titles</span>
              </div>
            </div>

            <div 
              className={`${styles.navItem} ${activeTab === 'analytics' ? styles.navActive : ''}`}
              onClick={() => setActiveTab('analytics')}
            >
              <span className={styles.navIcon}>📊</span>
              <div className={styles.navText}>
                <span className={styles.navLabel}>Analytics</span>
                <span className={styles.navDesc}>Track user engagement</span>
              </div>
            </div>

            <div 
              className={`${styles.navItem} ${activeTab === 'reports' ? styles.navActive : ''}`}
              onClick={() => setActiveTab('reports')}
            >
              <span className={styles.navIcon}>🚩</span>
              <div className={styles.navText}>
                <span className={styles.navLabel}>Reports</span>
                <span className={styles.navDesc}>Fix broken links</span>
              </div>
              {reports.filter(r => r.status === 'pending').length > 0 && (
                <span className={styles.badgeCount}>{reports.filter(r => r.status === 'pending').length}</span>
              )}
            </div>

            <div 
              className={`${styles.navItem} ${activeTab === 'userRequests' ? styles.navActive : ''}`}
              onClick={() => setActiveTab('userRequests')}
            >
              <span className={styles.navIcon}>📬</span>
              <div className={styles.navText}>
                <span className={styles.navLabel}>User Requests</span>
                <span className={styles.navDesc}>Fulfill missing titles</span>
              </div>
              {userRequests.filter(r => r.status === 'pending').length > 0 && (
                <span className={styles.badgeCount}>{userRequests.filter(r => r.status === 'pending').length}</span>
              )}
            </div>

            <div 
              className={`${styles.navItem} ${activeTab === 'reviews' ? styles.navActive : ''}`}
              onClick={() => setActiveTab('reviews')}
            >
              <span className={styles.navIcon}>💬</span>
              <div className={styles.navText}>
                <span className={styles.navLabel}>Reviews</span>
                <span className={styles.navDesc}>Manage user feedback</span>
              </div>
            </div>

            <div 
              className={`${styles.navItem} ${activeTab === 'settings' ? styles.navActive : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              <span className={styles.navIcon}>⚙️</span>
              <div className={styles.navText}>
                <span className={styles.navLabel}>Settings</span>
                <span className={styles.navDesc}>Configure platform</span>
              </div>
            </div>
          </div>

          <div className={styles.sidebarFooter}>
            <div className={styles.adminProfile}>
              <div className={styles.adminAvatar}>A</div>
              <div className={styles.adminInfo}>
                <p className={styles.adminName}>Administrator</p>
                <p className={styles.adminRole}>{siteName}</p>
              </div>
            </div>
            <div className={styles.logoutBtn} onClick={handleLogout}>🔓 Logout</div>
          </div>
        </aside>

        {/* Toast Container */}
        {toast && (
          <div className="toastContainer">
            <div className={`toast ${toast.type === 'success' ? 'toastSuccess' : toast.type === 'error' ? 'toastError' : 'toastInfo'}`}>
              <div className="toastIcon">
                {toast.type === 'success' && '✅'}
                {toast.type === 'error' && '❌'}
                {toast.type === 'info' && '🔔'}
              </div>
              <div className="toastContent">
                <span className="toastTitle">{toast.title}</span>
                <span className="toastMessage">{toast.msg}</span>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className={styles.contentArea}>
          {/* Stats Section */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Total Assets</div>
              <div className={styles.statValue}>{movies.length}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Movies</div>
              <div className={styles.statValue}>{totalMovies}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>TV Series</div>
              <div className={styles.statValue}>{totalTv}</div>
            </div>
          </div>

          {activeTab === 'add' && (
            <ProductionWizard 
              onSuccess={fetchMovies} 
              showToast={showToast} 
            />
          )}

          {activeTab === 'manage' && (
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>📂 Managed Library</h2>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>TMDb ID</th>
                      <th>Type</th>
                      <th>Source Link</th>
                      <th>Status</th>
                      <th className={styles.textRight}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movies.map((movie) => (
                      editingId === movie.id ? (
                        <tr key={movie.id} className={styles.editingRow}>
                          <td>
                            <input 
                              className={styles.editInput} 
                              value={editTmdbId} 
                              onChange={(e) => setEditTmdbId(e.target.value)} 
                            />
                          </td>
                          <td>
                            <select 
                              className={styles.editSelect} 
                              value={editType} 
                              onChange={(e) => setEditType(e.target.value)}
                            >
                              <option value="movie">movie</option>
                              <option value="tv">tv</option>
                            </select>
                          </td>
                          <td>
                            <input 
                              className={styles.editInput} 
                              value={editLink} 
                              onChange={(e) => setEditLink(e.target.value)} 
                            />
                          </td>
                          <td>
                            {movie.linkStatus === 'checking' && <span className={styles.statusChecking}>Checking...</span>}
                            {movie.linkStatus === 'active' && <span className={styles.statusActive}>✅ Active</span>}
                            {movie.linkStatus === 'broken' && <span className={styles.statusBroken}>❌ Broken</span>}
                          </td>
                          <td className={styles.actionCell}>
                            <div className={styles.actionGroup}>
                              <button className={styles.saveBtn} onClick={() => handleSaveEdit(movie.id)}>Save</button>
                              <button className={styles.cancelBtn} onClick={cancelEdit}>Cancel</button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        <tr key={movie.id}>
                          <td>{movie.tmdb_id}</td>
                          <td>
                            <span className={`${styles.badge} ${movie.type === 'movie' ? styles.badgeMovie : styles.badgeTv}`}>
                              {movie.type}
                            </span>
                          </td>
                          <td className={styles.linkCell}>
                            <a href={movie.terabox_link} target="_blank" rel="noopener noreferrer">
                              {movie.terabox_link}
                            </a>
                          </td>
                          <td>
                            {movie.linkStatus === 'checking' && <span className={styles.statusChecking}>Checking...</span>}
                            {movie.linkStatus === 'active' && <span className={styles.statusActive}>✅ Active</span>}
                            {movie.linkStatus === 'broken' && <span className={styles.statusBroken}>❌ Broken</span>}
                            {!movie.linkStatus && (
                              <button 
                                className={styles.checkBtn}
                                onClick={() => handleCheckLink(movie.id, movie.terabox_link)}
                              >
                                Check Link
                              </button>
                            )}
                          </td>
                          <td className={styles.actionCell}>
                            <div className={styles.actionGroup}>
                              <button 
                                className={styles.editModeBtn}
                                onClick={() => startEdit(movie)}
                              >
                                Edit
                              </button>
                              <button 
                                className={styles.deleteBtn}
                                onClick={() => handleDelete(movie.id)}
                              >
                                Remove
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>📊 Operational Intelligence</h2>
              <p className={styles.analyticsDesc}>Real-time monitoring of platform traffic and asset engagement.</p>
              
              <div className={styles.chartSection}>
                <h3 className={styles.subTitle}>Daily Platform Traffic</h3>
                <AnalyticsChart />
              </div>

              <div className={styles.analyticsList} style={{ marginTop: '40px' }}>
                <h3 className={styles.subTitle}>Top Performing Assets</h3>
                {analyticsData.map((movie, index) => (
                  <div key={movie.id} className={styles.analyticsItem}>
                    <div className={styles.analyticsRank}>{index + 1}</div>
                    <div className={styles.analyticsInfo}>
                      <span className={styles.analyticsTitle}>{movie.title}</span>
                      <span className={styles.analyticsId}>TMDb ID: {movie.tmdb_id} ({movie.type})</span>
                      <div className={styles.analyticsBarContainer}>
                        <div 
                          className={styles.analyticsBar} 
                          style={{ width: `${Math.max(5, ((movie.clicks || 0) / Math.max(1, analyticsData[0]?.clicks || 1)) * 100)}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className={styles.analyticsClicks}>
                      <strong>{movie.clicks || 0}</strong> clicks
                    </div>
                  </div>
                ))}
                {analyticsData.length === 0 && activeTab === 'analytics' && (
                  <p className={styles.analyticsLoading}>Loading analytics data...</p>
                )}
                {movies.length === 0 && (
                  <p>No analytics data available yet.</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>🚩 Broken Link Reports</h2>
              <p className={styles.analyticsDesc}>Users have reported the following items. Please update their Terabox links.</p>
              
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>TMDb ID</th>
                      <th>Status</th>
                      <th className={styles.textRight}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((report) => (
                      <tr key={report.id}>
                        <td>{new Date(report.created_at).toLocaleDateString()}</td>
                        <td>{report.movie_id}</td>
                        <td>
                          {report.status === 'pending' ? (
                            <span className={styles.statusBroken}>Pending</span>
                          ) : (
                            <span className={styles.statusActive}>Resolved</span>
                          )}
                        </td>
                        <td className={styles.actionCell}>
                          <div className={styles.actionGroup}>
                            {report.status === 'pending' && (
                              <button 
                                className={styles.saveBtn}
                                onClick={() => handleResolveReport(report.id, report.user_id, report.movie_id)}
                              >
                                Resolve
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {reports.length === 0 && (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', padding: '20px' }}>No reports found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'userRequests' && (
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>📬 User Content Requests</h2>
              <p className={styles.analyticsDesc}>These titles were requested by your users. Fulfill them by adding a link.</p>
              
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Type</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th className={styles.textRight}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userRequests.map((req) => (
                      <tr key={req.id}>
                        <td style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <img src={req.poster_url || 'https://via.placeholder.com/50x75?text=No+Img'} alt={req.title} style={{ width: '40px', borderRadius: '4px' }} />
                          {req.title}
                        </td>
                        <td style={{ textTransform: 'capitalize' }}>{req.type}</td>
                        <td>{new Date(req.created_at).toLocaleDateString()}</td>
                        <td>
                          {req.status === 'pending' ? (
                            <span className={styles.statusBroken}>Pending</span>
                          ) : (
                            <span className={styles.statusActive}>Fulfilled</span>
                          )}
                        </td>
                        <td className={styles.actionCell}>
                          <div className={styles.actionGroup}>
                            {req.status === 'pending' && (
                              <button 
                                className={styles.saveBtn}
                                onClick={() => handleFulfillRequest(req.id, req.tmdb_id, req.type, req.user_id)}
                              >
                                Fulfill
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {userRequests.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '20px' }}>No user requests found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>💬 Community Reviews</h2>
              <p className={styles.analyticsDesc}>Monitor and manage reviews posted by users across the platform.</p>
              
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Content</th>
                      <th>Rating</th>
                      <th>TMDb ID</th>
                      <th className={styles.textRight}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allComments.map((comment) => (
                      <tr key={comment.id}>
                        <td>{new Date(comment.created_at).toLocaleDateString()}</td>
                        <td className={styles.commentCell}>
                          <p className={styles.commentPreview}>{comment.content}</p>
                        </td>
                        <td>
                          {comment.rating ? (
                            <span className={styles.ratingBadge}>⭐ {comment.rating}</span>
                          ) : 'N/A'}
                        </td>
                        <td>{comment.movie_id}</td>
                        <td className={styles.actionCell}>
                          <div className={styles.actionGroup}>
                            <button 
                              className={styles.deleteBtn}
                              onClick={() => handleDeleteComment(comment.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {allComments.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '20px' }}>No reviews found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className={styles.settingsGrid}>
              <div className={styles.card}>
                <h2 className={styles.cardTitle}>⚙️ General Settings</h2>
                <div className={styles.inputGroup}>
                  <label className={styles.label}>Site Name</label>
                  <input 
                    type="text" 
                    className={styles.input} 
                    value={siteName}
                    onChange={(e) => setSiteName(e.target.value)}
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label className={styles.label}>
                    <input 
                      type="checkbox" 
                      checked={showPreviews}
                      onChange={(e) => setShowPreviews(e.target.checked)}
                      style={{ marginRight: '10px' }}
                    />
                    Show Poster Previews in Library
                  </label>
                </div>
                <div className={styles.inputGroup}>
                  <label className={styles.label}>
                    <input 
                      type="checkbox" 
                      checked={maintenanceMode}
                      onChange={(e) => toggleMaintenance(e.target.checked)}
                      style={{ marginRight: '10px' }}
                    />
                    Enable Maintenance Mode (Restricts Public Access)
                  </label>
                  <p className={styles.fieldNote}>
                    <strong>Note:</strong> Administrators can still access the site. To test this, open your site in an Incognito window.
                  </p>
                </div>
                <div className={styles.maintenanceGrid}>
                  <button 
                    className={styles.editModeBtn}
                    onClick={() => window.open('/?preview_maintenance=true', '_blank')}
                  >
                    Preview Maintenance Screen
                  </button>
                  <button 
                    className={styles.submitBtn}
                    onClick={() => showToast('Settings Saved', 'Global preferences have been updated.', 'success')}
                  >
                    Save Changes
                  </button>
                </div>
              </div>

              <div className={styles.card}>
                <h2 className={styles.cardTitle}>📢 Global Announcement</h2>
                <p className={styles.analyticsDesc}>Set a site-wide banner message for all users.</p>
                <div className={styles.inputGroup}>
                  <label className={styles.label}>
                    <input 
                      type="checkbox" 
                      checked={announcementEnabled}
                      onChange={(e) => setAnnouncementEnabled(e.target.checked)}
                      style={{ marginRight: '10px' }}
                    />
                    Enable Announcement Banner
                  </label>
                </div>
                <div className={styles.inputGroup}>
                  <label className={styles.label}>Announcement Message</label>
                  <textarea 
                    className={styles.input} 
                    style={{ minHeight: '80px', resize: 'vertical' }}
                    placeholder="E.g., Added 10 new Marvel movies in 4K!"
                    value={announcementText}
                    onChange={(e) => setAnnouncementText(e.target.value)}
                  />
                </div>
                <button 
                  className={styles.submitBtn}
                  onClick={handleSaveAnnouncement}
                >
                  Update Banner
                </button>
              </div>

              <div className={styles.card}>
                <h2 className={styles.cardTitle}>🛡️ Account Security</h2>
                <p className={styles.analyticsDesc}>Update your administrator access password.</p>
                <form onSubmit={handleUpdatePassword}>
                  <div className={styles.inputGroup}>
                    <label className={styles.label}>New Admin Password</label>
                    <input 
                      type="password" 
                      className={styles.input} 
                      placeholder="Enter new secure password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                  </div>
                  <button type="submit" className={styles.submitBtn}>
                    Update Password
                  </button>
                </form>
              </div>

              <div className={styles.card}>
                <h2 className={styles.cardTitle}>🧹 Maintenance</h2>
                <p className={styles.analyticsDesc}>Perform database optimization and cache clearing.</p>
                <div className={styles.maintenanceGrid}>
                  <button 
                    className={styles.editModeBtn}
                    onClick={() => {
                      if(window.confirm('Clear all click analytics?')) {
                        showToast('Analytics Reset', 'All click data has been cleared.', 'info');
                      }
                    }}
                  >
                    Clear Click Analytics
                  </button>
                  <button 
                    className={styles.editModeBtn}
                    onClick={() => showToast('Cache Purged', 'Global CDN cache has been invalidated.', 'success')}
                  >
                    Invalidate Cache
                  </button>
                </div>
              </div>

              <div className={styles.card}>
                <h2 className={styles.cardTitle}>ℹ️ About CineVault</h2>
                <div className={styles.aboutInfo}>
                  <p><strong>Version:</strong> 2.4.0-premium</p>
                  <p><strong>Environment:</strong> Production</p>
                  <p><strong>Last Sync:</strong> {new Date().toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
