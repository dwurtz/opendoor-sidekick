import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Opendoor Sidekick",
  description:
    "Talk to your AI assistant about Opendoor home listings in your area.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
