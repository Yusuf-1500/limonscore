'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Trophy,
  Calendar,
  Users,
  MapPin,
  Shield,
  ChevronRight,
  Flame,
  Clock,
  Loader2,
} from 'lucide-react';

interface TeamHubProps {
  team: any;
  cleanId: string;
}

export function TeamHubClient({ team, cleanId }: TeamHubProps) {
  const [activeTab, setActiveTab] = useState<'standings' | 'squad'>('standings');
  const [matchFilter, setMatchFilter] = useState<'finished' | 'upcoming'>('finished');
  const [selectedLeagueIdx, setSelectedLeagueIdx] = useState(0);

  const [fixtures, setFixtures] = useState<any[]>([]);
  const [standingsData, setStandingsData] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [coach, setCoach] = useState<any>(null);

  const [loadingFixtures, setLoadingFixtures] = useState(true);
  const [loadingStandings, setLoadingStandings] = useState(true);
  const [loadingSquad, setLoadingSquad] = useState(true);

  const numericId = Number(cleanId);

  useEffect(() => {
    let cancelled = false;

    async function loadSequentially() {
      // 1. Adım: Maçlar (0ms)
      try {
        const res1 = await fetch(`/api/team-hub?id=${cleanId}&section=fixtures`);
        const d1 = await res1.json();
        if (!cancelled && Array.isArray(d1.fixtures)) setFixtures(d1.fixtures);
      } catch {}
      if (!cancelled) setLoadingFixtures(false);

      // 2. Adım: Puan Durumu (1.1 sn sonra - rate limit koruması)
      await new Promise((r) => setTimeout(r, 1100));
      if (cancelled) return;
      try {
        const res2 = await fetch(`/api/team-hub?id=${cleanId}&section=standings`);
        const d2 = await res2.json();
        if (!cancelled && Array.isArray(d2.standingsData)) setStandingsData(d2.standingsData);
      } catch {}
      if (!cancelled) setLoadingStandings(false);

      // 3. Adım: Kadro & Teknik Direktör (1.1 sn sonra)
      await new Promise((r) => setTimeout(r, 1100));
      if (cancelled) return;
      try {
        const res3 = await fetch(`/api/team-hub?id=${cleanId}&section=squad`);
        const d3 = await res3.json();
        if (!cancelled) {
          if (Array.isArray(d3.players)) setPlayers(d3.players);
          if (d3.coach) setCoach(d3.coach);
        }
      } catch {}
      if (!cancelled) setLoadingSquad(false);
    }

    loadSequentially();
    return () => {
      cancelled = true;
    };
  }, [cleanId]);

  const liveMatch = fixtures.find((f) =>
    ['1H', '2H', 'HT', 'ET', 'P', 'LIVE'].includes(f.fixture.status.short)
  );

  const finishedMatches = fixtures
    .filter((f) => ['FT', 'AET', 'PEN'].includes(f.fixture.status.short))
    .sort((a, b) => new Date(b.fixture.date).getTime() - new Date(a.fixture.date).getTime());

  const upcomingMatches = fixtures
    .filter((f) => ['NS', 'TBD', 'PST'].includes(f.fixture.status.short))
    .sort((a, b) => new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime());

  const nextMatch = upcomingMatches[0] || null;
  const displayedMatches =
    matchFilter === 'finished' ? finishedMatches.slice(0, 12) : upcomingMatches.slice(0, 12);

  const positionGroups = [
    { key: 'Goalkeeper', label: 'Kaleciler' },
    { key: 'Defender', label: 'Defans' },
    { key: 'Midfielder', label: 'Orta Saha' },
    { key: 'Attacker', label: 'Forvet' },
  ];

  const getMatchOutcome = (f: any) => {
    const isHome = f.teams.home.id === numericId;
    const gf = isHome ? f.goals.home : f.goals.away;
    const ga = isHome ? f.goals.away : f.goals.home;
    if (gf === null || ga === null) return null;
    if (gf > ga) return { label: 'G', color: 'bg-emerald-500 text-slate-950' };
    if (gf < ga) return { label: 'M', color: 'bg-rose-500 text-white' };
    return { label: 'B', color: 'bg-amber-400 text-slate-950' };
  };

  const formatShortDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
      });
    } catch {
      return '';
    }
  };

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const activeLeague = standingsData[selectedLeagueIdx] || null;
  const activeStandings = activeLeague?.standings?.[0] || [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-12">
      {/* Breadcrumb */}
      <div className="border-b border-slate-800/80 bg-slate-900/60">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center gap-2 text-xs text-slate-400">
          <Link href="/" className="hover:text-lime-400 transition">
            Ana Sayfa
          </Link>
          <span>&rsaquo;</span>
          <span>{team.country}</span>
          {activeLeague && (
            <>
              <span>&rsaquo;</span>
              <Link href={`/lig/l-${activeLeague.id}`} className="hover:text-lime-400 transition">
                {activeLeague.name}
              </Link>
            </>
          )}
          <span>&rsaquo;</span>
          <span className="text-slate-200 font-medium">{team.name}</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pt-5 space-y-5">
        {/* ÜST HERO KARTI */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-5">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-slate-950 border border-slate-800 p-3 flex items-center justify-center shrink-0">
              {team.logo && (
                <img src={team.logo} alt={team.name} className="w-full h-full object-contain" />
              )}
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {team.name}
                </h1>
                {team.founded && (
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    Kuruluş {team.founded}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                <span className="flex items-center gap-1.5 text-slate-300 font-medium">
                  <Shield className="w-3.5 h-3.5 text-lime-400" /> {team.country}
                </span>

                {coach && (
                  <Link
                    href={`/antrenor/${coach.id}`}
                    className="flex items-center gap-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-lime-400/50 px-2.5 py-1 rounded-full transition"
                  >
                    <img
                      src={coach.photo}
                      alt={coach.name}
                      className="w-5 h-5 rounded-full object-cover"
                    />
                    <span className="text-slate-200 font-semibold">{coach.name}</span>
                    <span className="text-[10px] text-slate-500">Antrenör</span>
                  </Link>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 pt-0.5">
                {team.venue?.name && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-lime-400" />
                    {team.venue.name}
                    {team.venue.capacity ? ` (${team.venue.capacity.toLocaleString()})` : ''}
                  </span>
                )}
                {activeLeague && (
                  <Link
                    href={`/lig/l-${activeLeague.id}`}
                    className="flex items-center gap-1 hover:text-lime-400 transition"
                  >
                    <Trophy className="w-3.5 h-3.5 text-amber-400" />
                    {activeLeague.name}
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Sağ: Canlı / Son Maç & Sonraki Maç Kartları */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:w-[460px] shrink-0">
            {(liveMatch || finishedMatches[0]) &&
              (() => {
                const m = liveMatch || finishedMatches[0];
                const isLive = Boolean(liveMatch);
                return (
                  <Link
                    href={`/mac/${m.fixture.id}`}
                    className={`rounded-xl p-3 border transition flex flex-col justify-between ${
                      isLive
                        ? 'bg-lime-400/10 border-lime-400/40 hover:border-lime-400'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-bold mb-2">
                      <span
                        className={
                          isLive ? 'text-lime-400 flex items-center gap-1' : 'text-slate-400'
                        }
                      >
                        {isLive && <Flame className="w-3 h-3" />}
                        {isLive ? `CANLI (${m.fixture.status.elapsed}')` : 'SON MAÇ'}
                      </span>
                      <span className="text-slate-500 truncate max-w-[110px]">
                        {m.league.name}
                      </span>
                    </div>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <img
                            src={m.teams.home.logo}
                            alt=""
                            className="w-4 h-4 object-contain"
                          />
                          <span className="truncate font-semibold text-white">
                            {m.teams.home.name}
                          </span>
                        </div>
                        <span className="font-mono font-bold text-white">
                          {m.goals.home ?? '-'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <img
                            src={m.teams.away.logo}
                            alt=""
                            className="w-4 h-4 object-contain"
                          />
                          <span className="truncate font-semibold text-white">
                            {m.teams.away.name}
                          </span>
                        </div>
                        <span className="font-mono font-bold text-white">
                          {m.goals.away ?? '-'}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })()}

            {nextMatch && (
              <Link
                href={`/mac/${nextMatch.fixture.id}`}
                className="rounded-xl p-3 bg-slate-950 border border-slate-800 hover:border-lime-400/40 transition flex flex-col justify-between"
              >
                <div className="flex items-center justify-between text-[10px] font-bold mb-2">
                  <span className="text-sky-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> SONRAKİ MAÇ
                  </span>
                  <span className="text-slate-500 truncate max-w-[110px]">
                    {nextMatch.league.name}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[11px] font-mono text-slate-400 shrink-0">
                    <div>{formatShortDate(nextMatch.fixture.date)}</div>
                    <div className="text-lime-400 font-bold">
                      {formatTime(nextMatch.fixture.date)}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 space-y-1 text-xs">
                    <div className="flex items-center gap-1.5">
                      <img
                        src={nextMatch.teams.home.logo}
                        alt=""
                        className="w-4 h-4 object-contain"
                      />
                      <span className="truncate font-medium text-slate-200">
                        {nextMatch.teams.home.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <img
                        src={nextMatch.teams.away.logo}
                        alt=""
                        className="w-4 h-4 object-contain"
                      />
                      <span className="truncate font-medium text-slate-200">
                        {nextMatch.teams.away.name}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            )}
          </div>
        </div>

        {/* ANA 2 SÜTUNLU ALAN */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* SOL SÜTUN: Maçlar */}
          <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-lime-400" /> Maçlar
              </h2>
              <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-xs">
                <button
                  onClick={() => setMatchFilter('finished')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition ${
                    matchFilter === 'finished'
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Biten ({finishedMatches.length})
                </button>
                <button
                  onClick={() => setMatchFilter('upcoming')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition ${
                    matchFilter === 'upcoming'
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Yaklaşan ({upcomingMatches.length})
                </button>
              </div>
            </div>

            <div className="divide-y divide-slate-800/70">
              {loadingFixtures ? (
                <div className="p-8 flex items-center justify-center gap-2 text-xs text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin text-lime-400" />
                  <span>Maçlar yükleniyor...</span>
                </div>
              ) : displayedMatches.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  Bu kategoride maç bulunamadı.
                </div>
              ) : (
                displayedMatches.map((m: any) => {
                  const outcome = getMatchOutcome(m);
                  return (
                    <Link
                      key={m.fixture.id}
                      href={`/mac/${m.fixture.id}`}
                      className="block p-3 hover:bg-slate-800/40 transition"
                    >
                      <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1.5">
                        <span className="truncate font-medium text-slate-400">
                          {m.league.name}
                        </span>
                        <span>{formatShortDate(m.fixture.date)}</span>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <div className="w-10 text-[11px] font-mono text-slate-400 text-center shrink-0">
                          {matchFilter === 'finished'
                            ? m.fixture.status.short
                            : formatTime(m.fixture.date)}
                        </div>

                        <div className="flex-1 min-w-0 space-y-1 border-l border-slate-800 pl-2.5 text-xs">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <img
                                src={m.teams.home.logo}
                                alt=""
                                className="w-4 h-4 object-contain"
                              />
                              <span
                                className={`truncate ${
                                  m.teams.home.id === numericId
                                    ? 'font-bold text-white'
                                    : 'text-slate-300'
                                }`}
                              >
                                {m.teams.home.name}
                              </span>
                            </div>
                            <span className="font-mono font-bold text-slate-100">
                              {m.goals.home ?? '-'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <img
                                src={m.teams.away.logo}
                                alt=""
                                className="w-4 h-4 object-contain"
                              />
                              <span
                                className={`truncate ${
                                  m.teams.away.id === numericId
                                    ? 'font-bold text-white'
                                    : 'text-slate-300'
                                }`}
                              >
                                {m.teams.away.name}
                              </span>
                            </div>
                            <span className="font-mono font-bold text-slate-100">
                              {m.goals.away ?? '-'}
                            </span>
                          </div>
                        </div>

                        {outcome ? (
                          <span
                            className={`w-6 h-6 rounded-md text-[11px] font-black flex items-center justify-center shrink-0 ${outcome.color}`}
                          >
                            {outcome.label}
                          </span>
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />
                        )}
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </div>

          {/* SAĞ SÜTUN: Puan Durumu & Kadro */}
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-1.5 flex items-center gap-1">
              <button
                onClick={() => setActiveTab('standings')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                  activeTab === 'standings'
                    ? 'bg-lime-400/15 text-lime-400 border border-lime-400/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Trophy className="w-3.5 h-3.5" /> Puan Durumu
              </button>
              <button
                onClick={() => setActiveTab('squad')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                  activeTab === 'squad'
                    ? 'bg-lime-400/15 text-lime-400 border border-lime-400/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" /> Kadro ({players.length})
              </button>
            </div>

            {activeTab === 'standings' && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                {loadingStandings ? (
                  <div className="p-10 flex items-center justify-center gap-2 text-xs text-slate-400">
                    <Loader2 className="w-4 h-4 animate-spin text-lime-400" />
                    <span>Puan durumu yükleniyor...</span>
                  </div>
                ) : (
                  <>
                    {standingsData.length > 1 && (
                      <div className="p-3 border-b border-slate-800 flex items-center gap-2 overflow-x-auto">
                        {standingsData.map((lg: any, idx: number) => (
                          <button
                            key={lg.id}
                            onClick={() => setSelectedLeagueIdx(idx)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                              selectedLeagueIdx === idx
                                ? 'bg-slate-800 text-lime-400 border border-lime-400/30'
                                : 'bg-slate-950 text-slate-400 hover:text-white'
                            }`}
                          >
                            {lg.logo && (
                              <img src={lg.logo} alt="" className="w-4 h-4 object-contain" />
                            )}
                            <span>{lg.name}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {activeStandings.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-400">
                        Bu kulüp için güncel puan durumu verisi henüz API tarafından sağlanmadı.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                            <tr>
                              <th className="py-3 px-3 w-10">#</th>
                              <th className="py-3 px-3">Takım</th>
                              <th className="py-3 px-2 text-center">O</th>
                              <th className="py-3 px-2 text-center">G</th>
                              <th className="py-3 px-2 text-center">B</th>
                              <th className="py-3 px-2 text-center">M</th>
                              <th className="py-3 px-2 text-center">AV</th>
                              <th className="py-3 px-2 text-center hidden sm:table-cell">
                                Son 5
                              </th>
                              <th className="py-3 px-3 text-center font-bold text-white">P</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/70">
                            {activeStandings.map((row: any) => {
                              const isCurrentTeam = row.team.id === numericId;
                              return (
                                <tr
                                  key={row.team.id}
                                  className={
                                    isCurrentTeam
                                      ? 'bg-lime-400/10 border-l-2 border-l-lime-400'
                                      : 'hover:bg-slate-800/40 transition'
                                  }
                                >
                                  <td className="py-2.5 px-3 font-mono font-bold text-slate-400">
                                    {row.rank}
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <Link
                                      href={`/takim/t-${row.team.id}`}
                                      className="flex items-center gap-2.5 hover:text-lime-400 transition"
                                    >
                                      <img
                                        src={row.team.logo}
                                        alt=""
                                        className="w-5 h-5 object-contain"
                                      />
                                      <span
                                        className={`truncate ${
                                          isCurrentTeam
                                            ? 'font-black text-lime-400'
                                            : 'font-semibold text-white'
                                        }`}
                                      >
                                        {row.team.name}
                                      </span>
                                    </Link>
                                  </td>
                                  <td className="py-2.5 px-2 text-center text-slate-300">
                                    {row.all.played}
                                  </td>
                                  <td className="py-2.5 px-2 text-center text-slate-300">
                                    {row.all.win}
                                  </td>
                                  <td className="py-2.5 px-2 text-center text-slate-300">
                                    {row.all.draw}
                                  </td>
                                  <td className="py-2.5 px-2 text-center text-slate-300">
                                    {row.all.lose}
                                  </td>
                                  <td className="py-2.5 px-2 text-center text-slate-300">
                                    {row.goalsDiff}
                                  </td>
                                  <td className="py-2.5 px-2 hidden sm:table-cell">
                                    <div className="flex items-center justify-center gap-0.5">
                                      {(row.form || '')
                                        .slice(-5)
                                        .split('')
                                        .map((ch: string, i: number) => (
                                          <span
                                            key={i}
                                            className={`w-4 h-4 rounded text-[9px] font-black flex items-center justify-center ${
                                              ch === 'W'
                                                ? 'bg-emerald-500 text-slate-950'
                                                : ch === 'L'
                                                ? 'bg-rose-500 text-white'
                                                : 'bg-amber-400 text-slate-950'
                                            }`}
                                          >
                                            {ch === 'W' ? 'G' : ch === 'L' ? 'M' : 'B'}
                                          </span>
                                        ))}
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-3 text-center font-mono font-bold text-lime-400">
                                    {row.points}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {activeTab === 'squad' && (
              <div className="space-y-4">
                {loadingSquad ? (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 flex items-center justify-center gap-2 text-xs text-slate-400">
                    <Loader2 className="w-4 h-4 animate-spin text-lime-400" />
                    <span>Kadro yükleniyor...</span>
                  </div>
                ) : players.length === 0 ? (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-xs text-slate-400">
                    Kadro bilgisi bulunamadı.
                  </div>
                ) : (
                  positionGroups.map((group) => {
                    const groupPlayers = players.filter((p) => p.position === group.key);
                    if (groupPlayers.length === 0) return null;
                    return (
                      <div
                        key={group.key}
                        className="bg-slate-900 border border-slate-800 rounded-2xl p-4"
                      >
                        <h3 className="text-xs font-bold uppercase tracking-wider text-lime-400 mb-3">
                          {group.label} ({groupPlayers.length})
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                          {groupPlayers.map((player: any) => (
                            <Link
                              key={player.id}
                              href={`/oyuncu/${player.id}`}
                              className="flex items-center gap-3 bg-slate-950 border border-slate-800/80 hover:border-lime-400/50 rounded-xl p-2.5 transition"
                            >
                              <img
                                src={player.photo}
                                alt={player.name}
                                className="w-10 h-10 rounded-full object-cover bg-slate-800 shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-white truncate">
                                  {player.name}
                                </p>
                                <p className="text-[11px] text-slate-400">
                                  {player.age ? `${player.age} yaş` : group.label}
                                </p>
                              </div>
                              {player.number && (
                                <span className="text-xs font-mono font-bold bg-slate-800 text-lime-400 px-2 py-0.5 rounded-lg">
                                  #{player.number}
                                </span>
                              )}
                            </Link>
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}