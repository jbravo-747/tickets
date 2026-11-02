import { defaultBrand } from "@/lib/brand";
import { AccentScope } from "@/components/Accent";
import { PublicHeader } from "@/components/PublicHeader";
import { LookupForm } from "./LookupForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Seguimiento de solicitud" };

export default async function Seguimiento() {
  const brand = await defaultBrand();
  return (
    <AccentScope color={brand?.color}>
      <PublicHeader brand={brand} />
      <main className="mx-auto max-w-md px-4 py-10">
        <LookupForm />
      </main>
    </AccentScope>
  );
}
