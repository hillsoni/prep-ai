import { Router } from 'express';
import TestController from '../controllers/test.controller';
import { 
  authenticate, 
  requireEmailVerification,
  securityHeaders 
} from '../middleware/auth';

const router = Router();

// Apply security headers to all test routes
router.use(securityHeaders);

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/tests/categories:
 *   get:
 *     summary: Get available test categories
 *     tags: [Tests]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Test categories retrieved successfully
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
 *                   example: Test categories retrieved successfully
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
 *                         example: Programming Fundamentals
 *                       description:
 *                         type: string
 *                         example: Basic programming concepts and syntax
 *                       icon:
 *                         type: string
 *                         example: 💻
 *                       color:
 *                         type: string
 *                         example: from-blue-500 to-blue-600
 *                       testCount:
 *                         type: number
 *                         example: 15
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Internal server error
 */
router.get('/categories', TestController.getCategories);

/**
 * @swagger
 * /api/tests:
 *   get:
 *     summary: Get available tests with filters
 *     tags: [Tests]
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
 *         description: Filter by category
 *       - in: query
 *         name: difficulty
 *         schema:
 *           type: string
 *           enum: [beginner, intermediate, advanced]
 *         description: Filter by difficulty
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term
 *     responses:
 *       200:
 *         description: Tests retrieved successfully
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
 *                   example: Tests retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Test'
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
router.get('/', TestController.getTests);

/**
 * @swagger
 * /api/tests/{id}:
 *   get:
 *     summary: Get test details
 *     tags: [Tests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Test ID
 *     responses:
 *       200:
 *         description: Test retrieved successfully
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
 *                   example: Test retrieved successfully
 *                 data:
 *                   $ref: '#/components/schemas/Test'
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Test not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id', TestController.getTest);

/**
 * @swagger
 * /api/tests/session:
 *   post:
 *     summary: Start a new test session
 *     tags: [Tests]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - test_id
 *             properties:
 *               test_id:
 *                 type: string
 *                 example: 507f1f77bcf86cd799439011
 *     responses:
 *       201:
 *         description: Test session started successfully
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
 *                   example: Test session started successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     session_id:
 *                       type: string
 *                       example: 123e4567-e89b-12d3-a456-426614174000
 *                     test:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                         title:
 *                           type: string
 *                         description:
 *                           type: string
 *                         category:
 *                           type: string
 *                         difficulty:
 *                           type: string
 *                         duration:
 *                           type: number
 *                         total_questions:
 *                           type: number
 *                         passing_score:
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
 *                         options:
 *                           type: array
 *                           items:
 *                             type: string
 *                         time_limit:
 *                           type: number
 *                         points:
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
 *         description: Test not found
 *       409:
 *         description: Active session already exists
 *       500:
 *         description: Internal server error
 */
router.post('/session', TestController.startTest);

/**
 * @swagger
 * /api/tests/session/{id}:
 *   get:
 *     summary: Get test session details
 *     tags: [Tests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Test session ID
 *     responses:
 *       200:
 *         description: Test session retrieved successfully
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
 *                   example: Test session retrieved successfully
 *                 data:
 *                   $ref: '#/components/schemas/TestSession'
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Test session not found
 *       500:
 *         description: Internal server error
 */
router.get('/session/:id', TestController.getSession);

/**
 * @swagger
 * /api/tests/session/{id}/answer:
 *   post:
 *     summary: Submit answer for a question
 *     tags: [Tests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Test session ID
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
 *               - time_spent
 *             properties:
 *               session_id:
 *                 type: string
 *                 example: 123e4567-e89b-12d3-a456-426614174000
 *               question_id:
 *                 type: string
 *                 example: 507f1f77bcf86cd799439011
 *               answer:
 *                 type: any
 *                 example: "Option A"
 *               time_spent:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 600
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
 *                     is_correct:
 *                       type: boolean
 *                       example: true
 *                     points_earned:
 *                       type: number
 *                       example: 1
 *                     explanation:
 *                       type: string
 *                       example: "Correct! This is the right answer because..."
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
 *                         options:
 *                           type: array
 *                           items:
 *                             type: string
 *                         time_limit:
 *                           type: number
 *                         points:
 *                           type: number
 *                         order:
 *                           type: number
 *                     is_complete:
 *                       type: boolean
 *                       example: false
 *                     current_score:
 *                       type: number
 *                       example: 85
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
 *         description: Test session or question not found
 *       500:
 *         description: Internal server error
 */
