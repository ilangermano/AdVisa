import { IBM_Plex_Mono, Instrument_Sans, Source_Serif_4 } from "next/font/google";
import "@scaffold-ui/components/styles.css";
import { Providers } from "~~/app/providers";
import { ThemeProvider } from "~~/components/ThemeProvider";
import "~~/styles/globals.css";
import { getMetadata } from "~~/utils/scaffold-eth/getMetadata";

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument",
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-source-serif",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
});

export const metadata = getMetadata({
  title: "Advisa",
  description: "Verified visa advice, protected by milestone escrow.",
  imageRelativePath: "/og.png",
});

const ScaffoldEthApp = ({ children }: { children: React.ReactNode }) => {
  return (
    <html
      suppressHydrationWarning
      className={`${instrumentSans.variable} ${sourceSerif.variable} ${ibmPlexMono.variable}`}
    >
      <body>
        <ThemeProvider attribute="data-theme" defaultTheme="light" forcedTheme="light">
          <Providers>{children}</Providers>
        </ThemeProvider>
      </body>
    </html>
  );
};

export default ScaffoldEthApp;
