module.exports = {
    apps: [
      {
        name: 'rc-survey-web',
        script: 'npm',
        args: 'start',
        cwd: './apps/web',
        interpreter: 'node',
        env: {
          NODE_ENV: 'production',
          PORT: 3000,
          // Frontend will use .env file for API URLs
          NEXT_PUBLIC_SURVEY_SERVICE_URL: 'https://survey.research-connectllc.com//api/survey',
          NEXT_PUBLIC_AUTH_API: 'https://survey.research-connectllc.com//api/auth'
        },
        env_production: {
          NODE_ENV: 'production',
          PORT: 3000,
          NEXT_PUBLIC_SURVEY_SERVICE_URL: 'https://survey.research-connectllc.com//api/survey',
          NEXT_PUBLIC_AUTH_API: 'https://survey.research-connectllc.com//api/auth'
        },
        // Next.js specific settings
        instances: 1,
        exec_mode: 'fork',
        watch: false,
        max_memory_restart: '1G',
        error_file: './logs/web-error.log',
        out_file: './logs/web-out.log',
        log_file: './logs/web-combined.log',
        time: true,
        restart_delay: 10000, // Increased to 10s to allow ports to be released
        max_restarts: 5, // Reduced from 10 to prevent loops
        min_uptime: '30s', // Increased from 10s - service must run 30s to be considered stable
        exp_backoff_restart_delay: 100, // Exponential backoff starting at 100ms
        autorestart: true,
        stop_exit_codes: [0], // Only restart on non-zero exit codes
        listen_timeout: 10000, // Wait 10s for app to start listening
        kill_timeout: 5000 // Wait 5s for graceful shutdown
      },
      {
        name: 'rc-survey-auth',
        script: 'npm',
        args: 'start',
        cwd: './services/auth-service',
        interpreter: 'node',
        env: {
          NODE_ENV: 'production',
          PORT: 3001,
          // Auth service environment variables
          JWT_SECRET: 'dev-secret-change-me',
          JWT_EXPIRES_IN: '7d',
          RATE_LIMIT_WINDOW_MS: '900000',
          RATE_LIMIT_MAX_REQUESTS: '100',
          CORS_ORIGIN: 'https://survey.research-connectllc.com/',
          },
        env_production: {
          NODE_ENV: 'production',
          PORT: 3001,
          JWT_SECRET: 'dev-secret-change-me',
          JWT_EXPIRES_IN: '7d',
          RATE_LIMIT_WINDOW_MS: '900000',
          RATE_LIMIT_MAX_REQUESTS: '100',
          CORS_ORIGIN: 'https://survey.research-connectllc.com/',
          },
        // Service specific settings
        instances: 1,
        exec_mode: 'fork',
        watch: false,
        max_memory_restart: '512M',
        error_file: './logs/auth-error.log',
        out_file: './logs/auth-out.log',
        log_file: './logs/auth-combined.log',
        time: true,
        restart_delay: 10000, // Increased to 10s to allow ports to be released
        max_restarts: 5, // Reduced from 10 to prevent loops
        min_uptime: '30s', // Increased from 10s - service must run 30s to be considered stable
        exp_backoff_restart_delay: 100, // Exponential backoff starting at 100ms
        autorestart: true,
        stop_exit_codes: [0], // Only restart on non-zero exit codes
        listen_timeout: 10000, // Wait 10s for app to start listening
        kill_timeout: 5000, // Wait 5s for graceful shutdown
        // Auto-restart on file changes (optional for development)
        ignore_watch: ['node_modules', 'logs', 'dist']
      },
      {
        name: 'rc-survey-service',
        script: 'npm',
        args: 'start',
        cwd: './services/survey-service',
        interpreter: 'node',
        env: {
          NODE_ENV: 'production',
          PORT: 3002,
          // Survey service environment variables
          PUBLIC_BASE_URL: 'https://survey.research-connectllc.com/',
          KAFKA_BROKERS: 'localhost:9092', // Use localhost for internal Docker network
          KAFKA_CLIENT_ID: 'survey-service',
          KAFKA_GROUP_ID: 'survey-service-group',
          KAFKA_TOPICS_SESSIONS: 'runtime.sessions',
          KAFKA_TOPICS_ANSWERS: 'runtime.answers',
          KAFKA_TOPICS_QUOTA: 'runtime.quota',
          KAFKA_TOPICS_COLLECTORS: 'collectors.events',
          IPQS_KEY: 'WV1qJetwqk0iGZkzlnML5yTDDmluhaov',
          IPQS_STRICTNESS: '1',
          IPQS_ALLOW_PUBLIC: '1',
          VPN_BLOCK_THRESHOLD: '85',
          VPN_CHALLENGE_THRESHOLD: '60',
          REDIS_URL: 'redis://localhost:6379', // Use localhost for internal Docker network
          REDIS_PASSWORD: '',
          REDIS_DB: '0',
          OUTBOX_BATCH_SIZE: '100',
          OUTBOX_POLL_INTERVAL_MS: '1000',
          OUTBOX_MAX_ATTEMPTS: '5',
          OUTBOX_RETRY_BACKOFF_MS: '5000',
          RATE_LIMIT_WINDOW_MS: '900000',
          RATE_LIMIT_MAX_REQUESTS: '1000',
          CORS_ORIGIN: 'https://survey.research-connectllc.com/',
          AUTH_SERVICE_URL: 'http://localhost:3001', // Internal service communication
          ENABLE_METRICS: 'true',
          METRICS_PORT: '9090',
          LOG_LEVEL: 'info',
          EVENT_ENABLED: 'true',
          EVENT_REPLAY_ENABLED: 'false',
          EVENT_DLQ_ENABLED: 'true'
        },
        env_production: {
          NODE_ENV: 'production',
          PORT: 3002,
          PUBLIC_BASE_URL: 'https://survey.research-connectllc.com/',
          DATABASE_URL: 'postgresql://rc_survey_user:rc_survey_password@localhost:5432/rc_survey_db',
          KAFKA_BROKERS: 'localhost:9092',
          KAFKA_CLIENT_ID: 'survey-service',
          KAFKA_GROUP_ID: 'survey-service-group',
          KAFKA_TOPICS_SESSIONS: 'runtime.sessions',
          KAFKA_TOPICS_ANSWERS: 'runtime.answers',
          KAFKA_TOPICS_QUOTA: 'runtime.quota',
          KAFKA_TOPICS_COLLECTORS: 'collectors.events',
          IPQS_KEY: 'WV1qJetwqk0iGZkzlnML5yTDDmluhaov',
          IPQS_STRICTNESS: '1',
          IPQS_ALLOW_PUBLIC: '1',
          VPN_BLOCK_THRESHOLD: '85',
          VPN_CHALLENGE_THRESHOLD: '60',
          REDIS_URL: 'redis://localhost:6379',
          REDIS_PASSWORD: '',
          REDIS_DB: '0',
          OUTBOX_BATCH_SIZE: '100',
          OUTBOX_POLL_INTERVAL_MS: '1000',
          OUTBOX_MAX_ATTEMPTS: '5',
          OUTBOX_RETRY_BACKOFF_MS: '5000',
          RATE_LIMIT_WINDOW_MS: '900000',
          RATE_LIMIT_MAX_REQUESTS: '1000',
          CORS_ORIGIN: 'https://survey.research-connectllc.com/',
          AUTH_SERVICE_URL: 'https://survey.research-connectllc.com/:3001',
          ENABLE_METRICS: 'true',
          METRICS_PORT: '9090',
          LOG_LEVEL: 'info',
          EVENT_ENABLED: 'true',
          EVENT_REPLAY_ENABLED: 'false',
          EVENT_DLQ_ENABLED: 'true'
        },
        // Service specific settings
        instances: 1,
        exec_mode: 'fork',
        watch: false,
        max_memory_restart: '1G',
        error_file: './logs/survey-error.log',
        out_file: './logs/survey-out.log',
        log_file: './logs/survey-combined.log',
        time: true,
        restart_delay: 10000, // Increased to 10s to allow ports to be released
        max_restarts: 5, // Reduced from 10 to prevent loops
        min_uptime: '30s', // Increased from 10s - service must run 30s to be considered stable
        exp_backoff_restart_delay: 100, // Exponential backoff starting at 100ms
        autorestart: true,
        stop_exit_codes: [0], // Only restart on non-zero exit codes
        listen_timeout: 10000, // Wait 10s for app to start listening
        kill_timeout: 5000, // Wait 5s for graceful shutdown
        // Auto-restart on file changes (optional for development)
        ignore_watch: ['node_modules', 'logs', 'dist']
      }
    ],
  };