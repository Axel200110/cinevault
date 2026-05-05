"use server";

import { getMovieDetails } from "@/lib/tmdb";
import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

// 1. Auto-Complete Preview Action
export async function fetchTmdbPreview(tmdbId: string, type: 'movie' | 'tv') {
  if (!tmdbId || tmdbId.length < 2) return null;
  // We pass a dummy terabox link because we only need the TMDb metadata for preview
  const details = await getMovieDetails(tmdbId, "#", type);
  return details ? { title: details.title, posterUrl: details.posterUrl } : null;
}

// 1b. Search TMDb by Title Action
export async function searchTmdb(query: string, type: 'movie' | 'tv') {
  if (!query || query.length < 2) return [];
  
  const NEXT_PUBLIC_TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
  const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
  const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w92';
  
  try {
    const endpoint = type === 'movie' ? 'search/movie' : 'search/tv';
    const response = await fetch(`${TMDB_BASE_URL}/${endpoint}?api_key=${NEXT_PUBLIC_TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=en-US&page=1`);
    
    if (!response.ok) return [];
    
    const data = await response.json();
    return data.results.slice(0, 5).map((m: any) => ({
      id: m.id.toString(),
      title: m.title || m.name,
      year: new Date(m.release_date || m.first_air_date || Date.now()).getFullYear(),
      posterUrl: m.poster_path ? `${IMAGE_BASE_URL}${m.poster_path}` : null
    }));
  } catch (error) {
    return [];
  }
}

