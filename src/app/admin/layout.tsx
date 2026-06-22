import type { Metadata } from 'next';
import './admin.css';

export const metadata: Metadata = {
  title: 'HighWise Admin',
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    // Override RTL + Hebrew set by root layout
    <div id="admin-shell" dir="ltr" lang="en" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      {children}
    </div>
  );
}
