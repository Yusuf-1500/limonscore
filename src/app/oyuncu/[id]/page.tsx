import Link from "next/link";

async function getPlayerData(playerId: string) {
  const apiKey = process.env.API_FOOTBALL_KEY || process.env.NEXT_PUBLIC_API_FOOTBALL_KEY || "";
  const headers = { "x-apisports-key": apiKey };
  const year = new Date().getFullYear();

  const res = await fetch(`https://v3.football.api-sports.io/players?id=${playerId}&season=${year}`, { headers, next: { revalidate: 21600 } });
  const json = await res.json();
  return json.response?.[0] || null;
}

export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getPlayerData(id);

  if (!data) {
    return <div className="min-h-screen bg-slate-950 text-slate-200 flex items-center justify-center">Oyuncu bilgisi bulunamadi.</div>;
  }

  const { player, statistics } = data;
  const stat = statistics?.[0];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <Link href="/" className="text-xs text-lime-400 hover:underline">&larr; Ana Sayfaya Don</Link>
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-6">
        <img src={player.photo} alt={player.name} className="w-24 h-24 rounded-full object-cover border-2 border-lime-400/40" />
        <div className="text-center sm:text-left flex-1">
          <h1 className="text-2xl font-bold text-white">{player.name}</h1>
          <p className="text-slate-400 text-sm mt-1">{player.nationality} &bull; {player.age} yas &bull; {player.height || "-"} / {player.weight || "-"}</p>
          {stat?.team && (
            <Link href={`/takim/${stat.team.id}`} className="inline-flex items-center gap-2 mt-3 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg hover:border-lime-400/50 transition">
              <img src={stat.team.logo} alt={stat.team.name} className="w-5 h-5 object-contain" />
              <span className="text-xs font-medium text-white">{stat.team.name}</span>
            </Link>
          )}
        </div>
      </div>

      {stat && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
            <span className="text-xs text-slate-400 block">Mac</span>
            <span className="text-2xl font-bold text-white">{stat.games?.appearences ?? 0}</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
            <span className="text-xs text-slate-400 block">Gol</span>
            <span className="text-2xl font-bold text-lime-400">{stat.goals?.total ?? 0}</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
            <span className="text-xs text-slate-400 block">Asist</span>
            <span className="text-2xl font-bold text-white">{stat.goals?.assists ?? 0}</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
            <span className="text-xs text-slate-400 block">Reyting</span>
            <span className="text-2xl font-bold text-amber-400">{stat.games?.rating ? Number(stat.games.rating).toFixed(2) : "-"}</span>
          </div>
        </div>
      )}
    </div>
  );
}
