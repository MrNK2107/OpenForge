import { Navbar } from '@/components/Navbar';

export default function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Navbar />
      <main>{children}</main>
    </div>
  );
}
