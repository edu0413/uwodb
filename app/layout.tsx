import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "UWO Database - Indies at War",
  description: "Unofficial Uncharted Waters Online Database & Guides Hub",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: "serif",
          color: "#1a1a1a", // dark text for parchment readability
          backgroundImage: "url('/textures/map-parchment.png')",
          backgroundRepeat: "repeat",
          backgroundSize: "cover",
          minHeight: "100vh",
        }}
      >
        {children}
      </body>
    </html>
  );
}