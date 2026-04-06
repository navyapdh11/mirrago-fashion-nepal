import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Mirrago Fashion Nepal 🇳🇵 | AI-Powered E-Commerce",
  description: "Nepal's first AI-powered fashion e-commerce platform. Virtual try-on, smart recommendations, and seamless shopping experience.",
  keywords: ["fashion", "nepal", "e-commerce", "AI", "virtual try-on", "dhaka topi", "daura suruwal"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-sans min-h-screen flex flex-col" style={{ fontFamily: 'Inter, sans-serif' }}>
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
