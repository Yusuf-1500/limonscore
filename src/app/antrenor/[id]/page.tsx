import Link from 'next/link';
import { fetchApiFootball } from '@/lib/apiFootball';

export const runtime = 'edge';

export default async function CoachPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const json = await fetchApiFootball(`/coachs?id=${id}`, 21600);
  const coach = json?.response?.[0] || null;

  if (!coach) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col items-center justify-center gap-3">
        <p>Antrenör bilgisi bulunamadı.</p>
        <Link href="/" className="text-xs text-lime-400 hover:underline">&larr; Ana Sayfaya Dön</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <Link href="/" className="text-xs text-lime-400 hover:underline">&larr; Ana Sayfaya Dön</Link>
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex items-center gap-6">
        <img src={coach.photo} alt={coach.name} className="w-20 h-20 rounded-full object-cover border-2 border-lime-400/40" />
        <div>
          <h1 className="text-2xl font-bold text-white">{coach.name}</h1>
          <p className="text-slate-400 text-sm mt-1">{coach.nationality} &bull; {coach.age} yaş</p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
        <h2 className="text-lg font-bold text-white">Kariyer Geçmişi</h2>
        {coach.career?.map((item: any, idx: number) => (
          <Link key={idx} href={`/takim/${item.team.id}`} className="flex items-center justify-between bg-slate-950 border border-slate-800 hover:border-lime-400/50 rounded-xl p-3 transition">
            <div className="flex items-center gap-3">
              <img src={item.team.logo} alt={item.team.name} className="w-7 h-7 object-contain" />
              <span className="text-sm font-medium text-white">{item.team.name}</span>
            </div>
            <span className="text-xs text-slate-400">{item.start} &mdash; {item.end || 'Devam ediyor'}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}