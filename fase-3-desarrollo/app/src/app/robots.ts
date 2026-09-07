import type { MetadataRoute } from "next";
import { publicSiteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: ["/", "/privacy", "/terms"], disallow: ["/api/", "/auth/", "/accounts", "/budgets", "/categories", "/dashboard", "/settings", "/transactions"] }, sitemap: `${publicSiteUrl()}/sitemap.xml` };
}
