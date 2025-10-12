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
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: 0 }}>
        {children}
      </body>
    </html>
  );
}

