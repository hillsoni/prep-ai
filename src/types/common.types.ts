import { Document, ObjectId } from 'mongoose';

// Base interfaces
export interface BaseDocument extends Document {
  _id: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface SearchParams extends PaginationParams {
  query?: string;
  category?: string;
  difficulty?: string;
  tags?: string[];
}

// Error types
export interface AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  code?: string;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

// File upload types
export interface FileUpload {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
  destination?: string;
  filename?: string;
  path?: string;
}

export interface UploadedFile {
  url: string;
  filename: string;
  size: number;
  mimetype: string;
  uploadedAt: Date;
}

// Cache types
export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  key: string;
  tags?: string[];
}

// Rate limiting types
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: Date;
  retryAfter?: number;
}

// Analytics types
export interface AnalyticsData {
  totalUsers: number;
  activeUsers: number;
  totalInterviews: number;
  totalTests: number;
  averageScore: number;
  popularCategories: Array<{
    category: string;
    count: number;
  }>;
  userEngagement: {
    daily: number;
    weekly: number;
    monthly: number;
  };
}

// Notification types
export interface NotificationData {
  type: 'email' | 'push' | 'in_app';
  recipient: string;
  subject?: string;
  template: string;
  data: Record<string, any>;
  scheduledAt?: Date;
}

// Queue job types
export interface QueueJob {
  id: string;
  type: string;
  data: any;
  priority?: number;
  delay?: number;
  attempts?: number;
  createdAt: Date;
  processedAt?: Date;
  failedAt?: Date;
  error?: string;
}

// WebSocket types
export interface SocketData {
  userId: string;
  sessionId?: string;
  interviewId?: string;
  testId?: string;
}

export interface SocketEvent {
  type: string;
  data: any;
  timestamp: Date;
}

// Health check types
export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: Date;
  services: {
    database: ServiceStatus;
    redis: ServiceStatus;
    storage: ServiceStatus;
  };
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
}

export interface ServiceStatus {
  status: 'up' | 'down' | 'degraded';
  responseTime?: number;
  lastCheck: Date;
  error?: string;
}

// Configuration types
export interface DatabaseConfig {
  uri: string;
  options: {
    maxPoolSize: number;
    serverSelectionTimeoutMS: number;
    socketTimeoutMS: number;
  };
}

export interface RedisConfig {
  url: string;
  password?: string;
  retryStrategy: (options: any) => number | Error;
}

export interface JWTConfig {
  secret: string;
  refreshSecret: string;
  expiresIn: string;
  refreshExpiresIn: string;
}

// Utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type PartialExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>;

// Generic types
export type ID = string | ObjectId;
export type Timestamp = Date | string;
export const STATUS_VALUES = ['active', 'inactive', 'pending', 'completed', 'failed'] as const;
export type Status = (typeof STATUS_VALUES)[number];

export const DIFFICULTY_VALUES = ['beginner', 'intermediate', 'advanced'] as const;
export type Difficulty = (typeof DIFFICULTY_VALUES)[number];

export const CATEGORY_VALUES = ['technical', 'behavioral', 'communication', 'domain-specific'] as const;
export type Category = (typeof CATEGORY_VALUES)[number];

// Constants
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

export const ROLE_VALUES = ['user', 'admin', 'moderator'] as const;
export type Role = (typeof ROLE_VALUES)[number];
export const ROLES = {
  USER: ROLE_VALUES[0],
  ADMIN: ROLE_VALUES[1],
  MODERATOR: ROLE_VALUES[2],
} as const;

export const SUBSCRIPTION_PLAN_VALUES = ['free', 'premium', 'pro'] as const;
export type SubscriptionPlan = (typeof SUBSCRIPTION_PLAN_VALUES)[number];
export const SUBSCRIPTION_PLANS = {
  FREE: SUBSCRIPTION_PLAN_VALUES[0],
  PREMIUM: SUBSCRIPTION_PLAN_VALUES[1],
  PRO: SUBSCRIPTION_PLAN_VALUES[2],
} as const;

export const INTERVIEW_TYPE_VALUES = [
  'technical',
  'behavioral',
  'communication',
  'system-design',
  'hr',
  'domain-specific',
] as const;
export type InterviewType = (typeof INTERVIEW_TYPE_VALUES)[number];
export const INTERVIEW_TYPES = {
  TECHNICAL: INTERVIEW_TYPE_VALUES[0],
  BEHAVIORAL: INTERVIEW_TYPE_VALUES[1],
  COMMUNICATION: INTERVIEW_TYPE_VALUES[2],
  SYSTEM_DESIGN: INTERVIEW_TYPE_VALUES[3],
  HR: INTERVIEW_TYPE_VALUES[4],
  DOMAIN_SPECIFIC: INTERVIEW_TYPE_VALUES[5],
} as const;

export const TEST_TYPE_VALUES = [
  'multiple_choice',
  'true_false',
  'fill_blank',
  'coding',
  'essay',
] as const;
export type TestType = (typeof TEST_TYPE_VALUES)[number];
export const TEST_TYPES = {
  MULTIPLE_CHOICE: TEST_TYPE_VALUES[0],
  TRUE_FALSE: TEST_TYPE_VALUES[1],
  FILL_BLANK: TEST_TYPE_VALUES[2],
  CODING: TEST_TYPE_VALUES[3],
  ESSAY: TEST_TYPE_VALUES[4],
} as const;
