const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const BACKDROP_BASE_URL = 'https://image.tmdb.org/t/p/original';

export interface MovieDetails {
  id: string;
  title: string;
  description: string;
  rating: number;
  year: number;
  genre: string[];
  posterUrl: string;
  backdropUrl?: string;
  teraboxLink: string;
  type: 'movie' | 'tv';
  fullReleaseDate?: string;
}

export async function getMovieDetails(
  tmdbId: string,
  teraboxLink: string,
  type: 'movie' | 'tv' = 'movie'
): Promise<MovieDetails | null> {
  const NEXT_PUBLIC_TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
  if (!NEXT_PUBLIC_TMDB_API_KEY) { console.error('NEXT_PUBLIC_TMDB_API_KEY is missing!'); return null; }
  try {
    const sanitizedId = tmdbId.split('-')[0];
    const endpoint = type === 'movie' ? 'movie' : 'tv';
    const response = await fetch(`${TMDB_BASE_URL}/${endpoint}/${sanitizedId}?api_key=${NEXT_PUBLIC_TMDB_API_KEY}&language=en-US`);

    if (!response.ok) return null;

    const data = await response.json();

    return {
      id: sanitizedId,
      title: data.title || data.name || 'Unknown Title',
      description: data.overview || 'No description available.',
      rating: data.vote_average ? parseFloat(data.vote_average.toFixed(1)) : 0,
      year: new Date(data.release_date || data.first_air_date || Date.now()).getFullYear(),
      genre: data.genres?.map((g: any) => g.name) || [],
      posterUrl: data.poster_path ? `${IMAGE_BASE_URL}${data.poster_path}` : 'https://via.placeholder.com/500x750?text=No+Poster',
      backdropUrl: data.backdrop_path ? `${BACKDROP_BASE_URL}${data.backdrop_path}` : undefined,
      teraboxLink: teraboxLink,
      type: type,
      fullReleaseDate: data.release_date || data.first_air_date
    };
  } catch (error) {
    console.error('getMovieDetails error:', error);
    return null;
  }
}

export async function getTrending(): Promise<MovieDetails[]> {
  const NEXT_PUBLIC_TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
  if (!NEXT_PUBLIC_TMDB_API_KEY) return [];
  try {
    const response = await fetch(`${TMDB_BASE_URL}/trending/all/day?api_key=${NEXT_PUBLIC_TMDB_API_KEY}&language=en-US`);

    if (!response.ok) return [];

    const data = await response.json();

    return data.results.slice(0, 10).map((m: any) => ({
      id: m.id.toString(),
      title: m.title || m.name || 'Unknown',
      description: m.overview || '',
      rating: m.vote_average ? parseFloat(m.vote_average.toFixed(1)) : 0,
      year: new Date(m.release_date || m.first_air_date || Date.now()).getFullYear(),
      genre: [],
      posterUrl: m.poster_path ? `${IMAGE_BASE_URL}${m.poster_path}` : 'https://via.placeholder.com/500x750?text=No+Poster',
      backdropUrl: m.backdrop_path ? `${BACKDROP_BASE_URL}${m.backdrop_path}` : undefined,
      teraboxLink: '#',
      type: (m.media_type as 'movie' | 'tv') || 'movie'
    }));
  } catch (error) {
    return [];
  }
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profileUrl: string;
}

export interface ExtendedMovieDetails extends MovieDetails {
  cast: CastMember[];
  director?: string;
  trailerKey?: string;
  similar: MovieDetails[];
}

