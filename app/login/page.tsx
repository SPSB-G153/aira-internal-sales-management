import Link from "next/link";
import { AuthForm } from "@/components/auth-form";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const params = await searchParams;
  return (
    <div className="page auth-page">
      <section className="card form-card auth-card">
        <p className="eyebrow">Private workspace</p>
        <h1>Sign in without a password.</h1>
        <p className="subtle">We’ll email you a one-time link. The public Aira demo remains available without signing in.</p>
        {params.error && <p className="alert">{params.error}</p>}
        <AuthForm next={params.next} />
        <Link href="/dashboard" className="text-link">← Continue in the public demo</Link>
      </section>
    </div>
  );
}
