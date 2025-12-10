import Image from "next/image";

import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const revalidate = 0;

export default async function ViewProductsPage() {
  await requireAdmin();

  const products = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <main className="min-h-screen bg-slate-50 py-16 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">Admin</p>
            <h1 className="text-2xl font-semibold text-slate-900">
              View Products
            </h1>
            <p className="text-sm text-slate-500">
              Latest 100 products stored in the system.
            </p>
          </div>
          <Button asChild variant="outline">
            <a href="/admin">Back to Admin</a>
          </Button>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <th className="p-3">Code</th>
                <th className="p-3">Name</th>
                <th className="p-3">Image</th>
                <th className="p-3">Description</th>
                <th className="p-3">Manufacturer</th>
                <th className="p-3">Product Details</th>
                <th className="p-3">Area</th>
                <th className="p-3">Price</th>
                <th className="p-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p: typeof products[number]) => (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="p-3 font-semibold">{p.code}</td>
                  <td className="p-3 font-semibold">{p.name}</td>
                  <td className="p-3">
                    <div className="relative h-12 w-16 max-w-[120px]">
                      {p.imageUrl ? (
                        <Image
                          src={p.imageUrl}
                          alt={p.description}
                          fill
                          className="object-cover rounded border border-slate-200"
                        />
                      ) : (
                        <div className="h-12 w-16 max-w-[120px] bg-slate-100 border border-slate-200 rounded" />
                      )}
                    </div>
                  </td>
                  <td className="p-3">{p.description}</td>
                  <td className="p-3">
                    {p.manufacturerDescription || "—"}
                  </td>
                  <td className="p-3">{p.productDetails || "—"}</td>
                  <td className="p-3">{p.area}</td>
                  <td className="p-3">
                    {p.price !== null ? `$${p.price?.toString()}` : "—"}
                  </td>
                  <td className="p-3 text-xs text-slate-500">
                    {p.createdAt.toISOString().slice(0, 10)}
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="p-4 text-sm text-slate-500 text-center"
                  >
                    No products found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

