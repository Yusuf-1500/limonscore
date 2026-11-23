'use client';
import { AdBanner } from '@/components/AdBanner';
import { useLanguage, LangSetting } from '@/context/LanguageContext';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import { MatchItem, League, Team } from '@/types/football';
import { MatchDetailPanel } from '@/components/MatchDetailPanel';
import { playGoalChime } from '@/lib/sound';
import {
  Search,
  Star,
  Trophy,
  Flame,
  Calendar,
  CheckCircle2,
  Clock,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  Pin,
  X,
  Home,
  User,
  Volume2,
  VolumeX,
  Bell,
  LogIn,
  LogOut,
  ShieldCheck,
} from 'lucide-react';

// Gerçek Top Ligler ve Kıta Kupaları Öncelik Sırası
const POPULAR_LEAGUE_PRIORITY: Record<string, number> = {
  'l-2': 1,    // UEFA Champions League
  'l-3': 2,    // UEFA Europa League
  'l-848': 3,  // UEFA Conference League
  'l-203': 4,  // Süper Lig (Turkey)
  'l-39': 5,   // Premier League (England)
  'l-140': 6,  // LaLiga (Spain)
  'l-135': 7,  // Serie A (Italy)
  'l-78': 8,   // Bundesliga (Germany)
  'l-61': 9,   // Ligue 1 (France)
  'l-71': 10,  // Serie A (Brazil)
  'l-13': 11,  // CONMEBOL Libertadores
  'l-269': 12, // Uzbekistan Super League
  'l-1': 13,   // FIFA World Cup
};

function getPopularRank(league?: League): number {
  if (!league) return 999;
  if (POPULAR_LEAGUE_PRIORITY[league.id] !== undefined) {
    return POPULAR_LEAGUE_PRIORITY[league.id];
  }
  const c = (league.country || '').toLowerCase();
  const n = (league.name || '').toLowerCase();

  if (n.includes('femenina') || n.includes('women') || n.includes('rfef') || n.includes('segunda')) {
    return 999;
  }

  if (c === 'world' && n.includes('uefa champions league')) return 1;
  if (c === 'world' && n.includes('uefa europa league')) return 2;
  if (c === 'turkey' && (n === 'süper lig' || n === 'super lig')) return 4;
  if (c === 'england' && n === 'premier league') return 5;
  if (c === 'spain' && (n === 'la liga' || n === 'laliga')) return 6;
  if (c === 'italy' && n === 'serie a') return 7;
  if (c === 'germany' && n === 'bundesliga') return 8;
  if (c === 'france' && n === 'ligue 1') return 9;
  if (c === 'brazil' && n === 'serie a') return 10;
  if (c === 'uzbekistan' && n.includes('super league')) return 12;

  return 999;
}

function normalizeText(str: string): string {
  return str
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]/g, '');
}

function getDateOffsetStr(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
}

function formatDateLabel(offsetDays: number, dateStr: string): string {
  if (offsetDays === 0) return 'Bugün';
  if (offsetDays === -1) return 'Dün';
  if (offsetDays === 1) return 'Yarın';
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
}

interface GoalAlertToast {
  id: string;
  matchId: string;
  scorerTeamName: string;
  scorerTeamLogo: string | null;
  homeName: string;
  awayName: string;
  homeScore: number;
  awayScore: number;
  minute: number | null;
}

