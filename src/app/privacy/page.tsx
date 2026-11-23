import Link from 'next/link';

export const metadata = {
  title: 'Gizlilik Politikası | LimonScore',
  description: 'LimonScore gizlilik politikası, çerez kullanımı ve Google AdSense reklam bilgilendirmesi.',
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-200 px-4 py-12">
      <div className="max-w-3xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-10 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <h1 className="text-2xl font-extrabold text-white">Gizlilik Politikası (Privacy Policy)</h1>
          <Link href="/" className="text-xs font-bold text-lime-400 hover:underline">
            ← Ana Sayfaya Dön
          </Link>
        </div>
        <p className="text-sm text-slate-400">Son güncelleme: Kasım 2026</p>
        <section className="space-y-2 text-sm leading-relaxed text-slate-300">
          <h2 className="text-base font-bold text-white">1. Toplanan Veriler ve Yerel Depolama</h2>
          <p>
            LimonScore, canlı futbol skorları, fikstürler ve maç istatistikleri sunan bir spor bilgi platformudur.
            Favori takımlarınız, seçtiğiniz arayüz dili (TR/EN/RU) ve sesli gol bildirimi tercihleriniz yalnızca
            tarayıcınızın yerel depolama alanında (localStorage) saklanır.
          </p>
        </section>
        <section className="space-y-2 text-sm leading-relaxed text-slate-300">
          <h2 className="text-base font-bold text-white">2. Çerezler ve Google AdSense Reklamları</h2>
          <p>
            Sitemizde üçüncü taraf tedarikçi olarak Google AdSense reklamları yayınlanabilir. Google ve iş ortakları,
            kullanıcıların sitemize veya diğer web sitelerine yaptığı önceki ziyaretlere dayalı olarak reklam sunmak
            amacıyla çerezleri (cookies) kullanır. Kullanıcılar Google Reklam Ayarları sayfasından kişiselleştirilmiş
            reklamcılığı devre dışı bırakabilir.
          </p>
        </section>
        <section className="space-y-2 text-sm leading-relaxed text-slate-300">
          <h2 className="text-base font-bold text-white">3. İletişim</h2>
          <p>
            Gizlilik politikamızla ilgili sorularınız için{' '}
            <Link href="/contact" className="text-lime-400 underline">İletişim</Link> sayfasından bize ulaşabilirsiniz.
          </p>
        </section>
      </div>
    </main>
  );
}