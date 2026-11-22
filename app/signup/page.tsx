import { SignUpForm } from "@/components/AuthForms";
import { emailVerificationRequired } from "@/lib/auth";

export const metadata = { title: "Create account · Velox" };

export default function Page() {
  return <SignUpForm google={!!process.env.GOOGLE_CLIENT_ID} verify={emailVerificationRequired} />;
}
