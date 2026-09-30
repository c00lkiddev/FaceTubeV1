import './globals.css';
import TopBar from '@/components/TopBar';

export const metadata = { title: 'FaceTube' };

export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white min-h-screen antialiased">
        <TopBar />
        {children}
      </body>
    </html>
  );
}
