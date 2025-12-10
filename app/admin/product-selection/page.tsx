import { requireAdmin } from "@/lib/auth";
import dynamic from "next/dynamic";

const ProductSheetApp = dynamic(() => import("./ProductSheetApp"), {
  ssr: false,
});

export default async function ProductSelectionPage() {
  await requireAdmin();
  return <ProductSheetApp />;
}

