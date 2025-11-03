/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: 'D:/DOCUMENTOS PAI/SistemaLari/syslari'
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