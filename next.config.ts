import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  /* config options here */
  // allowedDevOrigins: ['*.tunnelmole.net', '*.ngrok-free.app'],
  allowedDevOrigins: ['8fd6-197-54-171-132.ngrok-free.app'],
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

export default withNextIntl(nextConfig);

