import Link from "next/link";

async function getLeagueData(leagueId: string) {
  const apiKey = process.env.API_FOOTBALL_KEY || process.env.NEXT_PUBLIC_API_FOOTBALL_KEY || "";
  const headers = { "x-apisports-key": apiKey };
  const year = new Date().getFullYear();

  let res = await fetch(`https://v3.football.api-sports.io/standings?league=${leagueId}&season=${year}`, {
    headers,
    next: { revalidate: 21600 },
  });
  let json = await res.json();

  if (!json.response?.length) {
    res = await fetch(`https://v3.football.api-sports.io/standings?league=${leagueId}&season=${year - 1}`, {
      headers,
      next: { revalidate: 21600 },
    });
    json = await res.json();
  }

  return json.response?.[0]?.league || null;
}

export default async function LeaguePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const league = await getLeagueData(id);

  if (!league) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col items-center justify-center gap-3">
        <p>Lig puan durumu bulunamadi.</p>
        <Link href="/" className="text-xs text-lime-400 hover:underline">&larr; Ana Sayfaya Don</Link>
      </div>
    );
  }

  const standings = league.standings?.[0] || [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      <Link href="/" className="text-xs text-lime-400 hover:underline">&larr; Ana Sayfaya Don</Link>
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex items-center gap-5">
        {league.logo && <img src={league.logo} alt={league.name} className="w-16 h-16 object-contain" />}
        <div>
          <h1 className="text-2xl font-bold text-white">{league.name}</h1>
          <p className="text-slate-400 text-sm mt-1">{league.country} &bull; Sezon {league.season}</p>
        </div>
      </div>

      {standings.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-3 w-10">#</th>
                  <th className="py-3 px-3">Takim</th>
                  <th className="py-3 px-2 text-center">O</th>
                  <th className="py-3 px-2 text-center">G</th>
                  <th className="py-3 px-2 text-center">B</th>
                  <th className="py-3 px-2 text-center">M</th>
                  <th className="py-3 px-2 text-center">AV</th>
                  <th className="py-3 px-3 text-center font-bold text-white">P</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {standings.map((row: any) => (
                  <tr key={row.team.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-400">{row.rank}</td>
                    <td className="py-2.5 px-3">
                      <Link href={`/takim/${row.team.id}`} className="flex items-center gap-2.5 hover:text-lime-400 transition">
                        <img src={row.team.logo} alt={row.team.name} className="w-5 h-5 object-contain" />
                        <span className="font-semibold text-white">{row.team.name}</span>
                      </Link>
                    </td>
                    <td className="py-2.5 px-2 text-center text-slate-300">{row.all.played}</td>
                    <td className="py-2.5 px-2 text-center text-slate-300">{row.all.win}</td>
                    <td className="py-2.5 px-2 text-center text-slate-300">{row.all.draw}</td>
                    <td className="py-2.5 px-2 text-center text-slate-300">{row.all.lose}</td>
                    <td className="py-2.5 px-2 text-center text-slate-300">{row.goalsDiff}</td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-lime-400">{row.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}