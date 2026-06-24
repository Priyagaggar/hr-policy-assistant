import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HR Policy Assistant",
  description: "Natural language query interface for company policies",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-50">{children}</body>
    </html>
  );
}
