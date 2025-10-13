const JSON_LD_REGEX = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

export interface MercadoLibreProduct {
  name: string;
  description?: string;
  price?: number;
  currency?: string;
  images: string[];
  url: string;
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function extractMetaContent(html: string, key: string): string | undefined {
  const propertyRegex = new RegExp(
    `<meta[^>]+property=["']${key}["'][^>]+content=["']([^"']+)["'][^>]*>`,
    "i"
  );
  const nameRegex = new RegExp(
    `<meta[^>]+name=["']${key}["'][^>]+content=["']([^"']+)["'][^>]*>`,
    "i"
  );
  const propertyMatch = propertyRegex.exec(html);
  if (propertyMatch?.[1]) {
    return decodeHtmlEntities(propertyMatch[1]);
  }
  const nameMatch = nameRegex.exec(html);
  if (nameMatch?.[1]) {
    return decodeHtmlEntities(nameMatch[1]);
  }
  return undefined;
}

function parsePrice(rawPrice: unknown): number | undefined {
  if (typeof rawPrice === "number") {
    return rawPrice;
  }
  if (typeof rawPrice === "string") {
    const cleaned = rawPrice.replace(/[^0-9.,]/g, "");
    if (!cleaned) return undefined;
    const normalized = cleaned.replace(/\./g, "").replace(/,/g, ".");
    const parsed = Number(normalized);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

type JsonRecord = Record<string, unknown>;

function findProductNode(candidate: unknown): JsonRecord | undefined {
  if (!candidate) return undefined;
  if (Array.isArray(candidate)) {
    for (const entry of candidate) {
      const result = findProductNode(entry);
      if (result) return result;
    }
    return undefined;
  }
  if (typeof candidate === "object") {
    const objectCandidate = candidate as JsonRecord;
    const typeValue = objectCandidate["@type"];
    if (typeValue) {
      const types = Array.isArray(typeValue) ? typeValue : [typeValue];
      if (types.some((type) => typeof type === "string" && type.toLowerCase() === "product")) {
        return objectCandidate;
      }
    }
    for (const value of Object.values(objectCandidate)) {
      const nested = findProductNode(value);
      if (nested) return nested;
    }
  }
  return undefined;
}

function parseJsonLdPayload(payload: string): unknown {
  const trimmed = payload.trim();
  if (!trimmed) return undefined;
  try {
    return JSON.parse(trimmed);
  } catch {
    try {
      const normalized = trimmed
        .replace(/\n/g, " ")
        .replace(/\r/g, " ")
        .replace(/\t/g, " ");
      return JSON.parse(normalized);
    } catch {
      return undefined;
    }
  }
}

export async function scrapeMercadoLibreProduct(url: string): Promise<MercadoLibreProduct> {
  const parsedUrl = new URL(url);
  if (!parsedUrl.hostname.includes("mercadolibre")) {
    throw new Error("Provided URL is not a Mercado Libre product page");
  }

  const response = await fetch(parsedUrl.toString(), {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch product page (status ${response.status})`);
  }

  const html = await response.text();
  const jsonLdMatches: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = JSON_LD_REGEX.exec(html)) !== null) {
    if (match[1]) {
      jsonLdMatches.push(match[1]);
    }
  }

  let productNode: JsonRecord | undefined;
  for (const payload of jsonLdMatches) {
    const parsed = parseJsonLdPayload(payload);
    const candidate = findProductNode(parsed);
    if (candidate) {
      productNode = candidate;
      break;
    }
  }

  const product: MercadoLibreProduct = {
    name: "",
    description: undefined,
    price: undefined,
    currency: undefined,
    images: [],
    url: parsedUrl.toString(),
  };

  if (productNode) {
    const nameValue = productNode["name"];
    if (typeof nameValue === "string") {
      product.name = nameValue;
    }

    const descriptionValue = productNode["description"];
    if (typeof descriptionValue === "string") {
      product.description = descriptionValue;
    }

    const imageValue = productNode["image"];
    if (imageValue) {
      const images = Array.isArray(imageValue) ? imageValue : [imageValue];
      product.images = images.filter(
        (img): img is string => typeof img === "string"
      );
    }

    const offersValue = productNode["offers"];
    const offers = Array.isArray(offersValue)
      ? offersValue
      : offersValue
      ? [offersValue]
      : [];

    for (const offer of offers) {
      if (typeof offer !== "object" || offer === null) {
        continue;
      }
      const offerRecord = offer as JsonRecord;
      const price = parsePrice(offerRecord["price"]);
      if (price !== undefined) {
        product.price = price;
        const currencyValue = offerRecord["priceCurrency"];
        if (typeof currencyValue === "string") {
          product.currency = currencyValue;
        }
        break;
      }
    }
  }

  if (!product.name) {
    const metaName = extractMetaContent(html, "og:title");
    if (metaName) {
      product.name = metaName;
    }
  }

  if (!product.description) {
    product.description = extractMetaContent(html, "og:description");
  }

  if (!product.images.length) {
    const metaImage = extractMetaContent(html, "og:image");
    if (metaImage) {
      product.images = [metaImage];
    }
  }

  if (product.price === undefined) {
    const priceMeta = extractMetaContent(html, "og:price:amount");
    if (priceMeta) {
      product.price = parsePrice(priceMeta);
    }
  }

  if (!product.name) {
    throw new Error("Unable to extract product information from Mercado Libre page");
  }

  return product;
}
