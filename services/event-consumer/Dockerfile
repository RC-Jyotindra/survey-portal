FROM node:18-alpine

WORKDIR /app

# Copy root package.json and yarn.lock for workspace setup
COPY package.json yarn.lock ./

# Copy workspace packages
COPY packages/event-bus ./packages/event-bus
COPY packages/database ./packages/database

# Copy event-consumer package files
COPY services/event-consumer/package*.json ./services/event-consumer/

# Install dependencies for the entire workspace
RUN yarn install --frozen-lockfile

# Copy event-consumer source code
COPY services/event-consumer/src ./services/event-consumer/src
COPY services/event-consumer/tsconfig.json ./services/event-consumer/

# Build the event-consumer
WORKDIR /app/services/event-consumer
RUN npm run build

# Start the consumer (no port needed - it's a background service)
CMD ["npm", "start"]
