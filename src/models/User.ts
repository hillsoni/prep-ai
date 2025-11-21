import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';
import { IUser, UserProfile, AcademicInfo, ProfessionalInfo, UserPreferences, SubscriptionInfo, VerificationInfo, SecurityInfo, UserStatistics } from '../types/auth.types';
import { ROLES, ROLE_VALUES, SUBSCRIPTION_PLANS, SUBSCRIPTION_PLAN_VALUES } from '../types/common.types';

// Sub-schemas
const UserProfileSchema = new Schema<UserProfile>({
  firstName: { type: String, required: true, trim: true, maxlength: 50 },
  lastName: { type: String, required: true, trim: true, maxlength: 50 },
  avatar: { type: String, default: null },
  phone: { type: String, trim: true, match: /^[\+]?[1-9][\d]{0,15}$/ },
  dateOfBirth: { type: Date },
  bio: { type: String, maxlength: 500 },
  location: { type: String, maxlength: 100 },
  website: { type: String, match: /^https?:\/\/.+/ }
}, { _id: false });

const AcademicInfoSchema = new Schema<AcademicInfo>({
  institution: { type: String, maxlength: 100 },
  degree: { type: String, maxlength: 100 },
  graduationYear: { type: Number, min: 1950, max: new Date().getFullYear() + 10 },
  cgpa: { type: Number, min: 0, max: 4.0 },
  fieldOfStudy: { type: String, maxlength: 100 },
  certifications: [{ type: String, maxlength: 100 }]
}, { _id: false });

const ProfessionalInfoSchema = new Schema<ProfessionalInfo>({
  experience: { type: Number, min: 0, max: 50 },
  currentRole: { type: String, maxlength: 100 },
  company: { type: String, maxlength: 100 },
  targetRole: { type: String, maxlength: 100 },
  skills: [{ type: String, maxlength: 50 }],
  industries: [{ type: String, maxlength: 50 }],
  salaryExpectation: { type: Number, min: 0 },
  availability: { type: String, maxlength: 100 }
}, { _id: false });

const NotificationPreferencesSchema = new Schema({
  email: { type: Boolean, default: true },
  push: { type: Boolean, default: true },
  sms: { type: Boolean, default: false },
  weekly_report: { type: Boolean, default: true },
  interview_reminders: { type: Boolean, default: true },
  achievement_notifications: { type: Boolean, default: true },
  marketing_emails: { type: Boolean, default: false }
}, { _id: false });

const PrivacyPreferencesSchema = new Schema({
  profile_visibility: { type: String, enum: ['public', 'private', 'friends'], default: 'private' },
  show_leaderboard: { type: Boolean, default: true },
  show_achievements: { type: Boolean, default: true },
  allow_analytics: { type: Boolean, default: true },
  data_sharing: { type: Boolean, default: false }
}, { _id: false });

const LearningPreferencesSchema = new Schema({
  difficulty: { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner' },
  focus_areas: [{ type: String, maxlength: 50 }],
  learning_style: { type: String, enum: ['visual', 'auditory', 'kinesthetic', 'reading'], default: 'visual' },
  study_schedule: {
    days: [{ type: String, enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] }],
    time: { type: String, match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ },
    duration: { type: Number, min: 15, max: 480 } // 15 minutes to 8 hours
  }
}, { _id: false });

const UserPreferencesSchema = new Schema<UserPreferences>({
  theme: { type: String, enum: ['light', 'dark', 'system'], default: 'light' },
  language: { type: String, default: 'en' },
  timezone: { type: String, default: 'UTC' },
  notifications: { type: NotificationPreferencesSchema, default: {} },
  privacy: { type: PrivacyPreferencesSchema, default: {} },
  learning: { type: LearningPreferencesSchema, default: {} }
}, { _id: false });

const SubscriptionInfoSchema = new Schema<SubscriptionInfo>({
  plan: { type: String, enum: SUBSCRIPTION_PLAN_VALUES, default: 'free' },
  expires_at: { type: Date },
  features: [{ type: String }],
  billing_cycle: { type: String, enum: ['monthly', 'yearly'] },
  auto_renew: { type: Boolean, default: false },
  payment_method: { type: String }
}, { _id: false });

const VerificationInfoSchema = new Schema<VerificationInfo>({
  email_verified: { type: Boolean, default: false },
  phone_verified: { type: Boolean, default: false },
  verification_token: { type: String },
  phone_verification_code: { type: String },
  verification_expires: { type: Date }
}, { _id: false });

const TrustedDeviceSchema = new Schema({
  device_id: { type: String, required: true },
  device_name: { type: String, required: true },
  ip_address: { type: String, required: true },
  user_agent: { type: String, required: true },
  last_used: { type: Date, default: Date.now },
  created_at: { type: Date, default: Date.now }
}, { _id: false });

const SecurityInfoSchema = new Schema<SecurityInfo>({
  refresh_tokens: [{ type: String }],
  password_reset_token: { type: String },
  password_reset_expires: { type: Date },
  two_factor_enabled: { type: Boolean, default: false },
  two_factor_secret: { type: String },
  backup_codes: [{ type: String }],
  login_attempts: { type: Number, default: 0 },
  locked_until: { type: Date },
  last_password_change: { type: Date, default: Date.now },
  trusted_devices: [TrustedDeviceSchema]
}, { _id: false });