router.post('/session/:id/answer', TestController.submitAnswer);

/**
 * @swagger
 * /api/tests/session/{id}/complete:
 *   post:
 *     summary: Complete test session
 *     tags: [Tests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Test session ID
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
 *         description: Test completed successfully
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
 *                   example: Test completed successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     session:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                         session_id:
 *                           type: string
 *                         score:
 *                           type: number
 *                         total_questions:
 *                           type: number
 *                         correct_answers:
 *                           type: number
 *                         time_spent:
 *                           type: number
 *                         status:
 *                           type: string
 *                         completed_at:
 *                           type: string
 *                           format: date-time
 *                         is_passed:
 *                           type: boolean
 *                     test:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                         title:
 *                           type: string
 *                         category:
 *                           type: string
 *                         difficulty:
 *                           type: string
 *                         passing_score:
 *                           type: number
 *                     results:
 *                       type: object
 *                       properties:
 *                         score:
 *                           type: number
 *                         percentage:
 *                           type: number
 *                         is_passed:
 *                           type: boolean
 *                         correct_answers:
 *                           type: number
 *                         total_questions:
 *                           type: number
 *                         time_spent:
 *                           type: number
 *                         average_time_per_question:
 *                           type: number
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Test session not found
 *       500:
 *         description: Internal server error
 */
router.post('/session/:id/complete', TestController.completeTest);

/**
 * @swagger
 * /api/tests/session/{id}/results:
 *   get:
 *     summary: Get test results
 *     tags: [Tests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Test session ID
 *     responses:
 *       200:
 *         description: Test results retrieved successfully
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
 *                   example: Test results retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     session:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                         session_id:
 *                           type: string
 *                         score:
 *                           type: number
 *                         total_questions:
 *                           type: number
 *                         correct_answers:
 *                           type: number
 *                         time_spent:
 *                           type: number
 *                         completed_at:
 *                           type: string
 *                           format: date-time
 *                         is_passed:
 *                           type: boolean
 *                     test:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                         title:
 *                           type: string
 *                         description:
 *                           type: string
 *                         category:
 *                           type: string
 *                         difficulty:
 *                           type: string
 *                         passing_score:
 *                           type: number
 *                     detailed_results:
 *                       type: object
 *                       properties:
 *                         score:
 *                           type: number
 *                         percentage:
 *                           type: number
 *                         is_passed:
 *                           type: boolean
 *                         correct_answers:
 *                           type: number
 *                         total_questions:
 *                           type: number
 *                         time_spent:
 *                           type: number
 *                         average_time_per_question:
 *                           type: number
 *                         answers:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               question_id:
 *                                 type: string
 *                               selected_answer:
 *                                 type: any
 *                               is_correct:
 *                                 type: boolean
 *                               time_spent:
 *                                 type: number
 *                               points_earned:
 *                                 type: number
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Test results not found
 *       500:
 *         description: Internal server error
 */
router.get('/session/:id/results', TestController.getResults);

/**
 * @swagger
 * /api/tests/history:
 *   get:
 *     summary: Get user's test history
 *     tags: [Tests]
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
 *         description: Filter by category
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [in_progress, completed, abandoned, timeout]
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: Test history retrieved successfully
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
 *                   example: Test history retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/TestSession'
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
router.get('/history', TestController.getHistory);

/**
 * @swagger
 * /api/tests/leaderboard/{test_id}:
 *   get:
 *     summary: Get test leaderboard
 *     tags: [Tests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: test_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Test ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 10
 *         description: Number of leaderboard entries
 *     responses:
 *       200:
 *         description: Leaderboard retrieved successfully
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
 *                   example: Leaderboard retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       user_name:
 *                         type: string
 *                       user_avatar:
 *                         type: string
 *                       score:
 *                         type: number
 *                       time_spent:
 *                         type: number
 *                       completed_at:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Internal server error
 */
router.get('/leaderboard/:test_id', TestController.getLeaderboard);

export default router;
