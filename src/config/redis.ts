import { createClient, RedisClientType } from 'redis';
import { env, isDevelopment } from './environment';
import { logger } from '../utils/logger';

class RedisClient {
  private static instance: RedisClient;
  private client: RedisClientType | null = null;
  private isConnected = false;

  private constructor() {}

  public static getInstance(): RedisClient {
    if (!RedisClient.instance) {
      RedisClient.instance = new RedisClient();
    }
    return RedisClient.instance;
  }

  public async connect(): Promise<void> {
    if (this.isConnected && this.client) {
      logger.info('Redis already connected');
      return;
    }

    // In development, make Redis optional
    if (isDevelopment && process.env.REDIS_ENABLED !== 'true') {
      logger.warn('⚠️  Redis is optional in development mode. Set REDIS_ENABLED=true to enable.');
      // Try to connect anyway, but don't fail if it doesn't work
      try {
        await this.attemptConnection();
      } catch (error) {
        logger.warn('⚠️  Redis connection failed. Continuing without Redis cache.');
        logger.warn('   To enable Redis, make sure Redis is running: docker-compose up -d redis');
      }
      return;
    }

    // In production or if explicitly enabled, require Redis
    await this.attemptConnection();
  }

  private async attemptConnection(): Promise<void> {
    try {
      const clientOptions: any = {
        url: env.REDIS_URL,
        socket: {
          connectTimeout: 5000,
          reconnectStrategy: isDevelopment ? (retries: number) => {
            if (retries > 3) {
              logger.warn('Redis connection failed after 3 retries. Continuing without Redis.');
              return false; // Stop retrying
            }
            return Math.min(retries * 100, 3000);
          } : (retries: number) => Math.min(retries * 100, 3000),
        },
      };

      if (env.REDIS_PASSWORD) {
        clientOptions.password = env.REDIS_PASSWORD;
      }

      this.client = createClient(clientOptions);

      this.client.on('error', (error) => {
        logger.error('Redis client error:', error);
        this.isConnected = false;
        if (isDevelopment) {
          logger.warn('⚠️  Redis unavailable. Continuing without Redis cache.');
        }
      });

      this.client.on('connect', () => {
        logger.info('Redis client connected');
        this.isConnected = true;
      });

      this.client.on('ready', () => {
        logger.info('✅ Redis client ready');
        this.isConnected = true;
      });

      this.client.on('end', () => {
        logger.warn('Redis client connection ended');
        this.isConnected = false;
      });

      await this.client.connect();
    } catch (error: any) {
      // In development, allow the app to continue without Redis
      if (isDevelopment) {
        logger.warn('⚠️  Redis connection failed. Continuing without Redis cache.');
        logger.warn('   To enable Redis, make sure Redis is running: docker-compose up -d redis');
        this.client = null;
        this.isConnected = false;
        return;
      }
      // In production, throw error
      logger.error('❌ Redis connection failed:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.client || !this.isConnected) {
      return;
    }

    try {
      await this.client.quit();
      this.isConnected = false;
      logger.info('Redis disconnected successfully');
    } catch (error) {
      logger.error('Error disconnecting from Redis:', error);
      throw error;
    }
  }

  public getClient(): RedisClientType | null {
    return this.client;
  }

  public isConnectionActive(): boolean {
    return this.isConnected && this.client?.isReady === true;
  }

  // Cache methods
  public async set(key: string, value: any, ttl?: number): Promise<void> {
    if (!this.client || !this.isConnected) {
      // In development, silently fail if Redis is not available
      if (env.NODE_ENV === 'development') {
        return;
      }
      throw new Error('Redis client not connected');
    }

    const serializedValue = JSON.stringify(value);
    if (ttl) {
      await this.client.setEx(key, ttl, serializedValue);
    } else {
      await this.client.set(key, serializedValue);
    }
  }

  public async get(key: string): Promise<any> {
    if (!this.client || !this.isConnected) {
      // In development, return null if Redis is not available
      if (env.NODE_ENV === 'development') {
        return null;
      }
      throw new Error('Redis client not connected');
    }

    const value = await this.client.get(key);
    return value ? JSON.parse(value) : null;
  }

  public async del(key: string): Promise<void> {
    if (!this.client || !this.isConnected) {
      // In development, silently fail if Redis is not available
      if (env.NODE_ENV === 'development') {
        return;
      }
      throw new Error('Redis client not connected');
    }

    await this.client.del(key);
  }

  public async exists(key: string): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      // In development, return false if Redis is not available
      if (env.NODE_ENV === 'development') {
        return false;
      }
      throw new Error('Redis client not connected');
    }

    const result = await this.client.exists(key);
    return result === 1;
  }

  public async expire(key: string, ttl: number): Promise<void> {
    if (!this.client || !this.isConnected) {
      // In development, silently fail if Redis is not available
      if (env.NODE_ENV === 'development') {
        return;
      }
      throw new Error('Redis client not connected');
    }

    await this.client.expire(key, ttl);
  }

  // Session management
  public async setSession(sessionId: string, data: any, ttl: number = 3600): Promise<void> {
    await this.set(`session:${sessionId}`, data, ttl);
  }

  public async getSession(sessionId: string): Promise<any> {
    return await this.get(`session:${sessionId}`);
  }

  public async deleteSession(sessionId: string): Promise<void> {
    await this.del(`session:${sessionId}`);
  }

  // Rate limiting
  public async incrementRateLimit(key: string, window: number): Promise<number> {
    if (!this.client || !this.isConnected) {
      // In development, return 0 if Redis is not available (no rate limiting)
      if (env.NODE_ENV === 'development') {
        return 0;
      }
      throw new Error('Redis client not connected');
    }

    const multi = this.client.multi();
    multi.incr(key);
    multi.expire(key, window);
    const results = await multi.exec();
    return results?.[0] as number || 0;
  }
}

export const redisClient = RedisClient.getInstance();
export default redisClient;
