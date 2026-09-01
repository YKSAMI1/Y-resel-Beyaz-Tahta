import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Yöresel Beyaz Tahta - Ücretsiz Ortak Beyaz Tahta',
  description: 'Ücretsiz, sınırlı olmayan, Türkçe ortak beyaz tahta uygulaması. Arkadaşlarınla, ekibinle veya öğrencilerinle gerçek zamanlı çalış.',
  keywords: ['beyaz tahta', 'whiteboard', 'ücretsiz', 'ortak çalışma', 'Türkçe', 'gerçek zamanlı'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body className="bg-white text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
