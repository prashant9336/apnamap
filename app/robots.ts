import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://apnamap.com";
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/admin/", "/vendor/dashboard", "/api/", "/auth/"] },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
