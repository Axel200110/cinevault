import { NextResponse } from 'next/server';

export async function GET() {
  const NEXT_PUBLIC_TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

  // Test TMDb API
  let tmdbStatus = 'NOT TESTED';
  let tmdbData = null;
  if (NEXT_PUBLIC_TMDB_API_KEY) {
    try {
      const res = await fetch(`https://api.themoviedb.org/3/movie/567460?api_key=${NEXT_PUBLIC_TMDB_API_KEY}&language=en-US`);
      tmdbStatus = res.ok ? `OK (${res.status})` : `FAILED (${res.status})`;
      if (res.ok) {
        const d = await res.json();
        tmdbData = d.title;
      }
    } catch (e: any) {
      tmdbStatus = `ERROR: ${e.message}`;
    }
  }

  return NextResponse.json({
    env: {
      NEXT_PUBLIC_TMDB_API_KEY: NEXT_PUBLIC_TMDB_API_KEY ? `SET (${NEXT_PUBLIC_TMDB_API_KEY.slice(0, 5)}...)` : 'MISSING',
      SUPABASE_URL: SUPABASE_URL ? `SET` : 'MISSING',
    },
    tmdbTest: {
      status: tmdbStatus,
      movieTitle: tmdbData,
    },
    timestamp: new Date().toISOString(),
  });
}
