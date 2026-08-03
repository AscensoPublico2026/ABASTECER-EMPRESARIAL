/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      // Imagenes del catalogo web subidas a Supabase Storage (bucket "sitio")
      { protocol: 'https', hostname: '**.supabase.co', pathname: '/storage/v1/object/public/**' },
    ],
  },
};

export default nextConfig;
