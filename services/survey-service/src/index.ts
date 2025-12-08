import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';
import { getEventBusService } from './lib/event-bus';

// Import routes
import surveyRoutes from './routes/surveys';
import pageRoutes from './routes/pages';
import questionRoutes from './routes/questions';
import answerRoutes from './routes/answers';
import expressionRoutes from './routes/expressions';
import jumpRoutes from './routes/jumps';
import runtimeRoutes from './routes/runtime';
import collectorsRoutes from './routes/collectors';
import targetRoutes from './targets/routes';
import quotaRoutes from './quotas/routes';
import questionGroupRoutes from './question-groups/routes';
import groupShufflingRoutes from './group-shuffling/routes';
import runtimeQuotaRoutes from './runtime-quota/routes';
import loopBatteryRoutes from './loop-batteries/routes';
import surveySettingsRoutes from './routes/survey-settings';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// Initialize Prisma and Event Bus
const prisma = new PrismaClient();
const eventBus = getEventBusService(prisma);

// Trust proxy for ngrok and other reverse proxies
app.set('trust proxy', 1);

// Middleware
app.use(helmet());
app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting - disabled for development with ngrok
if (process.env.NODE_ENV !== 'development') {
  const limiter = rateLimit({
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000, // limit each IP
    message: { error: 'Too many requests, please try again later' },
    standardHeaders: true,
    legacyHeaders: false
  });
  app.use(limiter);
} else {
  console.log('⚠️ Rate limiting disabled for development');
}

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const eventBusHealth = await eventBus.healthCheck();
    res.json({ 
      status: 'OK', 
      service: 'survey-service',
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV || 'development',
      eventBus: eventBusHealth
    });
  } catch (error) {
    res.status(503).json({
      status: 'ERROR',
      service: 'survey-service',
      timestamp: new Date().toISOString(),
      error: 'Event bus health check failed'
    });
  }
});

// API Routes
app.use('/api/surveys', surveyRoutes);
app.use('/api/surveys', pageRoutes);
app.use('/api/surveys', questionRoutes);
app.use('/api/surveys', answerRoutes);
app.use('/api/surveys', expressionRoutes);
app.use('/api', jumpRoutes); // Jump Logic routes

// Runtime and Collectors routes
app.use('/api/runtime', runtimeRoutes); // Survey Runtime Engine
app.use('/api/authoring', collectorsRoutes); // Collector Management

// New feature routes
app.use('/api/surveys', targetRoutes); // Survey Targets
app.use('/api/surveys', quotaRoutes); // Quota Plans & Buckets
app.use('/api/surveys', questionGroupRoutes); // Question Groups & Shuffling
app.use('/api/surveys', groupShufflingRoutes); // Group Shuffling Logic
app.use('/api/runtime', runtimeQuotaRoutes); // Runtime Quota Management
app.use('/api/surveys', loopBatteryRoutes); // Loop Batteries & Dataset Items
app.use('/api/survey-settings', surveySettingsRoutes); // Survey Settings for Frontend

// Catch 404
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    method: req.method,
    path: req.originalUrl
  });
});

// Global error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err.stack || err);
  
  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).json({ 
    error: isDevelopment ? err.message : 'Internal server error',
    ...(isDevelopment && { stack: err.stack })
  });
});

// Graceful shutdown
async function gracefulShutdown(signal: string) {
  console.log(`${signal} received, shutting down gracefully`);
  
  try {
    await eventBus.shutdown();
    await prisma.$disconnect();
    console.log('✅ Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during graceful shutdown:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start the server
async function startServer() {
  try {
    // Initialize event bus
    await eventBus.initialize();
    
    const server = app.listen(PORT, () => {
      console.log(`🚀 Survey service running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
      console.log(`📡 Event bus: Kafka + Redis integrated`);
    });

    // Handle port binding errors
    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use!`);
        console.error(`   Please stop the process using this port or change the PORT environment variable.`);
        console.error(`   To find the process: lsof -ti:${PORT} or ss -tlnp | grep :${PORT}`);
        gracefulShutdown('PORT_IN_USE').then(() => process.exit(1));
      } else {
        console.error('❌ Server error:', error);
        gracefulShutdown('SERVER_ERROR').then(() => process.exit(1));
      }
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    await gracefulShutdown('STARTUP_ERROR');
    process.exit(1);
  }
}

startServer();