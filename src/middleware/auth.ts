import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';
import { JWTUtils } from '../utils/jwt';
import { logger } from '../utils/logger';
import { HTTP_STATUS } from '../types/common.types';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: any;
      session?: any;
      device_info?: any;
    }
  }
}

/**
 * Authentication middleware
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = JWTUtils.extractTokenFromHeader(authHeader);

    if (!token) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: 'Access token required'
      });
    }

    // Verify token
    const payload = JWTUtils.verifyAccessToken(token);
    
    // Check if user exists and is active
    const user = await User.findById(payload.userId).select('+security');
    
    if (!user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.isActive) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Check if account is locked
    if (user.isLocked) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: 'Account is temporarily locked due to multiple failed login attempts'
      });
    }

    // Attach user to request
    req.user = user;
    
    // Log authentication
    logger.logAuth('token_verified', user._id.toString(), {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    next();
  } catch (error) {
    logger.logError(error as Error, { 
      endpoint: req.path,
      method: req.method 
    });
    
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

/**
 * Optional authentication middleware (doesn't fail if no token)
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = JWTUtils.extractTokenFromHeader(authHeader);

    if (token) {
      const payload = JWTUtils.verifyAccessToken(token);
      const user = await User.findById(payload.userId);
      
      if (user && user.isActive && !user.isLocked) {
        req.user = user;
      }
    }

    next();
  } catch (error) {
    // Continue without authentication for optional auth
    next();
  }
};

/**
 * Role-based authorization middleware
 */
export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

/**
 * Subscription-based authorization middleware
 */
export const requireSubscription = (...plans: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const userPlan = req.user.subscription.plan;
    
    if (!plans.includes(userPlan)) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: 'Premium subscription required',
        data: {
          currentPlan: userPlan,
          requiredPlans: plans
        }
      });
    }

    // Check if subscription is expired
    if (req.user.subscription.expires_at && new Date() > req.user.subscription.expires_at) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: 'Subscription has expired',
        data: {
          expiredAt: req.user.subscription.expires_at
        }
      });
    }

    next();
  };
};

/**
 * Email verification required middleware
 */
export const requireEmailVerification = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (!req.user.verification.email_verified) {
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      message: 'Email verification required',
      data: {
        email: req.user.email,
        verified: false
      }
    });
  }

  next();
};

/**
 * Rate limiting middleware for authentication endpoints
 */
export const authRateLimit = (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip;
  const key = `auth_attempts:${ip}`;
  
  // This would integrate with Redis for actual rate limiting
  // For now, we'll use a simple in-memory approach
  const attempts = (global as any).authAttempts || {};
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 5;

  // Clean old attempts
  Object.keys(attempts).forEach(ipKey => {
    if (now - attempts[ipKey].firstAttempt > windowMs) {
      delete attempts[ipKey];
    }
  });

  if (!attempts[ip]) {
    attempts[ip] = { count: 1, firstAttempt: now };
  } else {
    attempts[ip].count++;
  }

  (global as any).authAttempts = attempts;

  if (attempts[ip].count > maxAttempts) {
    logger.logSecurity('rate_limit_exceeded', {
      ip,
      attempts: attempts[ip].count,
      endpoint: req.path
    });

    return res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
      success: false,
      message: 'Too many authentication attempts. Please try again later.',
      retryAfter: Math.ceil((attempts[ip].firstAttempt + windowMs - now) / 1000)
    });
  }

  next();
};

/**
 * Device fingerprinting middleware
 */
export const deviceFingerprint = (req: Request, res: Response, next: NextFunction) => {
  const crypto = require('crypto');
  
  const deviceInfo = {
    ip: req.ip,
    userAgent: req.get('User-Agent') || '',
    acceptLanguage: req.get('Accept-Language') || '',
    acceptEncoding: req.get('Accept-Encoding') || ''
  };

  const fingerprint = crypto
    .createHash('sha256')
    .update(JSON.stringify(deviceInfo))
    .digest('hex');

  req.device_info = {
    ...deviceInfo,
    fingerprint
  };

  next();
};

/**
 * Session management middleware
 */
export const sessionManager = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next();
  }

  try {
    // Update last activity
    req.user.lastLoginAt = new Date();
    await req.user.save();

    // Log session activity
    logger.logAuth('session_activity', req.user._id.toString(), {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      endpoint: req.path
    });

    next();
  } catch (error) {
    logger.logError(error as Error, { 
      userId: req.user._id,
      endpoint: req.path 
    });
    next();
  }
};

/**
 * Security headers middleware
 */
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Strict transport security (HTTPS only)
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  // Content security policy
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'");
  
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  next();
};

export default {
  authenticate,
  optionalAuth,
  authorize,
  requireSubscription,
  requireEmailVerification,
  authRateLimit,
  deviceFingerprint,
  sessionManager,
  securityHeaders
};
