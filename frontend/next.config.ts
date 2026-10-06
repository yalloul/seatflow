import type { NextConfig } from 'next';
const target = process.env.API_PROXY_TARGET || 'http://localhost:8080';
const nextConfig: NextConfig = {
  async rewrites() { return [
    { source: '/api/:path*', destination: `${target}/api/:path*` },
    { source: '/v3/:path*', destination: `${target}/v3/:path*` }
  ]; }
};
export default nextConfig;
