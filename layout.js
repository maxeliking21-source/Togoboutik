import './globals.css';

export const metadata = {
  title: 'TogoBoutik : crée ta boutique en ligne au Togo',
  description: 'Crée ta boutique en ligne en 2 minutes. Vends au Togo avec WhatsApp et Mobile Money.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#25D366',
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>
        <div className="mx-auto min-h-screen max-w-xl">{children}</div>
      </body>
    </html>
  );
}
