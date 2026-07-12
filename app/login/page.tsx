import type { Metadata } from "next";
import { getWeddingContent } from "@/services/wedding-service";
import { LoginForm } from "@/features/auth/login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage(props: PageProps<"/login">) {
  const [{ wedding }, searchParams] = await Promise.all([
    getWeddingContent(),
    props.searchParams,
  ]);

  return (
    <main className="flex min-h-svh items-center justify-center bg-parchment px-6">
      <div className="fade-slide-in w-full max-w-sm">
        <div className="rounded-3xl border border-line bg-ivory/85 p-10 shadow-[0_20px_70px_rgba(26,24,21,0.08)] backdrop-blur-md">
          <div className="flex flex-col items-center gap-3 text-center">
            <p className="font-serif text-3xl tracking-[0.18em]">
              {wedding.brideName[0]} <span className="text-gold">&amp;</span>{" "}
              {wedding.groomName[0]}
            </p>
            <span aria-hidden className="h-px w-12 bg-gold" />
            <h1 className="eyebrow text-stone">Couple Dashboard</h1>
          </div>

          <LoginForm
            sessionExpired={searchParams.expired === "1"}
            invalidLink={searchParams.link === "invalid"}
          />
        </div>

        <p className="mt-6 text-center text-xs text-stone">
          {wedding.brideName} &amp; {wedding.groomName} ·{" "}
          <a href="/" className="underline-offset-4 hover:underline">
            back to the website
          </a>
        </p>
      </div>
    </main>
  );
}
