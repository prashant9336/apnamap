import { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base    = process.env.NEXT_PUBLIC_APP_URL ?? "https://apnamap.com";
  const supabase = createAdminClient();

  const { data: shops } = await supabase
    .from("shops").select("slug, updated_at")
    .eq("is_approved", true).limit(500);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base,           lastModified: new Date(), changeFrequency: "daily",  priority: 1   },
    { url: `${base}/explore`, lastModified: new Date(), changeFrequency: "always", priority: 0.9 },
    { url: `${base}/offers`,  lastModified: new Date(), changeFrequency: "hourly", priority: 0.9 },
    { url: `${base}/search`,  lastModified: new Date(), changeFrequency: "daily",  priority: 0.7 },
  ];

  const shopRoutes: MetadataRoute.Sitemap = (shops ?? []).map((s) => ({
    url: `${base}/shop/${s.slug}`,
    lastModified: new Date(s.updated_at),
    changeFrequency: "daily" as const,
    priority: 0.8,
  }));

  return [...staticRoutes, ...shopRoutes];
}
