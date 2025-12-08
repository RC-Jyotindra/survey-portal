# Environment Configuration Guide

## Overview
This guide explains how to configure the survey service for different environments with the event-driven architecture.

## Environment Files

### Development (.env)
```bash
# Server Configuration
PORT=3002
NODE_ENV=development

# Database Configuration
DATABASE_URL=postgresql://postgres:password@localhost:5432/rc_survey_db

# JWT Configuration
JWT_SECRET=dev-jwt-secret-key-change-in-production

# Kafka Configuration (matches docker-compose.yml)
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=survey-service-dev
KAFKA_GROUP_ID=survey-service-group-dev
KAFKA_TOPICS_SESSIONS=runtime.sessions
KAFKA_TOPICS_ANSWERS=runtime.answers
KAFKA_TOPICS_QUOTA=runtime.quota
KAFKA_TOPICS_COLLECTORS=collectors.events

# Redis Configuration (matches docker-compose.yml)
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=
REDIS_DB=0

# Outbox Configuration
OUTBOX_BATCH_SIZE=50
OUTBOX_POLL_INTERVAL_MS=2000
OUTBOX_MAX_ATTEMPTS=3
OUTBOX_RETRY_BACKOFF_MS=3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000

# CORS Configuration
CORS_ORIGIN=http://localhost:3000

# Service URLs
AUTH_SERVICE_URL=http://localhost:3001

# Monitoring & Observability
ENABLE_METRICS=true
METRICS_PORT=9090
LOG_LEVEL=debug

# Event-Driven Architecture Settings
EVENT_ENABLED=true
EVENT_REPLAY_ENABLED=true
EVENT_DLQ_ENABLED=true

# Development-specific settings
DEBUG_EVENTS=true
SKIP_QUOTA_CHECKS=false
MOCK_PAYMENT_PROCESSING=true
```

### Production (.env.production)
```bash
# Server Configuration
PORT=3002
NODE_ENV=production

# Database Configuration (with connection pooling)
DATABASE_URL=postgresql://username:password@db-host:5432/rc_survey_db?connection_limit=20&pool_timeout=20

# JWT Configuration
JWT_SECRET=your-super-secure-jwt-secret-key-min-32-chars

# Kafka Configuration (managed Kafka service)
KAFKA_BROKERS=kafka-cluster-1:9092,kafka-cluster-2:9092,kafka-cluster-3:9092
KAFKA_CLIENT_ID=survey-service-prod
KAFKA_GROUP_ID=survey-service-group-prod
KAFKA_TOPICS_SESSIONS=runtime.sessions
KAFKA_TOPICS_ANSWERS=runtime.answers
KAFKA_TOPICS_QUOTA=runtime.quota
KAFKA_TOPICS_COLLECTORS=collectors.events

# Redis Configuration (managed Redis service)
REDIS_URL=redis://redis-cluster:6379
REDIS_PASSWORD=your-redis-password
REDIS_DB=0

# Outbox Configuration (optimized for production)
OUTBOX_BATCH_SIZE=100
OUTBOX_POLL_INTERVAL_MS=1000
OUTBOX_MAX_ATTEMPTS=5
OUTBOX_RETRY_BACKOFF_MS=5000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS Configuration
CORS_ORIGIN=https://yourdomain.com

# Service URLs
AUTH_SERVICE_URL=https://auth.yourdomain.com

# Monitoring & Observability
ENABLE_METRICS=true
METRICS_PORT=9090
LOG_LEVEL=info

# Event-Driven Architecture Settings
EVENT_ENABLED=true
EVENT_REPLAY_ENABLED=false
EVENT_DLQ_ENABLED=true

# Production-specific settings
DEBUG_EVENTS=false
SKIP_QUOTA_CHECKS=false
MOCK_PAYMENT_PROCESSING=false

# Security
HELMET_ENABLED=true
TRUST_PROXY=true

# Performance
ENABLE_COMPRESSION=true
ENABLE_CACHING=true
CACHE_TTL_SECONDS=300
```

## Configuration Explanations

### Kafka Topics
- `runtime.sessions`: Session lifecycle events (started, completed, terminated)
- `runtime.answers`: Answer submission events
- `runtime.quota`: Quota management events (reserved, released, finalized)
- `collectors.events`: Collector lifecycle events

### Outbox Configuration
- `OUTBOX_BATCH_SIZE`: Number of events to process in one batch
- `OUTBOX_POLL_INTERVAL_MS`: How often to check for new events
- `OUTBOX_MAX_ATTEMPTS`: Maximum retry attempts before moving to DLQ
- `OUTBOX_RETRY_BACKOFF_MS`: Backoff time between retries

### Redis Usage
- Session state caching
- Rate limiting counters
- Survey definition caching
- Real-time dashboard counters

### Monitoring
- `ENABLE_METRICS`: Enable Prometheus metrics
- `METRICS_PORT`: Port for metrics endpoint
- `LOG_LEVEL`: Logging level (debug, info, warn, error)

## Setup Instructions

### 1. Start Infrastructure
```bash
cd infra/docker
docker-compose up -d
```

### 2. Create Kafka Topics
```bash
# Connect to Kafka container
docker exec -it kafka bash

# Create topics
kafka-topics.sh --create --topic runtime.sessions --bootstrap-server localhost:9092 --partitions 3 --replication-factor 1
kafka-topics.sh --create --topic runtime.answers --bootstrap-server localhost:9092 --partitions 3 --replication-factor 1
kafka-topics.sh --create --topic runtime.quota --bootstrap-server localhost:9092 --partitions 3 --replication-factor 1
kafka-topics.sh --create --topic collectors.events --bootstrap-server localhost:9092 --partitions 3 --replication-factor 1
```

### 3. Set Environment Variables
```bash
# Copy example to actual env file
cp env.example .env

# Edit with your actual values
nano .env
```

### 4. Run Database Migrations
```bash
npx prisma migrate dev
```

### 5. Start the Service
```bash
npm run dev
```

## Verification

### Check Kafka UI
- Open http://localhost:9000
- Verify topics are created
- Monitor message flow

### Check Redis
```bash
redis-cli -h localhost -p 6379 ping
```

### Check Metrics
- Open http://localhost:9090/metrics
- Verify Prometheus metrics are exposed

## Troubleshooting

### Common Issues

1. **Kafka Connection Failed**
   - Ensure Kafka is running: `docker ps`
   - Check KAFKA_BROKERS in .env
   - Verify network connectivity

2. **Redis Connection Failed**
   - Ensure Redis is running: `docker ps`
   - Check REDIS_URL in .env
   - Verify Redis is accepting connections

3. **Database Connection Failed**
   - Check DATABASE_URL format
   - Ensure PostgreSQL is running
   - Verify credentials and permissions

4. **Outbox Events Not Processing**
   - Check OUTBOX_ENABLED=true
   - Verify outbox relay is running
   - Check Kafka connectivity
   - Monitor outbox table for pending events
