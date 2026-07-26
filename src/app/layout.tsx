import type { Metadata } from "next";
import { Inter, Hanken_Grotesk } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

import PlaygroundShellNav from "@/components/PlaygroundShellNav";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const hanken = Hanken_Grotesk({ subsets: ["latin"], variable: "--font-hanken" });

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Quick Notes & Reminders",
  description: "A simple notes and reminders app for Playground",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body className={`${inter.variable} ${hanken.variable} ${geistMono.variable} font-body bg-surface text-on-surface min-h-screen flex flex-col`}>
        <PlaygroundShellNav>
          {children}
        </PlaygroundShellNav>
      </body>
    </html>
  );
}
