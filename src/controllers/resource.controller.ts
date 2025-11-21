import { Request, Response } from 'express';
import { Resource, Bookmark, ResourceRating } from '../models/Resource';
import { logger } from '../utils/logger';
import { HTTP_STATUS } from '../types/common.types';
import { z } from 'zod';

// Validation schemas
const createResourceSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(1000),
  content: z.string().min(1).max(50000),
  type: z.enum(['article', 'video', 'tutorial', 'cheatsheet', 'book', 'course', 'tool']),
  category: z.string().min(1).max(100),
  subcategory: z.string().max(100).optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  tags: z.array(z.string().max(50)).max(20),
  url: z.string().url().optional(),
  thumbnail_url: z.string().url().optional(),
  duration: z.number().min(1).max(10080).optional(),
  author: z.string().min(1).max(200),
  source: z.string().min(1).max(200),
  is_premium: z.boolean().optional()
});

const bookmarkResourceSchema = z.object({
  resource_id: z.string().min(1),
  folder: z.string().max(100).optional(),
  notes: z.string().max(1000).optional()
});

const rateResourceSchema = z.object({
  resource_id: z.string().min(1),
  rating: z.number().min(1).max(5),
  review: z.string().max(1000).optional()
});

export class ResourceController {
  /**
   * Get resource categories
   */
  static async getCategories(req: Request, res: Response) {
    try {
      const categories = [
        {
          id: 'programming',
          name: 'Programming',
          description: 'Programming languages, frameworks, and tools',
          icon: '💻',
          color: 'from-blue-500 to-blue-600',
          resourceCount: 45
        },
        {
          id: 'algorithms',
          name: 'Algorithms & Data Structures',
          description: 'Algorithm design and data structure concepts',
          icon: '⚡',
          color: 'from-green-500 to-green-600',
          resourceCount: 32
        },
        {
          id: 'system-design',
          name: 'System Design',
          description: 'Scalable system architecture and design patterns',
          icon: '🏗️',
          color: 'from-purple-500 to-purple-600',
          resourceCount: 18
        },
        {
          id: 'databases',
          name: 'Databases',
          description: 'SQL, NoSQL, and database optimization',
          icon: '🗄️',
          color: 'from-orange-500 to-orange-600',
          resourceCount: 25
        },
        {
          id: 'web-development',
          name: 'Web Development',
          description: 'Frontend and backend web technologies',
          icon: '🌐',
          color: 'from-pink-500 to-pink-600',
          resourceCount: 38
        },
        {
          id: 'mobile-development',
          name: 'Mobile Development',
          description: 'iOS, Android, and cross-platform development',
          icon: '📱',
          color: 'from-indigo-500 to-indigo-600',
          resourceCount: 22
        },
        {
          id: 'devops',
          name: 'DevOps & Cloud',
          description: 'CI/CD, cloud platforms, and infrastructure',
          icon: '☁️',
          color: 'from-cyan-500 to-cyan-600',
          resourceCount: 28
        },
        {
          id: 'career',
          name: 'Career & Interview',
          description: 'Interview preparation and career guidance',
          icon: '🎯',
          color: 'from-red-500 to-red-600',
          resourceCount: 35
        }
      ];

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Resource categories retrieved successfully',
        data: categories
      });
    } catch (error) {
      logger.logError(error as Error, { 
        endpoint: 'GET /api/resources/categories' 
      });
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Search resources
   */
  static async searchResources(req: Request, res: Response) {
    try {
      const { 
        q = '', 
        category, 
        difficulty, 
        type, 
        is_premium,
        page = 1, 
        limit = 20,
        sort = 'relevance'
      } = req.query;

      // Build search query
      const searchQuery: any = {};
      const filters: any = {};

      if (q) {
        searchQuery.$or = [
          { title: { $regex: q, $options: 'i' } },
          { description: { $regex: q, $options: 'i' } },
          { content: { $regex: q, $options: 'i' } },
          { tags: { $in: [new RegExp(q as string, 'i')] } }
        ];
      }

      if (category) filters.category = category;
      if (difficulty) filters.difficulty = difficulty;
      if (type) filters.type = type;
      if (is_premium !== undefined) filters.is_premium = is_premium === 'true';

      const query = { ...searchQuery, ...filters };

      // Build sort options
      let sortOptions: any = {};
      switch (sort) {
        case 'rating':
          sortOptions = { rating: -1, rating_count: -1 };
          break;
        case 'views':
          sortOptions = { view_count: -1 };
          break;
        case 'newest':
          sortOptions = { created_at: -1 };
          break;
        case 'popular':
          sortOptions = { bookmark_count: -1, view_count: -1 };
          break;
        default: // relevance
          sortOptions = { rating: -1, view_count: -1 };
      }

      // Execute search
      const resources = await Resource.find(query)
        .sort(sortOptions)
        .limit(Number(limit) * 1)
        .skip((Number(page) - 1) * Number(limit))
        .select('-content'); // Exclude full content for list view

      const total = await Resource.countDocuments(query);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Resources retrieved successfully',
        data: resources,
        meta: {
          query: q,
          filters,
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
          sort
        }
      });
    } catch (error) {
      logger.logError(error as Error, { 
        endpoint: 'GET /api/resources/search',
        query: req.query 
      });
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get resource details
   */
  static async getResource(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const resource = await Resource.findById(id)
        .populate('created_by', 'profile.firstName profile.lastName profile.avatar');

      if (!resource) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Resource not found'
        });
      }

      // Increment view count
      await resource.incrementViewCount();

      // Get user's bookmark status if authenticated
      let isBookmarked = false;
      let userRating = null;

      if (req.user) {
        const bookmark = await Bookmark.findOne({
          user_id: req.user._id,
          resource_id: resource._id
        });
        isBookmarked = !!bookmark;

        const rating = await ResourceRating.findOne({
          user_id: req.user._id,
          resource_id: resource._id
        });
        userRating = rating;
      }

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Resource retrieved successfully',
        data: {
          ...resource.toObject(),
          is_bookmarked: isBookmarked,
          user_rating: userRating
        }
      });
    } catch (error) {
      logger.logError(error as Error, { 
        endpoint: 'GET /api/resources/:id',
        resourceId: req.params.id 
      });
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get featured resources
   */
  static async getFeatured(req: Request, res: Response) {
    try {
      const { limit = 10, category } = req.query;

      const filter: any = { is_featured: true };
      if (category) filter.category = category;

      const resources = await Resource.find(filter)
        .sort({ created_at: -1 })
        .limit(Number(limit))
        .select('-content');

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Featured resources retrieved successfully',
        data: resources
      });
    } catch (error) {
      logger.logError(error as Error, { 
        endpoint: 'GET /api/resources/featured',
        query: req.query 
      });
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get popular resources
   */
  static async getPopular(req: Request, res: Response) {
    try {
      const { limit = 10, category } = req.query;

      const filter: any = {};
      if (category) filter.category = category;

      const resources = await Resource.find(filter)
        .sort({ view_count: -1, rating: -1 })
        .limit(Number(limit))
        .select('-content');

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Popular resources retrieved successfully',
        data: resources
      });
    } catch (error) {
      logger.logError(error as Error, { 
        endpoint: 'GET /api/resources/popular',
        query: req.query 
      });
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Bookmark a resource
   */
  static async bookmarkResource(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Validate request body
      const validationResult = bookmarkResourceSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Validation failed',
          errors: validationResult.error.flatten().fieldErrors
        });
      }

      const { resource_id, folder = 'General', notes } = validationResult.data;

      // Check if resource exists
      const resource = await Resource.findById(resource_id);
      if (!resource) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Resource not found'
        });
      }

      // Check if already bookmarked
      const existingBookmark = await Bookmark.findOne({
        user_id: req.user._id,
        resource_id: resource_id
      });

      if (existingBookmark) {
        return res.status(HTTP_STATUS.CONFLICT).json({
          success: false,
          message: 'Resource already bookmarked'
        });
      }

      // Create bookmark
      const bookmark = new Bookmark({
        user_id: req.user._id,
        resource_id: resource_id,
        folder,
        notes
      });

      await bookmark.save();

      // Update resource bookmark count
      await resource.addBookmark();

      logger.logAuth('resource_bookmarked', req.user._id.toString(), {
        resource_id,
        folder
      });

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message: 'Resource bookmarked successfully',
        data: {
          bookmark_id: bookmark._id,
          resource_id: resource_id,
          folder,
          notes
        }
      });
    } catch (error) {
      logger.logError(error as Error, { 
        endpoint: 'POST /api/resources/bookmark',
        userId: req.user?._id 
      });
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Remove bookmark
   */
  static async removeBookmark(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const { id } = req.params;

      const bookmark = await Bookmark.findOne({
        _id: id,
        user_id: req.user._id
      });

      if (!bookmark) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Bookmark not found'
        });
      }

      // Remove bookmark
      await Bookmark.findByIdAndDelete(id);

      // Update resource bookmark count
      const resource = await Resource.findById(bookmark.resource_id);
      if (resource) {
        await resource.removeBookmark();
      }

      logger.logAuth('bookmark_removed', req.user._id.toString(), {
        bookmark_id: id,
        resource_id: bookmark.resource_id
      });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Bookmark removed successfully'
      });
    } catch (error) {
      logger.logError(error as Error, { 
        endpoint: 'DELETE /api/resources/bookmark/:id',
        userId: req.user?._id 
      });
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get user's bookmarks
   */
  static async getUserBookmarks(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const { folder, page = 1, limit = 20 } = req.query;

      const filter: any = { user_id: req.user._id };
      if (folder) filter.folder = folder;

      const bookmarks = await Bookmark.find(filter)
        .populate('resource_id', 'title description type category difficulty thumbnail_url rating view_count')
        .sort({ created_at: -1 })
        .limit(Number(limit) * 1)
        .skip((Number(page) - 1) * Number(limit));

      const total = await Bookmark.countDocuments(filter);

      // Get user's folders
      const folders = await Bookmark.getUserFolders(req.user._id);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Bookmarks retrieved successfully',
        data: bookmarks,
        folders,
        meta: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error) {
      logger.logError(error as Error, { 
        endpoint: 'GET /api/resources/bookmarks',
        userId: req.user?._id 
      });
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Rate a resource
   */
  static async rateResource(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Validate request body
      const validationResult = rateResourceSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Validation failed',
          errors: validationResult.error.flatten().fieldErrors
        });
      }

      const { resource_id, rating, review } = validationResult.data;

      // Check if resource exists
      const resource = await Resource.findById(resource_id);
      if (!resource) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Resource not found'
        });
      }

      // Check if user already rated this resource
      const existingRating = await ResourceRating.findOne({
        user_id: req.user._id,
        resource_id: resource_id
      });

      if (existingRating) {
        // Update existing rating
        existingRating.rating = rating;
        existingRating.review = review;
        await existingRating.save();
      } else {
        // Create new rating
        const resourceRating = new ResourceRating({
          user_id: req.user._id,
          resource_id: resource_id,
          rating,
          review
        });
        await resourceRating.save();
      }

      // Update resource rating
      await resource.updateRating(rating);

      logger.logAuth('resource_rated', req.user._id.toString(), {
        resource_id,
        rating,
        has_review: !!review
      });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Resource rated successfully',
        data: {
          resource_id,
          rating,
          review
        }
      });
    } catch (error) {
      logger.logError(error as Error, { 
        endpoint: 'POST /api/resources/rate',
        userId: req.user?._id 
      });
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get resource ratings
   */
  static async getResourceRatings(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { page = 1, limit = 10 } = req.query;

      const ratings = await ResourceRating.find({ resource_id: id })
        .populate('user_id', 'profile.firstName profile.lastName profile.avatar')
        .sort({ created_at: -1 })
        .limit(Number(limit) * 1)
        .skip((Number(page) - 1) * Number(limit));

      const total = await ResourceRating.countDocuments({ resource_id: id });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Resource ratings retrieved successfully',
        data: ratings,
        meta: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error) {
      logger.logError(error as Error, { 
        endpoint: 'GET /api/resources/:id/ratings',
        resourceId: req.params.id 
      });
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get trending tags
   */
  static async getTrendingTags(req: Request, res: Response) {
    try {
      const { limit = 20 } = req.query;

      // Get most used tags
      const tagCounts = await Resource.aggregate([
        { $unwind: '$tags' },
        { $group: { _id: '$tags', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: Number(limit) }
      ]);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Trending tags retrieved successfully',
        data: tagCounts.map(tag => ({
          name: tag._id,
          count: tag.count
        }))
      });
    } catch (error) {
      logger.logError(error as Error, { 
        endpoint: 'GET /api/resources/trending-tags' 
      });
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

export default ResourceController;
