import { NextResponse } from 'next/server';
import { fetchApiFootball } from '@/lib/apiFootball';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'edge';

function getCurrentFootballSeason(): number {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return month >= 7 ? year : year - 1;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id')?.replace(/^t-/, '').trim();
  const section = searchParams.get('section') || 'squad';

  if (!id) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const season = getCurrentFootballSeason();

  try {
    if (section === 'squad') {
      const squadJson = await fetchApiFootball(`/players/squads?team=${id}`, 21600);
      let players = squadJson?.response?.[0]?.players || [];

      if (!players.length) {
        const pJson = await fetchApiFootball(`/players?team=${id}&season=${season}`, 21600);
        players = (pJson?.response || []).map((item: any) => ({
          id: item.player.id,
          name: item.player.name,
          age: item.player.age,
          photo: item.player.photo,
          position: item.statistics?.[0]?.games?.position || '',
          number: item.statistics?.[0]?.games?.number || null,
        }));
      }

      const coachJson = await fetchApiFootball(`/coachs?team=${id}`, 21600);
      return NextResponse.json({
        players,
        coach: coachJson?.response?.[0] || null,
      });
    }

    if (section === 'standings') {
      // Önce güncel sezonu dener (Pro planda direkt 2026/27 döner), boşsa önceki sezona bakar
      let json = await fetchApiFootball(`/standings?team=${id}&season=${season}`, 21600);
      if (!json?.response?.length) {
        json = await fetchApiFootball(`/standings?team=${id}&season=${season - 1}`, 21600);
      }
      const standingsData = (json?.response || []).map((r: any) => r.league).filter(Boolean);
      return NextResponse.json({ standingsData });
    }

    if (section === 'fixtures') {
      // 1. Önce API'den güncel sezon fikstürünü dene (Pro planda tüm sezon fikstürü gelir)
      const apiJson = await fetchApiFootball(`/fixtures?team=${id}&season=${season}`, 3600);
      const apiFixtures = apiJson?.response || [];
      if (apiFixtures.length > 0) {
        return NextResponse.json({ fixtures: apiFixtures });
      }

      // 2. API boş dönerse kendi Supabase veritabanımızdaki maçları getir
      const teamVariants = [`t-${id}`, id];
      const { data: dbMatches } = await supabaseAdmin
        .from('matches')
        .select('*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*), league:leagues(*)')
        .or(`home_team_id.in.(${teamVariants.join(',')}),away_team_id.in.(${teamVariants.join(',')})`)
        .order('fixture_date', { ascending: false })
        .limit(30);

      const mapped = (dbMatches || []).map((m: any) => ({
        fixture: {
          id: m.id,
          date: m.fixture_date || new Date().toISOString(),
          status: {
            short: m.status === 'LIVE' ? '2H' : m.status,
            elapsed: m.minute,
          },
        },
        league: {
          id: String(m.league_id || '').replace(/^l-/, ''),
          name: m.league?.name || 'Lig',
          logo: m.league?.logo_url || '',
        },
        teams: {
          home: {
            id: Number(String(m.home_team_id).replace(/^t-/, '')),
            name: m.home_team?.name || 'Ev Sahibi',
            logo: m.home_team?.logo_url || '',
          },
          away: {
            id: Number(String(m.away_team_id).replace(/^t-/, '')),
            name: m.away_team?.name || 'Deplasman',
            logo: m.away_team?.logo_url || '',
          },
        },
        goals: {
          home: m.home_score,
          away: m.away_score,
        },
      }));

      return NextResponse.json({ fixtures: mapped });
    }

    return NextResponse.json({ ok: false }, { status: 400 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}