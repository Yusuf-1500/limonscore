import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  if (!q || q.length < 3) {
    return NextResponse.json({ teams: [], players: [] });
  }

  const apiKey = process.env.API_FOOTBALL_KEY || process.env.NEXT_PUBLIC_API_FOOTBALL_KEY || "";
  const headers = { "x-apisports-key": apiKey };

  try {
    const [teamsRes, playersRes] = await Promise.all([
      fetch(`https://v3.football.api-sports.io/teams?search=${encodeURIComponent(q)}`, { headers, next: { revalidate: 3600 } }),
      fetch(`https://v3.football.api-sports.io/players/profiles?search=${encodeURIComponent(q)}`, { headers, next: { revalidate: 3600 } }),
    ]);

    const teamsData = await teamsRes.json();
    const playersData = await playersRes.json();

    return NextResponse.json({
      teams: (teamsData.response || []).slice(0, 5),
      players: (playersData.response || []).slice(0, 5),
    });
  } catch {
    return NextResponse.json({ teams: [], players: [] }, { status: 500 });
  }
}
