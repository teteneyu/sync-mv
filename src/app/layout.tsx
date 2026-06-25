import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sync MV | AIと思考を同期する",
  description: "歌詞、タイミング、意図、リファレンス、AI相談メモを同期するMV制作台帳",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
