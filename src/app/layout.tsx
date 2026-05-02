import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});



import { ToastProvider } from "@/components/Toast/Toast";
import MaintenanceProvider from "@/components/Maintenance/MaintenanceProvider";
import AnnouncementBanner from "@/components/Announcement/AnnouncementBanner";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`} data-scroll-behavior="smooth">
      <body>
        <MaintenanceProvider>
          <ToastProvider>
            <AnnouncementBanner />
            {children}
          </ToastProvider>
        </MaintenanceProvider>
      </body>
    </html>
  );
}
