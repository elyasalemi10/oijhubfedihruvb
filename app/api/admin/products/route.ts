import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getPublicUrl, uploadToR2 } from "@/lib/r2";

const AREA_PREFIX: Record<string, string> = {
  Kitchen: "A",
  Bedroom: "B",
  "Living Room": "C",
  Patio: "D",
};

async function nextCodeForArea(area: string) {
  const prefix = AREA_PREFIX[area];
  if (!prefix) throw new Error("Invalid area");

  const latest = await prisma.product.findFirst({
    where: { code: { startsWith: prefix } },
    orderBy: { code: "desc" },
    select: { code: true },
  });

  const current =
    latest && latest.code.startsWith(prefix)
      ? Number(latest.code.slice(1)) || 0
      : 0;

  const nextNumber = current + 1;
  return `${prefix}${String(nextNumber).padStart(3, "0")}`;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") ?? "";

    console.log("Product search query:", q);

    const where =
      q.trim().length === 0
        ? {}
        : {
            OR: [
              { code: { contains: q, mode: "insensitive" as const } },
              { name: { contains: q, mode: "insensitive" as const } },
              { description: { contains: q, mode: "insensitive" as const } },
              {
                manufacturerDescription: {
                  contains: q,
                  mode: "insensitive" as const,
                },
              },
              {
                productDetails: { contains: q, mode: "insensitive" as const },
              },
              { area: { contains: q, mode: "insensitive" as const } },
            ],
          };

    const products = await prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    console.log("Found products:", products.length);

    return NextResponse.json({ products });
  } catch (error) {
    console.error("Error fetching products:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch products", details: errorMessage, products: [] },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const formData = await request.formData();

  const name = formData.get("name")?.toString() || "";
  const area = formData.get("area")?.toString() || "";
  const description = formData.get("description")?.toString() || "";
  const manufacturerDescription =
    formData.get("manufacturerDescription")?.toString() || "";
  const productDetails = formData.get("productDetails")?.toString() || "";
  const priceRaw = formData.get("price")?.toString() || "";
  const image = formData.get("image") as File | null;

  if (!name.trim()) {
    return NextResponse.json(
      { error: "Product name is required." },
      { status: 400 }
    );
  }

  if (!area || !AREA_PREFIX[area]) {
    return NextResponse.json({ error: "Area is required." }, { status: 400 });
  }

  if (!description.trim()) {
    return NextResponse.json(
      { error: "Description is required." },
      { status: 400 }
    );
  }

  if (!image) {
    return NextResponse.json({ error: "Image is required." }, { status: 400 });
  }

  const code = await nextCodeForArea(area);
  const buffer = Buffer.from(await image.arrayBuffer());
  const key = `products/${AREA_PREFIX[area]}/${code}-${Date.now()}-${
    image.name || "image"
  }`;

  await uploadToR2({
    key,
    body: buffer,
    contentType: image.type || "application/octet-stream",
  });

  const price = priceRaw ? Number(priceRaw) : null;

  const product = await prisma.product.create({
    data: {
      code,
      name,
      area,
      description,
      manufacturerDescription: manufacturerDescription || null,
      productDetails: productDetails || null,
      price: price !== null && !Number.isNaN(price) ? price : null,
      imageUrl: getPublicUrl(key),
    },
  });

  return NextResponse.json({ product });
}

