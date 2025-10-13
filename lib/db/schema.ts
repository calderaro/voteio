import {
  pgTable,
  text,
  boolean,
  timestamp,
  decimal,
  integer,
  unique,
} from "drizzle-orm/pg-core";

// Better Auth tables
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  name: text("name"),
  createdAt: timestamp("createdAt", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updatedAt", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expiresAt", { withTimezone: true }).notNull(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updatedAt", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const accounts = pgTable(
  "accounts",
  {
    id: text("id").primaryKey(),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    providerId: text("providerId").notNull(),
    accountId: text("accountId").notNull(),
    password: text("password"),
    accessToken: text("accessToken"),
    refreshToken: text("refreshToken"),
    idToken: text("idToken"),
    accessTokenExpiresAt: timestamp("accessTokenExpiresAt", {
      withTimezone: true,
    }),
    refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt", {
      withTimezone: true,
    }),
    scope: text("scope"),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    providerAccount: unique().on(table.providerId, table.accountId),
  })
);

export const verifications = pgTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  token: text("token").notNull(),
  type: text("type").notNull(),
  expiresAt: timestamp("expiresAt", { withTimezone: true }).notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updatedAt", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// App tables
export const lists = pgTable("lists", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  budget: decimal("budget", { precision: 10, scale: 2 }).notNull(),
  isClosed: boolean("isClosed").default(false),
  createdAt: timestamp("createdAt").defaultNow(),
  createdBy: text("createdBy").references(() => users.id),
});

export const items = pgTable("items", {
  id: text("id").primaryKey(),
  listId: text("listId").references(() => lists.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  imageUrl: text("imageUrl"),
  imageUrls: text("imageUrls").array(),
  mercadoLibreUrl: text("mercadoLibreUrl"),
  createdAt: timestamp("createdAt").defaultNow(),
});

export const votes = pgTable(
  "votes",
  {
    id: text("id").primaryKey(),
    listId: text("listId").references(() => lists.id, { onDelete: "cascade" }),
    house: text("house").notNull(),
    userName: text("userName"),
    createdAt: timestamp("createdAt").defaultNow(),
    updatedAt: timestamp("updatedAt").defaultNow(),
  },
  (table) => ({
    uniqueListHouse: unique().on(table.listId, table.house),
  })
);

export const voteItems = pgTable("voteItems", {
  id: text("id").primaryKey(),
  voteId: text("voteId").references(() => votes.id, { onDelete: "cascade" }),
  itemId: text("itemId").references(() => items.id, { onDelete: "cascade" }),
  quantity: integer("quantity").default(1).notNull(),
});
