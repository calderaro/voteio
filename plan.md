# Voting Shopping App Implementation Plan

## 1. Setup Database and ORM

- Install Drizzle ORM packages: `drizzle-orm`, `drizzle-kit`, `postgres` (or `@neondatabase/serverless`)
- Create Drizzle configuration file (`drizzle.config.ts`)
- Set up database connection utility (`lib/db/index.ts`)
- Configure environment variables for database connection URL

## 2. Database Schema Design

Create Drizzle schema in `lib/db/schema.ts`:

**users table** (for Better Auth)

- id (text, primary key)
- email (text, unique, not null)
- emailVerified (boolean, default false)
- name (text)
- createdAt (timestamp, default now)
- updatedAt (timestamp, default now)

**sessions table** (for Better Auth)

- id (text, primary key)
- userId (text, references users)
- expiresAt (timestamp)
- ipAddress (text)
- userAgent (text)

**lists table**

- id (text, primary key, using cuid2)
- name (text, not null)
- budget (numeric/decimal, not null)
- isClosed (boolean, default false)
- createdAt (timestamp, default now)
- createdBy (text, references users)

**items table**

- id (text, primary key, using cuid2)
- listId (text, references lists, on delete cascade)
- name (text, not null)
- description (text)
- price (numeric/decimal, not null)
- imageUrl (text) - primary product image
- mercadoLibreUrl (text) - original product URL
- createdAt (timestamp, default now)

**votes table**

- id (text, primary key, using cuid2)
- listId (text, references lists, on delete cascade)
- house (text, not null) - stores house selection like "1a", "2b", etc.
- userName (text) - optional display name
- createdAt (timestamp, default now)
- updatedAt (timestamp, default now)
- Unique constraint on (listId, house)

**voteItems table**

- id (text, primary key, using cuid2)
- voteId (text, references votes, on delete cascade)
- itemId (text, references items, on delete cascade)
- quantity (integer, default 1, not null)

Run migrations: `drizzle-kit generate` and `drizzle-kit migrate`

## 3. Authentication Setup with Better Auth

- Install Better Auth: `better-auth`, `@better-auth/drizzle-adapter`
- Create Better Auth configuration (`lib/auth/config.ts`)
- Configure Better Auth with Drizzle adapter and email/password provider
- Create auth API route handler at `app/api/auth/[...all]/route.ts`
- Create auth client utility (`lib/auth/client.ts`)
- Implement auth middleware (`middleware.ts`) to protect admin routes
- Add logout functionality

**Initial Setup Flow**:

- Create `/setup` route for first-time admin account creation
- Check if any users exist in database
- If no users exist, redirect to `/setup` page
- Setup page allows creating first admin account (email, password, name)
- After first admin is created, redirect to admin login
- Middleware should allow access to `/setup` only when no users exist

## 4. Admin Dashboard

Create `/admin` route structure:

**Admin Login** (`/admin/login/page.tsx`):

- Email and password form using Better Auth
- Redirect to dashboard after successful login
- Error handling for invalid credentials

**Admin Layout** (`/admin/layout.tsx`):

- Protected layout checking authentication status
- Navigation header with logout button
- Sidebar/nav menu for lists management

**Dashboard** (`/admin/page.tsx`):

- Display all lists in a table/grid
- Show list name, budget, status (open/closed), created date
- Actions: Edit, View Submissions, Delete
- Button to create new list

**Create/Edit List** (`/admin/lists/new/page.tsx` and `/admin/lists/[id]/edit/page.tsx`):

- Form with list name and budget inputs
- Item management section:
  - **Mercado Libre URL input field**:
    - Admin pastes Mercado Libre product URL
    - App scrapes product data (name, description, price, image)
    - Auto-populate item form with scraped data
    - Allow manual editing before adding
  - Manual add item form (name, description, price, image URL)
  - List of current items with edit/delete actions showing:
    - Product image thumbnail
    - Name and price
    - Link to original Mercado Libre listing (if available)
  - Real-time total of all items
- Toggle to close/reopen list
- Save button with validation

**Submissions View** (`/admin/lists/[id]/submissions/page.tsx`):

- Display all votes for the list grouped by house
- Show for each submission:
  - House number
  - User name (if provided)
  - Selected items with quantities
  - Total spent
  - Remaining budget
- Summary section:
  - Total participants
  - Most popular items with vote counts
  - Average spending
  - Total budget allocation across all users
