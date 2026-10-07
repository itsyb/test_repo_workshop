import type { NextConfig } from "next";

// Two builds from one codebase:
//  - default: the full server app (Prisma, sign-in, server actions);
//  - DEMO_STATIC=1: a static export for GitHub Pages. Only `*.demo.tsx` route
//    files are picked up, and all data lives in the browser (src/demo).
const demo = process.env.DEMO_STATIC === "1";

const nextConfig: NextConfig = demo
  ? {
      output: "export",
      pageExtensions: ["demo.tsx", "demo.ts"],
      basePath: process.env.DEMO_BASE_PATH || "",
      trailingSlash: true,
      images: { unoptimized: true },
    }
  : {
      serverExternalPackages: ["@prisma/client", "nodemailer"],
    };

export default nextConfig;
