import type { Metadata } from 'next';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { PitchView } from '@/components/PitchView';
import { ArrowLeft, MapPin, UserCheck, Trophy } from 'lucide-react';

export const runtime = 'edge';

interface PageProps {
  params: { id: string };
}

async function getMatchWithDetails(rawId: string) {
  const matchId = rawId.startsWith('f-') ? rawId : `f-${rawId}`;
  const fixtureId = matchId.replace(/^f-/, '');

  const [{ data: match }, { data: cache }] = await Promise.all([
    supabaseAdmin
      .from('matches')
      .select(`
        *,
        home_team:teams!matches_home_team_id_fkey(*),
        away_team:teams!matches_away_team_id_fkey(*),
        league:leagues!matches_league_id_fkey(*)
      `)
      .eq('id', matchId)
      .maybeSingle(),
    supabaseAdmin
      .from('match_details_cache')
      .select('*')
      .eq('fixture_id', fixtureId)
      .maybeSingle(),
  ]);

  return { match, cache };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { match } = await getMatchWithDetails(params.id);

  if (!match) {
    return {
      title: 'Maç Detayı — LimonScore',
      description: 'Canlı futbol skorları, istatistikler ve 2D saha dizilişleri — limonscore.com',
    };
  }

  const scoreStr =
    match.home_score !== null && match.away_score !== null
      ? `${match.home_score} - ${match.away_score}`
      : match.kickoff_time;

  const title = `${match.home_team?.name} (${scoreStr}) ${match.away_team?.name} | LimonScore`;
  const description = `${match.league?.country} - ${match.league?.name} canlı maç skoru, goller, istatistikler ve 2D kadro dizilişi — limonscore.com`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: 'LimonScore',
      url: `https://limonscore.com/mac/${match.id}`,
      type: 'website',
      images: match.home_team?.logo_url ? [match.home_team.logo_url] : [],
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  };
}

export default async function SingleMatchPage({ params }: PageProps) {
  const { match, cache } = await getMatchWithDetails(params.id);

  if (!match) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-lg font-bold">Karşılaşma Bulunamadı</h1>
        <p className="text-xs text-slate-400 mt-1">Bu maç henüz fikstüre eklenmemiş veya kaldırılmış olabilir.</p>
        <Link
          href="/"
          className="mt-4 px-4 py-2 rounded-xl bg-lime-400 text-slate-950 font-bold text-xs flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" /> LimonScore Ana Sayfa
        </Link>
      </div>
    );
  }

  const events = cache?.events ?? [];
  const statistics = cache?.statistics ?? [];
  const lineups = cache?.lineups ?? [];
  const rawStandings = Array.isArray(cache?.standings) ? cache.standings : [];
  const standings = (Array.isArray(rawStandings[0]) ? rawStandings[0] : rawStandings).filter((r: any) => r && r.team);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-12">
      <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur border-b border-slate-800">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 text-lime-400" /> Tüm Maçlar
          </Link>
          <Link href="/" className="flex items-center gap-2">
            <span className="text-lg leading-none">🍋</span>
            <span className="font-black text-base tracking-tight">
              Limon<span className="text-lime-400">Score</span>
            </span>
          </Link>
          <div className="w-16" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 pt-6 space-y-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-center gap-2 text-xs text-slate-400 mb-5">
            {match.league?.logo_url && (
              <img src={match.league.logo_url} alt="" className="w-4 h-4 object-contain" />
            )}
            <span>
              {match.league?.country} — {match.league?.name}
            </span>
          </div>

          <div className="grid grid-cols-3 items-center text-center gap-4">
            <div className="flex flex-col items-center gap-2">
              {match.home_team?.logo_url && (
                <img src={match.home_team.logo_url} alt="" className="w-16 h-16 object-contain" />
              )}
              <h1 className="text-sm sm:text-base font-bold text-white">{match.home_team?.name}</h1>
            </div>

            <div className="flex flex-col items-center">
              <div className="text-3xl sm:text-4xl font-black font-mono text-white">
                {match.home_score ?? '-'} : {match.away_score ?? '-'}
              </div>
              <span className="mt-2 px-3 py-0.5 rounded-full text-xs font-bold bg-lime-400/20 text-lime-400">
                {match.status === 'LIVE'
                  ? `${match.minute}' Canlı`
                  : match.status === 'FT'
                  ? 'Maç Sonucu'
                  : match.status === 'HT'
                  ? 'İlk Yarı'
                  : match.kickoff_time}
              </span>
              {match.ht_home !== null && (
                <span className="text-xs text-slate-500 mt-1">
                  İY: {match.ht_home} - {match.ht_away}
                </span>
              )}
            </div>

            <div className="flex flex-col items-center gap-2">
              {match.away_team?.logo_url && (
                <img src={match.away_team.logo_url} alt="" className="w-16 h-16 object-contain" />
              )}
              <h2 className="text-sm sm:text-base font-bold text-white">{match.away_team?.name}</h2>
            </div>
          </div>

          {(match.venue_name || match.referee_name) && (
            <div className="mt-5 pt-3 border-t border-slate-800 flex flex-wrap justify-center gap-4 text-xs text-slate-400">
              {match.venue_name && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> {match.venue_name}
                </span>
              )}
              {match.referee_name && (
                <span className="flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5" /> {match.referee_name}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                Maç Olayları
              </h3>
              {events.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">Kayıtlı olay bulunmuyor.</p>
              ) : (
                <div className="space-y-2">
                  {events.map((ev: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-800/40"
                    >
                      <span className="font-mono font-bold text-lime-400">{ev.time?.elapsed}&apos;</span>
                      <span className="font-semibold text-slate-100">{ev.player?.name}</span>
                      <span className="text-slate-400 text-[11px]">{ev.type}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {statistics.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Maç İstatistikleri
                </h3>
                {statistics.map((stat: any, idx: number) => (
                  <div key={idx} className="flex justify-between text-xs border-b border-slate-800/60 pb-1.5">
                    <span className="font-bold text-lime-400">{stat.home}</span>
                    <span className="text-slate-400">{stat.type}</span>
                    <span className="font-bold text-sky-400">{stat.away}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <PitchView lineups={lineups} events={events} />
          </div>
        </div>

        {standings.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-lime-400" /> Puan Durumu
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-800">
                    <th className="py-2">#</th>
                    <th className="py-2">Takım</th>
                    <th className="py-2 text-center">O</th>
                    <th className="py-2 text-center">AV</th>
                    <th className="py-2 text-right">P</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {standings.map((row: any) => (
                    <tr key={row.team.id}>
                      <td className="py-2 font-mono text-slate-400">{row.rank}</td>
                      <td className="py-2 flex items-center gap-2">
                        <img src={row.team.logo} alt="" className="w-4 h-4 object-contain" />
                        <span>{row.team.name}</span>
                      </td>
                      <td className="py-2 text-center font-mono">{row.all?.played ?? '-'}</td>
                      <td className="py-2 text-center font-mono">{row.goalsDiff}</td>
                      <td className="py-2 text-right font-mono font-bold text-lime-400">{row.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
