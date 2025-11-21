import { User } from '../models/User';
import { JWTUtils } from '../utils/jwt';
import { logger } from '../utils/logger';
import { redisClient } from '../config/redis';
import { 
  LoginCredentials, 
  RegisterData, 
  AuthTokens, 
  PublicUser, 
  UserSession,
  DeviceInfo,
  PasswordResetRequest,
  PasswordResetData,
  TwoFactorSetup,
  TwoFactorVerification,
  OAuthUser
} from '../types/auth.types';
import { ApiResponse } from '../types/common.types';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

export class AuthService {
  /**
   * Register a new user
   */
  static async register(userData: RegisterData, deviceInfo: DeviceInfo): Promise<ApiResponse<{ user: PublicUser; tokens: AuthTokens }>> {
    try {
      // Check if user already exists
      const existingUser = await User.findByEmail(userData.email);
      if (existingUser) {
        return {
          success: false,
          message: 'User with this email already exists'
        };
      }

      // Create new user
      const user = new User({
        email: userData.email,
        password: userData.password,
        profile: {
          firstName: userData.firstName,
          lastName: userData.lastName
        },
        preferences: userData.preferences || {},
        role: userData.role || 'user'
      });

      // Generate verification token
      const verificationToken = user.generateVerificationToken();
      await user.save();

      // Generate tokens
      const tokens = JWTUtils.generateTokenPair(
        user._id.toString(),
        user.email,
        user.role
      );

      // Create session
      const session = await this.createSession(user._id.toString(), deviceInfo);

      // Log registration
      logger.logAuth('user_registered', user._id.toString(), {
        email: user.email,
        ip: deviceInfo.ip_address
      });

      // TODO: Send verification email
      // await this.sendVerificationEmail(user.email, verificationToken);

      return {
        success: true,
        message: 'User registered successfully',
        data: {
          user: this.getPublicUser(user),
          tokens
        }
      };
    } catch (error) {
      logger.logError(error as Error, { 
        email: userData.email,
        operation: 'register' 
      });
      
      return {
        success: false,
        message: 'Registration failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Login user
   */
  static async login(credentials: LoginCredentials, deviceInfo: DeviceInfo): Promise<ApiResponse<{ user: PublicUser; tokens: AuthTokens; session: UserSession }>> {
    try {
      const user = await User.findByEmail(credentials.email).select('+password +security');
      
      if (!user) {
        return {
          success: false,
          message: 'Invalid credentials'
        };
      }

      // Check if account is locked
      if (user.isLocked) {
        return {
          success: false,
          message: 'Account is temporarily locked due to multiple failed login attempts'
        };
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(credentials.password);
      
      if (!isPasswordValid) {
        // Increment login attempts
        await user.incrementLoginAttempts();
        
        logger.logSecurity('failed_login_attempt', {
          email: credentials.email,
          ip: deviceInfo.ip_address,
          userAgent: deviceInfo.user_agent
        });

        return {
          success: false,
          message: 'Invalid credentials'
        };
      }

      // Reset login attempts on successful login
      await user.resetLoginAttempts();

      // Update last login
      user.lastLoginAt = new Date();
      await user.save();

      // Generate tokens
      const tokens = JWTUtils.generateTokenPair(
        user._id.toString(),
        user.email,
        user.role
      );

      // Create session
      const session = await this.createSession(user._id.toString(), deviceInfo);

      // Add refresh token to user's security
      user.addRefreshToken(tokens.refresh_token);
      await user.save();

      // Log successful login
      logger.logAuth('user_login', user._id.toString(), {
        email: user.email,
        ip: deviceInfo.ip_address,
        device: deviceInfo.device_name
      });

      return {
        success: true,
        message: 'Login successful',
        data: {
          user: this.getPublicUser(user),
          tokens,
          session
        }
      };
    } catch (error) {
      logger.logError(error as Error, { 
        email: credentials.email,
        operation: 'login' 
      });
      
      return {
        success: false,
        message: 'Login failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Refresh access token
   */
  static async refreshToken(refreshToken: string): Promise<ApiResponse<AuthTokens>> {
    try {
      // Verify refresh token
      const payload = JWTUtils.verifyRefreshToken(refreshToken);
      
      // Get user
      const user = await User.findById(payload.userId).select('+security');
      if (!user) {
        return {
          success: false,
          message: 'User not found'
        };
      }

      // Check if refresh token exists in user's tokens
      if (!user.security.refresh_tokens.includes(refreshToken)) {
        return {
          success: false,
          message: 'Invalid refresh token'
        };
      }

      // Generate new tokens
      const tokens = JWTUtils.generateTokenPair(
        user._id.toString(),
        user.email,
        user.role
      );

      // Remove old refresh token and add new one
      user.removeRefreshToken(refreshToken);
      user.addRefreshToken(tokens.refresh_token);
      await user.save();

      logger.logAuth('token_refreshed', user._id.toString());

      return {
        success: true,
        message: 'Token refreshed successfully',
        data: tokens
      };
    } catch (error) {
      logger.logError(error as Error, { operation: 'refresh_token' });
      
      return {
        success: false,
        message: 'Token refresh failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Logout user
   */
  static async logout(userId: string, refreshToken?: string): Promise<ApiResponse> {
    try {
      const user = await User.findById(userId).select('+security');
      if (!user) {
        return {
          success: false,
          message: 'User not found'
        };
      }

      // Remove specific refresh token if provided
      if (refreshToken) {
        user.removeRefreshToken(refreshToken);
      } else {
        // Remove all refresh tokens
        user.security.refresh_tokens = [];
      }

      await user.save();

      // Remove session from Redis
      if (refreshToken) {
        const sessionId = this.getSessionIdFromToken(refreshToken);
        if (sessionId) {
          await redisClient.deleteSession(sessionId);
        }
      }

      logger.logAuth('user_logout', userId);

      return {
        success: true,
        message: 'Logout successful'
      };
    } catch (error) {
      logger.logError(error as Error, { 
        userId,
        operation: 'logout' 
      });
      
      return {
        success: false,
        message: 'Logout failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Request password reset
   */
  static async requestPasswordReset(request: PasswordResetRequest): Promise<ApiResponse> {
    try {
      const user = await User.findByEmail(request.email);
      if (!user) {
        // Don't reveal if user exists
        return {
          success: true,
          message: 'If the email exists, a password reset link has been sent'
        };
      }

      // Generate reset token
      const resetToken = user.generatePasswordResetToken();
      await user.save();

      // TODO: Send password reset email
      // await this.sendPasswordResetEmail(user.email, resetToken);

      logger.logAuth('password_reset_requested', user._id.toString(), {
        email: user.email,
        ip: request.ip_address
      });

      return {
        success: true,
        message: 'If the email exists, a password reset link has been sent'
      };
    } catch (error) {
      logger.logError(error as Error, { 
        email: request.email,
        operation: 'password_reset_request' 
      });
      
      return {
        success: false,
        message: 'Password reset request failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Reset password
   */
  static async resetPassword(data: PasswordResetData): Promise<ApiResponse> {
    try {
      const user = await User.findOne({
        'security.password_reset_token': data.token,
        'security.password_reset_expires': { $gt: new Date() }
      }).select('+security');

      if (!user) {
        return {
          success: false,
          message: 'Invalid or expired reset token'
        };
      }

      // Update password
      user.password = data.new_password;
      user.security.password_reset_token = undefined;
      user.security.password_reset_expires = undefined;
      user.security.last_password_change = new Date();
      
      // Invalidate all refresh tokens
      user.security.refresh_tokens = [];
      
      await user.save();

      logger.logAuth('password_reset_completed', user._id.toString());

      return {
        success: true,
        message: 'Password reset successfully'
      };
    } catch (error) {
      logger.logError(error as Error, { 
        operation: 'password_reset' 
      });
      
      return {
        success: false,
        message: 'Password reset failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Verify email
   */
  static async verifyEmail(token: string): Promise<ApiResponse> {
    try {
      const user = await User.findOne({
        'verification.verification_token': token,
        'verification.verification_expires': { $gt: new Date() }
      });

      if (!user) {
        return {
          success: false,
          message: 'Invalid or expired verification token'
        };
      }

      user.verification.email_verified = true;
      user.verification.verification_token = undefined;
      user.verification.verification_expires = undefined;
      await user.save();

      logger.logAuth('email_verified', user._id.toString());

      return {
        success: true,
        message: 'Email verified successfully'
      };
    } catch (error) {
      logger.logError(error as Error, { operation: 'email_verification' });
      
      return {
        success: false,
        message: 'Email verification failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Setup two-factor authentication
   */
  static async setupTwoFactor(userId: string): Promise<ApiResponse<TwoFactorSetup>> {
    try {
      const user = await User.findById(userId).select('+security');
      if (!user) {
        return {
          success: false,
          message: 'User not found'
        };
      }

      // Generate secret
      const secret = crypto.randomBytes(20).toString('base32');
      const qrCode = this.generateQRCode(user.email, secret);

      // Generate backup codes
      const backupCodes = Array.from({ length: 10 }, () => 
        crypto.randomBytes(4).toString('hex').toUpperCase()
      );

      user.security.two_factor_secret = secret;
      user.security.backup_codes = backupCodes;
      await user.save();

      return {
        success: true,
        message: 'Two-factor authentication setup initiated',
        data: {
          secret,
          qr_code: qrCode,
          backup_codes: backupCodes
        }
      };
    } catch (error) {
      logger.logError(error as Error, { userId, operation: 'setup_2fa' });
      
      return {
        success: false,
        message: 'Two-factor setup failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * OAuth login/register
   */
  static async oauthLogin(oauthUser: OAuthUser, deviceInfo: DeviceInfo): Promise<ApiResponse<{ user: PublicUser; tokens: AuthTokens; session: UserSession }>> {
    try {
      // Check if user exists
      let user = await User.findOne({
        email: oauthUser.email
      });

      if (!user) {
        // Create new user
        user = new User({
          email: oauthUser.email,
          password: crypto.randomBytes(32).toString('hex'), // Random password for OAuth users
          profile: {
            firstName: oauthUser.name.split(' ')[0],
            lastName: oauthUser.name.split(' ').slice(1).join(' ') || '',
            avatar: oauthUser.avatar
          },
          verification: {
            email_verified: oauthUser.verified
          }
        });
        await user.save();
      }

      // Generate tokens
      const tokens = JWTUtils.generateTokenPair(
        user._id.toString(),
        user.email,
        user.role
      );

      // Create session
      const session = await this.createSession(user._id.toString(), deviceInfo);

      logger.logAuth('oauth_login', user._id.toString(), {
        provider: oauthUser.provider,
        email: user.email
      });

      return {
        success: true,
        message: 'OAuth login successful',
        data: {
          user: this.getPublicUser(user),
          tokens,
          session
        }
      };
    } catch (error) {
      logger.logError(error as Error, { 
        provider: oauthUser.provider,
        email: oauthUser.email,
        operation: 'oauth_login' 
      });
      
      return {
        success: false,
        message: 'OAuth login failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Create user session
   */
  private static async createSession(userId: string, deviceInfo: DeviceInfo): Promise<UserSession> {
    const sessionId = uuidv4();
    const session: UserSession = {
      session_id: sessionId,
      user_id: userId,
      device_info: deviceInfo,
      ip_address: deviceInfo.ip_address,
      user_agent: deviceInfo.user_agent,
      created_at: new Date(),
      last_activity: new Date(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      is_active: true
    };

    // Store session in Redis
    await redisClient.setSession(sessionId, session, 7 * 24 * 60 * 60); // 7 days

    return session;
  }

  /**
   * Get public user data
   */
  private static getPublicUser(user: any): PublicUser {
    return {
      _id: user._id.toString(),
      email: user.email,
      profile: user.profile,
      academic: user.academic,
      professional: user.professional,
      preferences: user.preferences,
      subscription: user.subscription,
      statistics: user.statistics,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt
    };
  }

  /**
   * Generate QR code for 2FA
   */
  private static generateQRCode(email: string, secret: string): string {
    // This would typically use a QR code library
    // For now, return a placeholder
    return `otpauth://totp/PrepAI:${email}?secret=${secret}&issuer=PrepAI`;
  }

  /**
   * Get session ID from token
   */
  private static getSessionIdFromToken(token: string): string | null {
    try {
      const payload = JWTUtils.decodeToken(token);
      return payload?.tokenId || null;
    } catch (error) {
      return null;
    }
  }
}

export default AuthService;
