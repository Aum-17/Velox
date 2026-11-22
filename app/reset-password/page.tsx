import { ResetForm } from "@/components/AuthForms";

export const metadata = { title: "Reset password · Velox" };

export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  const sp = await searchParams;
  return <ResetForm token={sp.token ?? null} invalid={!!sp.error} />;
}
