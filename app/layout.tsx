import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vibe - Your AI cultural concierge",
  description:
    "Vibe is an AI companion that recommends what to watch, read, or listen to based on your mood, energy, and emotional context.",
  authors: [{ name: "Vibe" }],
  openGraph: {
    title: "Vibe - Your AI cultural concierge",
    description: "Tell Vibe how you feel. Get three thoughtful recommendations tuned to your taste.",
    type: "website",
    images: [
      "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/3aee0152-dd82-404c-8270-66fb0d337a4e/id-preview-3f7b8d4c--434d1999-633c-4386-904c-d70e47a79199.lovable.app-1778412776711.png",
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Vibe - Your AI cultural concierge",
    description: "Tell Vibe how you feel. Get three thoughtful recommendations tuned to your taste.",
    images: [
      "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/3aee0152-dd82-404c-8270-66fb0d337a4e/id-preview-3f7b8d4c--434d1999-633c-4386-904c-d70e47a79199.lovable.app-1778412776711.png",
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
