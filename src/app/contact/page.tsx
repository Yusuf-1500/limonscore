'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function ContactPage() {
  const [sent, setSent] = useState(false);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-200 px-4 py-12">
      <div className="max-w-2xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-10 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <h1 className="text-2xl font-extrabold text-white">İletişim (Contact Us)</h1>
          <Link href="/" className="text-xs font-bold text-lime-400 hover:underline">
            ← Ana Sayfaya Dön
          </Link>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">
          Görüş, öneri, veri bildirimi veya reklam iş birlikleri için aşağıdaki formu doldurabilir ya da{' '}
          <span className="text-lime-400 font-semibold">info@limonscore.com</span> adresine ulaşabilirsiniz.
        </p>
        {sent ? (
          <div className="p-4 rounded-xl bg-lime-400/10 border border-lime-400/30 text-lime-300 text-sm font-medium">
            Mesajınız başarıyla alındı. En kısa sürede dönüş yapılacaktır.
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); setSent(true); }} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Adınız / Name</label>
              <input type="text" required placeholder="Adınız Soyadınız" className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-lime-400" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1">E-posta / Email</label>
              <input type="email" required placeholder="ornek@email.com" className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-lime-400" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Mesajınız / Message</label>
              <textarea rows={4} required placeholder="Mesajınızı buraya yazın..." className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-lime-400" />
            </div>
            <button type="submit" className="w-full py-3 rounded-xl bg-lime-400 hover:bg-lime-300 text-slate-950 font-extrabold text-sm transition">
              Mesajı Gönder
            </button>
          </form>
        )}
      </div>
    </main>
  );
}