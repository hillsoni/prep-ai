import { Router } from 'express';
import InterviewController from '../controllers/interview.controller';
import { 
  authenticate, 
  requireEmailVerification,
  securityHeaders 
} from '../middleware/auth';

const router = Router();

// Apply security headers to all interview routes
router.use(securityHeaders);

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/interviews/categories:
 *   get:
 *     summary: Get available interview categories
 *     tags: [Interviews]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Interview categories retrieved successfully
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
 *                   example: Interview categories retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: technical
 *                       name:
 *                         type: string
 *                         example: Technical Interview
 *                       description:
 *                         type: string
 *                         example: Coding, algorithms, and system design questions
 *                       icon:
 *                         type: string
 *                         example: 💻
 *                       duration:
 *                         type: number
 *                         example: 45
 *                       difficulty:
 *                         type: string
 *                         example: Advanced
 *                       color:
 *                         type: string
 *                         example: from-blue-500 to-blue-600
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Internal server error
 */
router.get('/categories', InterviewController.getCategories);

/**
 * @swagger
 * /api/interviews/session:
 *   post:
 *     summary: Start a new interview session
 *     tags: [Interviews]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - category
 *               - difficulty
 *             properties:
 *               category:
 *                 type: string
 *                 enum: [technical, behavioral, communication, domain-specific]
 *                 example: technical
 *               difficulty:
 *                 type: string
 *                 enum: [beginner, intermediate, advanced]
 *                 example: intermediate
 *               question_count:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 10
 *                 example: 5
 *               time_limit:
 *                 type: number
 *                 minimum: 15
 *                 maximum: 120
 *                 example: 45
 *               focus_areas:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["algorithms", "data structures"]
 *     responses:
 *       201:
 *         description: Interview session started successfully
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
 *                   example: Interview session started successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     session_id:
 *                       type: string
 *                       example: 123e4567-e89b-12d3-a456-426614174000
 *                     interview:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                         category:
 *                           type: string
 *                         difficulty:
 *                           type: string
 *                         status:
 *                           type: string
 *                         total_questions:
 *                           type: number
 *                     first_question:
 *                       type: object
 *                       properties:
 *                         question_id:
 *                           type: string
 *                         question_text:
 *                           type: string
 *                         question_type:
 *                           type: string
 *                         time_allocated:
 *                           type: number
 *                         order:
 *                           type: number
 *                     time_remaining:
 *                       type: number
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 *       404:
 *         description: No questions available
 *       500:
 *         description: Internal server error
 */
router.post('/session', InterviewController.startInterview);

/**
 * @swagger
 * /api/interviews/session/{id}:
 *   get:
 *     summary: Get interview session details
 *     tags: [Interviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Interview session ID
 *     responses:
 *       200:
 *         description: Interview session retrieved successfully
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
 *                   example: Interview session retrieved successfully
 *                 data:
 *                   $ref: '#/components/schemas/Interview'
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Interview session not found
 *       500:
 *         description: Internal server error
 */
router.get('/session/:id', InterviewController.getSession);

/**
 * @swagger
 * /api/interviews/session/{id}/answer:
 *   post:
 *     summary: Submit answer for a question
 *     tags: [Interviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Interview session ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - session_id
 *               - question_id
 *               - answer
 *               - time_taken
 *             properties:
 *               session_id:
 *                 type: string
 *                 example: 123e4567-e89b-12d3-a456-426614174000
 *               question_id:
 *                 type: string
 *                 example: 507f1f77bcf86cd799439011
 *               answer:
 *                 type: string
 *                 maxLength: 5000
 *                 example: "A stack is a LIFO data structure..."
 *               time_taken:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 1800
 *                 example: 120
 *     responses:
 *       200:
 *         description: Answer submitted successfully
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
 *                   example: Answer submitted successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     feedback:
 *                       type: object
 *                       properties:
 *                         strengths:
 *                           type: array
 *                           items:
 *                             type: string
 *                         improvements:
 *                           type: array
 *                           items:
 *                             type: string
 *                         suggestions:
 *                           type: array
 *                           items:
 *                             type: string
 *                         keyword_matches:
 *                           type: number
 *                         keyword_missed:
 *                           type: array
 *                           items:
 *                             type: string
 *                         clarity_score:
 *                           type: number
 *                         completeness_score:
 *                           type: number
 *                         relevance_score:
 *                           type: number
 *                     score:
 *                       type: number
 *                       example: 85
 *                     next_question:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         question_id:
 *                           type: string
 *                         question_text:
 *                           type: string
 *                         question_type:
 *                           type: string
 *                         time_allocated:
 *                           type: number
 *                         order:
 *                           type: number
 *                     is_complete:
 *                       type: boolean
 *                       example: false
 *                     current_score:
 *                       type: number
 *                       example: 82
 *                     progress:
 *                       type: object
 *                       properties:
 *                         answered:
 *                           type: number
 *                         total:
 *                           type: number
 *                         percentage:
 *                           type: number
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Interview session or question not found
 *       500:
 *         description: Internal server error
 */
