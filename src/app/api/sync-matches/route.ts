import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'edge';

function mapStatus(shortStatus: string): 'LIVE' | 'FT' | 'NS' | 'HT' {
  if (['1H', '2H', 'ET', 'BT', 'P', 'LIVE'].includes(shortStatus)) return 'LIVE';
  if (shortStatus === 'HT') return 'HT';
  if (['FT', 'AET', 'PEN'].includes(shortStatus)) return 'FT';
  return 'NS';
}

function formatKickoffTime(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    return date.toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Istanbul',
    });
  } catch {
    return '00:00';
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode') || 'live';
    const explicitDate = searchParams.get('date');
    const force = searchParams.get('force') === '1';

    // Yerel saat farki (UTC+3 / UTC+5) nedeniyle bugunun tarihini dogru hesapla
    const nowLocal = new Date(Date.now() + 3 * 3600 * 1000);
    const dateParam = explicitDate || nowLocal.toISOString().split('T')[0];

    const cacheKey = mode === 'live' ? 'sync_live' : `sync_date_${dateParam}`;
    const minIntervalSeconds = mode === 'live' ? 45 : 300;

    if (!force) {
      const { data: syncLog } = await supabaseAdmin
        .from('sync_logs')
        .select('last_synced_at')
        .eq('sync_key', cacheKey)
        .maybeSingle();

      if (syncLog?.last_synced_at) {
        const elapsed = (Date.now() - new Date(syncLog.last_synced_at).getTime()) / 1000;
        if (elapsed < minIntervalSeconds) {
          return NextResponse.json({
            ok: true,
            cached: true,
            date: dateParam,
          });
        }
      }
    }

    const host = (process.env.API_FOOTBALL_HOST || 'v3.football.api-sports.io').trim();
    const apiKey = (process.env.API_FOOTBALL_KEY || '').trim();

    const headers: Record<string, string> = host.includes('rapidapi')
      ? {
          'x-rapidapi-host': host,
          'x-rapidapi-key': apiKey,
        }
      : {
          'x-apisports-key': apiKey,
        };

    const apiUrl =
      mode === 'live'
        ? `https://${host}/fixtures?live=all`
        : `https://${host}/fixtures?date=${dateParam}`;

    const res = await fetch(apiUrl, { headers, cache: 'no-store' });
    if (!res.ok) {
      throw new Error(`API-Football Hatasi: ${res.status}`);
    }

    const json = await res.json();
    const fixtures = json.response ?? [];

    const leaguesMap = new Map<string, any>();
    const teamsMap = new Map<string, any>();
    const matchesList: any[] = [];

    for (const item of fixtures) {
      const league = item.league;
      const home = item.teams?.home;
      const away = item.teams?.away;
      const fix = item.fixture;
      const goals = item.goals;
      const score = item.score;

      if (!league?.id || !home?.id || !away?.id || !fix?.id) continue;

      const leagueId = `l-${league.id}`;
      const homeId = `t-${home.id}`;
      const awayId = `t-${away.id}`;

      leaguesMap.set(leagueId, {
        id: leagueId,
        name: league.name,
        country: league.country || 'World',
        logo_url: league.logo || null,
      });

      teamsMap.set(homeId, {
        id: homeId,
        name: home.name,
        short_name: home.name.slice(0, 3).toUpperCase(),
        logo_url: home.logo || null,
      });

      teamsMap.set(awayId, {
        id: awayId,
        name: away.name,
        short_name: away.name.slice(0, 3).toUpperCase(),
        logo_url: away.logo || null,
      });

      // Istanbul saatine gore gun kategorisi
      const localFixDate = fix.date
        ? new Date(new Date(fix.date).getTime() + 3 * 3600 * 1000).toISOString().split('T')[0]
        : dateParam;

      matchesList.push({
        id: `f-${fix.id}`,
        league_id: leagueId,
        date_category: localFixDate,
        fixture_date: fix.date || null,
        kickoff_time: formatKickoffTime(fix.date),
        status: mapStatus(fix.status?.short || 'NS'),
        minute: fix.status?.elapsed ?? null,
        home_team_id: homeId,
        away_team_id: awayId,
        home_score: goals?.home ?? null,
        away_score: goals?.away ?? null,
        ht_home: score?.halftime?.home ?? null,
        ht_away: score?.halftime?.away ?? null,
        venue_name: fix.venue?.name || null,
        referee_name: fix.referee || null,
      });
    }

    // Ilk kurulumdaki sahte ornek maclari temizle (gercek maclar 'f-' ile baslar)
    if (matchesList.length > 0) {
      await supabaseAdmin.from('matches').delete().in('date_category', ['today', 'yesterday', 'tomorrow']);
    }

    if (leaguesMap.size > 0) {
      await supabaseAdmin.from('leagues').upsert(Array.from(leaguesMap.values()));
    }
    if (teamsMap.size > 0) {
      await supabaseAdmin.from('teams').upsert(Array.from(teamsMap.values()));
    }
    if (matchesList.length > 0) {
      await supabaseAdmin.from('matches').upsert(matchesList);
    }

    await supabaseAdmin.from('sync_logs').upsert({
      sync_key: cacheKey,
      last_synced_at: new Date().toISOString(),
    });

    return NextResponse.json({
      ok: true,
      synced: matchesList.length,
      mode,
      date: dateParam,
      apiErrors: json.errors || [],
    });
  } catch (error: any) {
    console.error('Sync hatasi:', error);
    return NextResponse.json(
      { ok: false, error: error?.message || 'Senkronizasyon hatasi' },
      { status: 500 }
    );
  }
}