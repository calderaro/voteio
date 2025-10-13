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
    // 1. Users
    const userIdMap = new Map()

    const oldUsers = await oldDb`
      SELECT
        id,
        email,
        COALESCE("emailVerified", false) AS "emailVerified",
        name,
        "createdAt",
        "updatedAt"
      FROM users
    `

    console.log(`Found ${oldUsers.length} users in old database`)

    for (const user of oldUsers) {
      const [existingById] = await newDb`
        SELECT id FROM users WHERE id = ${user.id}
      `

      if (existingById) {
        userIdMap.set(user.id, existingById.id)
        continue
      }

      const [existingByEmail] = await newDb`
        SELECT id FROM users WHERE email = ${user.email}
      `

      if (existingByEmail) {
        await newDb`
          UPDATE users
          SET
            "emailVerified" = ${user.emailVerified},
            name = ${user.name},
            "updatedAt" = ${user.updatedAt}
          WHERE id = ${existingByEmail.id}
        `
        userIdMap.set(user.id, existingByEmail.id)
        continue
      }

      await newDb`
        INSERT INTO users (
          id,
          email,
          "emailVerified",
          name,
          "createdAt",
          "updatedAt"
        )
        VALUES (
          ${user.id},
          ${user.email},
          ${user.emailVerified},
          ${user.name},
          ${user.createdAt},
          ${user.updatedAt}
        )
      `
      userIdMap.set(user.id, user.id)
    }

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
      const mappedCreatedBy =
        list.createdBy && userIdMap.get(list.createdBy)

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
          ${mappedCreatedBy ?? null}
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
