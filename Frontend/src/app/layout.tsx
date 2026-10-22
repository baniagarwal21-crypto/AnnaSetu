import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AnnaSetu – AI-Powered Food Waste Management & Redistribution',
  description: 'Predictive meal demand, automated surplus matching, IoT freshness monitoring, and ESG waste analytics for college hostels and NGOs.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
