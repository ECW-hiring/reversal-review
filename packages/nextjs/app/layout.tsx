import "~~/styles/globals.css";

export const metadata = {
  title: "Reversal Review",
  description: "Permissioned entitlement ledger review console",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light">
      <body className="antialiased">{children}</body>
    </html>
  );
}
