CREATE TABLE "items" (
	"id" text PRIMARY KEY NOT NULL,
	"listId" text,
	"name" text NOT NULL,
	"description" text,
	"price" numeric(10, 2) NOT NULL,
	"imageUrl" text,
	"mercadoLibreUrl" text,
	"createdAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "lists" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"budget" numeric(10, 2) NOT NULL,
	"isClosed" boolean DEFAULT false,
	"createdAt" timestamp DEFAULT now(),
	"createdBy" text
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text,
	"expiresAt" timestamp,
	"ipAddress" text,
	"userAgent" text
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"emailVerified" boolean DEFAULT false,
	"name" text,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "voteItems" (
	"id" text PRIMARY KEY NOT NULL,
	"voteId" text,
	"itemId" text,
	"quantity" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "votes" (
	"id" text PRIMARY KEY NOT NULL,
	"listId" text,
	"house" text NOT NULL,
	"userName" text,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now(),
	CONSTRAINT "votes_listId_house_unique" UNIQUE("listId","house")
);
--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_listId_lists_id_fk" FOREIGN KEY ("listId") REFERENCES "public"."lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lists" ADD CONSTRAINT "lists_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voteItems" ADD CONSTRAINT "voteItems_voteId_votes_id_fk" FOREIGN KEY ("voteId") REFERENCES "public"."votes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voteItems" ADD CONSTRAINT "voteItems_itemId_items_id_fk" FOREIGN KEY ("itemId") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_listId_lists_id_fk" FOREIGN KEY ("listId") REFERENCES "public"."lists"("id") ON DELETE cascade ON UPDATE no action;