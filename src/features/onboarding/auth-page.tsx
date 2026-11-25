"use client";
// /login and /signup: the login screen, or straight on to the app (or the
// page that sent the visitor here, ?next=) once a session exists.
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { useSession } from "@/components/session";
import { Splash } from "@/components/gate";
import { LoginScreen } from "./login";

/** Only same-site paths, so ?next= can't send people to another site. */
function safeNext(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

function AuthPageInner({ signUp }: { signUp: boolean }) {
  const { session } = useSession();
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  useEffect(() => {
    if (session) router.replace(next);
  }, [session, next, router]);
  if (session) return <Splash />;
  return <LoginScreen initialSignUp={signUp} />;
}

export function AuthPage({ signUp = false }: { signUp?: boolean }) {
  return (
    <Suspense fallback={<Splash />}>
      <AuthPageInner signUp={signUp} />
    </Suspense>
  );
}
