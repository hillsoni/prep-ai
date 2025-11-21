import { Request, Response } from 'express';
import { User } from '../models/User';
import { logger } from '../utils/logger';
import { HTTP_STATUS } from '../types/common.types';
import { z } from 'zod';

// Validation schemas
const updateProfileSchema = z.object({
  profile: z.object({
    firstName: z.string().min(1).max(50).optional(),
    lastName: z.string().min(1).max(50).optional(),
    phone: z.string().regex(/^[\+]?[1-9][\d]{0,15}$/).optional(),
    dateOfBirth: z.string().datetime().optional(),
    bio: z.string().max(500).optional(),
    location: z.string().max(100).optional(),
    website: z.string().url().optional()
  }).optional(),
  academic: z.object({
    institution: z.string().max(100).optional(),
    degree: z.string().max(100).optional(),
    graduationYear: z.number().min(1950).max(new Date().getFullYear() + 10).optional(),
    cgpa: z.number().min(0).max(4.0).optional(),
    fieldOfStudy: z.string().max(100).optional(),
    certifications: z.array(z.string().max(100)).optional()
  }).optional(),
  professional: z.object({
    experience: z.number().min(0).max(50).optional(),
    currentRole: z.string().max(100).optional(),
    company: z.string().max(100).optional(),
    targetRole: z.string().max(100).optional(),
    skills: z.array(z.string().max(50)).optional(),
    industries: z.array(z.string().max(50)).optional(),
    salaryExpectation: z.number().min(0).optional(),
    availability: z.string().max(100).optional()
  }).optional(),
  preferences: z.object({
    theme: z.enum(['light', 'dark', 'system']).optional(),
    language: z.string().max(10).optional(),
    timezone: z.string().max(50).optional(),
    notifications: z.object({
      email: z.boolean().optional(),
      push: z.boolean().optional(),
      sms: z.boolean().optional(),
      weekly_report: z.boolean().optional(),
      interview_reminders: z.boolean().optional(),
      achievement_notifications: z.boolean().optional(),
      marketing_emails: z.boolean().optional()
    }).optional(),
    privacy: z.object({
      profile_visibility: z.enum(['public', 'private', 'friends']).optional(),
      show_leaderboard: z.boolean().optional(),
      show_achievements: z.boolean().optional(),
      allow_analytics: z.boolean().optional(),
      data_sharing: z.boolean().optional()
    }).optional(),
    learning: z.object({
      difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
      focus_areas: z.array(z.string().max(50)).optional(),
      learning_style: z.enum(['visual', 'auditory', 'kinesthetic', 'reading']).optional(),
      study_schedule: z.object({
        days: z.array(z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])).optional(),
        time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
        duration: z.number().min(15).max(480).optional()
      }).optional()
    }).optional()
  }).optional()
});

const changePasswordSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  new_password: z.string().min(8, 'New password must be at least 8 characters'),
  confirm_password: z.string().min(8, 'Password confirmation is required')
}).refine(data => data.new_password === data.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password']
});

const updateSubscriptionSchema = z.object({
  plan: z.enum(['free', 'premium', 'pro']),
  billing_cycle: z.enum(['monthly', 'yearly']).optional(),
  auto_renew: z.boolean().optional(),
  payment_method: z.string().max(100).optional()
});

