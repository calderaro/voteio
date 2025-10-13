import { NextRequest, NextResponse } from "next/server";
import {
  scrapeMercadoLibreProduct,
  type MercadoLibreProduct,
} from "@/lib/mercado-libre";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const url = body?.url;

    if (typeof url !== "string" || url.trim().length === 0) {
      return NextResponse.json(
        { error: "Missing Mercado Libre URL" },
        { status: 400 }
      );
    }

    const product: MercadoLibreProduct = await scrapeMercadoLibreProduct(url);

    return NextResponse.json({ product });
  } catch (error) {
    console.error("Failed to scrape Mercado Libre product", error);

    const message =
      error instanceof Error
        ? error.message
        : "Unable to fetch product details";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
