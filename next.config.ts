import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // allowedDevOrigins: ['*.tunnelmole.net', '*.ngrok-free.app'],
  allowedDevOrigins: ['40d2-197-54-171-132.ngrok-free.app'],
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'ngrok-skip-browser-warning',
            value: 'true',
          },
        ],
      },
    ];
  }
};

export default nextConfig;
