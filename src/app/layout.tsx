import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "23 Coffee",
  description:
    "23 Coffee",
  keywords: [
    "23 Coffee",
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
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
      </head>
      <body className="antialiased">
        <Toaster richColors position="top-center" />
        {children}
      </body>
    </html>
  );
}
