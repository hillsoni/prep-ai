import { Router } from 'express';
import AnalyticsController from '../controllers/analytics.controller';
import { 
  authenticate, 
  requireEmailVerification,
  securityHeaders 
} from '../middleware/auth';

const router = Router();

// Apply security headers to all analytics routes
router.use(securityHeaders);

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/analytics/dashboard:
 *   get:
 *     summary: Get comprehensive dashboard analytics
 *     tags: [Analytics]
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
 *         description: Dashboard analytics retrieved successfully
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
 *                   example: Dashboard analytics retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     period:
 *                       type: string
 *                       example: 30d
 *                     overview:
 *                       type: object
 *                       properties:
 *                         total_interviews:
 *                           type: number
 *                           example: 15
 *                         total_tests:
 *                           type: number
 *                           example: 8
 *                         total_resources:
 *                           type: number
 *                           example: 25
 *                         average_score:
 *                           type: number
 *                           example: 78
 *                         total_time_spent:
 *                           type: number
 *                           example: 3600
 *                         current_streak:
 *                           type: number
 *                           example: 5
 *                     interviews:
 *                       type: object
 *                       properties:
 *                         total_interviews:
 *                           type: number
 *                         average_score:
 *                           type: number
 *                         total_questions:
 *                           type: number
 *                         total_time_spent:
 *                           type: number
 *                         category_breakdown:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               category:
 *                                 type: string
 *                               score:
 *                                 type: number
 *                               difficulty:
 *                                 type: string
 *                     tests:
 *                       type: object
 *                       properties:
 *                         total_tests:
 *                           type: number
 *                         average_score:
 *                           type: number
 *                         total_questions:
 *                           type: number
 *                         total_time_spent:
 *                           type: number
 *                         passed_tests:
 *                           type: number
 *                         pass_rate:
 *                           type: number
 *                     resources:
 *                       type: object
 *                       properties:
 *                         total_bookmarks:
 *                           type: number
 *                         total_views:
 *                           type: number
 *                         category_breakdown:
 *                           type: object
 *                         type_breakdown:
 *                           type: object
 *                     performance:
 *                       type: object
 *                       properties:
 *                         trend:
 *                           type: object
 *                           properties:
 *                             interviews:
 *                               type: array
 *                               items:
 *                                 type: object
 *                                 properties:
 *                                   date:
 *                                     type: string
 *                                     format: date-time
 *                                   score:
 *                                     type: number
 *                                   count:
 *                                     type: number
 *                             tests:
 *                               type: array
 *                               items:
 *                                 type: object
 *                                 properties:
 *                                   date:
 *                                     type: string
 *                                     format: date-time
 *                                   score:
 *                                     type: number
 *                                   count:
 *                                     type: number
 *                         category_breakdown:
 *                           type: object
 *                           properties:
 *                             interviews:
 *                               type: array
 *                               items:
 *                                 type: object
 *                                 properties:
 *                                   category:
 *                                     type: string
 *                                   average_score:
 *                                     type: number
 *                                   count:
 *                                     type: number
 *                             tests:
 *                               type: array
 *                               items:
 *                                 type: object
 *                                 properties:
 *                                   category:
 *                                     type: string
 *                                   average_score:
 *                                     type: number
 *                                   count:
 *                                     type: number
 *                         improvement_areas:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               category:
 *                                 type: string
 *                               score:
 *                                 type: number
 *                               improvement_needed:
 *                                 type: number
 *                         strengths:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               category:
 *                                 type: string
 *                               score:
 *                                 type: number
 *                               strength_level:
 *                                 type: string
 *                                 enum: [good, excellent]
 *                     activity:
 *                       type: object
 *                       properties:
 *                         recent:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               type:
 *                                 type: string
 *                                 enum: [interview, test, bookmark]
 *                               id:
 *                                 type: string
 *                               title:
 *                                 type: string
 *                               category:
 *                                 type: string
 *                               score:
 *                                 type: number
 *                               status:
 *                                 type: string
 *                               date:
 *                                 type: string
 *                                 format: date-time
 *                         achievements:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                               description:
 *                                 type: string
 *                               icon:
 *                                 type: string
 *                               unlocked_at:
 *                                 type: string
 *                                 format: date-time
 *                               category:
 *                                 type: string
 *                                 enum: [milestone, consistency, performance]
 *                         recommendations:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               type:
 *                                 type: string
 *                                 enum: [consistency, performance, skill_development]
 *                               title:
 *                                 type: string
 *                               description:
 *                                 type: string
 *                               priority:
 *                                 type: string
 *                                 enum: [low, medium, high]
 *                               action:
 *                                 type: string
 *                     insights:
 *                       type: object
 *                       properties:
 *                         study_consistency:
 *                           type: object
 *                           properties:
 *                             days_active:
 *                               type: number
 *                             consistency_score:
 *                               type: number
 *                             streak:
 *                               type: number
 *                         skill_progression:
 *                           type: object
 *                           properties:
 *                             interviews:
 *                               type: number
 *                             tests:
 *                               type: number
 *                             overall:
 *                               type: number
 *                         next_goals:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               type:
 *                                 type: string
 *                                 enum: [streak, performance]
 *                               title:
 *                                 type: string
 *                               description:
 *                                 type: string
 *                               target:
 *                                 type: number
 *                               current:
 *                                 type: number
 *                               priority:
 *                                 type: string
 *                                 enum: [low, medium, high]
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Internal server error
 */
router.get('/dashboard', AnalyticsController.getDashboardAnalytics);

export default router;
