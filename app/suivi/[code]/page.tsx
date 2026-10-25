'use client';
import { useParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import OrderTracking from '@/components/OrderTracking';
import { useToast } from '@/components/Toast';

export default function Tracking() {
  const { code } = useParams<{ code: string }>();
  const toast = useToast();
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-3xl px-5 py-12"><OrderTracking code={code} onToast={(m, ok) => toast.show(m, ok ? 'ok' : 'err')} /></main>
      {toast.node}
    </>
  );
}
