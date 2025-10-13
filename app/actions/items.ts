"use server";

import { db } from "@/lib/db";
import { items } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generateId } from "@/lib/utils";

export async function createItem(
  listId: string,
  name: string,
  price: number,
  description?: string,
  imageUrl?: string,
  mercadoLibreUrl?: string,
  imageUrls?: string[]
) {
  try {
    const itemId = generateId();
    await db.insert(items).values({
      id: itemId,
      listId,
      name,
      price: price.toString(),
      description,
      imageUrl,
      mercadoLibreUrl,
      imageUrls,
    });
    return { success: true, id: itemId };
  } catch (error) {
    console.error("Error creating item:", error);
    return { success: false, error: "Failed to create item" };
  }
}

export async function updateItem(
  id: string,
  data: {
    name?: string;
    price?: number;
    description?: string;
    imageUrl?: string;
    mercadoLibreUrl?: string;
    imageUrls?: string[];
  }
) {
  try {
    const updateData: Record<string, unknown> = { ...data };
    if (data.price !== undefined) {
      updateData.price = data.price.toString();
    }
    await db.update(items).set(updateData).where(eq(items.id, id));
    return { success: true };
  } catch (error) {
    console.error("Error updating item:", error);
    return { success: false, error: "Failed to update item" };
  }
}

export async function deleteItem(id: string) {
  try {
    await db.delete(items).where(eq(items.id, id));
    return { success: true };
  } catch (error) {
    console.error("Error deleting item:", error);
    return { success: false, error: "Failed to delete item" };
  }
}

export async function getItemsByListId(listId: string) {
  try {
    const itemsList = await db
      .select()
      .from(items)
      .where(eq(items.listId, listId));
    return itemsList;
  } catch (error) {
    console.error("Error fetching items:", error);
    return [];
  }
}
