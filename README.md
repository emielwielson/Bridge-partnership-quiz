# Bridge Partnership Quiz App

A web application designed to help bridge partnerships test and align their bidding agreements.

## Tech Stack

- **Framework**: Next.js 14+ with App Router
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Session-based authentication

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and add your PostgreSQL connection string and session secret.

4. Set up the database:
   ```bash
   npx prisma migrate dev
   ```

5. Run the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Commands

- Generate Prisma Client: `npm run db:generate`
- Run migrations: `npm run db:migrate`
- Open Prisma Studio: `npm run db:studio`

## Project Structure

- `app/` - Next.js App Router pages and API routes
- `components/` - React components
- `lib/` - Utility functions and business logic
- `prisma/` - Database schema and migrations

