'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function CatchAll() {
  const path = usePathname();
  useEffect(() => {
    // Route to the right page based on the URL
    const parts = path.split('/').filter(Boolean);
    if (parts[0] === 'profile' && parts[1]) {
      window.location.href = `/profile/placeholder/?id=${parts[1]}`;
    }
  }, [path]);

  return (
    <div className="min-h-screen pt-24 text-center text-gray-500">
      Loading…
    </div>
  );
}

export function generateStaticParams() {
  return [{ slug: ['placeholder'] }];
}
