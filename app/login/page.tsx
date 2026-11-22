import { SignInForm } from "@/components/AuthForms";

export const metadata = { title: "Sign in · Velox" };

export default function Page() {
  return <SignInForm google={!!process.env.GOOGLE_CLIENT_ID} />;
}
