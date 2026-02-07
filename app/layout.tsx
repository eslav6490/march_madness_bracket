import type { Metadata } from 'next';
import { Space_Grotesk } from 'next/font/google';

import './globals.css';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '600']
});

export const metadata: Metadata = {
  title: 'March Madness Squares',
  description: 'Public grid view for a March Madness squares pool.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={spaceGrotesk.className}>{children}</body>
    </html>
  );
}
