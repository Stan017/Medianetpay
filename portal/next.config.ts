import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Permite cargar QR PNGs desde el backend local y producción
    remotePatterns: [
      { protocol: "http", hostname: "localhost", port: "8000", pathname: "/static/**" },
      { protocol: "https", hostname: "medianetpay.ec", pathname: "/static/**" },
      { protocol: "https", hostname: "api.medianetpay.ec", pathname: "/static/**" },
    ],
  },
};

export default nextConfig;
