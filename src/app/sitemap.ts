import type { MetadataRoute } from 'next';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'edge';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://limonscore.com';
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, lastModified: now, changeFrequency: 'always', priority: 1.0 },
    { url: `${baseUrl}/privacy`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${baseUrl}/terms`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${baseUrl}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
  ];

  try {
    const [{ data: leagues }, { data: teams }, { data: matches }] = await Promise.all([
      supabaseAdmin.from('leagues').select('id').limit(200),
      supabaseAdmin.from('teams').select('id').limit(600),
      supabaseAdmin
        .from('matches')
        .select('id, fixture_date')
        .order('fixture_date', { ascending: false })
        .limit(600),
    ]);

    const leagueRoutes: MetadataRoute.Sitemap = (leagues || []).map((l: any) => ({
      url: `${baseUrl}/lig/${l.id}`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.85,
    }));

    const teamRoutes: MetadataRoute.Sitemap = (teams || []).map((t: any) => ({
      url: `${baseUrl}/takim/${t.id}`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8,
    }));

    const matchRoutes: MetadataRoute.Sitemap = (matches || []).map((m: any) => ({
      url: `${baseUrl}/mac/${m.id}`,
      lastModified: m.fixture_date ? new Date(m.fixture_date) : now,
      changeFrequency: 'hourly',
      priority: 0.7,
    }));

    return [...staticRoutes, ...leagueRoutes, ...teamRoutes, ...matchRoutes];
  } catch {
    return staticRoutes;
  }
}