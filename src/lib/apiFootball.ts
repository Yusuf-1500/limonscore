export async function fetchApiFootball(path: string, revalidateSeconds = 21600) {
  const host = (process.env.API_FOOTBALL_HOST || 'v3.football.api-sports.io').trim();
  const apiKey = (process.env.API_FOOTBALL_KEY || process.env.NEXT_PUBLIC_API_FOOTBALL_KEY || '').trim();

  const headers: Record<string, string> = host.includes('rapidapi')
    ? {
        'x-rapidapi-host': host,
        'x-rapidapi-key': apiKey,
      }
    : {
        'x-apisports-key': apiKey,
      };

  const res = await fetch(`https://${host}${path}`, {
    headers,
    next: { revalidate: revalidateSeconds },
  });

  if (!res.ok) return null;
  return res.json();
}