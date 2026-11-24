import { NextResponse } from 'next/server';
import { fetchApiFootball } from '@/lib/apiFootball';

export const runtime = 'edge';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim();

  if (!q || q.length < 3) {
    return NextResponse.json({ teams: [], players: [] });
  }

  try {
    const [teamsData, playersData] = await Promise.all([
      fetchApiFootball(`/teams?search=${encodeURIComponent(q)}`, 3600),
      fetchApiFootball(`/players/profiles?search=${encodeURIComponent(q)}`, 3600),
    ]);

    return NextResponse.json({
      teams: (teamsData?.response || []).slice(0, 6),
      players: (playersData?.response || []).slice(0, 6),
    });
  } catch {
    return NextResponse.json({ teams: [], players: [] }, { status: 500 });
  }
}