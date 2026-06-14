import type { Metadata } from "next";
import { Rajdhani, Inter } from "next/font/google";
import "./globals.css";

const rajdhani = Rajdhani({
  variable: "--font-rajdhani",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "69Game — Rental PS & Game House Premium Semarang",
  description:
    "69Game adalah pusat hiburan dan gaming lounge premium di Semarang. Nikmati PS5 VIP Room, PS4, PS3, Racing Simulator dengan fasilitas AC, No Smoking, dan WiFi. Buka setiap hari!",
  keywords: [
    "69Game",
    "rental PS Semarang",
    "game house Semarang",
    "PS5 VIP",
    "racing simulator",
    "gaming lounge",
  ],
  openGraph: {
    title: "69Game — Level Up Your Gaming Experience",
    description:
      "Rental PS & Game House Terlengkap di Semarang. Fasilitas VIP, Ruangan AC, dan Simulator Balap Terbaik.",
    type: "website",
    locale: "id_ID",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${rajdhani.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <div className="noise-overlay" />
        {children}
      </body>
    </html>
  );
}