const UserStatisticsSchema = new Schema<UserStatistics>({
  interviews_completed: { type: Number, default: 0 },
  tests_completed: { type: Number, default: 0 },
  total_score: { type: Number, default: 0 },
  average_score: { type: Number, default: 0 },
  current_streak: { type: Number, default: 0 },
  longest_streak: { type: Number, default: 0 },
  total_study_time: { type: Number, default: 0 },
  achievements: [{ type: Schema.Types.ObjectId, ref: 'Achievement' }],
  level: { type: Number, default: 1 },
  xp: { type: Number, default: 0 },
  badges: [{ type: String }]
}, { _id: false });

// Main User Schema
const UserSchema = new Schema<IUser>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  password: {
    type: String,
    required: true,
    minlength: 8,
    select: false
  },
  profile: {
    type: UserProfileSchema,
    required: true
  },
  academic: {
    type: AcademicInfoSchema,
    default: {}
  },
  professional: {
    type: ProfessionalInfoSchema,
    default: {}
  },
  preferences: {
    type: UserPreferencesSchema,
    default: {}
  },
  subscription: {
    type: SubscriptionInfoSchema,
    default: {}
  },
  verification: {
    type: VerificationInfoSchema,
    default: {}
  },
  security: {
    type: SecurityInfoSchema,
    default: {}
  },
  statistics: {
    type: UserStatisticsSchema,
    default: {}
  },
  role: {
    type: String,
    enum: ROLE_VALUES,
    default: 'user'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLoginAt: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
UserSchema.index({ email: 1 });
UserSchema.index({ 'profile.firstName': 1, 'profile.lastName': 1 });
UserSchema.index({ 'professional.skills': 1 });
UserSchema.index({ 'subscription.plan': 1 });
UserSchema.index({ 'statistics.level': -1 });
UserSchema.index({ createdAt: -1 });

// Virtuals
UserSchema.virtual('fullName').get(function() {
  return `${this.profile.firstName} ${this.profile.lastName}`;
});

UserSchema.virtual('isVerified').get(function() {
  return this.verification.email_verified;
});

UserSchema.virtual('isLocked').get(function() {
  return this.security.locked_until && this.security.locked_until > new Date();
});

// Pre-save middleware
UserSchema.pre('save', async function(next) {
  // Hash password if it's modified
  if (this.isModified('password')) {
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
    this.password = await bcrypt.hash(this.password, saltRounds);
    this.security.last_password_change = new Date();
  }
  
  // Update statistics
  if (this.statistics.interviews_completed > 0 || this.statistics.tests_completed > 0) {
    this.statistics.average_score = this.statistics.total_score / 
      (this.statistics.interviews_completed + this.statistics.tests_completed);
  }
  
  next();
});

// Instance methods
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

UserSchema.methods.generatePasswordResetToken = function(): string {
  const crypto = require('crypto');
  const token = crypto.randomBytes(32).toString('hex');
  this.security.password_reset_token = token;
  this.security.password_reset_expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  return token;
};

UserSchema.methods.generateVerificationToken = function(): string {
  const crypto = require('crypto');
  const token = crypto.randomBytes(32).toString('hex');
  this.verification.verification_token = token;
  this.verification.verification_expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  return token;
};

UserSchema.methods.incrementLoginAttempts = function(): void {
  // If we have a previous lock that has expired, restart at 1
  if (this.security.locked_until && this.security.locked_until < new Date()) {
    return this.updateOne({
      $unset: { 'security.locked_until': 1 },
      $set: { 'security.login_attempts': 1 }
    });
  }
  
  const updates: any = { $inc: { 'security.login_attempts': 1 } };
  
  // Lock account after 5 failed attempts for 2 hours
  if (this.security.login_attempts + 1 >= 5 && !this.security.locked_until) {
    updates.$set = { 'security.locked_until': new Date(Date.now() + 2 * 60 * 60 * 1000) };
  }
  
  return this.updateOne(updates);
};

UserSchema.methods.resetLoginAttempts = function(): void {
  return this.updateOne({
    $unset: { 'security.login_attempts': 1, 'security.locked_until': 1 }
  });
};

UserSchema.methods.addRefreshToken = function(token: string): void {
  this.security.refresh_tokens.push(token);
  // Keep only the last 5 refresh tokens
  if (this.security.refresh_tokens.length > 5) {
    this.security.refresh_tokens = this.security.refresh_tokens.slice(-5);
  }
};

UserSchema.methods.removeRefreshToken = function(token: string): void {
  this.security.refresh_tokens = this.security.refresh_tokens.filter(t => t !== token);
};

UserSchema.methods.addTrustedDevice = function(deviceInfo: any): void {
  this.security.trusted_devices.push({
    ...deviceInfo,
    created_at: new Date()
  });
  
  // Keep only the last 10 devices
  if (this.security.trusted_devices.length > 10) {
    this.security.trusted_devices = this.security.trusted_devices.slice(-10);
  }
};

// Static methods
UserSchema.statics.findByEmail = function(email: string) {
  return this.findOne({ email: email.toLowerCase() });
};

UserSchema.statics.findActiveUsers = function() {
  return this.find({ isActive: true });
};

UserSchema.statics.findByRole = function(role: string) {
  return this.find({ role });
};

// Export the model
export const User = mongoose.model<IUser>('User', UserSchema);
export default User;
