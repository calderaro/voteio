"use server";

import { db } from "@/lib/db";
import { lists, items } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generateId } from "@/lib/utils";

export async function createList(
  name: string,
  budget: number,
  createdBy: string
) {
  try {
    const listId = generateId();
    await db.insert(lists).values({
      id: listId,
      name,
      budget: budget.toString(),
      createdBy,
    });
    return { success: true, id: listId };
  } catch (error) {
    console.error("Error creating list:", error);
    return { success: false, error: "Failed to create list" };
  }
}

export async function updateList(
  id: string,
  data: { name?: string; budget?: number; isClosed?: boolean }
) {
  try {
    const updateData: any = { ...data };
    if (data.budget !== undefined) {
      updateData.budget = data.budget.toString();
    }
    await db.update(lists).set(updateData).where(eq(lists.id, id));
    return { success: true };
  } catch (error) {
    console.error("Error updating list:", error);
    return { success: false, error: "Failed to update list" };
  }
}

export async function deleteList(id: string) {
  try {
    await db.delete(lists).where(eq(lists.id, id));
    return { success: true };
  } catch (error) {
    console.error("Error deleting list:", error);
    return { success: false, error: "Failed to delete list" };
  }
}

export async function closeList(id: string, isClosed: boolean) {
  try {
    await db.update(lists).set({ isClosed }).where(eq(lists.id, id));
    return { success: true };
  } catch (error) {
    console.error("Error closing list:", error);
    return { success: false, error: "Failed to close list" };
  }
}

export async function getListById(id: string) {
  try {
    const list = await db.select().from(lists).where(eq(lists.id, id)).limit(1);
    return list[0] || null;
  } catch (error) {
    console.error("Error fetching list:", error);
    return null;
  }
}

export async function getAllLists() {
  try {
    const allLists = await db.select().from(lists);
    return allLists;
  } catch (error) {
    console.error("Error fetching lists:", error);
    return [];
  }
}
