# Database Setup

## First Time Setup
1. Copy `.env.example` to `.env` and configure your database URL
2. Run `yarn install`
3. Run `yarn db:generate`
4. Run `yarn db:migrate:deploy`

## When pulling new changes
1. `git pull origin main`
2. `yarn install`
3. `yarn db:generate`
4. `yarn db:migrate:deploy`

## Making schema changes
1. Edit `prisma/schema.prisma`
2. Run `yarn db:migrate --name "descriptive_name"`
3. Commit both schema and migration files