export default function LimonScoreDashboard() {
  // Ana Navigasyon Sekmesi: Ana Sayfa | Favoriler | Arama | Profil
  const { lang, setting: langSetting, setLangSetting, t } = useLanguage();
  const [navTab, setNavTab] = useState<'home' | 'favorites' | 'search' | 'profile'>('home');

  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');

  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState<boolean>(false);

  const [selectedLeagueId, setSelectedLeagueId] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'LIVE' | 'FT' | 'NS'>('ALL');
  const [dayOffset, setDayOffset] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');

  // Favoriler & Kullanıcı Ayarları
  const [favoriteMatches, setFavoriteMatches] = useState<string[]>([]);
  const [favoriteTeams, setFavoriteTeams] = useState<string[]>([]);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [onlyFavAlerts, setOnlyFavAlerts] = useState<boolean>(false);

  // Canlı Gol Bildirimi & Yeşil Parlama Efekti
  const [goalToasts, setGoalToasts] = useState<GoalAlertToast[]>([]);
  const [flashingMatchIds, setFlashingMatchIds] = useState<Set<string>>(new Set());
  const prevScoresRef = useRef<Map<string, { home: number; away: number }>>(new Map());

  // Supabase Auth State (Profil sekmesi için)
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authEmailInput, setAuthEmailInput] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const selectedDateStr = useMemo(() => getDateOffsetStr(dayOffset), [dayOffset]);

  // Yerel tercihleri ve Supabase oturumunu yükle
  useEffect(() => {
    try {
      const savedMatches = localStorage.getItem('limonscore_favorites') || localStorage.getItem('goalpulse_favorites');
      if (savedMatches) setFavoriteMatches(JSON.parse(savedMatches));
      const savedTeams = localStorage.getItem('limonscore_favorite_teams') || localStorage.getItem('goalpulse_favorite_teams');
      if (savedTeams) setFavoriteTeams(JSON.parse(savedTeams));
      const savedSound = localStorage.getItem('limonscore_sound') ?? localStorage.getItem('goalpulse_sound');
      if (savedSound !== null) setSoundEnabled(savedSound === 'true');
      const savedOnlyFav = localStorage.getItem('limonscore_only_fav_alerts') ?? localStorage.getItem('goalpulse_only_fav_alerts');
      if (savedOnlyFav !== null) setOnlyFavAlerts(savedOnlyFav === 'true');
    } catch {}

    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.email) setUserEmail(data.user.email);
    });
  }, []);

  const toggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('limonscore_sound', String(next));
      } catch {}
      if (next) playGoalChime();
      return next;
    });
  };

  const toggleOnlyFavAlerts = () => {
    setOnlyFavAlerts((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('limonscore_only_fav_alerts', String(next));
      } catch {}
      return next;
    });
  };

  const toggleFavoriteMatch = (e: React.MouseEvent, matchId: string) => {
    e.stopPropagation();
    setFavoriteMatches((prev) => {
      const next = prev.includes(matchId)
        ? prev.filter((id) => id !== matchId)
        : [...prev, matchId];
      try {
        localStorage.setItem('limonscore_favorites', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const toggleFavoriteTeam = (teamId: string) => {
    setFavoriteTeams((prev) => {
      const next = prev.includes(teamId)
        ? prev.filter((id) => id !== teamId)
        : [...prev, teamId];
      try {
        localStorage.setItem('limonscore_favorite_teams', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleSelectMatch = (matchId: string) => {
    setSelectedMatchId(matchId);
    setMobileDetailOpen(true);
  };

  // Gol Bildirimi Tetikleyici
  const triggerGoalNotification = useCallback(
    (m: MatchItem, scorerIsHome: boolean) => {
      const isFav =
        favoriteMatches.includes(m.id) ||
        favoriteTeams.includes(m.home_team_id) ||
        favoriteTeams.includes(m.away_team_id);

      if (onlyFavAlerts && !isFav) return;

      if (soundEnabled) {
        playGoalChime();
      }

      const toastId = `${m.id}-${Date.now()}`;
      const newToast: GoalAlertToast = {
        id: toastId,
        matchId: m.id,
        scorerTeamName: scorerIsHome ? m.home_team?.name : m.away_team?.name,
        scorerTeamLogo: scorerIsHome ? m.home_team?.logo_url : m.away_team?.logo_url,
        homeName: m.home_team?.name,
        awayName: m.away_team?.name,
        homeScore: m.home_score ?? 0,
        awayScore: m.away_score ?? 0,
        minute: m.minute,
      };

      setGoalToasts((prev) => [newToast, ...prev].slice(0, 3));
      setFlashingMatchIds((prev) => new Set(prev).add(m.id));

      setTimeout(() => {
        setGoalToasts((prev) => prev.filter((t) => t.id !== toastId));
      }, 6500);

      setTimeout(() => {
        setFlashingMatchIds((prev) => {
          const copy = new Set(prev);
          copy.delete(m.id);
          return copy;
        });
      }, 5000);
    },
    [favoriteMatches, favoriteTeams, onlyFavAlerts, soundEnabled]
  );

  // Supabase'den maçları çek ve skor artışlarını algıla
  const fetchMatches = useCallback(async () => {
    const { data, error } = await supabase
      .from('matches')
      .select(`
        id,
        league_id,
        date_category,
        kickoff_time,
        status,
        minute,
        home_team_id,
        away_team_id,
        home_score,
        away_score,
        ht_home,
        ht_away,
        fixture_date,
        venue_name,
        referee_name,
        home_team:teams!matches_home_team_id_fkey(id, name, short_name, logo_url),
        away_team:teams!matches_away_team_id_fkey(id, name, short_name, logo_url),
        league:leagues!matches_league_id_fkey(id, name, country, logo_url)
      `)
      .order('kickoff_time', { ascending: true });

    if (!error && data) {
      const typed = data as unknown as MatchItem[];

      if (prevScoresRef.current.size > 0) {
        for (const m of typed) {
          const prev = prevScoresRef.current.get(m.id);
          const curH = m.home_score ?? 0;
          const curA = m.away_score ?? 0;
          if (prev && (m.status === 'LIVE' || m.status === 'HT')) {
            if (curH > prev.home) {
              triggerGoalNotification(m, true);
            } else if (curA > prev.away) {
              triggerGoalNotification(m, false);
            }
          }
        }
      }

      const nextMap = new Map<string, { home: number; away: number }>();
      for (const m of typed) {
        nextMap.set(m.id, { home: m.home_score ?? 0, away: m.away_score ?? 0 });
      }
      prevScoresRef.current = nextMap;

      setMatches(typed);
      setSelectedMatchId((prev) => prev ?? (typed[0]?.id || null));
    }
    setLoading(false);
  }, [triggerGoalNotification]);

  const triggerBackgroundSync = useCallback(
    async (mode: 'live' | 'date', dateStr?: string, force = false) => {
      try {
        setSyncing(true);
        const url =
          mode === 'date' && dateStr
            ? `/api/sync-matches?auto=1&mode=date&date=${dateStr}${force ? '&force=1' : ''}`
            : `/api/sync-matches?auto=1&mode=live${force ? '&force=1' : ''}`;
        await fetch(url);
        setLastSyncTime(
          new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        );
        await fetchMatches();
      } catch {
      } finally {
        setSyncing(false);
      }
    },
    [fetchMatches]
  );

  useEffect(() => {
    fetchMatches();
    triggerBackgroundSync('date', selectedDateStr);

    const interval = setInterval(() => {
      triggerBackgroundSync('live');
    }, 60000);

    const channel = supabase
      .channel('public:matches-limonscore')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'matches' },
        () => {
          fetchMatches();
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [selectedDateStr, fetchMatches, triggerBackgroundSync]);

  // Seçili tarihe ait maçlar
  const dateMatches = useMemo(() => {
    return matches.filter((m) => {
      if (!m.fixture_date && !m.date_category) return dayOffset === 0;
      const mDay = m.fixture_date ? m.fixture_date.split('T')[0] : m.date_category;
      return mDay === selectedDateStr || (dayOffset === 0 && m.date_category === 'today');
    });
  }, [matches, selectedDateStr, dayOffset]);

  // Sol menü için ligler
  const { popularLeagues, otherLeagues } = useMemo(() => {
    const map = new Map<string, { league: League; count: number; liveCount: number; rank: number }>();
    for (const m of dateMatches) {
      if (!m.league) continue;
      const existing = map.get(m.league_id);
      if (existing) {
        existing.count += 1;
        if (m.status === 'LIVE' || m.status === 'HT') existing.liveCount += 1;
      } else {
        map.set(m.league_id, {
          league: m.league,
          count: 1,
          liveCount: m.status === 'LIVE' || m.status === 'HT' ? 1 : 0,
          rank: getPopularRank(m.league),
        });
      }
    }
    const all = Array.from(map.values());
    const pop = all.filter((l) => l.rank < 999).sort((a, b) => a.rank - b.rank);
    const oth = all
      .filter((l) => l.rank === 999)
      .sort((a, b) => b.liveCount - a.liveCount || a.league.country.localeCompare(b.league.country));
    return { popularLeagues: pop, otherLeagues: oth };
  }, [dateMatches]);

  // Ana Sayfa Filtrelenmiş Maçlar
  const filteredHomeMatches = useMemo(() => {
    return dateMatches.filter((m) => {
      if (selectedLeagueId !== 'ALL' && m.league_id !== selectedLeagueId) return false;
      if (statusFilter === 'LIVE' && m.status !== 'LIVE' && m.status !== 'HT') return false;
      if (statusFilter === 'FT' && m.status !== 'FT') return false;
      if (statusFilter === 'NS' && m.status !== 'NS') return false;
      return true;
    });
  }, [dateMatches, selectedLeagueId, statusFilter]);

  // Favoriler Sekmesi Maçları
  const favoriteTabMatches = useMemo(() => {
    return matches.filter(
      (m) =>
        favoriteMatches.includes(m.id) ||
        favoriteTeams.includes(m.home_team_id) ||
        favoriteTeams.includes(m.away_team_id)
    );
  }, [matches, favoriteMatches, favoriteTeams]);

  // Favori Takım Nesneleri
  const favoriteTeamObjects = useMemo(() => {
    const map = new Map<string, Team>();
    for (const m of matches) {
      if (favoriteTeams.includes(m.home_team_id) && m.home_team) {
        map.set(m.home_team_id, m.home_team);
      }
      if (favoriteTeams.includes(m.away_team_id) && m.away_team) {
        map.set(m.away_team_id, m.away_team);
      }
    }
    return Array.from(map.values());
  }, [matches, favoriteTeams]);

  // Arama Sekmesi Sonuçları
  const searchTabMatches = useMemo(() => {
    const normQuery = normalizeText(searchQuery);
    if (!normQuery) return [];
    return matches.filter((m) => {
      const homeNorm = normalizeText(m.home_team?.name || '');
      const awayNorm = normalizeText(m.away_team?.name || '');
      const leagueNorm = normalizeText(m.league?.name || '');
      const countryNorm = normalizeText(m.league?.country || '');
      return (
        homeNorm.includes(normQuery) ||
        awayNorm.includes(normQuery) ||
        leagueNorm.includes(normQuery) ||
        countryNorm.includes(normQuery)
      );
    });
  }, [matches, searchQuery]);

  const activeMatchesList =
    navTab === 'favorites'
      ? favoriteTabMatches
      : navTab === 'search'
      ? searchTabMatches
      : filteredHomeMatches;

  const groupedMatches = useMemo(() => {
    const groups = activeMatchesList.reduce<
      Record<string, { league: League; items: MatchItem[]; rank: number }>
    >((acc, match) => {
      const lId = match.league_id;
      if (!acc[lId]) {
        acc[lId] = {
          league: match.league,
          items: [],
          rank: getPopularRank(match.league),
        };
      }
      acc[lId].items.push(match);
      return acc;
    }, {});

    return Object.values(groups).sort((a, b) => a.rank - b.rank);
  }, [activeMatchesList]);

  const liveTotalCount = useMemo(
    () => dateMatches.filter((m) => m.status === 'LIVE' || m.status === 'HT').length,
    [dateMatches]
  );

  const totalFavoritesCount = favoriteMatches.length + favoriteTeams.length;

  const selectedMatch = useMemo(
    () => matches.find((m) => m.id === selectedMatchId) ?? null,
    [matches, selectedMatchId]
  );

  // Supabase Magic Link Girişi (noreply@limonscore.com üzerinden gönderilir)
  const handleSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmailInput.trim()) return;
    setAuthLoading(true);
    setAuthMessage('');
    const { error } = await supabase.auth.signInWithOtp({
      email: authEmailInput.trim(),
    });
    setAuthLoading(false);
    if (error) {
      setAuthMessage(`Hata: ${error.message}`);
    } else {
      setAuthMessage('Giriş bağlantısı e-posta adresinize gönderildi! Gelen kutunuzu kontrol edin.');
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUserEmail(null);
  };

  const handleTestGoalToast = () => {
    const sample = matches.find((m) => m.status === 'LIVE') || matches[0];
    if (sample) {
      if (soundEnabled) playGoalChime();
      const toastId = `test-${Date.now()}`;
      setGoalToasts((prev) => [
        {
          id: toastId,
          matchId: sample.id,
          scorerTeamName: sample.home_team?.name || 'Ev Sahibi',
          scorerTeamLogo: sample.home_team?.logo_url || null,
          homeName: sample.home_team?.name || 'Ev Sahibi',
          awayName: sample.away_team?.name || 'Deplasman',
          homeScore: (sample.home_score ?? 0) + 1,
          awayScore: sample.away_score ?? 0,
          minute: sample.minute ?? 67,
        },
        ...prev,
      ]);
      setTimeout(() => {
        setGoalToasts((prev) => prev.filter((t) => t.id !== toastId));
      }, 5000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col pb-20 lg:pb-0">
      {/* CANLI GOL BİLDİRİMİ (GOAL ALERT TOAST) */}
      {goalToasts.length > 0 && (
        <div className="fixed top-16 left-3 right-3 sm:left-auto sm:top-auto sm:bottom-5 sm:right-5 z-50 space-y-2 sm:w-80">
          {goalToasts.map((toast) => (
            <div
              key={toast.id}
              onClick={() => handleSelectMatch(toast.matchId)}
              className="bg-slate-900/95 backdrop-blur border-2 border-lime-400 rounded-2xl p-3 shadow-2xl cursor-pointer animate-bounce"
            >
              <div className="flex items-center justify-between text-[11px] font-black text-lime-400 uppercase tracking-wider mb-1">
                <span className="flex items-center gap-1.5">
                  ⚽ GOOOLL! {toast.minute ? `(${toast.minute}')` : ''}
                </span>
                <span className="text-slate-400 font-normal">LimonScore</span>
              </div>
              <div className="flex items-center gap-2.5">
                {toast.scorerTeamLogo && (
                  <img src={toast.scorerTeamLogo} alt="" className="w-7 h-7 object-contain shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-white truncate">{toast.scorerTeamName}</div>
                  <div className="text-[11px] text-slate-300 truncate">
                    {toast.homeName} <span className="font-mono font-bold text-lime-400">{toast.homeScore} - {toast.awayScore}</span> {toast.awayName}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Üst Navigasyon Barı (LimonScore Marka + Masaüstü Sekmeler + Arama + Ses & Sync) */}
      <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur border-b border-slate-800">
        <div className="max-w-[1440px] mx-auto px-3 sm:px-4 h-16 flex items-center justify-between gap-3">
          {/* LimonScore Logo */}
          <button
            onClick={() => setNavTab('home')}
            className="flex items-center gap-2.5 shrink-0 text-left group"
          >
            <div className="w-9 h-9 rounded-xl bg-lime-400/15 border border-lime-400/35 flex items-center justify-center text-lg shadow-inner group-hover:scale-105 transition">
              🍋
            </div>
            <div>
              <span className="font-black text-base sm:text-lg tracking-tight text-white">
                Limon<span className="text-lime-400">Score</span>
              </span>
              <span className="hidden xl:inline-block ml-2 text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-800 text-lime-400/90">
                Live
              </span>
            </div>
          </button>

          {/* Masaüstü Üst Ana Sekmeler */}
          <nav className="hidden lg:flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setNavTab('home')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                navTab === 'home'
                  ? 'bg-lime-400/15 text-lime-400 border border-lime-400/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Home className="w-3.5 h-3.5" /> {t('nav_home')}
            </button>
            <button
              onClick={() => setNavTab('favorites')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                navTab === 'favorites'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Star className="w-3.5 h-3.5" /> {t('nav_favorites')}
              {totalFavoritesCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[10px]">
                  {totalFavoritesCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setNavTab('search')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                navTab === 'search'
                  ? 'bg-lime-400/15 text-lime-400 border border-lime-400/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Search className="w-3.5 h-3.5" /> {t('nav_search')}
            </button>
            <button
              onClick={() => setNavTab('profile')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                navTab === 'profile'
                  ? 'bg-lime-400/15 text-lime-400 border border-lime-400/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <User className="w-3.5 h-3.5" /> {t('nav_profile')}
            </button>
          </nav>

          {/* Hızlı Arama Kutusu */}
          <div className="flex-1 max-w-xs sm:max-w-sm relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onFocus={() => setNavTab('search')}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (navTab !== 'search') setNavTab('search');
              }}
              placeholder={t('search_placeholder')}
              className="w-full bg-slate-950 border border-slate-800 focus:border-lime-400/60 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-100 placeholder:text-slate-500 outline-none transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Gol Sesi & Senkronizasyon Butonları */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={toggleSound}
              title={soundEnabled ? 'Gol Sesi Açık' : 'Gol Sesi Kapalı'}
              className={`p-2 rounded-full border transition ${
                soundEnabled
                  ? 'bg-lime-400/15 border-lime-400/30 text-lime-400'
                  : 'bg-slate-950 border-slate-800 text-slate-500'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={() => triggerBackgroundSync('date', selectedDateStr, true)}
              disabled={syncing}
              title="Şimdi Senkronize Et"
              className="text-xs font-medium p-2 sm:px-3 sm:py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-full flex items-center gap-2 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-lime-400 ${syncing ? 'animate-spin' : ''}`} />
              <span className="hidden xl:inline">
                {syncing ? 'Güncelleniyor...' : lastSyncTime ? lastSyncTime : 'Canlı'}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Ana 3 Sütunlu Yerleşim */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-3 sm:px-4 py-4 sm:py-5 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* SOL SÜTUN: Popüler Ligler Sabitlenmiş + Tüm Ligler */}
        <aside className="hidden lg:flex lg:col-span-3 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden sticky top-20 max-h-[calc(100vh-5.5rem)] flex-col">
          <div className="p-3.5 border-b border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-lime-400" /> {t('leagues_title')}
            </span>
            <span className="text-[11px] font-semibold text-slate-500">
              {popularLeagues.length + otherLeagues.length}
            </span>
          </div>

          <div className="p-2 overflow-y-auto space-y-1">
            <button
              onClick={() => {
                setNavTab('home');
                setSelectedLeagueId('ALL');
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition ${
                navTab === 'home' && selectedLeagueId === 'ALL'
                  ? 'bg-lime-400/15 text-lime-400 border border-lime-400/30'
                  : 'text-slate-300 hover:bg-slate-800/60'
              }`}
            >
              <span>{t('all_leagues')}</span>
              <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                {dateMatches.length}
              </span>
            </button>

            {popularLeagues.length > 0 && (
              <div className="pt-2 pb-1">
                <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-amber-400/90 flex items-center gap-1">
                  <Pin className="w-3 h-3" /> {t('popular_leagues')}
                </div>
                <div className="space-y-1">
                  {popularLeagues.map(({ league, count, liveCount }) => (
                    <button
                      key={league.id}
                      onClick={() => {
                        setNavTab('home');
                        setSelectedLeagueId(league.id);
                      }}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs transition text-left ${
                        navTab === 'home' && selectedLeagueId === league.id
                          ? 'bg-lime-400/15 text-lime-400 border border-lime-400/30 font-semibold'
                          : 'bg-slate-800/30 text-slate-200 hover:bg-slate-800/70'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {league.logo_url ? (
                          <img src={league.logo_url} alt={league.name} className="w-4 h-4 object-contain shrink-0" />
                        ) : (
                          <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        )}
                        <div className="truncate">
                          <div className="truncate font-medium">{league.name}</div>
                          <div className="text-[10px] text-slate-500 truncate">{league.country}</div>
                        </div>
                      </div>
                      <span
                        className={`font-mono text-[10px] px-1.5 py-0.5 rounded shrink-0 ${
                          liveCount > 0
                            ? 'bg-lime-400/20 text-lime-400 font-bold'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {otherLeagues.length > 0 && (
              <div className="pt-2">
                <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Diğer Turnuvalar
                </div>
                <div className="space-y-1">
                  {otherLeagues.map(({ league, count, liveCount }) => (
                    <button
                      key={league.id}
                      onClick={() => {
                        setNavTab('home');
                        setSelectedLeagueId(league.id);
                      }}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs transition text-left ${
                        navTab === 'home' && selectedLeagueId === league.id
                          ? 'bg-lime-400/15 text-lime-400 border border-lime-400/30 font-semibold'
                          : 'text-slate-300 hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {league.logo_url ? (
                          <img src={league.logo_url} alt={league.name} className="w-4 h-4 object-contain shrink-0" />
                        ) : (
                          <Trophy className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        )}
                        <div className="truncate">
                          <div className="truncate">{league.name}</div>
                          <div className="text-[10px] text-slate-500 truncate">{league.country}</div>
                        </div>
                      </div>
                      <span
                        className={`font-mono text-[10px] px-1.5 py-0.5 rounded shrink-0 ${
                          liveCount > 0
                            ? 'bg-lime-400/20 text-lime-400 font-bold'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* ORTA SÜTUN: Aktif Sekme İçeriği */}
        <section className="lg:col-span-5 space-y-3.5">
          {navTab === 'home' && (
            <div className="bg-slate-900 border border-slate-800 p-2 rounded-2xl space-y-2">
              <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
                <button
                  onClick={() => setStatusFilter('ALL')}
                  className={`py-1.5 px-2.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition whitespace-nowrap ${
                    statusFilter === 'ALL'
                      ? 'bg-slate-800 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Tümü ({dateMatches.length})
                </button>
                <button
                  onClick={() => setStatusFilter('LIVE')}
                  className={`py-1.5 px-2.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition whitespace-nowrap ${
                    statusFilter === 'LIVE'
                      ? 'bg-lime-400/20 text-lime-400 border border-lime-400/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5 text-lime-400" /> Canlı ({liveTotalCount})
                </button>
                <button
                  onClick={() => setStatusFilter('FT')}
                  className={`py-1.5 px-2.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition whitespace-nowrap ${
                    statusFilter === 'FT'
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> {t('filter_ft')}
                </button>
                <button
                  onClick={() => setStatusFilter('NS')}
                  className={`py-1.5 px-2.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition whitespace-nowrap ${
                    statusFilter === 'NS'
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" /> Başlayacak
                </button>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/70">
                <div className="flex items-center bg-slate-950 border border-slate-800 rounded-full p-0.5">
                  <button
                    onClick={() => setDayOffset((d) => d - 1)}
                    className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDayOffset(0)}
                    className="px-3 py-1 text-xs font-bold text-lime-400 hover:text-lime-300 flex items-center gap-1.5 transition"
                  >
                    <Calendar className="w-3 h-3" />
                    <span>{formatDateLabel(dayOffset, selectedDateStr)}</span>
                  </button>
                  <button
                    onClick={() => setDayOffset((d) => d + 1)}
                    className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {selectedLeagueId !== 'ALL' && (
                  <button
                    onClick={() => setSelectedLeagueId('ALL')}
                    className="text-[11px] px-2.5 py-1 rounded-full bg-lime-400/15 text-lime-400 border border-lime-400/30 flex items-center gap-1"
                  >
                    <span>Lig Filtresi</span>
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          )}

          {navTab === 'favorites' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" /> {t('my_favorites')}
                </h2>
                <button
                  onClick={toggleSound}
                  className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 flex items-center gap-1.5"
                >
                  {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-lime-400" /> : <VolumeX className="w-3.5 h-3.5" />}
                  <span>{soundEnabled ? 'Gol Sesi Açık' : 'Ses Kapalı'}</span>
                </button>
              </div>

              {favoriteTeamObjects.length > 0 && (
                <div>
                  <div className="text-[11px] text-slate-400 mb-2">Takip Edilen Takımlar</div>
                  <div className="flex flex-wrap gap-2">
                    {favoriteTeamObjects.map((team) => (
                      <div
                        key={team.id}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs"
                      >
                        {team.logo_url && <img src={team.logo_url} alt="" className="w-4 h-4 object-contain" />}
                        <span className="font-semibold text-slate-200">{team.name}</span>
                        <button
                          onClick={() => toggleFavoriteTeam(team.id)}
                          className="text-slate-500 hover:text-rose-400"
                          title="Takibi bırak"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {navTab === 'search' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Takım, lig veya ülke adı yazın (örn: Galatasaray, Real Madrid)..."
                  className="w-full bg-slate-950 border border-slate-700 focus:border-lime-400 rounded-xl pl-10 pr-9 py-2.5 text-xs text-white outline-none"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {!searchQuery && popularLeagues.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-slate-400 mb-2.5">En Popüler Müsabakalar</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {popularLeagues.map(({ league, count }) => (
                      <button
                        key={league.id}
                        onClick={() => {
                          setSelectedLeagueId(league.id);
                          setNavTab('home');
                        }}
                        className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-lime-400/40 flex flex-col items-center text-center gap-1.5 transition"
                      >
                        {league.logo_url ? (
                          <img src={league.logo_url} alt={league.name} className="w-7 h-7 object-contain" />
                        ) : (
                          <Trophy className="w-6 h-6 text-amber-400" />
                        )}
                        <span className="text-[11px] font-semibold text-slate-100 line-clamp-2">
                          {league.name}
                        </span>
                        <span className="text-[10px] text-slate-500">{count} maç</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {navTab === 'profile' ? (
            <div className="space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-lime-400/15 border border-lime-400/30 flex items-center justify-center text-2xl">
                    🍋
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white">
                      {userEmail ? userEmail : t('profile_title')}
                    </h2>
                    <p className="text-xs text-slate-400">
                      {userEmail ? t('profile_account_linked') : t('profile_local_active')}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                    <div className="text-lg font-black font-mono text-amber-400">{favoriteMatches.length}</div>
                    <div className="text-[11px] text-slate-400">{t('stat_fav_matches')}</div>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                    <div className="text-lg font-black font-mono text-lime-400">{favoriteTeams.length}</div>
                    <div className="text-[11px] text-slate-400">{t('stat_fav_teams')}</div>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                    <div className="text-lg font-black font-mono text-sky-400">{liveTotalCount}</div>
                    <div className="text-[11px] text-slate-400">{t('stat_live_matches')}</div>
                  </div>
                </div>
              </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        🌐 {t('lang_settings_title')}
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">{t('lang_settings_desc')}</p>
                    </div>
                    <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-lime-400/15 text-lime-400 border border-lime-400/30">
                      {lang.toUpperCase()}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 pt-1">
                    {(
                      [
                        { id: 'auto', label: t('lang_auto') },
                        { id: 'tr', label: '🇹🇷 TR' },
                        { id: 'en', label: '🇬🇧 EN' },
                        { id: 'ru', label: '🇷🇺 RU' },
                      ] as { id: LangSetting; label: string }[]
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setLangSetting(opt.id)}
                        className={`py-2 rounded-xl text-xs font-bold border transition ${
                          langSetting === opt.id
                            ? 'bg-lime-400 text-slate-950 border-lime-400'
                            : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-lime-400" /> {t('notif_settings_title')}
                </h3>

                <div className="flex items-center justify-between py-2 border-b border-slate-800/70">
                  <div>
                    <div className="text-xs font-semibold text-white">{t('sound_alert')}</div>
                    <div className="text-[11px] text-slate-400">{t('sound_alert_desc')}</div>
                  </div>
                  <button
                    onClick={toggleSound}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      soundEnabled ? 'bg-lime-400 text-slate-950' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {soundEnabled ? 'Açık' : 'Kapalı'}
                  </button>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-slate-800/70">
                  <div>
                    <div className="text-xs font-semibold text-white">{t('only_fav_alert')}</div>
                    <div className="text-[11px] text-slate-400">{t('only_fav_alert_desc')}</div>
                  </div>
                  <button
                    onClick={toggleOnlyFavAlerts}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      onlyFavAlerts ? 'bg-lime-400 text-slate-950' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {onlyFavAlerts ? 'Açık' : 'Tümü'}
                  </button>
                </div>

                <button
                  onClick={handleTestGoalToast}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-lime-400 transition"
                >
                  ⚽ Canlı Gol Bildirimini &amp; Sesini Test Et
                </button>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-lime-400" /> LimonScore Hesap Girişi
                </h3>

                {userEmail ? (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-300">{userEmail}</span>
                    <button
                      onClick={handleSignOut}
                      className="px-3 py-1.5 rounded-xl bg-rose-500/20 text-rose-400 text-xs font-semibold flex items-center gap-1"
                    >
                      <LogOut className="w-3.5 h-3.5" /> Çıkış Yap
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSendMagicLink} className="space-y-2.5">
                    <p className="text-[11px] text-slate-400">
                      E-posta adresinize <span className="text-slate-200 font-medium">noreply@limonscore.com</span> üzerinden tek tıkla giriş bağlantısı gönderilir.
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        required
                        value={authEmailInput}
                        onChange={(e) => setAuthEmailInput(e.target.value)}
                        placeholder="ornek@email.com"
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-lime-400"
                      />
                      <button
                        type="submit"
                        disabled={authLoading}
                        className="px-4 py-2 rounded-xl bg-lime-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shrink-0"
                      >
                        <LogIn className="w-3.5 h-3.5" />
                        {authLoading ? 'Gönderiliyor...' : 'Giriş Linki'}
                      </button>
                    </div>
                    {authMessage && <p className="text-xs text-lime-400">{authMessage}</p>}
                  </form>
                )}
              </div>
            </div>
          ) : (
            <>
              {loading ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl py-16 flex items-center justify-center gap-2 text-xs text-slate-400">
                  <RefreshCw className="w-4 h-4 animate-spin text-lime-400" />
                  Fikstür yükleniyor...
                </div>
              ) : navTab === 'search' && !searchQuery ? null : groupedMatches.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl py-14 px-4 text-center">
                  <p className="text-sm font-medium text-slate-300">
                    {navTab === 'favorites'
                      ? 'Henüz favori maç veya takım eklemediniz.'
                      : 'Seçilen filtreye uygun maç bulunamadı.'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {navTab === 'favorites'
                      ? t('no_favorites_hint')
                      : 'Farklı bir gün veya sekme seçerek tekrar deneyebilirsiniz.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {groupedMatches.map(({ league, items, rank }) => (
                    <div
                      key={league.id}
                      className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg"
                    >
                      <div className="px-4 py-2.5 bg-slate-800/60 border-b border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          {league.logo_url ? (
                            <img
                              src={league.logo_url}
                              alt={league.name}
                              className="w-4 h-4 object-contain shrink-0"
                            />
                          ) : (
                            <Trophy className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          )}
                          <span className="text-xs font-bold text-slate-200 truncate">
                            {league.country}: {league.name}
                          </span>
                          {rank < 999 && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 font-semibold shrink-0">
                              Popüler
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono">{items.length}</span>
                      </div>

                      <div className="divide-y divide-slate-800/70">
                        {items.map((match) => {
                          const isSelected = match.id === selectedMatchId;
                          const isFav = favoriteMatches.includes(match.id);
                          const isHomeTeamFav = favoriteTeams.includes(match.home_team_id);
                          const isAwayTeamFav = favoriteTeams.includes(match.away_team_id);
                          const isLive = match.status === 'LIVE' || match.status === 'HT';
                          const isFlashing = flashingMatchIds.has(match.id);

                          return (
                            <div
                              key={match.id}
                              onClick={() => handleSelectMatch(match.id)}
                              className={`px-3.5 py-3 flex items-center gap-3 cursor-pointer transition-colors duration-300 ${
                                isFlashing
                                  ? 'bg-lime-400/25 animate-pulse'
                                  : isSelected
                                  ? 'bg-lime-400/10 border-l-2 border-l-lime-400'
                                  : 'hover:bg-slate-800/50'
                              }`}
                            >
                              <button
                                onClick={(e) => toggleFavoriteMatch(e, match.id)}
                                className="text-slate-500 hover:text-amber-400 transition shrink-0 p-1"
                                title="Maçı favorilere ekle/çıkar"
                              >
                                <Star
                                  className={`w-4 h-4 ${
                                    isFav ? 'fill-amber-400 text-amber-400' : ''
                                  }`}
                                />
                              </button>

                              <div className="w-11 shrink-0 text-xs font-bold tabular-nums text-center">
                                {match.status === 'LIVE' ? (
                                  <span className="text-lime-400 flex items-center justify-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-pulse" />
                                    {match.minute}&apos;
                                  </span>
                                ) : match.status === 'HT' ? (
                                  <span className="text-amber-400">İY</span>
                                ) : match.status === 'FT' ? (
                                  <span className="text-slate-400">MS</span>
                                ) : (
                                  <span className="text-slate-400">{match.kickoff_time}</span>
                                )}
                              </div>

                              <div className="flex-1 min-w-0 space-y-1.5 border-l border-slate-800 pl-3">
                                <div className="flex items-center gap-2">
                                  {match.home_team?.logo_url && (
                                    <img
                                      src={match.home_team.logo_url}
                                      alt={match.home_team.name}
                                      className="w-4 h-4 object-contain shrink-0"
                                    />
                                  )}
                                  <span className="text-xs font-semibold truncate text-slate-100">
                                    {match.home_team?.name}
                                  </span>
                                  {isHomeTeamFav && (
                                    <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  {match.away_team?.logo_url && (
                                    <img
                                      src={match.away_team.logo_url}
                                      alt={match.away_team.name}
                                      className="w-4 h-4 object-contain shrink-0"
                                    />
                                  )}
                                  <span className="text-xs font-semibold truncate text-slate-100">
                                    {match.away_team?.name}
                                  </span>
                                  {isAwayTeamFav && (
                                    <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
                                  )}
                                </div>
                              </div>

                              <div className="w-7 shrink-0 text-right font-mono font-black text-xs tabular-nums space-y-1.5">
                                <div className={isLive ? 'text-lime-400' : 'text-slate-100'}>
                                  {match.home_score ?? '-'}
                                </div>
                                <div className={isLive ? 'text-lime-400' : 'text-slate-100'}>
                                  {match.away_score ?? '-'}
                                </div>
                              </div>

                              <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </section>

        {/* SAĞ SÜTUN */}
        <section className="hidden lg:block lg:col-span-4">
          <MatchDetailPanel
            match={selectedMatch}
            onClose={() => setSelectedMatchId(null)}
            favoriteTeams={favoriteTeams}
            onToggleFavoriteTeam={toggleFavoriteTeam}
          />
        </section>
      </main>

      {/* MOBİL ALT NAVİGASYON BARI */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-slate-900/95 backdrop-blur border-t border-slate-800 px-2 py-1.5">
        <div className="grid grid-cols-4 gap-1 max-w-md mx-auto">
          <button
            onClick={() => {
              setMobileDetailOpen(false);
              setNavTab('home');
            }}
            className={`py-1.5 rounded-xl flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition ${
              navTab === 'home' ? 'text-lime-400 bg-lime-400/10' : 'text-slate-400'
            }`}
          >
            <Home className="w-4 h-4" />
            <span>{t('nav_home')}</span>
          </button>

          <button
            onClick={() => {
              setMobileDetailOpen(false);
              setNavTab('favorites');
            }}
            className={`py-1.5 rounded-xl flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold relative transition ${
              navTab === 'favorites' ? 'text-amber-400 bg-amber-500/10' : 'text-slate-400'
            }`}
          >
            <div className="relative">
              <Star className="w-4 h-4" />
              {totalFavoritesCount > 0 && (
                <span className="absolute -top-1 -right-2.5 px-1 rounded-full bg-amber-500 text-slate-950 text-[9px] font-black">
                  {totalFavoritesCount}
                </span>
              )}
            </div>
            <span>{t('nav_favorites')}</span>
          </button>

          <button
            onClick={() => {
              setMobileDetailOpen(false);
              setNavTab('search');
            }}
            className={`py-1.5 rounded-xl flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition ${
              navTab === 'search' ? 'text-lime-400 bg-lime-400/10' : 'text-slate-400'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>{t('nav_search')}</span>
          </button>

          <button
            onClick={() => {
              setMobileDetailOpen(false);
              setNavTab('profile');
            }}
            className={`py-1.5 rounded-xl flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition ${
              navTab === 'profile' ? 'text-lime-400 bg-lime-400/10' : 'text-slate-400'
            }`}
          >
            <User className="w-4 h-4" />
            <span>{t('nav_profile')}</span>
          </button>
        </div>
      </nav>

      {/* MOBİL MAÇ DETAY TAM EKRAN MODAL */}
      {mobileDetailOpen && selectedMatch && (
        <div className="fixed inset-0 z-50 lg:hidden bg-slate-950 flex flex-col">
          <MatchDetailPanel
            match={selectedMatch}
            onClose={() => setMobileDetailOpen(false)}
            favoriteTeams={favoriteTeams}
            onToggleFavoriteTeam={toggleFavoriteTeam}
          />
        </div>
      )}
    
      {/* AdSense Uyumlu Bilgilendirme Ozeti & Yasal Alt Bilgi */}
      <footer className="max-w-[1440px] mx-auto px-4 pt-6 pb-10 mt-6 border-t border-slate-800/80 text-xs text-slate-400 space-y-4">
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-4 leading-relaxed text-slate-400">
          <h2 className="text-slate-200 font-bold text-xs uppercase tracking-wider mb-1">
            LimonScore — Canlı Futbol Skorları, Fikstür ve Maç Merkezi
          </h2>
          <p>
            LimonScore üzerinden Türkiye Süper Lig, İngiltere Premier League, İspanya La Liga, İtalya Serie A,
            Almanya Bundesliga ve dünya genelindeki 100&apos;den fazla ligin anlık canlı skorlarını, gol dakikalarını,
            oyuncu değişikliklerini, maç istatistiklerini ve güncel puan durumlarını takip edebilirsiniz.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
          <span>© {new Date().getFullYear()} LimonScore. Tüm hakları saklıdır.</span>
          <nav className="flex items-center gap-5 font-medium text-slate-300">
            <a href="/privacy" className="hover:text-lime-400 transition">Gizlilik Politikası</a>
            <a href="/terms" className="hover:text-lime-400 transition">Kullanım Koşulları</a>
            <a href="/contact" className="hover:text-lime-400 transition">İletişim</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
