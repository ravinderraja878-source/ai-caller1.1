import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Telugu AI Attendance Caller | College Attendance & AI Voice Automation',
  description:
    'Full-stack attendance management & automated Telugu AI voice caller for colleges to notify parents of absent students.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="te">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
        />
      </head>
      <body className="font-sans antialiased bg-slate-50 text-slate-900 selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