router.post('/session/:id/answer', InterviewController.submitAnswer);

/**
 * @swagger
 * /api/interviews/session/{id}/complete:
 *   post:
 *     summary: Complete interview session
 *     tags: [Interviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Interview session ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               session_id:
 *                 type: string
 *                 example: 123e4567-e89b-12d3-a456-426614174000
 *               reason:
 *                 type: string
 *                 enum: [completed, abandoned, timeout]
 *                 example: completed
 *     responses:
 *       200:
 *         description: Interview completed successfully
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
 *                   example: Interview completed successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     interview:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                         session_id:
 *                           type: string
 *                         category:
 *                           type: string
 *                         difficulty:
 *                           type: string
 *                         status:
 *                           type: string
 *                         completed_at:
 *                           type: string
 *                           format: date-time
 *                         total_questions:
 *                           type: number
 *                         answered_questions:
 *                           type: number
 *                         completion_rate:
 *                           type: number
 *                     overall_feedback:
 *                       type: object
 *                       properties:
 *                         total_score:
 *                           type: number
 *                         category_scores:
 *                           type: object
 *                         strengths:
 *                           type: array
 *                           items:
 *                             type: string
 *                         areas_for_improvement:
 *                           type: array
 *                           items:
 *                             type: string
 *                         recommendations:
 *                           type: array
 *                           items:
 *                             type: string
 *                     analytics:
 *                       type: object
 *                       properties:
 *                         total_score:
 *                           type: number
 *                         category_scores:
 *                           type: object
 *                         strengths:
 *                           type: array
 *                           items:
 *                             type: string
 *                         improvements:
 *                           type: array
 *                           items:
 *                             type: string
 *                         recommendations:
 *                           type: array
 *                           items:
 *                             type: string
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Interview session not found
 *       500:
 *         description: Internal server error
 */
router.post('/session/:id/complete', InterviewController.completeInterview);

/**
 * @swagger
 * /api/interviews/history:
 *   get:
 *     summary: Get user's interview history
 *     tags: [Interviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [technical, behavioral, communication, domain-specific]
 *         description: Filter by category
 *       - in: query
 *         name: difficulty
 *         schema:
 *           type: string
 *           enum: [beginner, intermediate, advanced]
 *         description: Filter by difficulty
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [in_progress, completed, abandoned, paused]
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: Interview history retrieved successfully
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
 *                   example: Interview history retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Interview'
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
router.get('/history', InterviewController.getHistory);

/**
 * @swagger
 * /api/interviews/analytics:
 *   get:
 *     summary: Get interview analytics
 *     tags: [Interviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d]
 *           default: 30d
 *         description: Analytics period
 *     responses:
 *       200:
 *         description: Interview analytics retrieved successfully
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
 *                   example: Interview analytics retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     period:
 *                       type: string
 *                       example: 30d
 *                     total_interviews:
 *                       type: number
 *                       example: 15
 *                     average_score:
 *                       type: number
 *                       example: 78
 *                     total_questions:
 *                       type: number
 *                       example: 75
 *                     total_time_spent:
 *                       type: number
 *                       example: 3600
 *                     category_breakdown:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           category:
 *                             type: string
 *                           score:
 *                             type: number
 *                     improvement_trend:
 *                       type: number
 *                       example: 5
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Internal server error
 */
router.get('/analytics', InterviewController.getAnalytics);

export default router;
