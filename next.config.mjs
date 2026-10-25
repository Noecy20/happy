/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { remotePatterns: [{ protocol: 'https', hostname: '**.supabase.co' }] },
  // Autorise l'ouverture du site en dev depuis l'IP du PC (ex. 192.168.1.69:3000, téléphone sur le même Wi-Fi)
  allowedDevOrigins: ['192.168.*.*'],
};
export default nextConfig;
