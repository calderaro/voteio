# VoteIO - Collaborative Shopping Lists

A Next.js application for collaborative shopping lists with budget management. Admins can create lists with budgets, add items (including from Mercado Libre), and users can vote on items within their budget constraints.

## Features

- **Admin Dashboard**: Create and manage shopping lists with budgets
- **Item Management**: Add items manually or via Mercado Libre URLs
- **User Voting**: Users select their house (1a-35c) and vote on items within budget
- **Budget Validation**: Real-time budget tracking and validation
- **Analytics**: Comprehensive submission analytics and final shopping list generation
- **Authentication**: Secure admin authentication with Better Auth

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Server Actions
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Better Auth
- **Styling**: Tailwind CSS

## Setup Instructions

### 1. Prerequisites

- Node.js 18+
- PostgreSQL database (or use a cloud provider like Neon, Supabase, etc.)

### 2. Installation

```bash
# Clone the repository
git clone <repository-url>
cd voteio

# Install dependencies
npm install
```

### 3. Environment Configuration

Create a `.env.local` file in the root directory:

```env
DATABASE_URL=postgresql://username:password@host:port/database
BETTER_AUTH_SECRET=your-secret-key-here
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3000
```

Generate a secret key:

```bash
openssl rand -base64 32
```

### 4. Database Setup

```bash
# Generate database migrations
npm run db:generate

# Apply migrations to your database
npm run db:migrate
```

### 5. Run the Application

```bash
# Start the development server
npm run dev
```

Visit `http://localhost:3000` to access the application.

## First Time Setup

1. Visit `http://localhost:3000/setup` to create your first admin account
2. After creating the admin account, you'll be redirected to the admin dashboard
3. Create your first shopping list and start adding items

## Usage

### For Admins

1. **Login**: Visit `/admin/login` to access the admin dashboard
2. **Create Lists**: Set up shopping lists with budgets
3. **Add Items**: Add items manually or via Mercado Libre URLs
4. **Manage Lists**: Edit items, close lists, view submissions
5. **Analytics**: View comprehensive analytics and generate final shopping lists

### For Users

1. **Access Lists**: Use the voting URL provided by admins (`/vote/[listId]`)
2. **Select House**: Choose your house from 1a to 35c
3. **Browse Items**: View available items with prices and images
4. **Add to Cart**: Add items within your budget limit
5. **Submit Vote**: Submit your selections

## Database Schema

- **users**: Admin user accounts
- **sessions**: User sessions for authentication
- **lists**: Shopping lists with budgets
- **items**: Items within lists (with Mercado Libre integration)
- **votes**: User votes by house
- **voteItems**: Individual items in each vote

## API Endpoints

- `POST /api/auth/sign-up` - User registration
- `POST /api/auth/sign-in` - User login
- `POST /api/auth/sign-out` - User logout
- Server Actions for lists, items, and votes management

## Development

```bash
# Run database studio (optional)
npm run db:studio

# Generate new migrations after schema changes
npm run db:generate

# Apply migrations
npm run db:migrate
```

## Features in Detail

### Mercado Libre Integration

- Admins can paste Mercado Libre product URLs
- App extracts product name, description, price, and images
- Items maintain links back to original listings

### Budget Management

- Each list has a per-house budget
- Real-time budget validation during voting
- Visual budget progress indicators
- Prevents users from exceeding budget limits

### Analytics Dashboard

- Total participants and spending statistics
- Most popular items with vote counts
- Final aggregated shopping list
- Budget utilization tracking

### House Selection

- Supports houses 1a through 35c (105 total options)
- Prevents duplicate votes per house
- Loads existing votes for house selection

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.
