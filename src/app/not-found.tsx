import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="text-6xl mb-4">🌊</div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Page not found</h1>
        <p className="text-slate-500 mb-8">This page doesn't exist or has been moved.</p>
        <Link href="/dashboard">
          <button className="btn-primary">Back to Dashboard</button>
        </Link>
      </div>
    </div>
  );
}