export class UserController {
  /**
   * Get user profile
   */
  static async getProfile(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const user = await User.findById(req.user._id).select('-password -security');
      
      if (!user) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'User not found'
        });
      }

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Profile retrieved successfully',
        data: user
      });
    } catch (error) {
      logger.logError(error as Error, { 
        endpoint: 'GET /api/user/profile',
        userId: req.user?._id 
      });
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Validate request body
      const validationResult = updateProfileSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Validation failed',
          errors: validationResult.error.flatten().fieldErrors
        });
      }

      const updateData = validationResult.data;
      const user = await User.findById(req.user._id);
      
      if (!user) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'User not found'
        });
      }

      // Update user data
      if (updateData.profile) {
        Object.assign(user.profile, updateData.profile);
      }
      
      if (updateData.academic) {
        Object.assign(user.academic, updateData.academic);
      }
      
      if (updateData.professional) {
        Object.assign(user.professional, updateData.professional);
      }
      
      if (updateData.preferences) {
        Object.assign(user.preferences, updateData.preferences);
      }

      await user.save();

      logger.logAuth('profile_updated', user._id.toString(), {
        fields: Object.keys(updateData)
      });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Profile updated successfully',
        data: user
      });
    } catch (error) {
      logger.logError(error as Error, { 
        endpoint: 'PUT /api/user/profile',
        userId: req.user?._id 
      });
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Change password
   */
  static async changePassword(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Validate request body
      const validationResult = changePasswordSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Validation failed',
          errors: validationResult.error.flatten().fieldErrors
        });
      }

      const { current_password, new_password } = validationResult.data;
      const user = await User.findById(req.user._id).select('+password');
      
      if (!user) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'User not found'
        });
      }

      // Verify current password
      const isCurrentPasswordValid = await user.comparePassword(current_password);
      if (!isCurrentPasswordValid) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      // Update password
      user.password = new_password;
      user.security.last_password_change = new Date();
      
      // Invalidate all refresh tokens for security
      user.security.refresh_tokens = [];
      
      await user.save();

      logger.logAuth('password_changed', user._id.toString());

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      logger.logError(error as Error, { 
        endpoint: 'PUT /api/user/change-password',
        userId: req.user?._id 
      });
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Upload avatar
   */
  static async uploadAvatar(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // This would integrate with file upload middleware
      // For now, return a placeholder response
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Avatar upload endpoint - implementation pending',
        data: {
          avatar_url: 'https://via.placeholder.com/150'
        }
      });
    } catch (error) {
      logger.logError(error as Error, { 
        endpoint: 'POST /api/user/avatar',
        userId: req.user?._id 
      });
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get user statistics
   */
  static async getStatistics(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const user = await User.findById(req.user._id).select('statistics');
      
      if (!user) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'User not found'
        });
      }

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Statistics retrieved successfully',
        data: user.statistics
      });
    } catch (error) {
      logger.logError(error as Error, { 
        endpoint: 'GET /api/user/statistics',
        userId: req.user?._id 
      });
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Update subscription
   */
  static async updateSubscription(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Validate request body
      const validationResult = updateSubscriptionSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Validation failed',
          errors: validationResult.error.flatten().fieldErrors
        });
      }

      const { plan, billing_cycle, auto_renew, payment_method } = validationResult.data;
      const user = await User.findById(req.user._id);
      
      if (!user) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'User not found'
        });
      }

      // Update subscription
      user.subscription.plan = plan;
      if (billing_cycle) user.subscription.billing_cycle = billing_cycle;
      if (auto_renew !== undefined) user.subscription.auto_renew = auto_renew;
      if (payment_method) user.subscription.payment_method = payment_method;

      // Set expiration date based on plan and billing cycle
      if (plan !== 'free') {
        const now = new Date();
        const months = billing_cycle === 'yearly' ? 12 : 1;
        user.subscription.expires_at = new Date(now.getTime() + (months * 30 * 24 * 60 * 60 * 1000));
      } else {
        user.subscription.expires_at = undefined;
      }

      await user.save();

      logger.logAuth('subscription_updated', user._id.toString(), {
        plan,
        billing_cycle,
        expires_at: user.subscription.expires_at
      });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Subscription updated successfully',
        data: {
          plan: user.subscription.plan,
          billing_cycle: user.subscription.billing_cycle,
          expires_at: user.subscription.expires_at,
          auto_renew: user.subscription.auto_renew
        }
      });
    } catch (error) {
      logger.logError(error as Error, { 
        endpoint: 'PUT /api/user/subscription',
        userId: req.user?._id 
      });
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Delete user account
   */
  static async deleteAccount(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const { password } = req.body;
      
      if (!password) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Password is required to delete account'
        });
      }

      const user = await User.findById(req.user._id).select('+password');
      
      if (!user) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'User not found'
        });
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Password is incorrect'
        });
      }

      // Soft delete - mark as inactive instead of hard delete
      user.isActive = false;
      user.security.refresh_tokens = [];
      await user.save();

      logger.logAuth('account_deleted', user._id.toString());

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Account deleted successfully'
      });
    } catch (error) {
      logger.logError(error as Error, { 
        endpoint: 'DELETE /api/user/account',
        userId: req.user?._id 
      });
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get user achievements
   */
  static async getAchievements(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const user = await User.findById(req.user._id)
        .populate('statistics.achievements', 'name description icon category rarity rewards')
        .select('statistics.achievements');
      
      if (!user) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'User not found'
        });
      }

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Achievements retrieved successfully',
        data: user.statistics.achievements
      });
    } catch (error) {
      logger.logError(error as Error, { 
        endpoint: 'GET /api/user/achievements',
        userId: req.user?._id 
      });
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

export default UserController;
