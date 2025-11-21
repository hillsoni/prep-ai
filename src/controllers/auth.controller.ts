import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { logger } from '../utils/logger';
import { HTTP_STATUS } from '../types/common.types';
import { z } from 'zod';

// Validation schemas
const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required').max(50, 'First name too long'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name too long'),
  role: z.enum(['user', 'admin', 'moderator']).optional()
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
  remember_me: z.boolean().optional()
});

const refreshTokenSchema = z.object({
  refresh_token: z.string().min(1, 'Refresh token is required')
});

const passwordResetRequestSchema = z.object({
  email: z.string().email('Invalid email format')
});

const passwordResetSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  new_password: z.string().min(8, 'Password must be at least 8 characters'),
  confirm_password: z.string().min(8, 'Password confirmation is required')
}).refine(data => data.new_password === data.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password']
});

const emailVerificationSchema = z.object({
  token: z.string().min(1, 'Verification token is required')
});

export class AuthController {
  /**
   * Register new user
   */
  static async register(req: Request, res: Response) {
    try {
      // Validate request body
      const validationResult = registerSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Validation failed',
          errors: validationResult.error.flatten().fieldErrors
        });
      }

      const { email, password, firstName, lastName, role } = validationResult.data;

      // Get device info
      const deviceInfo = {
        device_id: req.headers['x-device-id'] as string || 'unknown',
        device_name: req.headers['x-device-name'] as string || 'Unknown Device',
        platform: req.headers['x-platform'] as string || 'unknown',
        browser: req.headers['user-agent'] || 'unknown',
        ip_address: req.ip || 'unknown',
        user_agent: req.headers['user-agent'] || 'unknown'
      };

      // Call auth service
      const result = await AuthService.register({
        email,
        password,
        firstName,
        lastName,
        role
      }, deviceInfo);

      const statusCode = result.success ? HTTP_STATUS.CREATED : HTTP_STATUS.BAD_REQUEST;
      res.status(statusCode).json(result);
    } catch (error) {
      logger.logError(error as Error, { 
        endpoint: 'POST /api/auth/register',
        body: req.body 
      });
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Login user
   */
  static async login(req: Request, res: Response) {
    try {
      // Validate request body
      const validationResult = loginSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Validation failed',
          errors: validationResult.error.flatten().fieldErrors
        });
      }

      const { email, password, remember_me } = validationResult.data;

      // Get device info
      const deviceInfo = {
        device_id: req.headers['x-device-id'] as string || 'unknown',
        device_name: req.headers['x-device-name'] as string || 'Unknown Device',
        platform: req.headers['x-platform'] as string || 'unknown',
        browser: req.headers['user-agent'] || 'unknown',
        ip_address: req.ip || 'unknown',
        user_agent: req.headers['user-agent'] || 'unknown'
      };

      // Call auth service
      const result = await AuthService.login({
        email,
        password,
        remember_me,
        device_info: deviceInfo
      }, deviceInfo);

      const statusCode = result.success ? HTTP_STATUS.OK : HTTP_STATUS.UNAUTHORIZED;
      res.status(statusCode).json(result);
    } catch (error) {
      logger.logError(error as Error, { 
        endpoint: 'POST /api/auth/login',
        body: req.body 
      });
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Refresh access token
   */
  static async refreshToken(req: Request, res: Response) {
    try {
      // Validate request body
      const validationResult = refreshTokenSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Validation failed',
          errors: validationResult.error.flatten().fieldErrors
        });
      }

      const { refresh_token } = validationResult.data;

      // Call auth service
      const result = await AuthService.refreshToken(refresh_token);

      const statusCode = result.success ? HTTP_STATUS.OK : HTTP_STATUS.UNAUTHORIZED;
      res.status(statusCode).json(result);
    } catch (error) {
      logger.logError(error as Error, { 
        endpoint: 'POST /api/auth/refresh',
        body: req.body 
      });
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Logout user
   */
  static async logout(req: Request, res: Response) {
    try {
      const userId = req.user?._id?.toString();
      const refreshToken = req.body.refresh_token;

      if (!userId) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Call auth service
      const result = await AuthService.logout(userId, refreshToken);

      const statusCode = result.success ? HTTP_STATUS.OK : HTTP_STATUS.BAD_REQUEST;
      res.status(statusCode).json(result);
    } catch (error) {
      logger.logError(error as Error, { 
        endpoint: 'POST /api/auth/logout',
        userId: req.user?._id 
      });
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Request password reset
   */
  static async requestPasswordReset(req: Request, res: Response) {
    try {
      // Validate request body
      const validationResult = passwordResetRequestSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Validation failed',
          errors: validationResult.error.flatten().fieldErrors
        });
      }

      const { email } = validationResult.data;

      // Get device info
      const deviceInfo = {
        ip_address: req.ip || 'unknown',
        user_agent: req.headers['user-agent'] || 'unknown'
      };

      // Call auth service
      const result = await AuthService.requestPasswordReset({
        email,
        ip_address: deviceInfo.ip_address,
        user_agent: deviceInfo.user_agent
      });

      const statusCode = result.success ? HTTP_STATUS.OK : HTTP_STATUS.BAD_REQUEST;
      res.status(statusCode).json(result);
    } catch (error) {
      logger.logError(error as Error, { 
        endpoint: 'POST /api/auth/forgot-password',
        body: req.body 
      });
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Reset password
   */
  static async resetPassword(req: Request, res: Response) {
    try {
      // Validate request body
      const validationResult = passwordResetSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Validation failed',
          errors: validationResult.error.flatten().fieldErrors
        });
      }

      const { token, new_password, confirm_password } = validationResult.data;

      // Call auth service
      const result = await AuthService.resetPassword({
        token,
        new_password,
        confirm_password
      });

      const statusCode = result.success ? HTTP_STATUS.OK : HTTP_STATUS.BAD_REQUEST;
      res.status(statusCode).json(result);
    } catch (error) {
      logger.logError(error as Error, { 
        endpoint: 'POST /api/auth/reset-password',
        body: req.body 
      });
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Verify email
   */
  static async verifyEmail(req: Request, res: Response) {
    try {
      // Validate request body
      const validationResult = emailVerificationSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Validation failed',
          errors: validationResult.error.flatten().fieldErrors
        });
      }

      const { token } = validationResult.data;

      // Call auth service
      const result = await AuthService.verifyEmail(token);

      const statusCode = result.success ? HTTP_STATUS.OK : HTTP_STATUS.BAD_REQUEST;
      res.status(statusCode).json(result);
    } catch (error) {
      logger.logError(error as Error, { 
        endpoint: 'POST /api/auth/verify-email',
        body: req.body 
      });
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get current user profile
   */
  static async getProfile(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Return user profile (excluding sensitive data)
      const userProfile = {
        _id: req.user._id,
        email: req.user.email,
        profile: req.user.profile,
        academic: req.user.academic,
        professional: req.user.professional,
        preferences: req.user.preferences,
        subscription: req.user.subscription,
        statistics: req.user.statistics,
        role: req.user.role,
        isActive: req.user.isActive,
        createdAt: req.user.createdAt,
        lastLoginAt: req.user.lastLoginAt
      };

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Profile retrieved successfully',
        data: userProfile
      });
    } catch (error) {
      logger.logError(error as Error, { 
        endpoint: 'GET /api/auth/profile',
        userId: req.user?._id 
      });
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Setup two-factor authentication
   */
  static async setupTwoFactor(req: Request, res: Response) {
    try {
      const userId = req.user?._id?.toString();

      if (!userId) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Call auth service
      const result = await AuthService.setupTwoFactor(userId);

      const statusCode = result.success ? HTTP_STATUS.OK : HTTP_STATUS.BAD_REQUEST;
      res.status(statusCode).json(result);
    } catch (error) {
      logger.logError(error as Error, { 
        endpoint: 'POST /api/auth/2fa/setup',
        userId: req.user?._id 
      });
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

export default AuthController;
