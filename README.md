# 🚀 RC Survey Builder Platform

A modern, scalable survey builder platform built with microservices architecture, designed for creating, managing, and analyzing surveys with advanced features like branching logic, quota management, and real-time analytics.

## Disclaimer: I (Jyotindra) have contributed a lot in this doc, so please make sure to read it thoroughly and understand what's the whole purpose of Survey Builder.

## Note: We need to figure out our DB Per service or a single DB for everything. Will brief you on Monday.

### Survey Builder has various complex logic nodes such as:
1. Build Questions (with Question Types)
2. Question Looping Logic
3. Quota Assignment (per question or per option)
4. Randomly Assign Quotas
5. Survey Loop
6. Piping Questions
7. Branching
8. Randomizer (Options)
9. Shuffling Groups (Questions and Options both)
10. Logical Nodes (If answer is 'BMW' then show him Q3 & Q4 both and if his answer is 'AUDI' then skip Q3 & Q4.)
11. ... and much more.

### This DOC might contain sections with this tag: <- Jyotindra: We are not there yet
## Consider reading it thoroughly.

## 📋 Table of Contents

- [🏗️ Architecture Overview](#️-architecture-overview)
- [🔄 Microservices Architecture](#-microservices-architecture)
- [⚡ Event-Driven Design](#-event-driven-design)
- [🛠️ Technology Stack](#️-technology-stack)
- [📁 Project Structure](#-project-structure)
- [🚀 Getting Started](#-getting-started)
- [🔧 Development Guidelines](#-development-guidelines)
- [📊 Database Strategy](#-database-strategy)
- [🔐 Security & Best Practices](#-security--best-practices)
- [📈 Deployment & Scaling](#-deployment--scaling)

## 🏗️ Architecture Overview

Our platform follows a **microservices architecture** pattern, where each service is responsible for a specific business domain. This approach provides:

- **Scalability**: Each service can be scaled independently
- **Maintainability**: Clear separation of concerns
- **Technology Flexibility**: Different services can use different technologies if needed
- **Team Autonomy**: Teams can work on different services simultaneously - Merge Conflicts can arise but if we are working on different services and in independent branches, then we can reduce our conflict headache.
- **Fault Isolation**: Issues in one service don't affect others

### Core Principles

1. **Single Responsibility**: Each service handles one business domain
2. **Loose Coupling**: Services communicate via APIs and events
3. **High Cohesion**: Related functionality is grouped together
4. **Independent Deployment**: Services can be deployed separately
5. **Data Isolation**: Each service owns its data <- Jyotindra: We still need to figure out that we should keep DB per service or a single DB.

## 🔄 Microservices Architecture

### Service Breakdown

| Service | Port | Responsibility | Key Features |
|---------|------|----------------|--------------|
| **auth-service** | 3001 | Authentication & Authorization | User management, JWT tokens, role-based access |
| **survey-service** | 3002 | Survey Management | Survey creation, questions, logic, analytics |
| **response-service** | 3003 | Response Handling | Data ingestion, deduplication, webhooks |
| **panel-service** | 3004 | Panel Management | Participant management, quota checking |
| **project-service** | 3005 | Project Management | Project linking, reporting, coordination |

### Service Communication

```
┌─────────────────┐    HTTP/REST    ┌─────────────────┐
│   Frontend      │◄──────────────►│  auth-service   │
│   (Next.js)     │                 │   (Port: 3001)  │
└─────────────────┘                 └─────────────────┘
         │                                   │
         │                                   │
         ▼                                   ▼
┌─────────────────┐                 ┌─────────────────┐
│  survey-service │◄────────────────┤  panel-service  │
│   (Port: 3002)  │    Kafka Events │   (Port: 3004)  │
└─────────────────┘                 └─────────────────┘
         │                                   │
         │                                   │
         ▼                                   ▼
┌─────────────────┐                 ┌─────────────────┐
│ response-service│◄────────────────┤ project-service │
│   (Port: 3003)  │    Kafka Events │   (Port: 3005)  │
└─────────────────┘                 └─────────────────┘
```

## ⚡ Event-Driven Design <- Jyotindra: We are not there yet

### Why Event-Driven Architecture?

- **Decoupled Services**: Services don't need to know about each other directly
- **Scalability**: Easy to add new services that react to events
- **Reliability**: Events can be replayed if processing fails
- **Real-time Processing**: Immediate reaction to state changes

### Event Flow Examples

#### Survey Creation Flow
```
1. Frontend → survey-service: Create survey
2. survey-service → Kafka: SurveyCreated event
3. project-service ← Kafka: Updates project statistics
4. panel-service ← Kafka: Checks quota availability
```

#### Response Submission Flow
```
1. Frontend → response-service: Submit response
2. response-service → Kafka: ResponseSubmitted event
3. survey-service ← Kafka: Updates survey analytics
4. panel-service ← Kafka: Updates participant status
5. project-service ← Kafka: Updates project metrics
```

### Kafka Topics Structure
```
rc-survey.surveys.*     # Survey-related events
rc-survey.responses.*   # Response-related events
rc-survey.panels.*      # Panel-related events
rc-survey.projects.*    # Project-related events
rc-survey.auth.*        # Authentication events
```

## 🛠️ Technology Stack

### Backend Services
- **Runtime**: Node.js 18+
- **Language**: TypeScript 5.8+
- **Framework**: Express.js
- **Database**: PostgreSQL (NeonDB)
- **ORM**: Prisma
- **Message Broker**: Apache Kafka
- **Authentication**: JWT + bcrypt
- **Validation**: Joi
- **Security**: Helmet, CORS, Rate Limiting

### Frontend
- **Framework**: Next.js
- **Language**: TypeScript
- **UI Library**: React
- **Styling**: Tailwind CSS
- **State Management**: Zustand/Redux Toolkit

### Infrastructure
- **Containerization**: Docker
- **Orchestration**: Docker Compose (dev) / Kubernetes (prod)
- **Package Manager**: Yarn
- **Monorepo Tool**: Turbo
- **CI/CD**: GitHub Actions

### Development Tools
- **Linting**: ESLint
- **Formatting**: Prettier
- **Type Checking**: TypeScript
- **Database GUI**: Prisma Studio

## 📁 Project Structure

```
rc-survey-microservice/
├── 📦 apps/                          # Frontend applications
│   ├── web/                         # Main Next.js application
│   └── docs/                        # Documentation site
│
├── 🔧 packages/                     # Shared packages
│   ├── eslint-config/              # Shared ESLint configuration
│   ├── typescript-config/          # Shared TypeScript configuration
│   └── ui/                         # Shared UI components
│
├── 🚀 services/                     # Microservices
│   ├── auth-service/               # Authentication service
│   │   ├── src/
│   │   │   ├── routes/            # API routes
│   │   │   ├── controllers/       # Request handlers
│   │   │   └── index.ts           # Service entry point
│   │   ├── prisma/                # Database schema & migrations
│   │   ├── package.json           # Service dependencies
│   │   ├── tsconfig.json          # TypeScript configuration
│   │   ├── Dockerfile             # Container configuration
│   │   └── env.example            # Environment variables template
│   │
│   ├── survey-service/            # Survey management service
│   │   ├── src/
│   │   │   ├── questions/         # Question management
│   │   │   ├── quota-logic/       # Quota management
│   │   │   ├── branching/         # Survey branching logic
│   │   │   ├── logic-nodes/       # Logic node handling
│   │   │   ├── shuffling-grouping/# Question randomization
│   │   │   ├── survey-links/      # Survey link generation
│   │   │   ├── analytics/         # Survey analytics
│   │   │   ├── events/            # Kafka event handlers
│   │   │   └── index.ts
│   │   └── ...
│   │
│   ├── response-service/          # Response handling service
│   │   ├── src/
│   │   │   ├── ingestion/         # Response data ingestion
│   │   │   ├── deduplication/     # Duplicate detection
│   │   │   ├── webhook/           # Webhook management
│   │   │   ├── events/            # Kafka event handlers
│   │   │   └── index.ts
│   │   └── ...
│   │
│   ├── panel-service/             # Panel management service
│   │   ├── src/
│   │   │   ├── admin/             # Panel administration
│   │   │   ├── participant/       # Participant management
│   │   │   ├── quota-check/       # Quota validation
│   │   │   ├── events/            # Kafka event handlers
│   │   │   └── index.ts
│   │   └── ...
│   │
│   └── project-service/           # Project management service
│       ├── src/
│       │   ├── projects/          # Project management
│       │   ├── linking/           # Service linking logic
│       │   ├── reporting/         # Project reporting
│       │   ├── events/            # Kafka event handlers
│       │   └── index.ts
│       └── ...
│
├── 📄 package.json                 # Root package.json
├── 📄 turbo.json                   # Turbo configuration
├── 📄 README.md                    # This file
└── 📄 .gitignore                   # Git ignore rules
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Yarn package manager
- Docker & Docker Compose
- PostgreSQL database (NeonDB recommended)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd rc-survey-microservice
   ```

2. **Install dependencies**
   ```bash
   yarn install
   ```

3. **Set up environment variables**
   ```bash
   # Copy environment templates for each service
   cp services/auth-service/env.example services/auth-service/.env
   cp services/survey-service/env.example services/survey-service/.env
   cp services/response-service/env.example services/response-service/.env
   cp services/panel-service/env.example services/panel-service/.env
   cp services/project-service/env.example services/project-service/.env
   ```

4. **Configure database URLs**
   ```bash
   # Update each .env file with your NeonDB connection strings
   DATABASE_URL="postgresql://username:password@host:port/database?sslmode=require"
   ```

5. **Set up databases**
   ```bash
   # Generate Prisma clients and push schemas
   yarn workspace @rc-survey/auth-service db:generate
   yarn workspace @rc-survey/auth-service db:push
   # Repeat for other services...
   ```

6. **Start development servers**
   ```bash
   # Start all services
   yarn dev
   
   # Or start individual services
   yarn workspace @rc-survey/auth-service dev
   yarn workspace @rc-survey/survey-service dev
   ```

### Development Commands

```bash
# Build all services
yarn build

# Run linting
yarn lint

# Type checking
yarn check-types

# Format code
yarn format

# Start specific service
yarn workspace @rc-survey/auth-service dev

# Database operations
yarn workspace @rc-survey/auth-service db:studio
yarn workspace @rc-survey/auth-service db:migrate
```

## 🔧 Development Guidelines

### Code Organization

1. **Service Independence**: Each service should be self-contained
2. **Clear Separation**: Keep routes, controllers, and services separate
3. **Type Safety**: Use TypeScript interfaces for all data structures
4. **Error Handling**: Implement proper error handling and logging
5. **Testing**: Write unit and integration tests for each service

### API Design Principles

1. **RESTful Design**: Follow REST conventions
2. **Consistent Response Format**: Use standardized response structures
3. **Proper HTTP Status Codes**: Return appropriate status codes
4. **Input Validation**: Validate all inputs using Joi schemas
5. **Rate Limiting**: Implement rate limiting for all endpoints

### Event Design Principles

1. **Event Naming**: Use descriptive, past-tense event names
2. **Event Versioning**: Include version information in events
3. **Event Schema**: Define clear schemas for all events
4. **Idempotency**: Design events to be idempotent
5. **Error Handling**: Implement dead letter queues for failed events

## 📊 Database Strategy

### Why PostgreSQL over MongoDB?

1. **ACID Compliance**: Better data consistency for survey responses
2. **Complex Queries**: Better support for analytics and reporting
3. **Relationships**: Natural support for relational data
4. **Transactions**: Critical for maintaining data integrity
5. **Performance**: Better performance for read-heavy workloads

### Database Per Service Strategy <- Jyotindra: We are not there yet

Each service has its own database schema within PostgreSQL:

- **auth_db**: User management, authentication
- **survey_db**: Survey definitions, questions, logic
- **response_db**: Survey responses, analytics
- **panel_db**: Panel management, participants
- **project_db**: Project coordination, reporting

### Prisma Schema Strategy <- Jyotindra: We are not there yet

Each service maintains its own Prisma schema with only the models it needs:

```prisma
// auth-service/schema.prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  // ... auth-specific fields
}

// survey-service/schema.prisma
model Survey {
  id          String   @id @default(cuid())
  title       String
  questions   Question[]
  // ... survey-specific fields
}
```

## 🔐 Security & Best Practices <- Jyotindra: We are focusing to implement this

### Authentication & Authorization

1. **JWT Tokens**: Secure token-based authentication
2. **Role-Based Access**: Implement RBAC for different user types
3. **Token Refresh**: Implement secure token refresh mechanism
4. **Password Security**: Use bcrypt for password hashing

### API Security

1. **HTTPS Only**: Enforce HTTPS in production
2. **CORS Configuration**: Proper CORS setup for frontend
3. **Rate Limiting**: Prevent abuse with rate limiting
4. **Input Sanitization**: Sanitize all user inputs
5. **Helmet.js**: Security headers with Helmet

### Data Protection

1. **Encryption**: Encrypt sensitive data at rest
2. **Data Minimization**: Only collect necessary data
3. **Audit Logging**: Log all data access and modifications
4. **Backup Strategy**: Regular database backups
5. **GDPR Compliance**: Implement data deletion and export

## 📈 Deployment & Scaling

### Development Environment

```bash
# Local development with Docker Compose
docker-compose up -d

# Individual service development
yarn workspace @rc-survey/auth-service dev
```

### Production Deployment

1. **Container Orchestration**: Use Kubernetes for production
2. **Load Balancing**: Implement proper load balancing
3. **Auto-scaling**: Configure auto-scaling based on metrics
4. **Monitoring**: Set up comprehensive monitoring and alerting
5. **CI/CD**: Automated deployment pipelines

### Scaling Strategies <- Jyotindra: We are not there yet

1. **Horizontal Scaling**: Scale services independently
2. **Database Scaling**: Use read replicas for read-heavy workloads
3. **Caching**: Implement Redis for caching
4. **CDN**: Use CDN for static assets
5. **Microservice Patterns**: Implement circuit breakers, bulkheads

## 🤝 Contributing

1. **Branch Strategy**: Use feature branches for development
2. **Code Review**: All changes require code review
3. **Testing**: Maintain high test coverage
4. **Documentation**: Keep documentation up to date
5. **Standards**: Follow established coding standards

## 📞 Support

For questions and support:
- **Technical Issues**: Create GitHub issues
- **Architecture Questions**: Contact the architecture team
- **Database Issues**: Contact the DevOps team

---

**Built with ❤️ by the RC Tech Team**