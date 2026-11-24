import Link from 'next/link';
import { fetchApiFootball } from '@/lib/apiFootball';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { TeamHubClient } from '@/components/TeamHubClient';

export const runtime = 'edge';

export default async function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cleanId = id.replace(/^t-/, '');

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
  const normalizedTeam = {
    name: teamObj?.team?.name || dbTeam?.name,
    logo: teamObj?.team?.logo || dbTeam?.logo_url,
    country: teamObj?.team?.country || dbTeam?.country || '',
    founded: teamObj?.team?.founded || null,
    venue: teamObj?.venue || null,
  };

  return <TeamHubClient team={normalizedTeam} cleanId={resolvedId} />;
}