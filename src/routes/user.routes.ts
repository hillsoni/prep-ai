import { Router } from 'express';
import UserController from '../controllers/user.controller';
import { 
  authenticate, 
  requireEmailVerification,
  securityHeaders 
} from '../middleware/auth';

const router = Router();

// Apply security headers to all user routes
router.use(securityHeaders);

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/user/profile:
 *   get:
 *     summary: Get current user profile
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
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
 *                   example: Profile retrieved successfully
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Authentication required
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.get('/profile', UserController.getProfile);

/**
 * @swagger
 * /api/user/profile:
 *   put:
 *     summary: Update user profile
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               profile:
 *                 type: object
 *                 properties:
 *                   firstName:
 *                     type: string
 *                     example: John
 *                   lastName:
 *                     type: string
 *                     example: Doe
 *                   phone:
 *                     type: string
 *                     example: +1234567890
 *                   bio:
 *                     type: string
 *                     example: Software developer passionate about AI
 *                   location:
 *                     type: string
 *                     example: San Francisco, CA
 *                   website:
 *                     type: string
 *                     example: https://johndoe.com
 *               academic:
 *                 type: object
 *                 properties:
 *                   institution:
 *                     type: string
 *                     example: Stanford University
 *                   degree:
 *                     type: string
 *                     example: Bachelor of Science
 *                   graduationYear:
 *                     type: number
 *                     example: 2020
 *                   cgpa:
 *                     type: number
 *                     example: 3.8
 *                   fieldOfStudy:
 *                     type: string
 *                     example: Computer Science
 *                   certifications:
 *                     type: array
 *                     items:
 *                       type: string
 *                     example: ["AWS Certified", "Google Cloud Professional"]
 *               professional:
 *                 type: object
 *                 properties:
 *                   experience:
 *                     type: number
 *                     example: 3
 *                   currentRole:
 *                     type: string
 *                     example: Software Engineer
 *                   company:
 *                     type: string
 *                     example: Tech Corp
 *                   targetRole:
 *                     type: string
 *                     example: Senior Software Engineer
 *                   skills:
 *                     type: array
 *                     items:
 *                       type: string
 *                     example: ["JavaScript", "React", "Node.js"]
 *                   industries:
 *                     type: array
 *                     items:
 *                       type: string
 *                     example: ["Technology", "Fintech"]
 *                   salaryExpectation:
 *                     type: number
 *                     example: 120000
 *                   availability:
 *                     type: string
 *                     example: Immediately
 *               preferences:
 *                 type: object
 *                 properties:
 *                   theme:
 *                     type: string
 *                     enum: [light, dark, system]
 *                     example: dark
 *                   language:
 *                     type: string
 *                     example: en
 *                   timezone:
 *                     type: string
 *                     example: America/New_York
 *                   notifications:
 *                     type: object
 *                     properties:
 *                       email:
 *                         type: boolean
 *                         example: true
 *                       push:
 *                         type: boolean
 *                         example: true
 *                       sms:
 *                         type: boolean
 *                         example: false
 *                       weekly_report:
 *                         type: boolean
 *                         example: true
 *                       interview_reminders:
 *                         type: boolean
 *                         example: true
 *                       achievement_notifications:
 *                         type: boolean
 *                         example: true
 *                       marketing_emails:
 *                         type: boolean
 *                         example: false
 *                   privacy:
 *                     type: object
 *                     properties:
 *                       profile_visibility:
 *                         type: string
 *                         enum: [public, private, friends]
 *                         example: private
 *                       show_leaderboard:
 *                         type: boolean
 *                         example: true
 *                       show_achievements:
 *                         type: boolean
 *                         example: true
 *                       allow_analytics:
 *                         type: boolean
 *                         example: true
 *                       data_sharing:
 *                         type: boolean
 *                         example: false
 *                   learning:
 *                     type: object
 *                     properties:
 *                       difficulty:
 *                         type: string
 *                         enum: [beginner, intermediate, advanced]
 *                         example: intermediate
 *                       focus_areas:
 *                         type: array
 *                         items:
 *                           type: string
 *                         example: ["Data Structures", "Algorithms"]
 *                       learning_style:
 *                         type: string
 *                         enum: [visual, auditory, kinesthetic, reading]
 *                         example: visual
 *                       study_schedule:
 *                         type: object
 *                         properties:
 *                           days:
 *                             type: array
 *                             items:
 *                               type: string
 *                               enum: [monday, tuesday, wednesday, thursday, friday, saturday, sunday]
 *                             example: [monday, wednesday, friday]
 *                           time:
 *                             type: string
 *                             example: "19:00"
 *                           duration:
 *                             type: number
 *                             example: 60
 *     responses:
 *       200:
 *         description: Profile updated successfully
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
 *                   example: Profile updated successfully
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.put('/profile', UserController.updateProfile);

/**
 * @swagger
 * /api/user/change-password:
 *   put:
 *     summary: Change user password
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - current_password
 *               - new_password
 *               - confirm_password
 *             properties:
 *               current_password:
 *                 type: string
 *                 example: currentPassword123
 *               new_password:
 *                 type: string
 *                 minLength: 8
 *                 example: newSecurePassword123
 *               confirm_password:
 *                 type: string
 *                 example: newSecurePassword123
 *     responses:
 *       200:
 *         description: Password changed successfully
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
 *                   example: Password changed successfully
 *       400:
 *         description: Validation error or incorrect current password
 *       401:
 *         description: Authentication required
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.put('/change-password', UserController.changePassword);

/**
 * @swagger
 * /api/user/avatar:
 *   post:
 *     summary: Upload user avatar
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *                 description: Avatar image file
 *     responses:
 *       200:
 *         description: Avatar uploaded successfully
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
 *                   example: Avatar uploaded successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     avatar_url:
 *                       type: string
 *                       example: https://example.com/avatars/user123.jpg
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Internal server error
 */
