import Link from 'next/link';
import { fetchApiFootball } from '@/lib/apiFootball';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { TeamHubClient } from '@/components/TeamHubClient';

export const runtime = 'edge';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default async function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cleanId = id.replace(/^t-/, '');
  const year = new Date().getFullYear();

  // 1. Takım bilgisi
  let teamJson = await fetchApiFootball(`/teams?id=${cleanId}`, 21600);
  let teamObj = teamJson?.response?.[0] || null;

  let dbTeam: any = null;
  if (!teamObj) {
    const { data } = await supabaseAdmin
      .from('teams')
      .select('id, name, country, logo_url')
      .in('id', [id, `t-${cleanId}`, cleanId])
      .maybeSingle();
    dbTeam = data;

    if (dbTeam?.name) {
      await sleep(300);
      const searchJson = await fetchApiFootball(`/teams?search=${encodeURIComponent(dbTeam.name)}`, 21600);
      teamObj = searchJson?.response?.[0] || null;
    }
  }

  if (!teamObj && !dbTeam) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col items-center justify-center gap-3">
        <p>Takım bilgisi bulunamadı.</p>
        <Link href="/" className="text-xs text-lime-400 hover:underline">&larr; Ana Sayfaya Dön</Link>
      </div>
    );
  }

  const resolvedId = String(teamObj?.team?.id || cleanId);

  // 2. Takımın oynadığı ligler / puan durumu
  await sleep(300);
  let standingsJson = await fetchApiFootball(`/standings?team=${resolvedId}&season=${year}`, 21600);
  if (!standingsJson?.response?.length) {
    await sleep(300);
    standingsJson = await fetchApiFootball(`/standings?team=${resolvedId}&season=${year - 1}`, 21600);
  }
  const standingsData = (standingsJson?.response || []).map((r: any) => r.league).filter(Boolean);

  // 3. Takımın son & gelecek maçları (fikstür)
  await sleep(300);
  let fixturesJson = await fetchApiFootball(`/fixtures?team=${resolvedId}&season=${year}`, 3600);
  if (!fixturesJson?.response?.length) {
    await sleep(300);
    fixturesJson = await fetchApiFootball(`/fixtures?team=${resolvedId}&season=${year - 1}`, 3600);
  }
  const fixtures = fixturesJson?.response || [];

  // 4. Kadro ve Teknik Direktör
  await sleep(300);
  const squadJson = await fetchApiFootball(`/players/squads?team=${resolvedId}`, 21600);
  let players = squadJson?.response?.[0]?.players || [];

  if (!players.length) {
    await sleep(300);
    const pJson = await fetchApiFootball(`/players?team=${resolvedId}&season=${year}`, 21600);
    players = (pJson?.response || []).map((item: any) => ({
      id: item.player.id,
      name: item.player.name,
      age: item.player.age,
      photo: item.player.photo,
      position: item.statistics?.[0]?.games?.position || '',
      number: item.statistics?.[0]?.games?.number || null,
    }));
  }

  await sleep(300);
  const coachJson = await fetchApiFootball(`/coachs?team=${resolvedId}`, 21600);
  const coach = coachJson?.response?.[0] || null;

  // 5. Ana lig sezon istatistikleri
  let teamStats = null;
  if (standingsData[0]?.id) {
    await sleep(300);
    const statsJson = await fetchApiFootball(
      `/teams/statistics?team=${resolvedId}&league=${standingsData[0].id}&season=${standingsData[0].season || year}`,
      21600
    );
    teamStats = statsJson?.response || null;
  }

  const normalizedTeam = {
    name: teamObj?.team?.name || dbTeam?.name,
    logo: teamObj?.team?.logo || dbTeam?.logo_url,
    country: teamObj?.team?.country || dbTeam?.country || '',
    founded: teamObj?.team?.founded || null,
    venue: teamObj?.venue || null,
  };

  return (
    <TeamHubClient
      team={normalizedTeam}
      coach={coach}
      players={players}
      fixtures={fixtures}
      standingsData={standingsData}
      teamStats={teamStats}
      cleanId={resolvedId}
    />
  );
}