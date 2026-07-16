import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import { getWeddingContent } from "@/services/wedding-service";
import { formatLongDate } from "@/lib/datetime";
import { MicrosoftClarity } from "@/components/analytics/MicrosoftClarity";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const { wedding } = await getWeddingContent();
  const title = `${wedding.brideName} & ${wedding.groomName}`;
  const description = `${wedding.welcomeMessage} ${formatLongDate(wedding.weddingDate)} · ${wedding.ceremonyVenue}.`;

  return {
    title: {
      default: title,
      template: `%s · ${title}`,
    },
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: [{ url: wedding.heroImage }],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${cormorant.variable} ${inter.variable} antialiased`}
    >
      <body>
        {children}
        <MicrosoftClarity />
      </body>
    </html>
  );
}
