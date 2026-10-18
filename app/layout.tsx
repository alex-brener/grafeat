export const metadata = {
  title: "Challenge Curator — Instagram API Spike",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "monospace", padding: "2rem", maxWidth: 720 }}>{children}</body>
    </html>
  );
}
