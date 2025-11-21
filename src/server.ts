import app from './app';
import { env, isDevelopment } from './config/environment';
import { database } from './config/database';
import { redisClient } from './config/redis';
import { logger } from './utils/logger';

// Graceful shutdown handler
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  try {
    // Close database connection
    await database.disconnect();
    logger.info('Database connection closed');
    
    // Close Redis connection
    try {
      if (redisClient.isConnectionActive()) {
        await redisClient.disconnect();
        logger.info('Redis connection closed');
      }
    } catch (error) {
      logger.warn('Error closing Redis connection:', error);
    }
    
    // Close server
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  } catch (error) {
    logger.logError(error as Error, { 
      context: 'graceful_shutdown',
      signal 
    });
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.logError(error, { context: 'uncaught_exception' });
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.logError(new Error(`Unhandled Rejection: ${reason}`), { 
    context: 'unhandled_rejection',
    promise: promise.toString()
  });
  process.exit(1);
});

// Handle termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await database.connect();
    logger.info('✅ Database connected');

    // Connect to Redis (optional in development)
    try {
      await redisClient.connect();
      if (redisClient.isConnectionActive()) {
        logger.info('✅ Redis connected');
      }
    } catch (error) {
      if (isDevelopment) {
        logger.warn('⚠️  Redis connection failed. Continuing without Redis.');
        logger.warn('   Some features may not work optimally without Redis.');
      } else {
        throw error;
      }
    }

    // Start HTTP server
    const server = app.listen(env.PORT, () => {
      logger.info(`🚀 Server running on port ${env.PORT}`);
      logger.info(`📊 Environment: ${env.NODE_ENV}`);
      logger.info(`🌐 API Base URL: http://localhost:${env.PORT}/api`);
      logger.info(`📚 Health Check: http://localhost:${env.PORT}/health`);
      logger.info(`📖 API Docs: http://localhost:${env.PORT}/api/docs`);
      
      if (isDevelopment) {
        logger.info(`🔧 Development mode enabled`);
        logger.info(`📝 Log level: ${env.LOG_LEVEL}`);
      }
    });

    // Handle server errors
    server.on('error', (error: any) => {
      if (error.syscall !== 'listen') {
        throw error;
      }

      const bind = typeof env.PORT === 'string' 
        ? 'Pipe ' + env.PORT 
        : 'Port ' + env.PORT;

      switch (error.code) {
        case 'EACCES':
          logger.logError(new Error(`${bind} requires elevated privileges`));
          process.exit(1);
          break;
        case 'EADDRINUSE':
          logger.logError(new Error(`${bind} is already in use`));
          process.exit(1);
          break;
        default:
          throw error;
      }
    });

    // Graceful shutdown on server close
    server.on('close', () => {
      logger.info('Server closed');
    });

    return server;
  } catch (error) {
    logger.logError(error as Error, { context: 'server_startup' });
    process.exit(1);
  }
};

// Start the server
let server: any;
startServer().then((s) => {
  server = s;
}).catch((error) => {
  logger.logError(error as Error, { context: 'server_initialization' });
  process.exit(1);
});

export default server;
