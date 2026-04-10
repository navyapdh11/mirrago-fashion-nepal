import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import Footer from "@/components/Footer";
import { CartProvider } from "@/context/CartContext";
import { AuthProvider } from "@/context/AuthContext";
import AIAssistantWrapper from "@/components/AIAssistantWrapper";

export const metadata: Metadata = {
  title: "Mirrago Fashion Nepal 🇳🇵 | AI-Powered E-Commerce",
  description: "Nepal's first AI-powered fashion e-commerce platform with KAIROS-MIRRAGO AI reasoning. Virtual try-on, smart recommendations, and seamless shopping experience.",
  keywords: ["fashion", "nepal", "e-commerce", "AI", "virtual try-on", "dhaka topi", "daura suruwal", "KAIROS", "MCTS", "agentic search"],
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
      <body className="font-sans min-h-screen bg-gray-50" style={{ fontFamily: 'Inter, sans-serif' }}>
        <CartProvider>
          <AuthProvider>
            <div className="flex min-h-screen">
              <Sidebar />
              <div className="flex-1 flex flex-col">
                <main className="flex-1">{children}</main>
                <Footer />
              </div>
            </div>
            <AIAssistantWrapper />
          </AuthProvider>
        </CartProvider>
      </body>
    </html>
  );
}
