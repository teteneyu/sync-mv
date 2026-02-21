import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MV Storyboard - ストーリーボード制作ツール",
  description: "MV制作のためのストーリーボード制作・タイミング調整アプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased" style={{ fontFamily: "'Zen Maru Gothic', sans-serif" }} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
