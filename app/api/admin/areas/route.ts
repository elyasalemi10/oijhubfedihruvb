import { NextResponse } from "next/server";

import { getSessionFromCookies } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const areas = await prisma.area.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ areas });
  } catch (error: any) {
    console.error("Error fetching areas:", error);
    return NextResponse.json(
      { error: "Failed to fetch areas", details: error?.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = body?.name?.toString().trim();
  if (!name) {
    return NextResponse.json(
      { error: "Area name is required" },
      { status: 400 }
    );
  }

  try {
    const existing = await prisma.area.findUnique({ where: { name } });
    if (existing) {
      return NextResponse.json(
        { error: "Area already exists" },
        { status: 400 }
      );
    }

    const area = await prisma.area.create({ data: { name } });
    return NextResponse.json({ area });
  } catch (error: any) {
    console.error("Error creating area:", error);
    return NextResponse.json(
      { error: "Failed to create area", details: error?.message },
      { status: 500 }
    );
  }
}

