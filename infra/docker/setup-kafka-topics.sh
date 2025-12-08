#!/bin/bash

# Setup Kafka Topics for Survey Service
# Run this script after starting the Kafka container

echo "🚀 Setting up Kafka topics for Survey Service..."

# Wait for Kafka to be ready
echo "⏳ Waiting for Kafka to be ready..."
until docker exec kafka kafka-topics.sh --bootstrap-server localhost:9092 --list > /dev/null 2>&1; do
  echo "Waiting for Kafka..."
  sleep 5
done

echo "✅ Kafka is ready!"

# Create topics with proper partitioning
echo "📝 Creating Kafka topics..."

# Runtime Sessions Topic
echo "Creating runtime.sessions topic..."
docker exec kafka kafka-topics.sh \
  --create \
  --topic runtime.sessions \
  --bootstrap-server localhost:9092 \
  --partitions 3 \
  --replication-factor 1 \
  --config cleanup.policy=delete \
  --config retention.ms=604800000

# Runtime Answers Topic
echo "Creating runtime.answers topic..."
docker exec kafka kafka-topics.sh \
  --create \
  --topic runtime.answers \
  --bootstrap-server localhost:9092 \
  --partitions 3 \
  --replication-factor 1 \
  --config cleanup.policy=delete \
  --config retention.ms=604800000

# Runtime Quota Topic
echo "Creating runtime.quota topic..."
docker exec kafka kafka-topics.sh \
  --create \
  --topic runtime.quota \
  --bootstrap-server localhost:9092 \
  --partitions 3 \
  --replication-factor 1 \
  --config cleanup.policy=delete \
  --config retention.ms=604800000

# Collectors Events Topic
echo "Creating collectors.events topic..."
docker exec kafka kafka-topics.sh \
  --create \
  --topic collectors.events \
  --bootstrap-server localhost:9092 \
  --partitions 3 \
  --replication-factor 1 \
  --config cleanup.policy=delete \
  --config retention.ms=604800000

# Dead Letter Queue Topic
echo "Creating dlq.survey-service topic..."
docker exec kafka kafka-topics.sh \
  --create \
  --topic dlq.survey-service \
  --bootstrap-server localhost:9092 \
  --partitions 1 \
  --replication-factor 1 \
  --config cleanup.policy=delete \
  --config retention.ms=2592000000

echo "✅ All topics created successfully!"

# List all topics
echo "📋 Current topics:"
docker exec kafka kafka-topics.sh --bootstrap-server localhost:9092 --list

echo ""
echo "🎉 Kafka setup complete!"
echo ""
echo "📊 You can monitor topics at: http://localhost:9000"
echo "🔧 Topics created:"
echo "   - runtime.sessions (3 partitions)"
echo "   - runtime.answers (3 partitions)"
echo "   - runtime.quota (3 partitions)"
echo "   - collectors.events (3 partitions)"
echo "   - dlq.survey-service (1 partition)"
echo ""
echo "💡 Next steps:"
echo "   1. Start your survey service"
echo "   2. Monitor events in Kafka UI"
echo "   3. Check Redis for cached data"
echo "   4. Verify PostgreSQL for persistent data"
