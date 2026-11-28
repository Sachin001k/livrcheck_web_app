"use client";
import { useSession } from "@/components/session";
import { CheckScreen } from "@/features/check/check-screen";

/** The health check: in the app when signed in, open to everyone otherwise. */
export default function CheckPage() {
  const { session } = useSession();
  return <CheckScreen key={session ? "user" : "guest"} guest={!session} />;
}
