// Homeowner section uses a completely different layout from the pro app.
// No sidebar. Mobile-first. Consumer feel, not business tool.
export default function HomeownerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-md mx-auto min-h-screen bg-white">
      {children}
    </div>
  );
}