export async function searchMultiAction(query: string) {
  if (!query || query.length < 1) return { results: [] };
  
  const NEXT_PUBLIC_TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
  const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
  
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/search/multi?api_key=${NEXT_PUBLIC_TMDB_API_KEY}&language=en-US&query=${encodeURIComponent(query)}&page=1&include_adult=false`
    );
    
    if (!response.ok) return { results: [] };
    
    return await response.json();
  } catch (error) {
    return { results: [] };
  }
}

// 2. Link Status Action
export async function checkLinkStatus(url: string) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // Increase timeout to 15s

    const response = await fetch(url, { 
      method: 'GET', // Use GET as some servers block or mishandle HEAD
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      }
    });

    clearTimeout(timeoutId);

    // Some file hosts return 200 even for 404s, but with specific text.
    // For now, we assume if it loads without throwing an error or 40x/50x, it's alive.
    return response.ok;
  } catch (error) {
    console.error("Link check failed for", url, ":", error);
    return false;
  }
}

// 3. Increment Click Analytics Action
export async function incrementClickCount(tmdbId: string) {
  try {
    // 1. Update individual movie clicks
    const { data: movies } = await supabase.from('movies').select('id, clicks').eq('tmdb_id', tmdbId);
    
    if (movies && movies.length > 0) {
      const updates = movies.map(m => 
        supabase.from('movies').update({ clicks: (m.clicks || 0) + 1 }).eq('id', m.id)
      );
      await Promise.all(updates);
    }

    // 2. Update daily traffic log
    const today = new Date().toISOString().split('T')[0];
    const { data: log, error: fetchError } = await supabase
      .from('traffic_logs')
      .select('total_clicks')
      .eq('date', today)
      .single();

    if (fetchError && fetchError.code === 'PGRST116') {
      // Row doesn't exist, insert new
      await supabase.from('traffic_logs').insert([{ date: today, total_clicks: 1 }]);
    } else if (log) {
      await supabase
        .from('traffic_logs')
        .update({ total_clicks: (log.total_clicks || 0) + 1 })
        .eq('date', today);
    }
  } catch (error) {
    console.error("Failed to increment click count:", error);
  }
}

// 4. Batch Fetch Titles for Analytics
export async function fetchTitlesForAnalytics(movies: any[]) {
  const NEXT_PUBLIC_TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
  const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
  
  const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
  
  const results = await Promise.all(movies.map(async (m) => {
    try {
      const endpoint = m.type === 'movie' ? 'movie' : 'tv';
      const response = await fetch(`${TMDB_BASE_URL}/${endpoint}/${m.tmdb_id}?api_key=${NEXT_PUBLIC_TMDB_API_KEY}&language=en-US`);
      if (response.ok) {
        const data = await response.json();
        return { 
          ...m, 
          title: data.title || data.name,
          posterUrl: data.poster_path ? `${IMAGE_BASE_URL}${data.poster_path}` : null,
          rating: data.vote_average ? parseFloat(data.vote_average.toFixed(1)) : 0,
          year: new Date(data.release_date || data.first_air_date || Date.now()).getFullYear()
        };
      }
      return { ...m, title: 'Unknown Title', posterUrl: null };
    } catch {
      return { ...m, title: 'Unknown Title', posterUrl: null };
    }
  }));
  
  return results;
}

// 5. Report Broken Link Action
export async function reportBrokenLink(tmdbId: string, userId?: string) {
  try {
    const payload: any = { movie_id: tmdbId };
    if (userId) payload.user_id = userId;
    
    const { error } = await supabase.from('reports').insert([payload]);
    return { success: !error };
  } catch (error) {
    console.error("Failed to report link:", error);
    return { success: false };
  }
}

// 6. Resolve Report Action (Admin)
export async function resolveReport(reportId: string, userId?: string, movieId?: string) {
  try {
    const { error } = await supabase.from('reports').update({ status: 'resolved' }).eq('id', reportId);
    
    if (!error && userId) {
      await createNotification(
        userId,
        'link_fixed',
        `Good news! The broken link you reported has been fixed.`,
        movieId ? `/title/movie/${movieId}` : undefined
      );
    }
    
    return { success: !error };
  } catch (error) {
    return { success: false };
  }
}


// 7. Manage Reviews Action (Admin)
export async function deleteComment(commentId: string) {
  try {
    const { error } = await supabase.from('comments').delete().eq('id', commentId);
    return { success: !error };
  } catch (error) {
    return { success: false };
  }
}
// 8. Fetch TV Show Episodes for Wizard
export async function fetchTvDetails(tmdbId: string, season: number = 1) {
  const NEXT_PUBLIC_TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
  const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
  
  try {
    const response = await fetch(`${TMDB_BASE_URL}/tv/${tmdbId}?api_key=${NEXT_PUBLIC_TMDB_API_KEY}&language=en-US`);
    if (!response.ok) return null;
    const data = await response.json();
    
    // Fetch episodes for requested season
    const sResponse = await fetch(`${TMDB_BASE_URL}/tv/${tmdbId}/season/${season}?api_key=${NEXT_PUBLIC_TMDB_API_KEY}&language=en-US`);
    let episodes = [];
    if (sResponse.ok) {
      const sData = await sResponse.json();
      episodes = sData.episodes.map((ep: any) => ({
        s: season.toString(),
        e: ep.episode_number.toString(),
        link: ''
      }));
    }
    
    return {
      seasonsCount: data.number_of_seasons,
      episodesCount: data.number_of_episodes,
      requestedEpisodes: episodes
    };
  } catch (error) {
    return null;
  }
}

// 9. Analytics: Fetch Traffic Logs
export async function fetchTrafficLogs() {
  try {
    const { data, error } = await supabase
      .from('traffic_logs')
      .select('*')
      .order('date', { ascending: true })
      .limit(30); // Last 30 days
    return data || [];
  } catch (error) {
    return [];
  }
}

// 10. User Profiles
export async function updateProfile(userId: string, username: string, avatarUrl: string) {
  try {
    const { error } = await supabase
      .from('profiles')
      .upsert({ id: userId, username, avatar_url: avatarUrl, updated_at: new Date().toISOString() });
    return { success: !error };
  } catch (error) {
    return { success: false };
  }
}

// 11. Notifications
export async function createNotification(userId: string, type: string, message: string, link?: string, posterUrl?: string) {
  try {
    const { error } = await supabase
      .from('notifications')
      .insert([{ user_id: userId, type, message, link, poster_url: posterUrl }]);
    return { success: !error };
  } catch (error) {
    return { success: false };
  }
}

export async function fetchNotifications(userId: string) {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);
    return data || [];
  } catch (error) {
    return [];
  }
}

export async function markNotificationAsRead(notifId: string) {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notifId);
    return { success: !error };
  } catch (error) {
    return { success: false };
  }
}

export async function clearReadNotifications(userId: string) {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', userId)
      .eq('is_read', true);
    return { success: !error };
  } catch (error) {
    return { success: false };
  }
}

// 12. Add Movie to Vault Action
export async function addMovieToVault(tmdbId: string, teraboxLink: string, type: 'movie' | 'tv') {
  try {
    const { error } = await supabase.from('movies').insert([{ 
      tmdb_id: tmdbId, 
      terabox_link: teraboxLink, 
      type: type 
    }]);

    if (!error) {
      // 1. Check for any pending user requests for this content
      const { data: requests } = await supabase
        .from('user_requests')
        .select('*')
        .eq('tmdb_id', tmdbId)
        .eq('status', 'pending');

      if (requests && requests.length > 0) {
        // 2. Mark all as fulfilled
        await supabase
          .from('user_requests')
          .update({ status: 'fulfilled' })
          .eq('tmdb_id', tmdbId)
          .eq('status', 'pending');

        // 3. Notify each user
        for (const req of requests) {
          if (req.user_id) {
            await createNotification(
              req.user_id,
              'request_fulfilled',
              `Your request for "${req.title || 'a movie'}" has been fulfilled!`,
              `/title/${type}/${tmdbId}`,
              req.poster_url
            );
          }
        }
      }

      // Trigger revalidation for the home page and other relevant routes
      revalidatePath('/');
      revalidatePath('/browse');
      revalidatePath('/trending');
      return { success: true };
    }
    return { success: false, error: error.message };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 13. Update Movie Action (Admin)
export async function updateMovieAction(id: string, tmdbId: string, teraboxLink: string, type: 'movie' | 'tv') {
  try {
    // 1. Update the movie record
    const { error: movieError } = await supabase
      .from('movies')
      .update({ tmdb_id: tmdbId, terabox_link: teraboxLink, type: type })
      .eq('id', id);

    if (movieError) throw movieError;

    // 2. Notify users who have this in their watchlist
    const { data: watchlistUsers } = await supabase
      .from('watchlists')
      .select('user_id')
      .eq('movie_id', tmdbId);

    if (watchlistUsers && watchlistUsers.length > 0) {
      for (const entry of watchlistUsers) {
        await createNotification(
          entry.user_id,
          'link_fixed',
          `Update: The source link for a title in your watchlist has been restored.`,
          `/title/${type}/${tmdbId}`
        );
      }
    }

    // 3. Resolve any pending reports for this movie and notify the reporters
    const { data: pendingReports } = await supabase
      .from('reports')
      .select('id, user_id')
      .eq('movie_id', tmdbId)
      .eq('status', 'pending');

    if (pendingReports && pendingReports.length > 0) {
      // Mark all as resolved
      await supabase
        .from('reports')
        .update({ status: 'resolved' })
        .eq('movie_id', tmdbId)
        .eq('status', 'pending');

      // Notify reporters
      for (const report of pendingReports) {
        if (report.user_id) {
          await createNotification(
            report.user_id,
            'link_fixed',
            `Good news! A broken link you reported has been fixed and updated.`,
            `/title/${type}/${tmdbId}`
          );
        }
      }
    }

    // Trigger revalidation
    revalidatePath('/');
    revalidatePath('/browse');
    revalidatePath(`/title/${type}/${tmdbId}`);

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 14. Bulk Cleanup Actions (Admin)
export async function cleanupBrokenLinkReports() {
  try {
    const { error } = await supabase.from('reports').delete().eq('status', 'resolved');
    revalidatePath('/admin');
    return { success: !error };
  } catch (error) {
    return { success: false };
  }
}

export async function cleanupUserRequests(mode: 'fulfilled' | 'all' = 'fulfilled') {
  try {
    let query = supabase.from('user_requests').update({ status: 'archived' });
    
    if (mode === 'fulfilled') {
      query = query.eq('status', 'fulfilled');
    } else {
      // For 'all', archive all that aren't already archived
      query = query.neq('status', 'archived');
    }
    
    const { error } = await query;
    if (error) throw error;
    
    revalidatePath('/admin');
    return { success: true };
  } catch (error: any) {
    console.error("Archive failed:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteUserRequest(requestId: string) {
  try {
    const { error } = await supabase
      .from('user_requests')
      .update({ status: 'archived' })
      .eq('id', requestId);
      
    revalidatePath('/admin');
    return { success: !error };
  } catch (error) {
    return { success: false };
  }
}

// 15. Watchlist Actions
export async function addToWatchlist(userId: string, tmdbId: string, type: 'movie' | 'tv') {
  try {
    const { error } = await supabase
      .from('watchlists')
      .upsert([{ user_id: userId, movie_id: tmdbId, type: type }], { onConflict: 'user_id, movie_id' });
    return { success: !error };
  } catch (error) {
    return { success: false };
  }
}

export async function removeFromWatchlist(userId: string, tmdbId: string) {
  try {
    const { error } = await supabase
      .from('watchlists')
      .delete()
      .eq('user_id', userId)
      .eq('movie_id', tmdbId);
    return { success: !error };
  } catch (error) {
    return { success: false };
  }
}