router.post('/avatar', UserController.uploadAvatar);

/**
 * @swagger
 * /api/user/statistics:
 *   get:
 *     summary: Get user statistics
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
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
 *                   example: Statistics retrieved successfully
 *                 data:
 *                   $ref: '#/components/schemas/UserStatistics'
 *       401:
 *         description: Authentication required
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.get('/statistics', UserController.getStatistics);

/**
 * @swagger
 * /api/user/subscription:
 *   put:
 *     summary: Update user subscription
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - plan
 *             properties:
 *               plan:
 *                 type: string
 *                 enum: [free, premium, pro]
 *                 example: premium
 *               billing_cycle:
 *                 type: string
 *                 enum: [monthly, yearly]
 *                 example: monthly
 *               auto_renew:
 *                 type: boolean
 *                 example: true
 *               payment_method:
 *                 type: string
 *                 example: card_1234567890
 *     responses:
 *       200:
 *         description: Subscription updated successfully
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
 *                   example: Subscription updated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     plan:
 *                       type: string
 *                       example: premium
 *                     billing_cycle:
 *                       type: string
 *                       example: monthly
 *                     expires_at:
 *                       type: string
 *                       format: date-time
 *                       example: 2024-02-01T00:00:00.000Z
 *                     auto_renew:
 *                       type: boolean
 *                       example: true
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.put('/subscription', UserController.updateSubscription);

/**
 * @swagger
 * /api/user/achievements:
 *   get:
 *     summary: Get user achievements
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Achievements retrieved successfully
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
 *                   example: Achievements retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Achievement'
 *       401:
 *         description: Authentication required
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.get('/achievements', UserController.getAchievements);

/**
 * @swagger
 * /api/user/account:
 *   delete:
 *     summary: Delete user account
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               password:
 *                 type: string
 *                 example: currentPassword123
 *     responses:
 *       200:
 *         description: Account deleted successfully
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
 *                   example: Account deleted successfully
 *       400:
 *         description: Password is required or incorrect
 *       401:
 *         description: Authentication required
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.delete('/account', UserController.deleteAccount);

export default router;
