import { ObjectId } from 'mongoose';
import { ROLES, SUBSCRIPTION_PLANS } from './common.types';

// User interfaces
export interface IUser extends Document {
  _id: ObjectId;
  email: string;
  password: string;
  profile: UserProfile;
  academic: AcademicInfo;
  professional: ProfessionalInfo;
  preferences: UserPreferences;
  subscription: SubscriptionInfo;
  verification: VerificationInfo;
  security: SecurityInfo;
  statistics: UserStatistics;
  role: keyof typeof ROLES;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile {
  firstName: string;
  lastName: string;
  avatar?: string;
  phone?: string;
  dateOfBirth?: Date;
  bio?: string;
  location?: string;
  website?: string;
}

export interface AcademicInfo {
  institution?: string;
  degree?: string;
  graduationYear?: number;
  cgpa?: number;
  fieldOfStudy?: string;
  certifications?: string[];
}

export interface ProfessionalInfo {
  experience?: number;
  currentRole?: string;
  company?: string;
  targetRole?: string;
  skills: string[];
  industries?: string[];
  salaryExpectation?: number;
  availability?: string;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  notifications: NotificationPreferences;
  privacy: PrivacyPreferences;
  learning: LearningPreferences;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
  weekly_report: boolean;
  interview_reminders: boolean;
  achievement_notifications: boolean;
  marketing_emails: boolean;
}

export interface PrivacyPreferences {
  profile_visibility: 'public' | 'private' | 'friends';
  show_leaderboard: boolean;
  show_achievements: boolean;
  allow_analytics: boolean;
  data_sharing: boolean;
}

export interface LearningPreferences {
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  focus_areas: string[];
  learning_style: 'visual' | 'auditory' | 'kinesthetic' | 'reading';
  study_schedule: {
    days: string[];
    time: string;
    duration: number;
  };
}

export interface SubscriptionInfo {
  plan: keyof typeof SUBSCRIPTION_PLANS;
  expires_at?: Date;
  features: string[];
  billing_cycle?: 'monthly' | 'yearly';
  auto_renew: boolean;
  payment_method?: string;
}

export interface VerificationInfo {
  email_verified: boolean;
  phone_verified: boolean;
  verification_token?: string;
  phone_verification_code?: string;
  verification_expires?: Date;
}

export interface SecurityInfo {
  refresh_tokens: string[];
  password_reset_token?: string;
  password_reset_expires?: Date;
  two_factor_enabled: boolean;
  two_factor_secret?: string;
  backup_codes?: string[];
  login_attempts: number;
  locked_until?: Date;
  last_password_change?: Date;
  trusted_devices: TrustedDevice[];
}

export interface TrustedDevice {
  device_id: string;
  device_name: string;
  ip_address: string;
  user_agent: string;
  last_used: Date;
  created_at: Date;
}

export interface UserStatistics {
  interviews_completed: number;
  tests_completed: number;
  total_score: number;
  average_score: number;
  current_streak: number;
  longest_streak: number;
  total_study_time: number; // in minutes
  achievements: ObjectId[];
  level: number;
  xp: number;
  badges: string[];
}

// Authentication interfaces
export interface LoginCredentials {
  email: string;
  password: string;
  remember_me?: boolean;
  device_info?: DeviceInfo;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: keyof typeof ROLES;
  preferences?: Partial<UserPreferences>;
}

export interface DeviceInfo {
  device_id: string;
  device_name: string;
  platform: string;
  browser: string;
  ip_address: string;
  user_agent: string;
  location?: {
    country: string;
    city: string;
    timezone: string;
  };
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: 'Bearer';
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
  jti?: string; // JWT ID for token revocation
}

export interface RefreshTokenPayload {
  userId: string;
  tokenId: string;
  iat: number;
  exp: number;
}

// OAuth interfaces
export interface GoogleProfile {
  id: string;
  email: string;
  name: string;
  picture: string;
  verified_email: boolean;
  given_name: string;
  family_name: string;
  locale: string;
}

export interface OAuthUser {
  provider: 'google' | 'github' | 'linkedin';
  provider_id: string;
  email: string;
  name: string;
  avatar?: string;
  verified: boolean;
}

// Password reset interfaces
export interface PasswordResetRequest {
  email: string;
  ip_address: string;
  user_agent: string;
}

export interface PasswordResetData {
  token: string;
  new_password: string;
  confirm_password: string;
}

// Two-factor authentication interfaces
export interface TwoFactorSetup {
  secret: string;
  qr_code: string;
  backup_codes: string[];
}

export interface TwoFactorVerification {
  code: string;
  backup_code?: string;
}

// Session interfaces
export interface UserSession {
  session_id: string;
  user_id: string;
  device_info: DeviceInfo;
  ip_address: string;
  user_agent: string;
  created_at: Date;
  last_activity: Date;
  expires_at: Date;
  is_active: boolean;
}

// Security interfaces
export interface SecurityEvent {
  type: 'login' | 'logout' | 'password_change' | 'email_change' | 'suspicious_activity';
  user_id: string;
  ip_address: string;
  user_agent: string;
  details: Record<string, any>;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface LoginAttempt {
  email: string;
  ip_address: string;
  user_agent: string;
  success: boolean;
  failure_reason?: string;
  timestamp: Date;
  device_fingerprint: string;
}

// API interfaces
export interface AuthResponse {
  user: PublicUser;
  tokens: AuthTokens;
  session: UserSession;
}

export interface PublicUser {
  _id: string;
  email: string;
  profile: UserProfile;
  academic: AcademicInfo;
  professional: ProfessionalInfo;
  preferences: UserPreferences;
  subscription: SubscriptionInfo;
  statistics: UserStatistics;
  role: string;
  isActive: boolean;
  createdAt: Date;
  lastLoginAt?: Date;
}

export interface UpdateProfileData {
  profile?: Partial<UserProfile>;
  academic?: Partial<AcademicInfo>;
  professional?: Partial<ProfessionalInfo>;
  preferences?: Partial<UserPreferences>;
}

export interface ChangePasswordData {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

// Validation interfaces
export interface AuthValidationErrors {
  email?: string[];
  password?: string[];
  firstName?: string[];
  lastName?: string[];
  general?: string[];
}

// Middleware interfaces
export interface AuthRequest extends Request {
  user?: IUser;
  session?: UserSession;
  device_info?: DeviceInfo;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: Date;
  retryAfter?: number;
}
