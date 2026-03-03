/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["@react-pdf/renderer", "pdf-parse"],
  },
};

export default nextConfig;
