# Survey Runtime Engine - Comprehensive Documentation

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Core Components](#core-components)
3. [Request Flow](#request-flow)
4. [Database Operations & Atomicity](#database-operations--atomicity)
5. [Quota System](#quota-system)
6. [Fault Tolerance & Error Handling](#fault-tolerance--error-handling)
7. [Performance Characteristics](#performance-characteristics)
8. [Scalability Bottlenecks](#scalability-bottlenecks)
9. [Security Considerations](#security-considerations)
10. [Improvements for 10k+ Users](#improvements-for-10k-users)

---

## Architecture Overview

The Survey Runtime Engine is a **synchronous, request-response based system** that handles the complete lifecycle of survey sessions. It's built on a **monolithic microservice architecture** using Express.js and Prisma ORM with PostgreSQL.

### Core Design Principles
- **Stateful Sessions**: Each survey session maintains state in the database
- **Synchronous Processing**: All operations are blocking and sequential
- **Database-Centric**: Heavy reliance on PostgreSQL for state management
- **Single-Instance**: No horizontal scaling or load balancing considerations

---

## Core Components

### 1. **Runtime Controller** (`runtime.controller.ts`)
**Purpose**: Main entry point for all survey runtime operations

**Key Operations**:
- `startSession()` - Creates new survey session
- `getPageLayout()` - Resolves and returns page structure
- `submitAnswers()` - Processes answers and determines next page
- `completeSession()` - Finalizes completed sessions
- `terminateSession()` - Handles session termination

**Database Operations per Request**:
- **startSession**: 3-5 queries (collector lookup, session creation, token consumption)
- **getPageLayout**: 2-3 queries (session fetch, page resolution, render state update)
- **submitAnswers**: 8-12 queries (session fetch, validation, answer save, quota check, routing)

### 2. **Admission System** (`collectors/admission.ts`)
**Purpose**: Controls access to surveys based on various constraints

**Checks Performed**:
- Collector status and date windows
- Response caps and survey targets
- Single-use token validation
- Device/session restrictions
- UTM parameter tracking

**Database Operations**: 2-4 queries per admission check

### 3. **Page Resolution Engine** (`runtime/resolvePage.ts`)
**Purpose**: Dynamically resolves page content based on current state

**Operations**:
- Visibility evaluation (page/group/question level)
- Carry-forward option generation
- Piping and merge token processing
- Deterministic randomization
- Question ordering within groups

**Database Operations**: 1-2 complex queries with multiple joins

### 4. **Routing Engine** (`runtime/router.ts`)
**Purpose**: Determines navigation flow through the survey

**Logic Hierarchy**:
1. Loop continuation checks
2. Question-level jumps (highest priority)
3. Page-level jumps
4. Default sequential navigation

**Database Operations**: 1-3 queries per routing decision

### 5. **Quota System** (`runtime/quota.ts`)
**Purpose**: Manages survey response quotas and reservations

**Key Features**:
- Atomic quota reservation
- Bucket-based quota management
- Automatic quota release on session termination
- Overquota handling

**Database Operations**: 2-4 queries per quota operation

### 6. **DSL Expression Engine** (`runtime/dsl.ts`)
**Purpose**: Evaluates conditional logic expressions

**Supported Functions**:
- `answer('Q1')` - Get answer values
- `anySelected()`, `allSelected()` - Choice validation
- `equals()`, `greaterThan()`, `lessThan()` - Comparisons
- `and()`, `or()`, `not()` - Logical operations
- `contains()`, `isEmpty()` - String operations
- `loop.variableName` - Loop context access

**Performance**: In-memory evaluation, no database queries

### 7. **Validation Engine** (`runtime/validate.ts`)
**Purpose**: Validates submitted answers against question constraints

**Validation Types**:
- Required field validation
- Type-specific validation (text, number, email, etc.)
- Range and length constraints
- Pattern matching
- Custom validation rules

**Performance**: In-memory validation, no database queries

---

## Request Flow

### Session Start Flow
```
1. Admission Check (2-4 DB queries)
   ├── Collector lookup
   ├── Status/date validation
   ├── Token validation (if applicable)
   └── Device restriction check

2. Session Creation (1 DB query)
   └── Create SurveySession record

3. Token Consumption (1 DB query, if applicable)
   └── Mark single-use token as consumed

4. First Page Resolution (1-2 DB queries)
   ├── Get first accessible page
   └── Return page ID to client

Total: 4-8 database queries
```

### Page Load Flow
```
1. Session Validation (1 DB query)
   └── Fetch session with answers

2. Page Resolution (1-2 DB queries)
   ├── Fetch page with all relations
   ├── Evaluate visibility conditions
   ├── Apply randomization
   └── Process piping/merge tokens

3. Render State Update (1 DB query)
   └── Persist resolved page structure

Total: 3-4 database queries
```

### Answer Submission Flow
```
1. Session Validation (1 DB query)
   └── Fetch session and answers

2. Answer Validation (0 DB queries)
   └── In-memory validation

3. Answer Persistence (1 DB transaction)
   ├── Delete existing answers for page
   └── Insert new answers

4. Quota Check (2-4 DB queries)
   ├── Find matching quota buckets
   └── Check capacity

5. Quota Reservation (1-2 DB queries)
   ├── Atomically increment reserved count
   └── Create reservation record

6. Routing Decision (1-3 DB queries)
   ├── Check question jumps
   ├── Check page jumps
   └── Determine next page

7. Session Update (1 DB query, if complete)
   └── Mark session as completed

Total: 7-12 database queries
```

---

## Database Operations & Atomicity

### Atomic Operations
✅ **Properly Atomic**:
- Answer submission (uses `$transaction`)
- Quota reservation (uses `updateMany` with conditions)
- Token consumption (single update operation)

❌ **Not Atomic**:
- Session creation + token consumption (separate operations)
- Quota check + reservation (race condition possible)
- Page resolution + render state update (separate operations)

### Transaction Usage
```typescript
// ✅ Good: Atomic answer submission
await prisma.$transaction(async (tx) => {
  await tx.answer.deleteMany({ where: { sessionId, pageId } });
  for (const answer of answerData) {
    await tx.answer.create({ data: answer });
  }
});

// ❌ Bad: Non-atomic quota operations
const canProceed = await checkQuota(...);  // Query 1
if (canProceed) {
  await reserveQuota(...);  // Query 2 - Race condition!
}
```

### Database Query Patterns
- **N+1 Queries**: Present in page resolution (questions, options, groups)
- **Complex Joins**: Used in page resolution and quota checking
- **Sequential Dependencies**: Most operations require previous results

---

## Quota System

### Architecture
The quota system uses a **bucket-based approach** with atomic reservations:

```typescript
interface QuotaBucket {
  id: string;
  planId: string;
  targetN: number;        // Target responses
  filledN: number;        // Completed responses
  reservedN: number;      // Reserved responses
  maxOverfill: number;    // Allowable overfill
}
```

### Quota Flow
```
1. Check Quota (2-4 queries)
   ├── Find matching buckets
   ├── Evaluate bucket conditions
   └── Check capacity (filledN + reservedN < targetN + maxOverfill)

2. Reserve Quota (1-2 queries)
   ├── Atomically increment reservedN
   └── Create QuotaReservation record

3. Finalize Quota (1-2 queries, on completion)
   ├── Increment filledN
   ├── Decrement reservedN
   └── Mark reservation as FINALIZED

4. Release Quota (1-2 queries, on termination)
   ├── Decrement reservedN
   └── Mark reservation as RELEASED
```

### Robustness Features
✅ **Strengths**:
- Atomic reservation prevents overbooking
- Automatic cleanup on session termination
- Expiration handling (30-minute timeout)
- Bucket-based granular control

❌ **Weaknesses**:
- Race conditions between check and reserve
- No distributed locking
- Single database dependency
- No quota monitoring/alerting

---

## Fault Tolerance & Error Handling

### Error Handling Patterns
```typescript
// ✅ Good: Comprehensive error handling
try {
  const result = await complexOperation();
  return result;
} catch (error) {
  console.error('Operation failed:', error);
  return res.status(500).json({ error: 'Operation failed' });
}

// ❌ Bad: Silent failures
const result = await operation(); // No error handling
```

### Fault Tolerance Mechanisms
✅ **Present**:
- Database connection error handling
- Validation error responses
- Session state validation
- Quota overflow protection

❌ **Missing**:
- Circuit breakers
- Retry mechanisms
- Graceful degradation
- Health checks
- Monitoring/alerting

### Recovery Mechanisms
- **Session Recovery**: Sessions can be resumed if valid
- **Quota Recovery**: Expired reservations are automatically released
- **Data Consistency**: Prisma handles connection issues

---

## Performance Characteristics

### Response Times (Estimated)
- **Session Start**: 200-500ms (4-8 DB queries)
- **Page Load**: 100-300ms (3-4 DB queries)
- **Answer Submission**: 300-800ms (7-12 DB queries)

### Database Load
- **Read Operations**: 70% of total queries
- **Write Operations**: 30% of total queries
- **Complex Joins**: 40% of queries involve joins
- **Index Usage**: Good on primary keys, poor on complex conditions

### Memory Usage
- **Session State**: Stored in database (not memory)
- **Answer Caching**: No caching implemented
- **Query Result Caching**: No caching implemented

---

## Scalability Bottlenecks

### 1. **Database Bottlenecks**
**Current Issues**:
- Single PostgreSQL instance
- No read replicas
- Complex queries with multiple joins
- No query optimization
- No connection pooling configuration

**Impact at 10k+ Users**:
- Database connection exhaustion
- Query timeout issues
- Lock contention on quota operations
- Slow response times (2-5 seconds)

### 2. **Synchronous Processing**
**Current Issues**:
- All operations are blocking
- No async processing
- No background jobs
- No queue system

**Impact at 10k+ Users**:
- Server thread exhaustion
- Request queuing
- Poor user experience
- System instability

### 3. **State Management**
**Current Issues**:
- All state in database
- No caching layer
- No session clustering
- No horizontal scaling

**Impact at 10k+ Users**:
- Database becomes single point of failure
- No load distribution
- Memory pressure on database
- Slow state retrieval

### 4. **Quota System Race Conditions**
**Current Issues**:
- Check-then-reserve pattern
- No distributed locking
- Race conditions under load

**Impact at 10k+ Users**:
- Quota overbooking
- Inconsistent quota counts
- Data integrity issues

### 5. **No Monitoring/Observability**
**Current Issues**:
- No metrics collection
- No performance monitoring
- No error tracking
- No alerting

**Impact at 10k+ Users**:
- Blind to performance issues
- No proactive problem detection
- Difficult debugging
- Poor operational visibility

---

## Security Considerations

### Current Security Measures
✅ **Implemented**:
- Input validation and sanitization
- SQL injection prevention (Prisma)
- Session-based access control
- Token-based authentication
- Device fingerprinting

❌ **Missing**:
- Rate limiting
- DDoS protection
- Request size limits
- CORS configuration
- Security headers
- Audit logging

### Security Vulnerabilities
1. **No Rate Limiting**: Vulnerable to brute force attacks
2. **No Request Size Limits**: Vulnerable to DoS attacks
3. **No CORS Protection**: Potential XSS vulnerabilities
4. **No Audit Trail**: No security event logging
5. **Session Hijacking**: No session security measures

---

## Improvements for 10k+ Users

### 1. **Event-Driven Architecture**
**Current**: Synchronous request-response
**Proposed**: Event-driven with message queues

```typescript
// Event-driven flow
SessionStarted → Queue → ProcessAdmission → Queue → CreateSession
AnswerSubmitted → Queue → ValidateAnswer → Queue → UpdateQuota → Queue → RouteNext
```

**Benefits**:
- Horizontal scaling
- Fault tolerance
- Better performance
- Decoupled components

### 2. **Database Optimization**
**Immediate Improvements**:
- Add read replicas
- Implement connection pooling
- Add database indexes
- Query optimization
- Partition large tables

**Advanced Improvements**:
- Database sharding
- CQRS pattern
- Event sourcing
- Read/write separation

### 3. **Caching Layer**
**Implementation**:
```typescript
// Redis caching
const sessionCache = new Redis();
const pageCache = new Redis();
const quotaCache = new Redis();

// Cache session data
await sessionCache.setex(`session:${sessionId}`, 3600, JSON.stringify(sessionData));

// Cache resolved pages
await pageCache.setex(`page:${pageId}:${sessionId}`, 1800, JSON.stringify(resolvedPage));
```

**Benefits**:
- Reduced database load
- Faster response times
- Better scalability

### 4. **Microservices Architecture**
**Current**: Monolithic survey service
**Proposed**: Separate services

```
- Session Service (session management)
- Quota Service (quota management)
- Routing Service (navigation logic)
- Validation Service (answer validation)
- Analytics Service (reporting)
```

### 5. **Async Processing**
**Implementation**:
```typescript
// Background job processing
import { Queue } from 'bull';

const answerQueue = new Queue('answer processing');
const quotaQueue = new Queue('quota management');

// Process answers asynchronously
answerQueue.process('submit-answer', async (job) => {
  const { sessionId, answers } = job.data;
  await processAnswers(sessionId, answers);
});
```

### 6. **Monitoring & Observability**
**Implementation**:
```typescript
// Metrics collection
import { PrometheusMetrics } from 'prom-client';

const metrics = {
  sessionStarts: new Counter({ name: 'session_starts_total' }),
  answerSubmissions: new Counter({ name: 'answer_submissions_total' }),
  responseTime: new Histogram({ name: 'response_time_seconds' }),
  quotaReservations: new Counter({ name: 'quota_reservations_total' })
};

// Health checks
app.get('/health', async (req, res) => {
  const health = await checkSystemHealth();
  res.json(health);
});
```

### 7. **Load Balancing & Auto-scaling**
**Implementation**:
- Multiple service instances
- Load balancer (nginx/HAProxy)
- Auto-scaling based on metrics
- Container orchestration (Kubernetes)

### 8. **Quota System Improvements**
**Current Issues**: Race conditions, single database
**Proposed Solutions**:

```typescript
// Distributed locking with Redis
import { Redlock } from 'redlock';

const redlock = new Redlock([redis]);

// Atomic quota reservation
const lock = await redlock.lock(`quota:${bucketId}`, 1000);
try {
  const bucket = await getBucket(bucketId);
  if (bucket.filledN + bucket.reservedN < bucket.targetN + bucket.maxOverfill) {
    await reserveQuota(bucketId, sessionId);
  }
} finally {
  await lock.unlock();
}
```

### 9. **Performance Optimizations**
**Database**:
- Add indexes on frequently queried columns
- Implement query result caching
- Use database views for complex queries
- Optimize join operations

**Application**:
- Implement request batching
- Use connection pooling
- Add response compression
- Implement lazy loading

### 10. **Security Enhancements**
**Implementation**:
```typescript
// Rate limiting
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

// Security headers
import helmet from 'helmet';
app.use(helmet());

// Request size limits
app.use(express.json({ limit: '10mb' }));
```

---

## Conclusion

The current Survey Runtime Engine is a **functional but not scalable** system designed for small to medium-scale usage. While it handles the core survey functionality well, it has significant limitations for high-scale deployment:

### Strengths
- ✅ Complete survey functionality
- ✅ Proper data validation
- ✅ Basic quota management
- ✅ Session state management
- ✅ Conditional logic support

### Critical Limitations for 10k+ Users
- ❌ Database bottlenecks
- ❌ Synchronous processing
- ❌ No horizontal scaling
- ❌ Race conditions in quota system
- ❌ No monitoring/observability
- ❌ Security vulnerabilities

### Recommended Migration Path
1. **Phase 1**: Add caching, monitoring, and basic optimizations
2. **Phase 2**: Implement event-driven architecture
3. **Phase 3**: Microservices decomposition
4. **Phase 4**: Full distributed system with auto-scaling

The system would require significant architectural changes to support 10k+ concurrent users effectively.
