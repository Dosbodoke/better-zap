import { createMDX } from "fumadocs-mdx/next";
import createNextIntlPlugin from "next-intl/plugin";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

initOpenNextCloudflareForDev();

const withMDX = createMDX();
const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{ hostname: "img.shields.io" }],
  },
  async redirects() {
    return [
      {
        source: "/:lang/docs",
        destination: "/:lang/docs/introduction",
        permanent: false,
      },
    ];
  },
};

export default withMDX(withNextIntl(nextConfig));
