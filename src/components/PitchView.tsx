'use client';

import React, { useState } from 'react';
import { TeamLineup, MatchEventDetail, PlayerMatchStat } from '@/types/football';
import { X, Shield, Target, Activity, Clock } from 'lucide-react';

interface PitchViewProps {
  lineups: TeamLineup[];
  events?: MatchEventDetail[];
  playersStats?: PlayerMatchStat[];
}

export function PitchView({ lineups, events = [], playersStats = [] }: PitchViewProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<{
    id: number;
    name: string;
    number: number;
    pos: string;
    teamName: string;
    teamLogo: string;
    isHome: boolean;
  } | null>(null);

  if (!lineups || lineups.length < 2) {
    return (
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6 text-center text-sm text-slate-400">
        Bu karşılaşma için henüz resmi kadro ve diziliş bilgisi yayınlanmadı.
      </div>
    );
  }

  const home = lineups[0];
  const away = lineups[1];

  // Oyuncunun maç içi olaylarını (Gol, Sarı/Kırmızı Kart, Oyundan Çıkma) eşleştir
  const getPlayerBadges = (playerId: number, playerName: string) => {
    let goals = 0;
    let assists = 0;
    let yellow = false;
    let red = false;
    let subbedOut = false;

    const cleanLast = playerName.split(' ').slice(-1)[0].toLowerCase();

    for (const ev of events) {
      const evPlayerMatch =
        (ev.player?.id && ev.player.id === playerId) ||
        (ev.player?.name && ev.player.name.toLowerCase().includes(cleanLast));

      const evAssistMatch =
        (ev.assist?.id && ev.assist.id === playerId) ||
        (ev.assist?.name && ev.assist.name.toLowerCase().includes(cleanLast));

      if (ev.type === 'Goal' && !ev.detail?.includes('Missed')) {
        if (evPlayerMatch) goals += 1;
        if (evAssistMatch) assists += 1;
      } else if (ev.type === 'Card' && evPlayerMatch) {
        if (ev.detail?.includes('Yellow')) yellow = true;
        if (ev.detail?.includes('Red')) red = true;
      } else if (ev.type === 'subst' && evPlayerMatch) {
        subbedOut = true;
      }
    }

    return { goals, assists, yellow, red, subbedOut };
  };

  // Oyuncunun API-Football canlı reyting ve detaylı istatistiklerini bul
  const getDetailedPlayerStat = (playerId: number, playerName: string) => {
    const cleanLast = playerName.split(' ').slice(-1)[0].toLowerCase();
    for (const teamGroup of playersStats as any[]) {
      const found = (teamGroup.players ?? []).find(
        (p: any) =>
          p.player?.id === playerId ||
          p.player?.name?.toLowerCase().includes(cleanLast)
      );
      if (found && found.statistics?.[0]) {
        return found.statistics[0];
      }
    }
    return null;
  };

  const buildVerticalPositions = (players: TeamLineup['startXI'], isBottomTeam: boolean) => {
    const parsed = players.map((item, idx) => {
      const grid = item.player.grid;
      if (grid && grid.includes(':')) {
        const [rStr, cStr] = grid.split(':');
        return {
          item,
          row: Math.max(1, Math.min(6, parseInt(rStr, 10) || 1)),
          col: Math.max(1, Math.min(6, parseInt(cStr, 10) || 1)),
        };
      }
      return {
        item,
        row: Math.floor(idx / 3) + 1,
        col: (idx % 3) + 1,
      };
    });

    const rowsMap = new Map<number, typeof parsed>();
    for (const p of parsed) {
      const list = rowsMap.get(p.row) ?? [];
      list.push(p);
      rowsMap.set(p.row, list);
    }

    const sortedRowKeys = Array.from(rowsMap.keys()).sort((a, b) => a - b);
    const totalRows = sortedRowKeys.length;
    const positioned: Array<{
      player: TeamLineup['startXI'][0]['player'];
      x: number;
      y: number;
    }> = [];

    sortedRowKeys.forEach((rowKey, rowIndex) => {
      const rowPlayers = rowsMap.get(rowKey)!;
      rowPlayers.sort((a, b) => (isBottomTeam ? b.col - a.col : a.col - b.col));

      const count = rowPlayers.length;
      const ratio = totalRows > 1 ? rowIndex / (totalRows - 1) : 0;
      const y = isBottomTeam ? 93 - ratio * 37 : 7 + ratio * 37;

      rowPlayers.forEach((rp, i) => {
        let x = 50;
        if (count === 2) x = i === 0 ? 33 : 67;
        else if (count === 3) x = 22 + i * 28;
        else if (count === 4) x = 14 + i * 24;
        else if (count >= 5) x = 11 + (i / (count - 1)) * 78;

        positioned.push({ player: rp.item.player, x, y });
      });
    });

    return positioned;
  };

  const homePositions = buildVerticalPositions(home.startXI, false);
  const awayPositions = buildVerticalPositions(away.startXI, true);

  const formatShortPlayerName = (fullName: string) => {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0];
    return `${parts[0][0]}. ${parts.slice(1).join(' ')}`;
  };

  const posLabels: Record<string, string> = {
    G: 'Kaleci',
    D: 'Defans',
    M: 'Orta Saha',
    F: 'Forvet',
  };

  const selectedBadges = selectedPlayer
    ? getPlayerBadges(selectedPlayer.id, selectedPlayer.name)
    : null;
  const selectedStat = selectedPlayer
    ? getDetailedPlayerStat(selectedPlayer.id, selectedPlayer.name)
    : null;

  return (
    <div className="space-y-4 relative">
      {/* Tıklanabilir Oyuncu Profil Kartı (Modal/Popover) */}
      {selectedPlayer && (
        <div className="bg-slate-950 border border-emerald-500/40 rounded-2xl p-3.5 shadow-2xl space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-full bg-slate-800 border-2 border-emerald-400 overflow-hidden flex items-center justify-center shrink-0">
                <img
                  src={`https://media.api-sports.io/football/players/${selectedPlayer.id}.png`}
                  alt={selectedPlayer.name}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                  className="w-full h-full object-cover"
                />
                <span className="text-sm font-black text-slate-300">#{selectedPlayer.number}</span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-slate-800 text-emerald-400">
                    #{selectedPlayer.number}
                  </span>
                  <h4 className="text-sm font-bold text-white truncate">{selectedPlayer.name}</h4>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                  <img src={selectedPlayer.teamLogo} alt="" className="w-3.5 h-3.5 object-contain" />
                  <span className="truncate">{selectedPlayer.teamName}</span>
                  <span>•</span>
                  <span>{posLabels[selectedPlayer.pos] || selectedPlayer.pos}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {selectedStat?.games?.rating && (
                <div className="px-2.5 py-1 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs font-mono">
                  {Number(selectedStat.games.rating).toFixed(1)}
                </div>
              )}
              <button
                onClick={() => setSelectedPlayer(null)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Oyuncu Maç İçi İstatistik Izgarası */}
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-2">
              <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                <Clock className="w-3 h-3" /> Süre
              </div>
              <div className="font-mono font-bold text-white mt-0.5">
                {selectedStat?.games?.minutes ? `${selectedStat.games.minutes}'` : 'İlk 11'}
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-2">
              <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                <Target className="w-3 h-3 text-emerald-400" /> Gol / Asist
              </div>
              <div className="font-mono font-bold text-emerald-400 mt-0.5">
                {selectedBadges?.goals ?? 0} / {selectedBadges?.assists ?? 0}
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-2">
              <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                <Activity className="w-3 h-3 text-sky-400" /> Şut (İsabet)
              </div>
              <div className="font-mono font-bold text-white mt-0.5">
                {selectedStat?.shots?.total ?? 0} ({selectedStat?.shots?.on ?? 0})
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-2">
              <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                <Shield className="w-3 h-3 text-amber-400" /> Pas / Kart
              </div>
              <div className="font-mono font-bold text-white mt-0.5">
                {selectedStat?.passes?.total ?? 0} /{' '}
                {selectedBadges?.red ? '🟥' : selectedBadges?.yellow ? '🟨' : '0'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dikey Sofascore Saha Kartı */}
      <div className="bg-[#181c20] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {/* Üst Takım Bandı (Ev Sahibi) */}
        <div className="px-3.5 py-2.5 bg-[#1e2328] border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <img src={home.team.logo} alt={home.team.name} className="w-5 h-5 object-contain shrink-0" />
            <span className="text-xs font-bold text-white truncate">{home.team.name}</span>
          </div>
          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-white/10 text-emerald-400">
            {home.formation || '4-2-3-1'}
          </span>
        </div>

        {/* Dikey Saha Alanı */}
        <div className="relative w-full aspect-[9/14] sm:aspect-[10/14] bg-[#1a1f24] select-none overflow-hidden">
          <div className="absolute inset-2.5 border border-white/20 pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[54%] h-[13%] border-x border-b border-white/20" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[26%] h-[5.5%] border-x border-b border-white/20" />
            <div className="absolute top-[13%] left-1/2 -translate-x-1/2 w-16 h-6 border-b border-x border-white/20 rounded-b-full" />

            <div className="absolute top-1/2 left-0 right-0 h-px bg-white/20" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border border-white/20" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white/30" />

            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[54%] h-[13%] border-x border-t border-white/20" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[26%] h-[5.5%] border-x border-t border-white/20" />
            <div className="absolute bottom-[13%] left-1/2 -translate-x-1/2 w-16 h-6 border-t border-x border-white/20 rounded-t-full" />
          </div>

          {/* Ev Sahibi Oyuncular (Üst Yarı) */}
          {homePositions.map(({ player, x, y }, idx) => {
            const badges = getPlayerBadges(player.id, player.name);
            const pStat = getDetailedPlayerStat(player.id, player.name);
            const rating = pStat?.games?.rating ? Number(pStat.games.rating).toFixed(1) : null;
            const photoUrl = `https://media.api-sports.io/football/players/${player.id}.png`;

            return (
              <button
                type="button"
                key={player.id || idx}
                onClick={() =>
                  setSelectedPlayer({
                    id: player.id,
                    name: player.name,
                    number: player.number,
                    pos: player.pos,
                    teamName: home.team.name,
                    teamLogo: home.team.logo,
                    isHome: true,
                  })
                }
                style={{ left: `${x}%`, top: `${y}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10 hover:z-30 w-[76px] group cursor-pointer focus:outline-none"
              >
                <div className="relative transition-transform group-hover:scale-110">
                  <div className="w-9 h-9 rounded-full bg-slate-200 border-2 border-emerald-400 overflow-hidden flex items-center justify-center shadow-lg">
                    <img
                      src={photoUrl}
                      alt={player.name}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                      }}
                      className="w-full h-full object-cover"
                    />
                    <span className="text-[11px] font-black text-slate-800">
                      {player.number}
                    </span>
                  </div>

                  {(badges.yellow || badges.red || badges.subbedOut) && (
                    <div className="absolute -left-2 -top-1 flex flex-col gap-0.5">
                      {badges.yellow && (
                        <span className="w-2.5 h-3 bg-amber-400 rounded-[2px] border border-slate-900 shadow" />
                      )}
                      {badges.red && (
                        <span className="w-2.5 h-3 bg-rose-500 rounded-[2px] border border-slate-900 shadow" />
                      )}
                      {badges.subbedOut && (
                        <span className="w-3.5 h-3.5 rounded-full bg-white text-rose-600 text-[9px] font-black flex items-center justify-center shadow border border-slate-900">
                          ⇄
                        </span>
                      )}
                    </div>
                  )}

                  {badges.goals > 0 && (
                    <span className="absolute -right-2 -top-1 px-1 rounded-full bg-white text-slate-950 text-[9px] font-black shadow border border-slate-900">
                      ⚽{badges.goals > 1 ? badges.goals : ''}
                    </span>
                  )}

                  {rating && !badges.goals && (
                    <span className="absolute -right-2.5 -bottom-1 px-1 rounded bg-emerald-500 text-slate-950 text-[8.5px] font-mono font-black shadow">
                      {rating}
                    </span>
                  )}
                </div>

                <div className="mt-1 px-1.5 py-[1px] rounded bg-black/75 backdrop-blur-sm text-[9.5px] leading-tight text-center max-w-[78px] truncate shadow group-hover:bg-emerald-950">
                  <span className="text-slate-400 font-mono mr-1">{player.number}</span>
                  <span className="text-white font-semibold">{formatShortPlayerName(player.name)}</span>
                </div>
              </button>
            );
          })}

          {/* Deplasman Oyuncular (Alt Yarı) */}
          {awayPositions.map(({ player, x, y }, idx) => {
            const badges = getPlayerBadges(player.id, player.name);
            const pStat = getDetailedPlayerStat(player.id, player.name);
            const rating = pStat?.games?.rating ? Number(pStat.games.rating).toFixed(1) : null;
            const photoUrl = `https://media.api-sports.io/football/players/${player.id}.png`;

            return (
              <button
                type="button"
                key={player.id || idx}
                onClick={() =>
                  setSelectedPlayer({
                    id: player.id,
                    name: player.name,
                    number: player.number,
                    pos: player.pos,
                    teamName: away.team.name,
                    teamLogo: away.team.logo,
                    isHome: false,
                  })
                }
                style={{ left: `${x}%`, top: `${y}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10 hover:z-30 w-[76px] group cursor-pointer focus:outline-none"
              >
                <div className="relative transition-transform group-hover:scale-110">
                  <div className="w-9 h-9 rounded-full bg-slate-200 border-2 border-sky-400 overflow-hidden flex items-center justify-center shadow-lg">
                    <img
                      src={photoUrl}
                      alt={player.name}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                      }}
                      className="w-full h-full object-cover"
                    />
                    <span className="text-[11px] font-black text-slate-800">
                      {player.number}
                    </span>
                  </div>

                  {(badges.yellow || badges.red || badges.subbedOut) && (
                    <div className="absolute -left-2 -top-1 flex flex-col gap-0.5">
                      {badges.yellow && (
                        <span className="w-2.5 h-3 bg-amber-400 rounded-[2px] border border-slate-900 shadow" />
                      )}
                      {badges.red && (
                        <span className="w-2.5 h-3 bg-rose-500 rounded-[2px] border border-slate-900 shadow" />
                      )}
                      {badges.subbedOut && (
                        <span className="w-3.5 h-3.5 rounded-full bg-white text-rose-600 text-[9px] font-black flex items-center justify-center shadow border border-slate-900">
                          ⇄
                        </span>
                      )}
                    </div>
                  )}

                  {badges.goals > 0 && (
                    <span className="absolute -right-2 -top-1 px-1 rounded-full bg-white text-slate-950 text-[9px] font-black shadow border border-slate-900">
                      ⚽{badges.goals > 1 ? badges.goals : ''}
                    </span>
                  )}

                  {rating && !badges.goals && (
                    <span className="absolute -right-2.5 -bottom-1 px-1 rounded bg-sky-400 text-slate-950 text-[8.5px] font-mono font-black shadow">
                      {rating}
                    </span>
                  )}
                </div>

                <div className="mt-1 px-1.5 py-[1px] rounded bg-black/75 backdrop-blur-sm text-[9.5px] leading-tight text-center max-w-[78px] truncate shadow group-hover:bg-sky-950">
                  <span className="text-slate-400 font-mono mr-1">{player.number}</span>
                  <span className="text-white font-semibold">{formatShortPlayerName(player.name)}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Alt Takım Bandı (Deplasman) */}
        <div className="px-3.5 py-2.5 bg-[#1e2328] border-t border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <img src={away.team.logo} alt={away.team.name} className="w-5 h-5 object-contain shrink-0" />
            <span className="text-xs font-bold text-white truncate">{away.team.name}</span>
          </div>
          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-white/10 text-sky-400">
            {away.formation || '4-2-3-1'}
          </span>
        </div>
      </div>

      {/* Teknik Direktörler & Yedek Kulübesi */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-2.5">
          {home.coach?.name && (
            <div className="text-[11px] text-slate-400 pb-1.5 mb-1.5 border-b border-slate-800 truncate">
              T.D: <span className="text-slate-200 font-semibold">{home.coach.name}</span>
            </div>
          )}
          <div className="font-semibold text-emerald-400 mb-1.5">Ev Sahibi Yedekler</div>
          <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
            {home.substitutes.map((s, idx) => (
              <button
                type="button"
                key={s.player.id || idx}
                onClick={() =>
                  setSelectedPlayer({
                    id: s.player.id,
                    name: s.player.name,
                    number: s.player.number,
                    pos: s.player.pos,
                    teamName: home.team.name,
                    teamLogo: home.team.logo,
                    isHome: true,
                  })
                }
                className="w-full flex items-center justify-between text-slate-300 hover:text-white text-left py-0.5"
              >
                <span className="truncate">{s.player.name}</span>
                <span className="font-mono text-slate-500 ml-1">#{s.player.number}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-2.5">
          {away.coach?.name && (
            <div className="text-[11px] text-slate-400 pb-1.5 mb-1.5 border-b border-slate-800 truncate">
              T.D: <span className="text-slate-200 font-semibold">{away.coach.name}</span>
            </div>
          )}
          <div className="font-semibold text-sky-400 mb-1.5">Deplasman Yedekler</div>
          <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
            {away.substitutes.map((s, idx) => (
              <button
                type="button"
                key={s.player.id || idx}
                onClick={() =>
                  setSelectedPlayer({
                    id: s.player.id,
                    name: s.player.name,
                    number: s.player.number,
                    pos: s.player.pos,
                    teamName: away.team.name,
                    teamLogo: away.team.logo,
                    isHome: false,
                  })
                }
                className="w-full flex items-center justify-between text-slate-300 hover:text-white text-left py-0.5"
              >
                <span className="truncate">{s.player.name}</span>
                <span className="font-mono text-slate-500 ml-1">#{s.player.number}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}