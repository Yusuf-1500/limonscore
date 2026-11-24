import Link from 'next/link';
import { fetchApiFootball } from '@/lib/apiFootball';

export const runtime = 'edge';

function getCandidateSeasons(): number[] {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const currentSeason = month >= 7 ? year : year - 1;
  return [currentSeason, currentSeason - 1, 2024];
}

export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const seasons = Array.from(new Set(getCandidateSeasons()));

  // 1. Önce güncel sezondan başlayarak istatistik + oyuncu bilgisini dene (Pro planda ilk denemede gelir)
  let statData: any = null;
  for (const s of seasons) {
    const statJson = await fetchApiFootball(`/players?id=${id}&season=${s}`, 21600);
    if (statJson?.response?.length) {
      statData = statJson.response[0];
      break;
    }
  }

  // 2. Plan kısıtı nedeniyle sezon istatistiği boş dönerse sezon bağımsız temel profili çek
  let profilePlayer: any = null;
  if (!statData) {
    const profileJson = await fetchApiFootball(`/players/profiles?player=${id}`, 21600);
    profilePlayer = profileJson?.response?.[0]?.player || null;
  }

  const player = statData?.player || profilePlayer;
  const stat = statData?.statistics?.[0] || null;

  if (!player) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col items-center justify-center gap-3">
        <p>Oyuncu bilgisi bulunamadı.</p>
        <Link href="/" className="text-xs text-lime-400 hover:underline">&larr; Ana Sayfaya Dön</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <Link href="/" className="text-xs text-lime-400 hover:underline">&larr; Ana Sayfaya Dön</Link>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-6">
        <img
          src={player.photo}
          alt={player.name}
          className="w-24 h-24 rounded-full object-cover border-2 border-lime-400/40 bg-slate-800"
        />
        <div className="text-center sm:text-left flex-1 space-y-1.5">
          <h1 className="text-2xl font-black text-white">{player.name}</h1>
          <p className="text-slate-400 text-sm">
            {player.nationality || '-'} {player.age ? `• ${player.age} yaş` : ''}{' '}
            {player.position ? `• ${player.position}` : ''}
          </p>
          {(player.height || player.weight) && (
            <p className="text-xs text-slate-500">
              Boy: {player.height || '-'} &bull; Kilo: {player.weight || '-'}
            </p>
          )}
          {stat?.team && (
            <div className="pt-2">
              <Link
                href={`/takim/t-${stat.team.id}`}
                className="inline-flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl hover:border-lime-400/50 transition"
              >
                <img src={stat.team.logo} alt={stat.team.name} className="w-5 h-5 object-contain" />
                <span className="text-xs font-semibold text-white">{stat.team.name}</span>
              </Link>
            </div>
          )}
        </div>
      </div>

      {stat && (
        <div className="space-y-2">
          <div className="text-xs text-slate-400 px-1">
            Sezon İstatistikleri ({stat.league?.name} {stat.league?.season})
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
              <span className="text-xs text-slate-400 block">Maç</span>
              <span className="text-2xl font-black text-white">{stat.games?.appearences ?? 0}</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
              <span className="text-xs text-slate-400 block">Gol</span>
              <span className="text-2xl font-black text-lime-400">{stat.goals?.total ?? 0}</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
              <span className="text-xs text-slate-400 block">Asist</span>
              <span className="text-2xl font-black text-white">{stat.goals?.assists ?? 0}</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
              <span className="text-xs text-slate-400 block">Reyting</span>
              <span className="text-2xl font-black text-amber-400">
                {stat.games?.rating ? Number(stat.games.rating).toFixed(2) : '-'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}