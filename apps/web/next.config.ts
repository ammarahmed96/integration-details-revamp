import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  // typedRoutes disabled — incompatible with UUID-driven dynamic paths
}

export default nextConfig
