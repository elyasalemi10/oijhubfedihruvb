import { requireAdmin } from "@/lib/auth";

export default async function CreateSchedulePage() {
  await requireAdmin();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Create Product Selection
        </h1>
        <ProductSelectionForm />
      </div>
    </div>
  );
}

import ProductSelectionForm from "./form";
