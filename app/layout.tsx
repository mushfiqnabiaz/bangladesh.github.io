import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Portrait of Bangladesh",
  description: "A complete Bangladesh data atlas built from thana, district, division, FMCG, route, bazar, postcode, and GeoJSON datasets."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
