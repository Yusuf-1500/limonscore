import Link from "next/link";

async function getTeamData(teamId: string) {
  const apiKey = process.env.API_FOOTBALL_KEY || process.env.NEXT_PUBLIC_API_FOOTBALL_KEY || "";
  const headers = { "x-apisports-key": apiKey };

  const [teamRes, squadRes, coachRes] = await Promise.all([
    fetch(`https://v3.football.api-sports.io/teams?id=${teamId}`, { headers, next: { revalidate: 21600 } }),
    fetch(`https://v3.football.api-sports.io/players/squads?team=${teamId}`, { headers, next: { revalidate: 21600 } }),
    fetch(`https://v3.football.api-sports.io/coachs?team=${teamId}`, { headers, next: { revalidate: 21600 } }),
  ]);

  const teamJson = await teamRes.json();
  const squadJson = await squadRes.json();
  const coachJson = await coachRes.json();

  return {
    team: teamJson.response?.[0] || null,
    players: squadJson.response?.[0]?.players || [],
    coach: coachJson.response?.[0] || null,
  };
}

export default async function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { team, players, coach } = await getTeamData(id);

  if (!team) {
    return <div className="min-h-screen bg-slate-950 text-slate-200 flex items-center justify-center">Takim bilgisi bulunamadi.</div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      <Link href="/" className="text-xs text-lime-400 hover:underline">&larr; Ana Sayfaya Don</Link>
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-6">
        <img src={team.team.logo} alt={team.team.name} className="w-20 h-20 object-contain" />
        <div className="text-center sm:text-left flex-1">
          <h1 className="text-2xl font-bold text-white">{team.team.name}</h1>
          <p className="text-slate-400 text-sm mt-1">{team.team.country} &bull; Kurulus: {team.team.founded || "-"}</p>
          {team.venue?.name && (
            <p className="text-lime-400 text-xs mt-2">Stadyum: {team.venue.name} ({team.venue.capacity?.toLocaleString()} kapasite)</p>
          )}
        </div>
        {coach && (
          <Link href={`/antrenor/${coach.id}`} className="bg-slate-950 border border-slate-800 hover:border-lime-400/50 rounded-xl p-3 flex items-center gap-3 transition">
            <img src={coach.photo} alt={coach.name} className="w-11 h-11 rounded-full object-cover" />
            <div>
              <span className="text-[11px] text-slate-400 block">Teknik Direktor</span>
              <span className="text-sm font-semibold text-white">{coach.name}</span>
            </div>
          </Link>
        )}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h2 className="text-lg font-bold text-white mb-4">Kadro ({players.length} Oyuncu)</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {players.map((player: any) => (
            <Link key={player.id} href={`/oyuncu/${player.id}`} className="flex items-center gap-3 bg-slate-950 border border-slate-800/80 hover:border-lime-400/50 rounded-xl p-3 transition">
              <img src={player.photo} alt={player.name} className="w-11 h-11 rounded-full object-cover bg-slate-800" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{player.name}</p>
                <p className="text-xs text-slate-400">{player.position} &bull; {player.age} yas</p>
              </div>
              {player.number && (
                <span className="text-xs font-bold bg-lime-400/15 text-lime-400 px-2 py-1 rounded-lg">#{player.number}</span>
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
