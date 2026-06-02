/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  allowedDevOrigins: ['192.168.29.73'],
  experimental: {
    instrumentationHook: true,
  },
}

export default nextConfig
