import { Request, Response } from 'express';
import { Test, TestSession } from '../models/Test';
import { logger } from '../utils/logger';
import { HTTP_STATUS } from '../types/common.types';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

// Validation schemas
const startTestSchema = z.object({
  test_id: z.string().min(1, 'Test ID is required')
});

const submitAnswerSchema = z.object({
  session_id: z.string().min(1, 'Session ID is required'),
  question_id: z.string().min(1, 'Question ID is required'),
  answer: z.any(),
  time_spent: z.number().min(0).max(600)
});

const completeTestSchema = z.object({
  session_id: z.string().min(1, 'Session ID is required'),
  reason: z.enum(['completed', 'abandoned', 'timeout']).optional()
});

export class TestController {
  /**
   * Get available test categories
   */
  static async getCategories(req: Request, res: Response) {
    try {
      const categories = [
        {
          id: 'programming',
          name: 'Programming Fundamentals',
          description: 'Basic programming concepts and syntax',
          icon: '💻',
          color: 'from-blue-500 to-blue-600',
          testCount: 15
        },
        {
          id: 'data-structures',
          name: 'Data Structures',
          description: 'Arrays, linked lists, trees, graphs, and more',
          icon: '🌳',
          color: 'from-green-500 to-green-600',
          testCount: 12
        },
        {
          id: 'algorithms',
          name: 'Algorithms',
          description: 'Sorting, searching, dynamic programming',
          icon: '⚡',
          color: 'from-purple-500 to-purple-600',
          testCount: 18
        },
        {
          id: 'system-design',
          name: 'System Design',
          description: 'Scalability, databases, and distributed systems',
          icon: '🏗️',
          color: 'from-orange-500 to-orange-600',
          testCount: 8
        },
        {
          id: 'databases',
          name: 'Databases',
          description: 'SQL, NoSQL, and database design',
          icon: '🗄️',
          color: 'from-indigo-500 to-indigo-600',
          testCount: 10
        },
        {
          id: 'web-development',
          name: 'Web Development',
          description: 'HTML, CSS, JavaScript, and frameworks',
          icon: '🌐',
          color: 'from-pink-500 to-pink-600',
          testCount: 14
        }
      ];

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Test categories retrieved successfully',
        data: categories
      });
    } catch (error) {
      logger.logError(error as Error, { 
        endpoint: 'GET /api/tests/categories' 
      });
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get available tests with filters
   */
  static async getTests(req: Request, res: Response) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        category, 
        difficulty, 
        search 
      } = req.query;

      // Build filter
      const filter: any = { is_active: true };
      if (category) filter.category = category;
      if (difficulty) filter.difficulty = difficulty;
      if (search) {
        filter.$or = [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ];
      }

      // Get tests with pagination
      const tests = await Test.find(filter)
        .populate('created_by', 'profile.firstName profile.lastName')
        .sort({ created_at: -1 })
        .limit(Number(limit) * 1)
        .skip((Number(page) - 1) * Number(limit))
        .select('-questions'); // Exclude detailed questions for list view

      const total = await Test.countDocuments(filter);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Tests retrieved successfully',
        data: tests,
        meta: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error) {
      logger.logError(error as Error, { 
        endpoint: 'GET /api/tests',
        query: req.query 
      });
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get test details
   */
  static async getTest(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const test = await Test.findById(id).populate('created_by', 'profile.firstName profile.lastName');
      
      if (!test) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Test not found'
        });
      }

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Test retrieved successfully',
        data: test
      });
    } catch (error) {
      logger.logError(error as Error, { 
        endpoint: 'GET /api/tests/:id',
        testId: req.params.id 
      });
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Start a new test session
   */
  static async startTest(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Validate request body
      const validationResult = startTestSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Validation failed',
          errors: validationResult.error.flatten().fieldErrors
        });
      }

      const { test_id } = validationResult.data;

      // Get test details
      const test = await Test.findById(test_id);
      if (!test) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Test not found'
        });
      }

      if (!test.is_active) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Test is not available'
        });
      }

      // Check if user already has an active session for this test
      const existingSession = await TestSession.findOne({
        user_id: req.user._id,
        test_id: test._id,
        status: 'in_progress'
      });

      if (existingSession) {
        return res.status(HTTP_STATUS.CONFLICT).json({
          success: false,
          message: 'You already have an active session for this test',
          data: {
            session_id: existingSession.session_id
          }
        });
      }

      // Create new test session
      const sessionId = uuidv4();
      const testSession = new TestSession({
        user_id: req.user._id,
        test_id: test._id,
        session_id: sessionId,
        total_questions: test.total_questions,
        started_at: new Date()
      });

      await testSession.save();

      // Get first question
      const firstQuestion = test.questions[0];

      logger.logAuth('test_started', req.user._id.toString(), {
        session_id: sessionId,
        test_id: test._id,
        test_title: test.title
      });

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message: 'Test session started successfully',
        data: {
          session_id: sessionId,
          test: {
            _id: test._id,
            title: test.title,
            description: test.description,
            category: test.category,
            difficulty: test.difficulty,
            duration: test.duration,
            total_questions: test.total_questions,
            passing_score: test.passing_score
          },
          first_question: {
            question_id: firstQuestion.question_id,
            question_text: firstQuestion.question_text,
            question_type: firstQuestion.question_type,
            options: firstQuestion.options,
            time_limit: firstQuestion.time_limit,
            points: firstQuestion.points,
            order: firstQuestion.order
          },
          time_remaining: test.duration * 60 // Convert to seconds
        }
      });
    } catch (error) {
      logger.logError(error as Error, { 
        endpoint: 'POST /api/tests/session',
        userId: req.user?._id 
      });
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get test session details
   */
  static async getSession(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const session = await TestSession.findOne({ 
        session_id: id,
        user_id: req.user?._id 
      }).populate('test_id', 'title description category difficulty duration');

      if (!session) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Test session not found'
        });
      }

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Test session retrieved successfully',
        data: session
      });
    } catch (error) {
      logger.logError(error as Error, { 
        endpoint: 'GET /api/tests/session/:id',
        sessionId: req.params.id 
      });
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Submit answer for a question
   */
  static async submitAnswer(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Validate request body
      const validationResult = submitAnswerSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Validation failed',
          errors: validationResult.error.flatten().fieldErrors
        });
      }

      const { session_id, question_id, answer, time_spent } = validationResult.data;

      // Find test session
      const session = await TestSession.findOne({ 
        session_id,
        user_id: req.user._id,
        status: 'in_progress'
      }).populate('test_id');

      if (!session) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Test session not found or not active'
        });
      }

      // Get test details
      const test = session.test_id as any;
      const question = test.questions.find((q: any) => q.question_id.toString() === question_id);
      
      if (!question) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Question not found'
        });
      }

      // Add answer to session
      const success = await session.addAnswer(question_id, answer, time_spent);
      
      if (!success) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Failed to submit answer'
        });
      }

      // Get next question
      const currentIndex = test.questions.findIndex((q: any) => q.question_id.toString() === question_id);
      const nextQuestion = currentIndex < test.questions.length - 1 
        ? test.questions[currentIndex + 1] 
        : null;

      logger.logAuth('answer_submitted', req.user._id.toString(), {
        session_id,
        question_id,
        is_correct: session.answers[session.answers.length - 1].is_correct,
        time_spent
      });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Answer submitted successfully',
        data: {
          is_correct: session.answers[session.answers.length - 1].is_correct,
          points_earned: session.answers[session.answers.length - 1].points_earned,
          explanation: question.explanation,
          next_question: nextQuestion ? {
            question_id: nextQuestion.question_id,
            question_text: nextQuestion.question_text,
            question_type: nextQuestion.question_type,
            options: nextQuestion.options,
            time_limit: nextQuestion.time_limit,
            points: nextQuestion.points,
            order: nextQuestion.order
          } : null,
          is_complete: !nextQuestion,
          current_score: session.score,
          progress: {
            answered: session.answers.length,
            total: session.total_questions,
            percentage: Math.round((session.answers.length / session.total_questions) * 100)
          }
        }
      });
    } catch (error) {
      logger.logError(error as Error, { 
        endpoint: 'POST /api/tests/session/:id/answer',
        userId: req.user?._id 
      });
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Complete test session
   */
  static async completeTest(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Validate request body
      const validationResult = completeTestSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Validation failed',
          errors: validationResult.error.flatten().fieldErrors
        });
      }

      const { session_id, reason = 'completed' } = validationResult.data;

      // Find test session
      const session = await TestSession.findOne({ 
        session_id,
        user_id: req.user._id 
      }).populate('test_id');

      if (!session) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Test session not found'
        });
      }

      // Complete session
      session.status = reason === 'completed' ? 'completed' : 'abandoned';
      session.completed_at = new Date();
      await session.save();

      // Update user statistics
      if (reason === 'completed') {
        await this.updateUserStatistics(req.user._id, session);
      }

      const test = session.test_id as any;
      const isPassed = session.score >= test.passing_score;

      logger.logAuth('test_completed', req.user._id.toString(), {
        session_id,
        test_id: test._id,
        score: session.score,
        is_passed: isPassed,
        duration: session.time_spent
      });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Test completed successfully',
        data: {
          session: {
            _id: session._id,
            session_id: session.session_id,
            score: session.score,
            total_questions: session.total_questions,
            correct_answers: session.correct_answers,
            time_spent: session.time_spent,
            status: session.status,
            completed_at: session.completed_at,
            is_passed: isPassed
          },
          test: {
            _id: test._id,
            title: test.title,
            category: test.category,
            difficulty: test.difficulty,
            passing_score: test.passing_score
          },
          results: {
            score: session.score,
            percentage: Math.round(session.score),
            is_passed: isPassed,
            correct_answers: session.correct_answers,
            total_questions: session.total_questions,
            time_spent: session.time_spent,
            average_time_per_question: session.averageTimePerQuestion
          }
        }
      });
    } catch (error) {
      logger.logError(error as Error, { 
        endpoint: 'POST /api/tests/session/:id/complete',
        userId: req.user?._id 
      });
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get test results
   */
  static async getResults(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const session = await TestSession.findOne({ 
        session_id: id,
        user_id: req.user?._id,
        status: 'completed'
      }).populate('test_id', 'title description category difficulty passing_score');

      if (!session) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Test results not found'
        });
      }

      const test = session.test_id as any;
      const isPassed = session.score >= test.passing_score;

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Test results retrieved successfully',
        data: {
          session: {
            _id: session._id,
            session_id: session.session_id,
            score: session.score,
            total_questions: session.total_questions,
            correct_answers: session.correct_answers,
            time_spent: session.time_spent,
            completed_at: session.completed_at,
            is_passed: isPassed
          },
          test: {
            _id: test._id,
            title: test.title,
            description: test.description,
            category: test.category,
            difficulty: test.difficulty,
            passing_score: test.passing_score
          },
          detailed_results: {
            score: session.score,
            percentage: Math.round(session.score),
            is_passed: isPassed,
            correct_answers: session.correct_answers,
            total_questions: session.total_questions,
            time_spent: session.time_spent,
            average_time_per_question: session.averageTimePerQuestion,
            answers: session.answers.map(answer => ({
              question_id: answer.question_id,
              selected_answer: answer.selected_answer,
              is_correct: answer.is_correct,
              time_spent: answer.time_spent,
              points_earned: answer.points_earned
            }))
          }
        }
      });
    } catch (error) {
      logger.logError(error as Error, { 
        endpoint: 'GET /api/tests/session/:id/results',
        sessionId: req.params.id 
      });
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get user's test history
   */
  static async getHistory(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const { page = 1, limit = 10, category, status } = req.query;

      // Build filter
      const filter: any = { user_id: req.user._id };
      if (status) filter.status = status;

      // Get test sessions with pagination
      const sessions = await TestSession.find(filter)
        .populate('test_id', 'title category difficulty passing_score')
        .sort({ created_at: -1 })
        .limit(Number(limit) * 1)
        .skip((Number(page) - 1) * Number(limit));

      const total = await TestSession.countDocuments(filter);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Test history retrieved successfully',
        data: sessions,
        meta: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error) {
      logger.logError(error as Error, { 
        endpoint: 'GET /api/tests/history',
        userId: req.user?._id 
      });
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get test leaderboard
   */
  static async getLeaderboard(req: Request, res: Response) {
    try {
      const { test_id } = req.params;
      const { limit = 10 } = req.query;

      const leaderboard = await TestSession.getLeaderboard(test_id, Number(limit));

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Leaderboard retrieved successfully',
        data: leaderboard
      });
    } catch (error) {
      logger.logError(error as Error, { 
        endpoint: 'GET /api/tests/leaderboard',
        testId: req.params.test_id 
      });
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Update user statistics after test completion
   */
  private static async updateUserStatistics(userId: string, session: any) {
    try {
      const User = require('../models/User').User;
      const user = await User.findById(userId);
      
      if (user) {
        user.statistics.tests_completed += 1;
        user.statistics.total_score += session.score;
        user.statistics.average_score = user.statistics.total_score / 
          (user.statistics.interviews_completed + user.statistics.tests_completed);
        
        // Update streak
        const today = new Date().toDateString();
        const lastTest = new Date(user.statistics.last_test_date || 0).toDateString();
        
        if (today !== lastTest) {
          user.statistics.current_streak += 1;
          user.statistics.longest_streak = Math.max(user.statistics.longest_streak, user.statistics.current_streak);
        }
        
        user.statistics.last_test_date = new Date();
        await user.save();
      }
    } catch (error) {
      logger.logError(error as Error, { 
        context: 'update_user_statistics',
        userId 
      });
    }
  }
}

export default TestController;
