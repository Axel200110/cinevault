import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const NEXT_PUBLIC_TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ results: [] });
  }

  try {
    // 1. Fetch all TMDB IDs currently in the Vault
    const { data: vaultMovies, error: supabaseError } = await supabase
      .from('movies')
      .select('tmdb_id');

    if (supabaseError) throw supabaseError;

    const vaultIds = new Set(vaultMovies.map(m => m.tmdb_id.toString()));

    // 2. Search TMDB
    const response = await fetch(
      `${TMDB_BASE_URL}/search/multi?api_key=${NEXT_PUBLIC_TMDB_API_KEY}&language=en-US&query=${encodeURIComponent(query)}&page=1&include_adult=false`
    );

    if (!response.ok) {
      return NextResponse.json({ results: [] }, { status: response.status });
    }

    const data = await response.json();

    // 3. Filter results to only include those in the Vault
    const filteredResults = (data.results || []).filter((item: any) =>
      vaultIds.has(item.id.toString())
    );

    return NextResponse.json({ results: filteredResults });
  } catch (error) {
    console.error('Vault Search Error:', error);
    return NextResponse.json({ results: [] }, { status: 500 });
  }
}
