import { Navbar } from '@/components/Navbar';

export default function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <Navbar />
      <main>{children}</main>
    </div>
  );
}
