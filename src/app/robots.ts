import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/"],
        disallow: ["/cases/", "/reports", "/settings", "/api/"],
      },
    ],
    sitemap: "https://dentarith.me/sitemap.xml",
  };
}
