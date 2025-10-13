"use server";

import { db } from "@/lib/db";
import { votes, voteItems, items, lists } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { generateId } from "@/lib/utils";

export async function submitVote(
  listId: string,
  house: string,
  itemsData: { itemId: string; quantity: number }[]
) {
  try {
    // Check if list exists and is open
    const list = await db
      .select()
      .from(lists)
      .where(eq(lists.id, listId))
      .limit(1);
    if (!list[0]) {
      return { success: false, error: "List not found" };
    }
    if (list[0].isClosed) {
      return { success: false, error: "List is closed" };
    }

    // Check if house already voted
    const existingVote = await db
      .select()
      .from(votes)
      .where(and(eq(votes.listId, listId), eq(votes.house, house)))
      .limit(1);

    let voteId: string;
    if (existingVote[0]) {
      // Update existing vote
      voteId = existingVote[0].id;
      await db
        .update(votes)
        .set({ userName: null, updatedAt: new Date() })
        .where(eq(votes.id, voteId));

      // Delete existing vote items
      await db.delete(voteItems).where(eq(voteItems.voteId, voteId));
    } else {
      // Create new vote
      voteId = generateId();
      await db.insert(votes).values({
        id: voteId,
        listId,
        house,
        userName: null,
      });
    }

    // Add vote items
    for (const item of itemsData) {
      const voteItemId = generateId();
      await db.insert(voteItems).values({
        id: voteItemId,
        voteId,
        itemId: item.itemId,
        quantity: item.quantity,
      });
    }

    return { success: true, id: voteId };
  } catch (error) {
    console.error("Error submitting vote:", error);
    return { success: false, error: "Failed to submit vote" };
  }
}

export async function getVoteByListAndHouse(listId: string, house: string) {
  try {
    const vote = await db
      .select()
      .from(votes)
      .where(and(eq(votes.listId, listId), eq(votes.house, house)))
      .limit(1);

    if (!vote[0]) {
      return null;
    }

    // Get vote items with item details
    const voteItemsData = await db
      .select({
        id: voteItems.id,
        quantity: voteItems.quantity,
        itemId: voteItems.itemId,
        itemName: items.name,
        itemPrice: items.price,
        itemImageUrl: items.imageUrl,
      })
      .from(voteItems)
      .innerJoin(items, eq(voteItems.itemId, items.id))
      .where(eq(voteItems.voteId, vote[0].id));

    return {
      ...vote[0],
      items: voteItemsData,
    };
  } catch (error) {
    console.error("Error fetching vote:", error);
    return null;
  }
}

export async function getVotesByListId(listId: string) {
  try {
    const votesData = await db
      .select()
      .from(votes)
      .where(eq(votes.listId, listId));

    // Get vote items for each vote
    const votesWithItems = await Promise.all(
      votesData.map(async (vote) => {
        const voteItemsData = await db
          .select({
            id: voteItems.id,
            quantity: voteItems.quantity,
            itemId: voteItems.itemId,
            itemName: items.name,
            itemPrice: items.price,
            itemImageUrl: items.imageUrl,
          })
          .from(voteItems)
          .innerJoin(items, eq(voteItems.itemId, items.id))
          .where(eq(voteItems.voteId, vote.id));

        return {
          ...vote,
          items: voteItemsData,
        };
      })
    );

    return votesWithItems;
  } catch (error) {
    console.error("Error fetching votes:", error);
    return [];
  }
}

export async function resetVotesForList(listId: string) {
  try {
    await db.delete(votes).where(eq(votes.listId, listId));
    return { success: true };
  } catch (error) {
    console.error("Error resetting votes:", error);
    return { success: false, error: "Failed to reset votes" };
  }
}
