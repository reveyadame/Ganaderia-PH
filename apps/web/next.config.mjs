/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@ganaderia/shared'],
  experimental: {
    typedRoutes: true,
  },
}

export default nextConfig
