import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "PrintHype — Gestión JR3D",
    description: "Plataforma administrativa para profesionales del 3D",
    manifest: '/manifest.json',
    appleWebApp: {
        capable: true,
        statusBarStyle: 'black-translucent',
        title: 'PrintHype',
    },
    icons: {
        apple: '/apple-touch-icon.png',
    }
};

export const viewport: Viewport = {
    themeColor: '#FF6600',
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
};

import SplashScreen from "@/components/ui/SplashScreen";
import PwaRegister from "@/components/PwaRegister";

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="es">
            <head>
                <meta name="theme-color" content="#FF6600" />
                <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
            </head>
            <body className={`${inter.className} bg-brand-dark text-white min-h-screen`}>
                <SplashScreen />
                {children}
                <PwaRegister />
            </body>
        </html>
    );
}
