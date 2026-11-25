import type { Metadata } from "next";
import { AuthPage } from "@/features/onboarding/auth-page";

export const metadata: Metadata = { title: "Sign up" };

export default function SignupPage() {
  return <AuthPage signUp />;
}
