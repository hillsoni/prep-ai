import { Request, Response } from 'express';
import { Interview } from '../models/Interview';
import { QuestionBank } from '../models/QuestionBank';
import { AIService } from '../services/ai.service';
import { logger } from '../utils/logger';
import { HTTP_STATUS } from '../types/common.types';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

// Validation schemas
const startInterviewSchema = z.object({
  category: z.enum(['technical', 'behavioral', 'communication', 'domain-specific']),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  question_count: z.number().min(1).max(10).optional(),
  time_limit: z.number().min(15).max(120).optional(),
  focus_areas: z.array(z.string()).optional()
});

const submitAnswerSchema = z.object({
  session_id: z.string().min(1),
  question_id: z.string().min(1),
  answer: z.string().min(1).max(5000),
  time_taken: z.number().min(0).max(1800)
});

const completeInterviewSchema = z.object({
  session_id: z.string().min(1),
  reason: z.enum(['completed', 'abandoned', 'timeout']).optional()
});

export class InterviewController {
  /**
   * Get available interview categories
   */
  static async getCategories(req: Request, res: Response) {
    try {
      const categories = [
        {
          id: 'technical',
          name: 'Technical Interview',
          description: 'Coding, algorithms, and system design questions',
          icon: '💻',
          duration: 45,
          difficulty: 'Advanced',
          color: 'from-blue-500 to-blue-600'
        },
        {
          id: 'behavioral',
          name: 'Behavioral Interview',
          description: 'STAR method, leadership, and teamwork scenarios',
          icon: '👔',
          duration: 30,
          difficulty: 'Intermediate',
          color: 'from-green-500 to-green-600'
        },
        {
          id: 'communication',
          name: 'Communication Skills',
          description: 'Presentation, public speaking, and articulation',
          icon: '🗣️',
          duration: 25,
          difficulty: 'Beginner',
          color: 'from-purple-500 to-purple-600'
        },
        {
          id: 'domain-specific',
          name: 'Domain Specific',
          description: 'Industry-specific questions and scenarios',
          icon: '🎯',
          duration: 40,
          difficulty: 'Intermediate',
          color: 'from-indigo-500 to-indigo-600'
        }
      ];

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Interview categories retrieved successfully',
        data: categories
      });
    } catch (error) {
      logger.logError(error as Error, { 
        endpoint: 'GET /api/interviews/categories' 
      });
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Start a new interview session
   */
  static async startInterview(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Validate request body
      const validationResult = startInterviewSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Validation failed',
          errors: validationResult.error.flatten().fieldErrors
        });
      }

      const { category, difficulty, question_count = 5, time_limit, focus_areas } = validationResult.data;

      // Generate session ID
      const sessionId = uuidv4();

      // Get questions from question bank
      const questions = await QuestionBank.getRandomQuestions(category, difficulty, question_count);
      
      if (questions.length === 0) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'No questions available for the selected category and difficulty'
        });
      }

      // Create interview session
      const interview = new Interview({
        user_id: req.user._id,
        session_id: sessionId,
        category,
        difficulty,
        questions: questions.map((q, index) => ({
          question_id: q._id,
          question_text: q.question_text,
          question_type: q.question_type,
          expected_keywords: q.expected_keywords,
          difficulty_weight: q.difficulty === 'beginner' ? 1 : q.difficulty === 'intermediate' ? 2 : 3,
          time_allocated: q.time_limit,
          time_taken: 0,
          user_answer: '',
          ai_score: 0,
          feedback: {
            strengths: [],
            improvements: [],
            suggestions: [],
            keyword_matches: 0,
            keyword_missed: [],
            clarity_score: 0,
            completeness_score: 0,
            relevance_score: 0
          },
          order: index + 1
        })),
        metadata: {
          duration: time_limit || (questions.reduce((sum, q) => sum + q.time_limit, 0)),
          paused_times: 0,
          completion_rate: 0,
          started_at: new Date(),
          session_data: {
            total_questions: questions.length,
            answered_questions: 0,
            skipped_questions: 0,
            average_time_per_question: 0
          }
        },
        status: 'in_progress'
      });

      await interview.save();

      // Get first question
      const firstQuestion = interview.questions[0];

      logger.logAuth('interview_started', req.user._id.toString(), {
        session_id: sessionId,
        category,
        difficulty,
        question_count: questions.length
      });

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message: 'Interview session started successfully',
        data: {
          session_id: sessionId,
          interview: {
            _id: interview._id,
            category: interview.category,
            difficulty: interview.difficulty,
            status: interview.status,
            total_questions: interview.questions.length
          },
          first_question: {
            question_id: firstQuestion.question_id,
            question_text: firstQuestion.question_text,
            question_type: firstQuestion.question_type,
            time_allocated: firstQuestion.time_allocated,
            order: firstQuestion.order
          },
          time_remaining: firstQuestion.time_allocated
        }
      });
    } catch (error) {
      logger.logError(error as Error, { 
        endpoint: 'POST /api/interviews/session',
        userId: req.user?._id 
      });
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get interview session details
   */
  static async getSession(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const interview = await Interview.findOne({ 
        session_id: id,
        user_id: req.user?._id 
      });

      if (!interview) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Interview session not found'
        });
      }

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Interview session retrieved successfully',
        data: interview
      });
    } catch (error) {
      logger.logError(error as Error, { 
        endpoint: 'GET /api/interviews/session/:id',
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

      const { session_id, question_id, answer, time_taken } = validationResult.data;

      // Find interview session
      const interview = await Interview.findOne({ 
        session_id,
        user_id: req.user._id,
        status: 'in_progress'
      });

      if (!interview) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Interview session not found or not active'
        });
      }

      // Find the question
      const question = interview.questions.find(q => q.question_id.toString() === question_id);
      if (!question) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Question not found'
        });
      }

      // Update question with user answer
      question.user_answer = answer;
      question.time_taken = time_taken;

      // Get AI analysis
      const aiAnalysis = await AIService.analyzeAnswer({
        question: question.question_text,
        user_answer: answer,
        expected_keywords: question.expected_keywords,
        question_type: question.question_type,
        difficulty: interview.difficulty
      });

      // Update question with AI feedback
      question.ai_score = aiAnalysis.score;
      question.feedback = aiAnalysis.feedback;

      // Update interview metadata
      interview.metadata.session_data.answered_questions += 1;
      interview.metadata.session_data.average_time_per_question = 
        interview.questions.reduce((sum, q) => sum + q.time_taken, 0) / 
        interview.questions.length;

      await interview.save();

      // Get next question
      const currentIndex = interview.questions.findIndex(q => q.question_id.toString() === question_id);
      const nextQuestion = currentIndex < interview.questions.length - 1 
        ? interview.questions[currentIndex + 1] 
        : null;

      logger.logAuth('answer_submitted', req.user._id.toString(), {
        session_id,
        question_id,
        score: aiAnalysis.score,
        time_taken
      });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Answer submitted successfully',
        data: {
          feedback: aiAnalysis.feedback,
          score: aiAnalysis.score,
          next_question: nextQuestion ? {
            question_id: nextQuestion.question_id,
            question_text: nextQuestion.question_text,
            question_type: nextQuestion.question_type,
            time_allocated: nextQuestion.time_allocated,
            order: nextQuestion.order
          } : null,
          is_complete: !nextQuestion,
          current_score: interview.calculateOverallScore(),
          progress: {
            answered: interview.answeredQuestions,
            total: interview.totalQuestions,
            percentage: Math.round((interview.answeredQuestions / interview.totalQuestions) * 100)
          }
        }
      });
    } catch (error) {
      logger.logError(error as Error, { 
        endpoint: 'POST /api/interviews/session/:id/answer',
        userId: req.user?._id 
      });
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Complete interview session
   */
  static async completeInterview(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Validate request body
      const validationResult = completeInterviewSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Validation failed',
          errors: validationResult.error.flatten().fieldErrors
        });
      }

      const { session_id, reason = 'completed' } = validationResult.data;

      // Find interview session
      const interview = await Interview.findOne({ 
        session_id,
        user_id: req.user._id 
      });

      if (!interview) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Interview session not found'
        });
      }

      // Update interview status
      interview.status = reason === 'completed' ? 'completed' : 'abandoned';
      interview.completed_at = new Date();
      interview.metadata.completed_at = new Date();

      // Generate overall feedback
      const overallFeedback = interview.generateFeedback();
      interview.overall_feedback = overallFeedback;

      await interview.save();

      // Update user statistics
      if (reason === 'completed') {
        await this.updateUserStatistics(req.user._id, interview);
      }

      logger.logAuth('interview_completed', req.user._id.toString(), {
        session_id,
        reason,
        total_score: overallFeedback.total_score,
        duration: interview.metadata.duration
      });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Interview completed successfully',
        data: {
          interview: {
            _id: interview._id,
            session_id: interview.session_id,
            category: interview.category,
            difficulty: interview.difficulty,
            status: interview.status,
            completed_at: interview.completed_at,
            total_questions: interview.totalQuestions,
            answered_questions: interview.answeredQuestions,
            completion_rate: interview.completionRate
          },
          overall_feedback: overallFeedback,
          analytics: {
            total_score: overallFeedback.total_score,
            category_scores: overallFeedback.category_scores,
            strengths: overallFeedback.strengths,
            improvements: overallFeedback.areas_for_improvement,
            recommendations: overallFeedback.recommendations
          }
        }
      });
    } catch (error) {
      logger.logError(error as Error, { 
        endpoint: 'POST /api/interviews/session/:id/complete',
        userId: req.user?._id 
      });
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get user's interview history
   */
  static async getHistory(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const { page = 1, limit = 10, category, difficulty, status } = req.query;

      // Build filter
      const filter: any = { user_id: req.user._id };
      if (category) filter.category = category;
      if (difficulty) filter.difficulty = difficulty;
      if (status) filter.status = status;

      // Get interviews with pagination
      const interviews = await Interview.find(filter)
        .sort({ createdAt: -1 })
        .limit(Number(limit) * 1)
        .skip((Number(page) - 1) * Number(limit))
        .select('-questions'); // Exclude detailed questions for list view

      const total = await Interview.countDocuments(filter);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Interview history retrieved successfully',
        data: interviews,
        meta: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error) {
      logger.logError(error as Error, { 
        endpoint: 'GET /api/interviews/history',
        userId: req.user?._id 
      });
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get interview analytics
   */
  static async getAnalytics(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const { period = '30d' } = req.query;

      // Calculate date range
      const now = new Date();
      const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
      const startDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));

      // Get analytics data
      const analytics = await Interview.aggregate([
        {
          $match: {
            user_id: req.user._id,
            status: 'completed',
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: null,
            totalInterviews: { $sum: 1 },
            averageScore: { $avg: '$overall_feedback.total_score' },
            totalQuestions: { $sum: { $size: '$questions' } },
            totalTimeSpent: { $sum: '$metadata.duration' },
            categoryBreakdown: {
              $push: {
                category: '$category',
                score: '$overall_feedback.total_score'
              }
            }
          }
        }
      ]);

      const result = analytics[0] || {
        totalInterviews: 0,
        averageScore: 0,
        totalQuestions: 0,
        totalTimeSpent: 0,
        categoryBreakdown: []
      };

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Interview analytics retrieved successfully',
        data: {
          period,
          total_interviews: result.totalInterviews,
          average_score: Math.round(result.averageScore || 0),
          total_questions: result.totalQuestions,
          total_time_spent: result.totalTimeSpent,
          category_breakdown: result.categoryBreakdown,
          improvement_trend: await this.calculateImprovementTrend(req.user._id, startDate)
        }
      });
    } catch (error) {
      logger.logError(error as Error, { 
        endpoint: 'GET /api/interviews/analytics',
        userId: req.user?._id 
      });
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Update user statistics after interview completion
   */
  private static async updateUserStatistics(userId: string, interview: any) {
    try {
      const User = require('../models/User').User;
      const user = await User.findById(userId);
      
      if (user) {
        user.statistics.interviews_completed += 1;
        user.statistics.total_score += interview.overall_feedback.total_score;
        user.statistics.average_score = user.statistics.total_score / user.statistics.interviews_completed;
        
        // Update streak
        const today = new Date().toDateString();
        const lastInterview = new Date(user.statistics.last_interview_date || 0).toDateString();
        
        if (today !== lastInterview) {
          user.statistics.current_streak += 1;
          user.statistics.longest_streak = Math.max(user.statistics.longest_streak, user.statistics.current_streak);
        }
        
        user.statistics.last_interview_date = new Date();
        await user.save();
      }
    } catch (error) {
      logger.logError(error as Error, { 
        context: 'update_user_statistics',
        userId 
      });
    }
  }

  /**
   * Calculate improvement trend
   */
  private static async calculateImprovementTrend(userId: string, startDate: Date): Promise<number> {
    try {
      const interviews = await Interview.find({
        user_id: userId,
        status: 'completed',
        createdAt: { $gte: startDate }
      }).sort({ createdAt: 1 });

      if (interviews.length < 2) return 0;

      const firstHalf = interviews.slice(0, Math.floor(interviews.length / 2));
      const secondHalf = interviews.slice(Math.floor(interviews.length / 2));

      const firstHalfAvg = firstHalf.reduce((sum, i) => sum + i.overall_feedback.total_score, 0) / firstHalf.length;
      const secondHalfAvg = secondHalf.reduce((sum, i) => sum + i.overall_feedback.total_score, 0) / secondHalf.length;

      return Math.round(secondHalfAvg - firstHalfAvg);
    } catch (error) {
      logger.logError(error as Error, { 
        context: 'calculate_improvement_trend',
        userId 
      });
      return 0;
    }
  }
}

export default InterviewController;
