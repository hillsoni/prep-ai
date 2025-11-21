import { Router } from 'express';
import ResourceController from '../controllers/resource.controller';
import { 
  authenticate, 
  requireEmailVerification,
  securityHeaders 
} from '../middleware/auth';

const router = Router();

// Apply security headers to all resource routes
router.use(securityHeaders);

/**
 * @swagger
 * /api/resources/categories:
 *   get:
 *     summary: Get available resource categories
 *     tags: [Resources]
 *     responses:
 *       200:
 *         description: Resource categories retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Resource categories retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: programming
 *                       name:
 *                         type: string
 *                         example: Programming
 *                       description:
 *                         type: string
 *                         example: Programming languages, frameworks, and tools
 *                       icon:
 *                         type: string
 *                         example: 💻
 *                       color:
 *                         type: string
 *                         example: from-blue-500 to-blue-600
 *                       resourceCount:
 *                         type: number
 *                         example: 45
 *       500:
 *         description: Internal server error
 */
router.get('/categories', ResourceController.getCategories);

/**
 * @swagger
 * /api/resources/search:
 *   get:
 *     summary: Search resources
 *     tags: [Resources]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: difficulty
 *         schema:
 *           type: string
 *           enum: [beginner, intermediate, advanced]
 *         description: Filter by difficulty
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [article, video, tutorial, cheatsheet, book, course, tool]
 *         description: Filter by type
 *       - in: query
 *         name: is_premium
 *         schema:
 *           type: boolean
 *         description: Filter by premium status
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 20
 *         description: Number of items per page
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [relevance, rating, views, newest, popular]
 *           default: relevance
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Resources retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Resources retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Resource'
 *                 meta:
 *                   type: object
 *                   properties:
 *                     query:
 *                       type: string
 *                     filters:
 *                       type: object
 *                     page:
 *                       type: number
 *                     limit:
 *                       type: number
 *                     total:
 *                       type: number
 *                     totalPages:
 *                       type: number
 *                     sort:
 *                       type: string
 *       500:
 *         description: Internal server error
 */
router.get('/search', ResourceController.searchResources);

/**
 * @swagger
 * /api/resources/featured:
 *   get:
 *     summary: Get featured resources
 *     tags: [Resources]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 10
 *         description: Number of featured resources
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *     responses:
 *       200:
 *         description: Featured resources retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Featured resources retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Resource'
 *       500:
 *         description: Internal server error
 */
router.get('/featured', ResourceController.getFeatured);

/**
 * @swagger
 * /api/resources/popular:
 *   get:
 *     summary: Get popular resources
 *     tags: [Resources]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 10
 *         description: Number of popular resources
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *     responses:
 *       200:
 *         description: Popular resources retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Popular resources retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Resource'
 *       500:
 *         description: Internal server error
 */
router.get('/popular', ResourceController.getPopular);

/**
 * @swagger
 * /api/resources/trending-tags:
 *   get:
 *     summary: Get trending tags
 *     tags: [Resources]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 20
 *         description: Number of trending tags
 *     responses:
 *       200:
 *         description: Trending tags retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Trending tags retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                         example: javascript
 *                       count:
 *                         type: number
 *                         example: 25
 *       500:
 *         description: Internal server error
 */
router.get('/trending-tags', ResourceController.getTrendingTags);

/**
 * @swagger
 * /api/resources/{id}:
 *   get:
 *     summary: Get resource details
 *     tags: [Resources]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Resource ID
 *     responses:
 *       200:
 *         description: Resource retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Resource retrieved successfully
 *                 data:
 *                   allOf:
 *                     - $ref: '#/components/schemas/Resource'
 *                     - type: object
 *                       properties:
 *                         is_bookmarked:
 *                           type: boolean
 *                           example: false
 *                         user_rating:
 *                           type: object
 *                           nullable: true
 *       404:
 *         description: Resource not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id', ResourceController.getResource);

// All routes below require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/resources/bookmark:
 *   post:
 *     summary: Bookmark a resource
 *     tags: [Resources]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - resource_id
 *             properties:
 *               resource_id:
 *                 type: string
 *                 example: 507f1f77bcf86cd799439011
 *               folder:
 *                 type: string
 *                 maxLength: 100
 *                 example: Programming
 *               notes:
 *                 type: string
 *                 maxLength: 1000
 *                 example: Great resource for learning React
 *     responses:
 *       201:
 *         description: Resource bookmarked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Resource bookmarked successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     bookmark_id:
 *                       type: string
 *                     resource_id:
 *                       type: string
 *                     folder:
 *                       type: string
 *                     notes:
 *                       type: string
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Resource not found
 *       409:
 *         description: Resource already bookmarked
 *       500:
 *         description: Internal server error
 */
router.post('/bookmark', ResourceController.bookmarkResource);

/**
 * @swagger
 * /api/resources/bookmark/{id}:
 *   delete:
 *     summary: Remove bookmark
 *     tags: [Resources]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Bookmark ID
 *     responses:
 *       200:
 *         description: Bookmark removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Bookmark removed successfully
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Bookmark not found
 *       500:
 *         description: Internal server error
 */
router.delete('/bookmark/:id', ResourceController.removeBookmark);

/**
 * @swagger
 * /api/resources/bookmarks:
 *   get:
 *     summary: Get user's bookmarks
 *     tags: [Resources]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: folder
 *         schema:
 *           type: string
 *         description: Filter by folder
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 20
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Bookmarks retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Bookmarks retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Bookmark'
 *                 folders:
 *                   type: array
 *                   items:
 *                     type: string
 *                 meta:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: number
 *                     limit:
 *                       type: number
 *                     total:
 *                       type: number
 *                     totalPages:
 *                       type: number
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Internal server error
 */
router.get('/bookmarks', ResourceController.getUserBookmarks);

/**
 * @swagger
 * /api/resources/rate:
 *   post:
 *     summary: Rate a resource
 *     tags: [Resources]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - resource_id
 *               - rating
 *             properties:
 *               resource_id:
 *                 type: string
 *                 example: 507f1f77bcf86cd799439011
 *               rating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 4
 *               review:
 *                 type: string
 *                 maxLength: 1000
 *                 example: Great resource, very helpful for beginners
 *     responses:
 *       200:
 *         description: Resource rated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Resource rated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     resource_id:
 *                       type: string
 *                     rating:
 *                       type: number
 *                     review:
 *                       type: string
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Resource not found
 *       500:
 *         description: Internal server error
 */
router.post('/rate', ResourceController.rateResource);

/**
 * @swagger
 * /api/resources/{id}/ratings:
 *   get:
 *     summary: Get resource ratings
 *     tags: [Resources]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Resource ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Resource ratings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Resource ratings retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ResourceRating'
 *                 meta:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: number
 *                     limit:
 *                       type: number
 *                     total:
 *                       type: number
 *                     totalPages:
 *                       type: number
 *       500:
 *         description: Internal server error
 */
router.get('/:id/ratings', ResourceController.getResourceRatings);

export default router;
