/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: {
    // Use project root for Turbopack to avoid invalid absolute paths
    root: '.'
  },
  images: {
    // Permite exibir logos hospedadas no Supabase Storage via next/image
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/public/**'
      }
    ]
  }
};

export default nextConfig;