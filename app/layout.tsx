import "./globals.css";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar"; // ✅ add this line
import Footer from "@/components/Footer";

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
          color: "#1a1a1a",
          backgroundImage: "url('/textures/map-parchment.png')",
          backgroundRepeat: "repeat",
          backgroundSize: "cover",
          minHeight: "100vh",
        }}
      >
        {/* ✅ Navbar now appears on every page */}
        <Navbar />
        {children}
        <Footer /> 
      </body>
    </html>
  );
}
