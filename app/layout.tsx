export const metadata = {
  title: 'X Candidates',
  description: 'Análisis de perfiles y tweets',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen antialiased">
        <div className="mx-auto max-w-6xl px-4 py-6">
          {children}
        </div>
      </body>
    </html>
  );
}
import './globals.css';
