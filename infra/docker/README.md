# Infrastructure Setup Guide

This directory contains Docker Compose configurations for the Survey Service infrastructure.

## Quick Start

### Option 1: Minimal Setup (Kafka + Redis only)
```bash
# Start basic infrastructure
docker-compose up -d

# Setup Kafka topics
chmod +x setup-kafka-topics.sh
./setup-kafka-topics.sh
```

### Option 2: Full Development Setup (includes PostgreSQL + monitoring)
```bash
# Start complete infrastructure
docker-compose -f docker-compose.full.yml up -d

# Setup Kafka topics
chmod +x setup-kafka-topics.sh
./setup-kafka-topics.sh
```

## Services Overview

### Core Services

| Service | Port | Description |
|---------|------|-------------|
| **PostgreSQL** | 5432 | Primary database for survey data |
| **Redis** | 6379 | Cache and session storage |
| **Kafka** | 9092 | Event streaming platform |

### Monitoring & Management

| Service | Port | Description |
|---------|------|-------------|
| **Kafka UI** | 9000 | Kafka cluster monitoring |
| **Redis Commander** | 8081 | Redis data browser |
| **pgAdmin** | 8080 | PostgreSQL administration |

## Environment Configuration

### For Survey Service (.env)
```bash
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/rc_survey_db

# Kafka
KAFKA_BROKERS=localhost:9092
KAFKA_TOPICS_SESSIONS=runtime.sessions
KAFKA_TOPICS_ANSWERS=runtime.answers
KAFKA_TOPICS_QUOTA=runtime.quota
KAFKA_TOPICS_COLLECTORS=collectors.events

# Redis
REDIS_URL=redis://localhost:6379
```

## Kafka Topics

The setup script creates these topics:

- **runtime.sessions** (3 partitions) - Session lifecycle events
- **runtime.answers** (3 partitions) - Answer submission events  
- **runtime.quota** (3 partitions) - Quota management events
- **collectors.events** (3 partitions) - Collector lifecycle events
- **dlq.survey-service** (1 partition) - Dead letter queue

## Monitoring URLs

- **Kafka UI**: http://localhost:9000
- **Redis Commander**: http://localhost:8081
- **pgAdmin**: http://localhost:8080 (admin@example.com / admin)

## Health Checks

All services include health checks. Check status with:

```bash
# Check all services
docker-compose ps

# Check specific service logs
docker-compose logs kafka
docker-compose logs redis
docker-compose logs postgres
```

## Data Persistence

Data is persisted in Docker volumes:

- `postgres-data` - PostgreSQL data
- `redis-data` - Redis data
- `kafka-data` - Kafka logs
- `pgadmin-data` - pgAdmin configuration

## Troubleshooting

### Common Issues

1. **Port Conflicts**
   ```bash
   # Check what's using ports
   netstat -tulpn | grep :5432
   netstat -tulpn | grep :6379
   netstat -tulpn | grep :9092
   ```

2. **Kafka Not Ready**
   ```bash
   # Check Kafka logs
   docker-compose logs kafka
   
   # Wait for Kafka to be ready
   docker exec kafka kafka-topics.sh --bootstrap-server localhost:9092 --list
   ```

3. **Database Connection Issues**
   ```bash
   # Test PostgreSQL connection
   docker exec postgres psql -U postgres -d rc_survey_db -c "SELECT 1;"
   ```

4. **Redis Connection Issues**
   ```bash
   # Test Redis connection
   docker exec redis redis-cli ping
   ```

### Reset Everything

```bash
# Stop and remove all containers
docker-compose down -v

# Remove all volumes (WARNING: deletes all data)
docker volume prune

# Start fresh
docker-compose up -d
```

## Production Considerations

For production deployment:

1. **Use managed services**:
   - AWS RDS for PostgreSQL
   - AWS ElastiCache for Redis
   - AWS MSK for Kafka

2. **Security**:
   - Use strong passwords
   - Enable SSL/TLS
   - Configure firewall rules
   - Use secrets management

3. **Monitoring**:
   - Set up proper alerting
   - Monitor resource usage
   - Track performance metrics

4. **Backup**:
   - Regular database backups
   - Kafka topic replication
   - Redis persistence configuration

## Development Workflow

1. **Start infrastructure**:
   ```bash
   docker-compose -f docker-compose.full.yml up -d
   ```

2. **Setup topics**:
   ```bash
   ./setup-kafka-topics.sh
   ```

3. **Run migrations**:
   ```bash
   cd ../../services/survey-service
   npx prisma migrate dev
   ```

4. **Start survey service**:
   ```bash
   npm run dev
   ```

5. **Monitor events**:
   - Open Kafka UI: http://localhost:9000
   - Check Redis: http://localhost:8081
   - View database: http://localhost:8080

## Performance Tuning

### PostgreSQL
```sql
-- Connection pooling
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
```

### Redis
```bash
# Memory optimization
redis-cli CONFIG SET maxmemory 512mb
redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

### Kafka
```properties
# Producer settings
batch.size=16384
linger.ms=5
compression.type=lz4

# Consumer settings
fetch.min.bytes=1
fetch.max.wait.ms=500
```
