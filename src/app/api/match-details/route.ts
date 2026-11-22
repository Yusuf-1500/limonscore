import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'edge';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawId = searchParams.get('id');
    const includeExtras = searchParams.get('extras') === '1';

    if (!rawId) {
      return NextResponse.json({ error: 'Maç ID gerekli' }, { status: 400 });
    }

    const fixtureId = rawId.replace(/^f-/, '');

    const { data: cachedRow } = await supabaseAdmin
      .from('match_details_cache')
      .select('*')
      .eq('fixture_id', fixtureId)
      .maybeSingle();

    if (cachedRow) {
      const updatedMs = new Date(cachedRow.updated_at).getTime();
      const ageSeconds = (Date.now() - updatedMs) / 1000;
      const isFinished = ['FT', 'AET', 'PEN'].includes(cachedRow.match_status || '');

      const hasExtrasIfNeeded =
        !includeExtras ||
        ((cachedRow.standings?.length ?? 0) > 0 || (cachedRow.h2h?.length ?? 0) > 0);

      if ((isFinished || ageSeconds < 90) && hasExtrasIfNeeded) {
        return NextResponse.json({
          fixtureId,
          events: cachedRow.events ?? [],
          statistics: cachedRow.statistics ?? [],
          lineups: cachedRow.lineups ?? [],
          players: cachedRow.players ?? [],
          standings: cachedRow.standings ?? [],
          h2h: cachedRow.h2h ?? [],
          cached: true,
        });
      }
    }

    const host = process.env.API_FOOTBALL_HOST || 'v3.football.api-sports.io';
    const apiKey = process.env.API_FOOTBALL_KEY!;

    const headers: Record<string, string> = host.includes('rapidapi')
      ? {
          'x-rapidapi-host': host,
          'x-rapidapi-key': apiKey,
        }
      : {
          'x-apisports-key': apiKey,
        };

    const fixtureRes = await fetch(`https://${host}/fixtures?id=${fixtureId}`, {
      headers,
      cache: 'no-store',
    });

    if (!fixtureRes.ok) {
      throw new Error(`API-Football Detay Hatası: ${fixtureRes.status}`);
    }

    const fixtureData = await fixtureRes.json();

    if (fixtureData.errors && Object.keys(fixtureData.errors).length > 0) {
      return NextResponse.json({
        fixtureId,
        events: cachedRow?.events ?? [],
        statistics: cachedRow?.statistics ?? [],
        lineups: cachedRow?.lineups ?? [],
        players: cachedRow?.players ?? [],
        standings: cachedRow?.standings ?? [],
        h2h: cachedRow?.h2h ?? [],
        cached: Boolean(cachedRow),
      });
    }

    const fixture = fixtureData.response?.[0];
    if (!fixture) {
      return NextResponse.json({
        fixtureId,
        events: [],
        statistics: [],
        lineups: [],
        players: [],
        standings: [],
        h2h: [],
      });
    }

    const leagueId = fixture.league?.id;
    const season = fixture.league?.season;
    const homeTeamId = fixture.teams?.home?.id;
    const awayTeamId = fixture.teams?.away?.id;

    let standings: any[] = cachedRow?.standings ?? [];
    let h2h: any[] = cachedRow?.h2h ?? [];

    if (includeExtras) {
      const [standingsRes, h2hRes] = await Promise.all([
        standings.length === 0 && leagueId && season
          ? fetch(`https://${host}/standings?league=${leagueId}&season=${season}`, {
              headers,
              cache: 'no-store',
            }).catch(() => null)
          : Promise.resolve(null),
        h2h.length === 0 && homeTeamId && awayTeamId
          ? fetch(`https://${host}/fixtures/headtohead?h2h=${homeTeamId}-${awayTeamId}&last=10`, {
              headers,
              cache: 'no-store',
            }).catch(() => null)
          : Promise.resolve(null),
      ]);

      if (standingsRes && standingsRes.ok) {
        const stData = await standingsRes.json();
        if (!stData.errors || Object.keys(stData.errors).length === 0) {
          standings = stData.response?.[0]?.league?.standings?.[0] ?? [];
        }
      }

      if (h2hRes && h2hRes.ok) {
        const h2hData = await h2hRes.json();
        if (!h2hData.errors || Object.keys(h2hData.errors).length === 0) {
          h2h = h2hData.response ?? [];
        }
      }
    }

    const homeStats = fixture.statistics?.[0]?.statistics ?? [];
    const awayStats = fixture.statistics?.[1]?.statistics ?? [];

    const statLabels: Record<string, string> = {
      'Ball Possession': 'Topla Oynama',
      'Total Shots': 'Toplam Şut',
      'Shots on Goal': 'İsabetli Şut',
      'Shots off Goal': 'İsabetsiz Şut',
      'Corner Kicks': 'Korner',
      'Fouls': 'Faul',
      'Yellow Cards': 'Sarı Kart',
      'Red Cards': 'Kırmızı Kart',
      'Offsides': 'Ofsayt',
      'Total passes': 'Toplam Pas',
      'Passes %': 'Pas İsabeti',
      'expected_goals': 'Gol Beklentisi (xG)',
    };

    const mergedStats = homeStats
      .filter((s: any) => statLabels[s.type])
      .map((s: any) => {
        const awayMatch = awayStats.find((a: any) => a.type === s.type);
        return {
          type: statLabels[s.type] || s.type,
          home: s.value ?? 0,
          away: awayMatch?.value ?? 0,
        };
      });

    const events = fixture.events ?? [];
    const lineups = fixture.lineups ?? [];
    const players = fixture.players ?? [];
    const matchStatus = fixture.fixture?.status?.short ?? 'NS';

    await supabaseAdmin.from('match_details_cache').upsert({
      fixture_id: fixtureId,
      events,
      statistics: mergedStats,
      lineups,
      standings,
      h2h,
      match_status: matchStatus,
      updated_at: new Date().toISOString(),
    });

    return NextResponse.json({
      fixtureId,
      events,
      statistics: mergedStats,
      lineups,
      players,
      standings,
      h2h,
      cached: false,
    });
  } catch (error: any) {
    console.error('Maç detay hatası:', error);
    return NextResponse.json(
      { error: error?.message || 'Detaylar alınamadı' },
      { status: 500 }
    );
  }
}
