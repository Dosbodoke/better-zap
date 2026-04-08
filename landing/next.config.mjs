import { createMDX } from "fumadocs-mdx/next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

initOpenNextCloudflareForDev();

const withMDX = createMDX();

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

export default withMDX(nextConfig);
