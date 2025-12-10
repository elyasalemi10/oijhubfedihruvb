import { requireAdmin } from "@/lib/auth";
import ProductSheetApp from "./ProductSheetApp";

export default async function ProductSelectionPage() {
  await requireAdmin();
  return <ProductSheetApp />;
}

