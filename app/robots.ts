import { MetadataRoute } from "next";
import { APP_URL } from "@/lib/config";

export default function robots(): MetadataRoute.Robots {
  const base = APP_URL;
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/admin/", "/vendor/dashboard", "/api/", "/auth/"] },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
