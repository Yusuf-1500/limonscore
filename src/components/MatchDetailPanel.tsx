'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { MatchItem, FixtureDetailsResponse } from '@/types/football';
import { PitchView } from './PitchView';
import {
  X,
  MapPin,
  UserCheck,
  BarChart2,
  ListOrdered,
  Users,
  RefreshCw,
  ArrowRightLeft,
  Trophy,
  History,
  Star,
  ArrowLeft,
  Share2,
  ExternalLink,
  Check,
} from 'lucide-react';

interface MatchDetailPanelProps {
  match: MatchItem | null;
  onClose: () => void;
  favoriteTeams: string[];
  onToggleFavoriteTeam: (teamId: string) => void;
}

export function MatchDetailPanel({
  match,
  onClose,
  favoriteTeams,
  onToggleFavoriteTeam,
}: MatchDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<'events' | 'stats' | 'lineups' | 'standings' | 'h2h'>('events');
  const [details, setDetails] = useState<FixtureDetailsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!match) return;
    let cancelled = false;
    setLoading(true);
    setDetails(null);

    const needsExtras = activeTab === 'standings' || activeTab === 'h2h';
    fetch(`/api/match-details?id=${match.id}${needsExtras ? '&extras=1' : ''}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          setDetails(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [match]);

  useEffect(() => {
    if (!match || !details) return;
    if (activeTab !== 'standings' && activeTab !== 'h2h') return;
    const hasStandings = Array.isArray(details?.standings) && details.standings.length > 0;
    const hasH2h = Array.isArray(details?.h2h) && details.h2h.length > 0;
    if (hasStandings || hasH2h) return;

    let cancelled = false;
    setLoading(true);
    fetch(`/api/match-details?id=${match.id}&extras=1`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          setDetails(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeTab, match, details]);

  const handleShareMatch = async () => {
    if (!match) return;
    const shareUrl = `${window.location.origin}/mac/${match.id}`;
    const shareText = `${match.home_team?.name} ${match.home_score ?? '-'} : ${match.away_score ?? '-'} ${match.away_team?.name} — LimonScore Canlı Skor`;

    if (navigator.share) {
      try {
        await navigator.share({ title: shareText, url: shareUrl });
        return;
      } catch {}
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  if (!match) {
    return (
      <div className="hidden lg:flex flex-col items-center justify-center h-[calc(100vh-5.5rem)] sticky top-20 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-lime-400/10 border border-lime-400/20 flex items-center justify-center mb-3 text-xl">
          🍋
        </div>
        <h3 className="font-semibold text-slate-200">LimonScore Maç Merkezi</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-xs">
          Canlı olayları, istatistikleri, tıklanabilir 2D dizilişi, lig puan tablosunu ve H2H geçmişini incelemek için listeden bir maç seçin.
        </p>
      </div>
    );
  }

  const isHomeFav = favoriteTeams.includes(match.home_team_id);
  const isAwayFav = favoriteTeams.includes(match.away_team_id);

  return (
    <div className="bg-slate-900 border border-slate-800 lg:rounded-2xl overflow-hidden shadow-2xl lg:sticky lg:top-20 flex flex-col h-full lg:h-auto lg:max-h-[calc(100vh-5.5rem)]">
      {/* Üst Skor Kartı */}
      <div className="bg-gradient-to-b from-slate-800/90 to-slate-900 p-4 border-b border-slate-800 relative shrink-0">
        <button
          onClick={onClose}
          className="lg:hidden absolute top-3 left-3 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Geri
        </button>

        {/* Paylaşım & Tam Sayfa Linki */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          <button
            onClick={handleShareMatch}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-lime-400 transition"
            title="Maç linkini paylaş / kopyala"
          >
            {copied ? <Check className="w-4 h-4 text-lime-400" /> : <Share2 className="w-4 h-4" />}
          </button>
          <Link
            href={`/mac/${match.id}`}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
            title="Maçın özel sayfasını aç"
          >
            <ExternalLink className="w-4 h-4" />
          </Link>
          <button
            onClick={onClose}
            className="hidden lg:flex p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
            aria-label="Kapat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-slate-400 mb-3 pt-1 lg:pt-0">
          {match.league?.logo_url && (
            <img src={match.league.logo_url} alt={match.league.name} className="w-4 h-4 object-contain" />
          )}
          <span className="font-medium truncate max-w-[180px]">
            {match.league?.country} — {match.league?.name}
          </span>
        </div>

        {/* Takımlar ve Skor */}
        <div className="grid grid-cols-3 items-center gap-2 text-center">
          <div className="flex flex-col items-center gap-1.5">
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => onToggleFavoriteTeam(match.home_team_id)}
                className="p-1.5 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-amber-400 transition"
                title={isHomeFav ? 'Takımı favorilerden çıkar' : 'Takımı favorilere ekle'}
              >
                <Star className={`w-4 h-4 ${isHomeFav ? 'fill-amber-400 text-amber-400' : ''}`} />
              </button>
              {match.home_team?.logo_url && (
                <img
                  src={match.home_team.logo_url}
                  alt={match.home_team.name}
                  className="w-11 h-11 object-contain"
                />
              )}
            </div>
            <span className="text-xs font-bold text-slate-100 line-clamp-2">
              {match.home_team?.name}
            </span>
          </div>

          <div className="flex flex-col items-center">
            <div className="text-2xl font-black font-mono tracking-wider text-white">
              {match.home_score ?? '-'} : {match.away_score ?? '-'}
            </div>
            <div className="mt-1">
              {match.status === 'LIVE' ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-lime-400/20 text-lime-400 border border-lime-400/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-ping" />
                  {match.minute}&apos; Canlı
                </span>
              ) : match.status === 'HT' ? (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/20 text-amber-400">
                  İlk Yarı Sonucu
                </span>
              ) : match.status === 'FT' ? (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-300">
                  Maç Sonucu
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-300">
                  {match.kickoff_time}
                </span>
              )}
            </div>
            {match.ht_home !== null && match.ht_home !== undefined && (
              <span className="text-[10px] text-slate-500 mt-1">
                İY: {match.ht_home} - {match.ht_away}
              </span>
            )}
          </div>

          <div className="flex flex-col items-center gap-1.5">
            <div className="flex items-center justify-center gap-2">
              {match.away_team?.logo_url && (
                <img
                  src={match.away_team.logo_url}
                  alt={match.away_team.name}
                  className="w-11 h-11 object-contain"
                />
              )}
              <button
                onClick={() => onToggleFavoriteTeam(match.away_team_id)}
                className="p-1.5 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-amber-400 transition"
                title={isAwayFav ? 'Takımı favorilerden çıkar' : 'Takımı favorilere ekle'}
              >
                <Star className={`w-4 h-4 ${isAwayFav ? 'fill-amber-400 text-amber-400' : ''}`} />
              </button>
            </div>
            <span className="text-xs font-bold text-slate-100 line-clamp-2">
              {match.away_team?.name}
            </span>
          </div>
        </div>

        {(match.venue_name || match.referee_name) && (
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center justify-center gap-3 text-[11px] text-slate-400">
            {match.venue_name && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-500" /> {match.venue_name}
              </span>
            )}
            {match.referee_name && (
              <span className="flex items-center gap-1">
                <UserCheck className="w-3 h-3 text-slate-500" /> {match.referee_name}
              </span>
            )}
          </div>
        )}
      </div>

      {/* 5 Sekmeli Analiz Menüsü */}
      <div className="grid grid-cols-5 border-b border-slate-800 bg-slate-950/60 text-[11px] font-semibold shrink-0">
        <button
          onClick={() => setActiveTab('events')}
          className={`py-2.5 flex flex-col sm:flex-row items-center justify-center gap-1 border-b-2 transition ${
            activeTab === 'events'
              ? 'border-lime-400 text-lime-400 bg-slate-900'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ListOrdered className="w-3.5 h-3.5" /> <span>Olaylar</span>
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`py-2.5 flex flex-col sm:flex-row items-center justify-center gap-1 border-b-2 transition ${
            activeTab === 'stats'
              ? 'border-lime-400 text-lime-400 bg-slate-900'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <BarChart2 className="w-3.5 h-3.5" /> <span>İstat.</span>
        </button>
        <button
          onClick={() => setActiveTab('lineups')}
          className={`py-2.5 flex flex-col sm:flex-row items-center justify-center gap-1 border-b-2 transition ${
            activeTab === 'lineups'
              ? 'border-lime-400 text-lime-400 bg-slate-900'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-3.5 h-3.5" /> <span>2D Saha</span>
        </button>
        <button
          onClick={() => setActiveTab('standings')}
          className={`py-2.5 flex flex-col sm:flex-row items-center justify-center gap-1 border-b-2 transition ${
            activeTab === 'standings'
              ? 'border-lime-400 text-lime-400 bg-slate-900'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Trophy className="w-3.5 h-3.5" /> <span>Puan</span>
        </button>
        <button
          onClick={() => setActiveTab('h2h')}
          className={`py-2.5 flex flex-col sm:flex-row items-center justify-center gap-1 border-b-2 transition ${
            activeTab === 'h2h'
              ? 'border-lime-400 text-lime-400 bg-slate-900'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <History className="w-3.5 h-3.5" /> <span>H2H</span>
        </button>
      </div>

      {/* İçerik Alanı */}
      <div className="p-4 overflow-y-auto flex-1 space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-xs gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-lime-400" />
            Maç verileri yükleniyor...
          </div>
        ) : activeTab === 'events' ? (
          !details?.events || details.events.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-400">
              Henüz kaydedilmiş gol, kart veya oyuncu değişikliği bulunmuyor.
            </div>
          ) : (
            <div className="space-y-2">
              {details.events.map((ev, idx) => {
                const isHome = `t-${ev.team.id}` === match.home_team_id;
                return (
                  <div
                    key={idx}
                    className={`flex items-center gap-2.5 p-2 rounded-lg bg-slate-800/40 border border-slate-800/80 text-xs ${
                      isHome ? 'flex-row' : 'flex-row-reverse text-right'
                    }`}
                  >
                    <span className="font-mono font-bold text-lime-400 w-9 shrink-0">
                      {ev.time.elapsed}
                      {ev.time.extra ? `+${ev.time.extra}` : ''}&apos;
                    </span>
                    <div className="shrink-0">
                      {ev.type === 'Goal' ? (
                        <span title="Gol">⚽</span>
                      ) : ev.type === 'Card' && ev.detail?.includes('Yellow') ? (
                        <span className="inline-block w-2.5 h-3.5 bg-amber-400 rounded-[2px]" title="Sarı Kart" />
                      ) : ev.type === 'Card' ? (
                        <span className="inline-block w-2.5 h-3.5 bg-rose-500 rounded-[2px]" title="Kırmızı Kart" />
                      ) : (
                        <ArrowRightLeft className="w-3.5 h-3.5 text-sky-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-100 truncate">
                        {ev.player?.name || 'Oyuncu'}
                      </div>
                      {ev.assist?.name && (
                        <div className="text-[11px] text-slate-400 truncate">
                          {ev.type === 'subst' ? `Çıkan: ${ev.assist.name}` : `Asist: ${ev.assist.name}`}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : activeTab === 'stats' ? (
          !details?.statistics || details.statistics.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-400">
              Bu maç için detaylı istatistik verisi henüz mevcut değil.
            </div>
          ) : (
            <div className="space-y-3">
              {details.statistics.map((stat, idx) => {
                const hVal = parseFloat(String(stat.home).replace('%', '')) || 0;
                const aVal = parseFloat(String(stat.away).replace('%', '')) || 0;
                const total = hVal + aVal || 1;
                const homePct = Math.round((hVal / total) * 100);

                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-lime-400 font-bold">{stat.home}</span>
                      <span className="text-slate-400">{stat.type}</span>
                      <span className="text-sky-400 font-bold">{stat.away}</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden flex">
                      <div
                        style={{ width: `${homePct}%` }}
                        className="bg-lime-400 h-full transition-all"
                      />
                      <div
                        style={{ width: `${100 - homePct}%` }}
                        className="bg-sky-500 h-full transition-all"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : activeTab === 'lineups' ? (
          <PitchView
            lineups={details?.lineups ?? []}
            events={details?.events ?? []}
            playersStats={details?.players ?? []}
          />
        ) : activeTab === 'standings' ? (
          !Array.isArray(details?.standings) || details.standings.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-400">
              Bu turnuva/kupa karşılaşması için lig puan tablosu bulunmuyor.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="text-[11px] text-slate-400 border-b border-slate-800">
                    <th className="py-2 pr-2">#</th>
                    <th className="py-2">Takım</th>
                    <th className="py-2 text-center">O</th>
                    <th className="py-2 text-center">G</th>
                    <th className="py-2 text-center">B</th>
                    <th className="py-2 text-center">M</th>
                    <th className="py-2 text-center">AV</th>
                    <th className="py-2 text-right font-bold text-slate-200">P</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {(Array.isArray(details.standings[0]) ? details.standings[0] : details.standings).filter((r: any) => r && r.team).map((row: any) => {
                    const isMatchTeam =
                      `t-${row.team.id}` === match.home_team_id ||
                      `t-${row.team.id}` === match.away_team_id;
                    return (
                      <tr
                        key={row.team.id}
                        className={
                          isMatchTeam
                            ? 'bg-lime-400/15 font-semibold text-white'
                            : 'text-slate-300 hover:bg-slate-800/40'
                        }
                      >
                        <td className="py-2 pr-2 font-mono text-slate-400">{row.rank}</td>
                        <td className="py-2 flex items-center gap-2 max-w-[140px]">
                          <img src={row.team.logo} alt={row.team.name} className="w-4 h-4 object-contain shrink-0" />
                          <span className="truncate">{row.team.name}</span>
                        </td>
                        <td className="py-2 text-center font-mono">{row.all?.played ?? '-'}</td>
                        <td className="py-2 text-center font-mono text-lime-400">{row.all?.win ?? '-'}</td>
                        <td className="py-2 text-center font-mono">{row.all?.draw ?? '-'}</td>
                        <td className="py-2 text-center font-mono text-rose-400">{row.all?.lose ?? '-'}</td>
                        <td className="py-2 text-center font-mono">{row.goalsDiff}</td>
                        <td className="py-2 text-right font-mono font-bold text-lime-400">{row.points}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : !details?.h2h || details.h2h.length === 0 ? (
          <div className="text-center py-10 text-xs text-slate-400">
            İki takım arasında kayıtlı geçmiş karşılaşma bulunamadı.
          </div>
        ) : (
          <div className="space-y-2">
            {details.h2h.map((item, idx) => {
              const dateStr = new Date(item.fixture.date).toLocaleDateString('tr-TR', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              });
              return (
                <div
                  key={item.fixture.id || idx}
                  className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-800/80 text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span className="truncate max-w-[180px]">{item.league.name}</span>
                    <span>{dateStr}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <img src={item.teams.home.logo} alt="" className="w-4 h-4 object-contain shrink-0" />
                      <span className={`truncate ${item.teams.home.winner ? 'font-bold text-white' : 'text-slate-300'}`}>
                        {item.teams.home.name}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-slate-900 font-mono font-bold text-lime-400 shrink-0">
                      {item.goals.home ?? '-'} - {item.goals.away ?? '-'}
                    </span>
                    <div className="flex items-center justify-end gap-1.5 flex-1 min-w-0">
                      <span className={`truncate ${item.teams.away.winner ? 'font-bold text-white' : 'text-slate-300'}`}>
                        {item.teams.away.name}
                      </span>
                      <img src={item.teams.away.logo} alt="" className="w-4 h-4 object-contain shrink-0" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
