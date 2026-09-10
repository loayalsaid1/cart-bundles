import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin({
  experimental: {
    createMessagesDeclaration: "./messages/en.json",
  },
});

const nextConfig: NextConfig = {
  allowedDevOrigins: ['sacred-resolved-gazelle.ngrok-free.app', '*.tunnelmole.net', "frontend-dev.cartbundles.com", '.monkeycode-ai.live'],
  experimental: {
    allowedHosts: ['.monkeycode-ai.live'],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'ngrok-skip-browser-warning',
            value: 'true',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: 'https://demostore.salla.sa',
          },
          {
            key: 'Access-Control-Allow-Credentials',
            value: 'true',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, Accept, X-Requested-With',
          },
        ],
      },
    ];
  },
 async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/api/:path*',
          destination: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/:path*`,
        },
      ],
    };
  },

};

export default withNextIntl(nextConfig);

