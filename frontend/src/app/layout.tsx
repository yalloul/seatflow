import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'SeatFlow — Billetterie vivante', description: 'Réservation de places et billetterie locale' };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="fr"><body>{children}</body></html>; }
