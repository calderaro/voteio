import dotenv from "dotenv"
import postgres from "postgres"

dotenv.config({ path: ".env.local" })

const oldDatabaseUrl = process.env.OLD_DATABASE_URL
const newDatabaseUrl = process.env.DATABASE_URL

if (!oldDatabaseUrl) {
  console.error("Missing OLD_DATABASE_URL environment variable")
  process.exit(1)
}

if (!newDatabaseUrl) {
  console.error("Missing DATABASE_URL environment variable")
  process.exit(1)
}

const oldDb = postgres(oldDatabaseUrl, { max: 1 })
const newDb = postgres(newDatabaseUrl, { max: 1 })

async function migrate() {
  console.log("Starting migration from old database to new database...")

  try {
    const oldLists = await oldDb`
      SELECT
        id,
        name,
        budget,
        "createdAt",
        "isClosed",
        "createdBy"
      FROM lists
    `

    console.log(`Found ${oldLists.length} lists in old database`)

    for (const list of oldLists) {
      await newDb`
        INSERT INTO lists (
          id,
          name,
          budget,
          "createdAt",
          "isClosed",
          "createdBy"
        )
        VALUES (
          ${list.id},
          ${list.name},
          ${list.budget},
          ${list.createdAt},
          ${list.isClosed},
          ${list.createdBy}
        )
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          budget = EXCLUDED.budget,
          "isClosed" = EXCLUDED."isClosed",
          "createdBy" = EXCLUDED."createdBy"
      `
    }

    const oldItems = await oldDb`
      SELECT
        id,
        "listId",
        name,
        description,
        price,
        "imageUrl",
        "imageUrls",
        "mercadoLibreUrl",
        "createdAt"
      FROM items
    `

    console.log(`Found ${oldItems.length} items in old database`)

    for (const item of oldItems) {
      await newDb`
        INSERT INTO items (
          id,
          "listId",
          name,
          description,
          price,
          "imageUrl",
          "imageUrls",
          "mercadoLibreUrl",
          "createdAt"
        )
        VALUES (
          ${item.id},
          ${item.listId},
          ${item.name},
          ${item.description},
          ${item.price},
          ${item.imageUrl},
          ${item.imageUrls},
          ${item.mercadoLibreUrl},
          ${item.createdAt}
        )
        ON CONFLICT (id) DO UPDATE SET
          "listId" = EXCLUDED."listId",
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          price = EXCLUDED.price,
          "imageUrl" = EXCLUDED."imageUrl",
          "imageUrls" = EXCLUDED."imageUrls",
          "mercadoLibreUrl" = EXCLUDED."mercadoLibreUrl"
      `
    }

    console.log("Migration completed successfully ✅")
  } catch (error) {
    console.error("Migration failed", error)
    process.exitCode = 1
  } finally {
    await oldDb.end({ timeout: 5 })
    await newDb.end({ timeout: 5 })
  }
}

migrate()
