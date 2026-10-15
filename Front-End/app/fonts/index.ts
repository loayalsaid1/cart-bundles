import localFont from "next/font/local";

export const pingARLT = localFont({
  src: [
    {
      path: "./PingARLT-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "./PingARLT-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "./PingARLT-Bold.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "./PingARLT-Bold.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "./PingARLT-Bold.woff2",
      weight: "800",
      style: "normal",
    },
  ],
  variable: "--font-pingarlt",
  display: "swap",
});

