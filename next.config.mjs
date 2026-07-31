/** @type {import('next').NextConfig} */
// cache-bust: 2026-07-31
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
