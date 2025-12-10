import { getSessionFromCookies } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPublicUrl, uploadToR2 } from "@/lib/r2";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type IncomingProduct = {
  category?: string;
  code?: string;
  description?: string;
  manufacturerDescription?: string;
  productDetails?: string;
  areaDescription?: string;
  quantity?: string;
  price?: string;
  notes?: string;
  image?: string | null;
};

const CATEGORY_PREFIX: Record<string, string> = {
  Kitchen: "A",
  Bathroom: "E",
  Bedroom: "B",
  "Living Room": "C",
  Laundry: "F",
  Balcony: "G",
  Patio: "D",
  Other: "Z",
};

async function nextCodeForPrefix(prefix: string) {
  const latest = await prisma.product.findFirst({
    where: { code: { startsWith: prefix } },
    orderBy: { code: "desc" },
    select: { code: true },
  });

  const current =
    latest && latest.code.startsWith(prefix)
      ? Number(latest.code.slice(prefix.length)) || 0
      : 0;

  const nextNumber = current + 1;
  return `${prefix}${String(nextNumber).padStart(3, "0")}`;
}

function buildProductDetails(p: IncomingProduct) {
  const parts: string[] = [];
  if (p.productDetails?.trim()) parts.push(p.productDetails.trim());
  if (p.areaDescription?.trim()) parts.push(`Area: ${p.areaDescription.trim()}`);
  if (p.quantity?.trim()) parts.push(`Qty: ${p.quantity.trim()}`);
  if (p.notes?.trim()) parts.push(`Notes: ${p.notes.trim()}`);
  return parts.length ? parts.join(" | ") : null;
}

export async function POST(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { products } = payload ?? {};

  if (!Array.isArray(products) || products.length === 0) {
    return NextResponse.json(
      { error: "At least one product is required" },
      { status: 400 }
    );
  }

  const saved = [];

  try {
    for (const raw of products as IncomingProduct[]) {
      const category = (raw?.category || "Other").trim() || "Other";
      const prefix = CATEGORY_PREFIX[category] || CATEGORY_PREFIX.Other;
      const code = await nextCodeForPrefix(prefix);

      const name =
        raw?.description?.trim() ||
        raw?.code?.trim() ||
        `Product ${code}` ||
        "Product";

      const description = raw?.description?.trim() || "N/A";
      const manufacturerDescription =
        raw?.manufacturerDescription?.trim() || null;
      const productDetails = buildProductDetails(raw);

      const priceNumber = raw?.price ? Number.parseFloat(raw.price) : NaN;
      const price =
        Number.isFinite(priceNumber) && !Number.isNaN(priceNumber)
          ? priceNumber
          : null;

      let imageUrl = "https://placehold.co/600x600?text=No+Image";

      if (raw?.image) {
        const buffer = Buffer.from(raw.image, "base64");
        const key = `product-sheet/${prefix}/${code}-${Date.now()}.jpg`;

        await uploadToR2({
          key,
          body: buffer,
          contentType: "image/jpeg",
        });

        imageUrl = getPublicUrl(key);
      }

      const product = await prisma.product.create({
        data: {
          code,
          name,
          area: category,
          description,
          manufacturerDescription,
          productDetails,
          price,
          imageUrl,
        },
      });

      saved.push(product);
    }
  } catch (error: any) {
    console.error("Error saving products:", error);
    return NextResponse.json(
      {
        error: "Failed to save products",
        details: error?.message,
        savedCount: saved.length,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ products: saved });
}

