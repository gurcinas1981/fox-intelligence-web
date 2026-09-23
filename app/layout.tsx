import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FOX Land IQ | Planning & Development Appraisal",
  description:
    "Evidence-led UK land, planning and development appraisal powered by FOX Intelligence."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
