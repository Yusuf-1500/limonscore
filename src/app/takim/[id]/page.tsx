import Link from 'next/link';
import { fetchApiFootball } from '@/lib/apiFootball';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'edge';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default async function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cleanId = id.replace(/^t-/, '');
  const year = new Date().getFullYear();

  // 1. Önce API-Football'dan takım bilgisini çek
  let teamJson = await fetchApiFootball(`/teams?id=${cleanId}`, 21600);
  let team = teamJson?.response?.[0] || null;

  // 2. Eğer ID ile dönmezse Supabase'deki takım adıyla yedek arama yap
  let dbTeam: any = null;
  if (!team) {
    const { data } = await supabaseAdmin
      .from('teams')
      .select('id, name, country, logo_url')
      .in('id', [id, `t-${cleanId}`, cleanId])
      .maybeSingle();
    dbTeam = data;

    if (dbTeam?.name) {
      await sleep(300);
      const searchJson = await fetchApiFootball(`/teams?search=${encodeURIComponent(dbTeam.name)}`, 21600);
      team = searchJson?.response?.[0] || null;
    }
  }

  const resolvedTeamId = team?.team?.id || cleanId;

  // 3. Rate-limit'e takılmamak için kısa aralıkla kadro ve teknik direktörü çek
  await sleep(350);
  const squadJson = await fetchApiFootball(`/players/squads?team=${resolvedTeamId}`, 21600);
  let players = squadJson?.response?.[0]?.players || [];

  // Kadro boş dönerse sezonluk oyuncu istatistiklerinden kadroyu doldur
  if (!players.length) {
    await sleep(350);
    let pJson = await fetchApiFootball(`/players?team=${resolvedTeamId}&season=${year}`, 21600);
    if (!pJson?.response?.length) {
      await sleep(350);
      pJson = await fetchApiFootball(`/players?team=${resolvedTeamId}&season=${year - 1}`, 21600);
    }
    players = (pJson?.response || []).map((item: any) => ({
      id: item.player.id,
      name: item.player.name,
      age: item.player.age,
      photo: item.player.photo,
      position: item.statistics?.[0]?.games?.position || '',
      number: item.statistics?.[0]?.games?.number || null,
    }));
  }

  await sleep(350);
  const coachJson = await fetchApiFootball(`/coachs?team=${resolvedTeamId}`, 21600);
  const coach = coachJson?.response?.[0] || null;

  if (!team && !dbTeam) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col items-center justify-center gap-3">
        <p>Takım bilgisi bulunamadı.</p>
        <Link href="/" className="text-xs text-lime-400 hover:underline">&larr; Ana Sayfaya Dön</Link>
      </div>
    );
  }

  const displayName = team?.team?.name || dbTeam?.name;
  const displayLogo = team?.team?.logo || dbTeam?.logo_url;
  const displayCountry = team?.team?.country || dbTeam?.country || '';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      <Link href="/" className="text-xs text-lime-400 hover:underline">&larr; Ana Sayfaya Dön</Link>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-6">
        {displayLogo && <img src={displayLogo} alt={displayName} className="w-20 h-20 object-contain" />}
        <div className="text-center sm:text-left flex-1">
          <h1 className="text-2xl font-bold text-white">{displayName}</h1>
          <p className="text-slate-400 text-sm mt-1">
            {displayCountry} {team?.team?.founded ? `• Kuruluş: ${team.team.founded}` : ''}
          </p>
          {team?.venue?.name && (
            <p className="text-lime-400 text-xs mt-2">
              Stadyum: {team.venue.name} {team.venue.capacity ? `(${team.venue.capacity.toLocaleString()} kapasite)` : ''}
            </p>
          )}
        </div>
        {coach && (
          <Link href={`/antrenor/${coach.id}`} className="bg-slate-950 border border-slate-800 hover:border-lime-400/50 rounded-xl p-3 flex items-center gap-3 transition">
            <img src={coach.photo} alt={coach.name} className="w-11 h-11 rounded-full object-cover" />
            <div>
              <span className="text-[11px] text-slate-400 block">Teknik Direktör</span>
              <span className="text-sm font-semibold text-white">{coach.name}</span>
            </div>
          </Link>
        )}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h2 className="text-lg font-bold text-white mb-4">Kadro ({players.length} Oyuncu)</h2>
        {players.length === 0 ? (
          <p className="text-xs text-slate-400">Bu kulüp için güncel kadro verisi henüz API tarafından sağlanmadı.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {players.map((player: any) => (
              <Link key={player.id} href={`/oyuncu/${player.id}`} className="flex items-center gap-3 bg-slate-950 border border-slate-800/80 hover:border-lime-400/50 rounded-xl p-3 transition">
                <img src={player.photo} alt={player.name} className="w-11 h-11 rounded-full object-cover bg-slate-800" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{player.name}</p>
                  <p className="text-xs text-slate-400">
                    {player.position} {player.age ? `• ${player.age} yaş` : ''}
                  </p>
                </div>
                {player.number && (
                  <span className="text-xs font-bold bg-lime-400/15 text-lime-400 px-2 py-1 rounded-lg">#{player.number}</span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}