export async function getExtendedMovieDetails(
  tmdbId: string,
  type: 'movie' | 'tv' = 'movie',
  teraboxLink: string = '#'
): Promise<ExtendedMovieDetails | null> {
  const NEXT_PUBLIC_TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
  if (!NEXT_PUBLIC_TMDB_API_KEY) { console.error('NEXT_PUBLIC_TMDB_API_KEY is missing in getExtendedMovieDetails!'); return null; }
  try {
    const sanitizedId = tmdbId.split('-')[0];
    const endpoint = type === 'movie' ? 'movie' : 'tv';
    const response = await fetch(
      `${TMDB_BASE_URL}/${endpoint}/${sanitizedId}?api_key=${NEXT_PUBLIC_TMDB_API_KEY}&language=en-US&append_to_response=credits,videos,similar&include_video_language=en,hi,ta,te,kn,ml`
    );

    if (!response.ok) {
      console.error(`TMDb API error: ${response.status} for ID ${sanitizedId}`);
      return null;
    }

    const data = await response.json();

    const standardDetails = {
      id: sanitizedId,
      title: data.title || data.name || 'Unknown Title',
      description: data.overview || 'No description available.',
      rating: data.vote_average ? parseFloat(data.vote_average.toFixed(1)) : 0,
      year: new Date(data.release_date || data.first_air_date || Date.now()).getFullYear(),
      genre: data.genres?.map((g: any) => g.name) || [],
      posterUrl: data.poster_path ? `${IMAGE_BASE_URL}${data.poster_path}` : 'https://via.placeholder.com/500x750?text=No+Poster',
      backdropUrl: data.backdrop_path ? `${BACKDROP_BASE_URL}${data.backdrop_path}` : undefined,
      teraboxLink: teraboxLink,
      type: type
    };

    const videos = data.videos?.results || [];
    const trailer =
      videos.find((v: any) => v.site === 'YouTube' && v.type === 'Trailer') ||
      videos.find((v: any) => v.site === 'YouTube' && v.type === 'Teaser') ||
      videos.find((v: any) => v.site === 'YouTube' && v.type === 'Clip') ||
      videos.find((v: any) => v.site === 'YouTube');

    const trailerKey = trailer?.key;

    const castData = data.credits?.cast || [];
    const cast: CastMember[] = castData.slice(0, 10).map((c: any) => ({
      id: c.id,
      name: c.name,
      character: c.character,
      profileUrl: c.profile_path ? `${IMAGE_BASE_URL}${c.profile_path}` : 'https://via.placeholder.com/150x225?text=No+Image'
    }));

    const crew = data.credits?.crew || [];
    let director = 'Unknown';
    if (type === 'movie') {
      const dirObj = crew.find((c: any) => c.job === 'Director');
      if (dirObj) director = dirObj.name;
    } else {
      const creatorObj = data.created_by?.[0];
      if (creatorObj) director = creatorObj.name;
    }

    const similarData = data.similar?.results || [];
    const similar: MovieDetails[] = similarData.slice(0, 6).map((m: any) => ({
      id: m.id.toString(),
      title: m.title || m.name || 'Unknown',
      description: m.overview || '',
      rating: m.vote_average ? parseFloat(m.vote_average.toFixed(1)) : 0,
      year: new Date(m.release_date || m.first_air_date || Date.now()).getFullYear(),
      genre: [],
      posterUrl: m.poster_path ? `${IMAGE_BASE_URL}${m.poster_path}` : 'https://via.placeholder.com/500x750?text=No+Poster',
      backdropUrl: m.backdrop_path ? `${BACKDROP_BASE_URL}${m.backdrop_path}` : undefined,
      teraboxLink: '#',
      type: type
    }));

    return {
      ...standardDetails,
      cast,
      director,
      trailerKey,
      similar
    };
  } catch (error) {
    console.error('getExtendedMovieDetails error:', error);
    return null;
  }
}

export async function searchMulti(query: string): Promise<any> {
  const NEXT_PUBLIC_TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
  if (!NEXT_PUBLIC_TMDB_API_KEY) return { results: [] };
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/search/multi?api_key=${NEXT_PUBLIC_TMDB_API_KEY}&language=en-US&query=${encodeURIComponent(query)}&page=1&include_adult=false`
    );

    if (!response.ok) return { results: [] };

    return await response.json();
  } catch (error) {
    console.error("Search API Error:", error);
    return { results: [] };
  }
}

export async function getUpcoming(): Promise<MovieDetails[]> {
  const NEXT_PUBLIC_TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
  if (!NEXT_PUBLIC_TMDB_API_KEY) return [];
  try {
    const response = await fetch(`${TMDB_BASE_URL}/movie/upcoming?api_key=${NEXT_PUBLIC_TMDB_API_KEY}&language=en-US&page=1`);

    if (!response.ok) return [];

    const data = await response.json();

    return data.results.slice(0, 10).map((m: any) => ({
      id: m.id.toString(),
      title: m.title || m.name || 'Unknown',
      description: m.overview || '',
      rating: m.vote_average ? parseFloat(m.vote_average.toFixed(1)) : 0,
      year: new Date(m.release_date || m.first_air_date || Date.now()).getFullYear(),
      genre: [],
      posterUrl: m.poster_path ? `${IMAGE_BASE_URL}${m.poster_path}` : 'https://via.placeholder.com/500x750?text=No+Poster',
      backdropUrl: m.backdrop_path ? `${BACKDROP_BASE_URL}${m.backdrop_path}` : undefined,
      teraboxLink: '#',
      type: 'movie',
      fullReleaseDate: m.release_date
    }));
  } catch (error) {
    return [];
  }
}
