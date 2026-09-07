import type { MetadataRoute } from "next";
import { publicSiteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = publicSiteUrl();
  return ["", "/privacy", "/terms"].map((path, index) => ({ url: origin + path, changeFrequency: index ? "yearly" : "monthly", priority: index ? 0.3 : 1 }));
}
