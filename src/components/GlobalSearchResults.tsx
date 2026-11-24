'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, Shield, Loader2 } from 'lucide-react';

export function GlobalSearchResults({ query }: { query: string }) {
  const [teams, setTeams] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) {
      setTeams([]);
      setPlayers([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}`)
        .then((res) => res.json())
        .then((data) => {
          if (!cancelled) {
            setTeams(data.teams || []);
            setPlayers(data.players || []);
            setLoading(false);
          }
        })
        .catch(() => {
          if (!cancelled) setLoading(false);
        });
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  if (query.trim().length < 3) return null;

  return (
    <div className="space-y-3 pt-2 border-t border-slate-800">
      {loading && (
        <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-lime-400" />
          <span>Kulup ve oyuncular araniyor...</span>
        </div>
      )}

      {!loading && teams.length === 0 && players.length === 0 && (
        <p className="text-xs text-slate-500">API uzerinde eslesen kulup veya oyuncu bulunamadi.</p>
      )}

      {teams.length > 0 && (
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-lime-400 mb-2 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" /> Kulupler
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {teams.map((item: any) => (
              <Link
                key={item.team.id}
                href={`/takim/${item.team.id}`}
                className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-lime-400/50 transition"
              >
                <img src={item.team.logo} alt={item.team.name} className="w-7 h-7 object-contain shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">{item.team.name}</div>
                  <div className="text-[10px] text-slate-400 truncate">{item.team.country}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {players.length > 0 && (
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400 mb-2 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" /> Oyuncular
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {players.map((item: any) => (
              <Link
                key={item.player.id}
                href={`/oyuncu/${item.player.id}`}
                className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-lime-400/50 transition"
              >
                <img src={item.player.photo} alt={item.player.name} className="w-7 h-7 rounded-full object-cover bg-slate-800 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">{item.player.name}</div>
                  <div className="text-[10px] text-slate-400 truncate">
                    {item.player.nationality} {item.player.age ? `• ${item.player.age} yas` : ''}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}