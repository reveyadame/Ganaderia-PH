import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@ganaderia/shared'],
  experimental: {
    typedRoutes: true,
  },
}

export default nextConfig
