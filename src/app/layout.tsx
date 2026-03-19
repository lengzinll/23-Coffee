import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Next Play Live - Event Registration & AI Verification",
  description:
    "Join the ultimate challenge with Next Play Live. Register for events, get your social participation verified by AI, and secure your spot with fast QR code check-ins.",
  keywords: [
    "Next Play Live",
    "Event Registration",
    "AI Verification",
    "Football Challenge",
    "QR Check-in",
    "Live 4K",
  ],
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
  },
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
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Kantumruy+Pro:ital,wght@0,100..700;1,100..700&display=swap"
          rel="stylesheet"
          crossOrigin="anonymous"
        />
      </head>
      <body className="antialiased">
        <Toaster richColors position="top-center" />
        {children}
      </body>
    </html>
  );
}
