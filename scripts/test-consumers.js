#!/usr/bin/env node

const { exec } = require('child_process');
const util = require('util');

const execAsync = util.promisify(exec);

async function testConsumers() {
  console.log('🧪 Testing Consumer Services...\n');

  try {
    // Test Redis connection
    console.log('1. Testing Redis connection...');
    const redisTest = await execAsync('docker exec redis redis-cli ping');
    console.log('✅ Redis:', redisTest.stdout.trim());

    // Test Kafka topics
    console.log('\n2. Testing Kafka topics...');
    const topicsTest = await execAsync('docker exec kafka kafka-topics.sh --bootstrap-server localhost:9092 --list');
    console.log('✅ Kafka topics:', topicsTest.stdout.trim());

    // Test consumer services (if running)
    console.log('\n3. Testing Consumer Services...');
    
    try {
      const quotaConsumer = await execAsync('docker exec quota-consumer node -e "console.log(\'Quota Consumer: OK\')"');
      console.log('✅ Quota Consumer:', quotaConsumer.stdout.trim());
    } catch (error) {
      console.log('❌ Quota Consumer: Not running');
    }

    try {
      const sessionConsumer = await execAsync('docker exec session-consumer node -e "console.log(\'Session Consumer: OK\')"');
      console.log('✅ Session Consumer:', sessionConsumer.stdout.trim());
    } catch (error) {
      console.log('❌ Session Consumer: Not running');
    }

    try {
      const answerConsumer = await execAsync('docker exec answer-consumer node -e "console.log(\'Answer Consumer: OK\')"');
      console.log('✅ Answer Consumer:', answerConsumer.stdout.trim());
    } catch (error) {
      console.log('❌ Answer Consumer: Not running');
    }

    // Test Redis data
    console.log('\n4. Testing Redis data...');
    const redisKeys = await execAsync('docker exec redis redis-cli KEYS "*"');
    const keys = redisKeys.stdout.trim().split('\n').filter(key => key.length > 0);
    
    if (keys.length > 0) {
      console.log(`✅ Redis has ${keys.length} keys:`);
      keys.slice(0, 10).forEach(key => console.log(`   - ${key}`));
      if (keys.length > 10) {
        console.log(`   ... and ${keys.length - 10} more`);
      }
    } else {
      console.log('⚠️ Redis is empty (consumers may not be processing events yet)');
    }

    console.log('\n🎉 Consumer test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testConsumers();