- **Final Shopping List Calculator**:
  - Aggregate all items from all user submissions
  - Calculate total quantity needed for each item
  - Show total cost for each aggregated item
  - Display grand total cost for all items
  - Show if aggregate total fits within total budget (list budget × number of participants)
  - Highlight items that are most frequently voted
  - Option to exclude/include specific submissions from calculation
- Export to CSV functionality (both individual submissions and final aggregated list)

## 5. User Voting Interface

**List Access Page** (`/vote/[listId]/page.tsx`):

- Fetch list details and check if open
- If closed, show message that voting is closed
- House selection dropdown:
  - Generate options 1a through 35c programmatically
  - Store selection in component state
  - Check if house already voted (show existing cart)
- Optional user name input
- Display all available items as cards:
  - Item name and price
  - Add to cart button
- Shopping cart section:
  - List selected items with quantity controls (+/-)
  - Show running total
  - Budget progress bar (visual indicator)
  - Remaining budget display
  - Clear cart button
- Client-side validation preventing total from exceeding budget
- "Submit Vote" or "Update Vote" button
- Success/error toast notifications

## 6. Server Actions

Create server actions in `app/actions/`:

**lists.ts**:

- `createList(name, budget)` - Admin only
- `updateList(id, data)` - Admin only
- `deleteList(id)` - Admin only
- `closeList(id, isClosed)` - Admin only
- `getListById(id)` - Public (for voting page)
- `getAllLists()` - Admin only

**items.ts**:

- `createItem(listId, name, price)` - Admin only
- `updateItem(id, name, price)` - Admin only
- `deleteItem(id)` - Admin only
- `getItemsByListId(listId)` - Public

**votes.ts**:

- `submitVote(listId, house, items)` - Public
- `getVoteByListAndHouse(listId, house)` - Public
- `getVotesByListId(listId)` - Admin only
- Server-side budget validation

## 7. Home Page

Update `app/page.tsx`:

- Hero section explaining the app purpose
- Two main sections:
  - For voters: "How to vote" instructions
  - For admins: Link to admin dashboard
- Modern, clean design with Tailwind CSS
- Responsive layout

## 8. Key Features Implementation

**Budget Validation**:

- Client-side: Disable add button when budget would be exceeded
- Server-side: Validate total before saving vote
- Show clear feedback when budget limit reached

**House Selection Logic**:

- Generate houses: numbers 1-35, letters a-c
- Prevent duplicate votes per house (unique constraint)
- Load existing vote if house already submitted

**Vote Updates**:

- Users can modify their cart and resubmit
- Update existing vote record instead of creating new one
- Show "Update Vote" button text when editing existing vote

## 9. UI/UX Enhancements

- Install and configure `sonner` for toast notifications
- Add loading states with spinners/skeletons
- Form validation with clear error messages
- Confirmation dialogs for destructive actions
- Responsive design for mobile and desktop
- Accessible forms and buttons
- Empty states for lists with no items/votes

## 10. Environment Setup

Create `.env.local`:

```
DATABASE_URL=postgresql://user:password@host:port/database
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://localhost:3000
```

Generate auth secret: `openssl rand -base64 32`

## File Structure

```
lib/
  db/
    index.ts - Database connection
    schema.ts - Drizzle schema definitions
  auth/
    config.ts - Better Auth configuration
    client.ts - Auth client utilities
  utils.ts - Helper functions
  types.ts - TypeScript types

app/
  actions/
    lists.ts - List server actions
    items.ts - Item server actions
    votes.ts - Vote server actions
  api/
    auth/[...all]/route.ts - Better Auth API handler
  admin/
    layout.tsx - Protected admin layout
    page.tsx - Admin dashboard
    login/page.tsx - Admin login
    lists/
      new/page.tsx - Create list
      [id]/
        edit/page.tsx - Edit list
        submissions/page.tsx - View submissions
  vote/
    [listId]/page.tsx - User voting interface
  page.tsx - Home page

components/
  ui/ - Reusable UI components
  admin/
    ListForm.tsx
    ItemManager.tsx
    SubmissionsTable.tsx
  vote/
    HouseSelector.tsx
    ItemCard.tsx
    ShoppingCart.tsx
    BudgetIndicator.tsx

middleware.ts - Auth middleware
drizzle.config.ts - Drizzle configuration
```

## Implementation Order

1. Setup database connection and Drizzle ORM
2. Define database schema and run migrations
3. Setup Better Auth with admin user creation
4. Build admin authentication (login page, middleware)
5. Create admin dashboard and list management
6. Build item management within lists
7. Implement user voting interface
8. Add submissions view for admins
9. Polish UI/UX and add validations
10. Test complete flow and edge cases
