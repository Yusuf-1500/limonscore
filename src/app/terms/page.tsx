import Link from 'next/link';

export const metadata = {
  title: 'Kullanım Koşulları | LimonScore',
  description: 'LimonScore kullanım koşulları ve canlı maç verileri sorumluluk reddi.',
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-200 px-4 py-12">
      <div className="max-w-3xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-10 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <h1 className="text-2xl font-extrabold text-white">Kullanım Koşulları (Terms of Service)</h1>
          <Link href="/" className="text-xs font-bold text-lime-400 hover:underline">
            ← Ana Sayfaya Dön
          </Link>
        </div>

        <section className="space-y-2 text-sm leading-relaxed text-slate-300">
          <h2 className="text-base font-bold text-white">1. Hizmet Kapsamı</h2>
          <p>
            LimonScore, dünya genelindeki futbol ligleri ve turnuvalarına ait canlı skorlar, maç olayları, kadrolar
            ve puan durumlarını bilgilendirme amacıyla sunar. Sitedeki veriler yalnızca genel bilgi ve spor takibi
            içindir.
          </p>
        </section>

        <section className="space-y-2 text-sm leading-relaxed text-slate-300">
          <h2 className="text-base font-bold text-white">2. Veri Doğruluğu ve Sorumluluk Reddi</h2>
          <p>
            Canlı maç verileri uluslararası spor veri sağlayıcıları üzerinden anlık olarak senkronize edilir. Ağ
            gecikmeleri veya yayıncı kaynaklı anlık farklılıklardan doğabilecek gecikmelerden LimonScore sorumlu
            tutulamaz. Sitemiz bahis veya kumar hizmeti sunmaz.
          </p>
        </section>

        <section className="space-y-2 text-sm leading-relaxed text-slate-300">
          <h2 className="text-base font-bold text-white">3. Fikri Mülkiyet</h2>
          <p>
            Sitede yer alan takım ve lig logoları ilgili spor kulüpleri ve federasyonlarının mülkiyetindedir;
            yalnızca tanımlama ve bilgilendirme amacıyla gösterilmektedir.
          </p>
        </section>
      </div>
    </main>
  );
}