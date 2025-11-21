import { Request, Response } from 'express';
import { Interview } from '../models/Interview';
import { TestSession } from '../models/Test';
import { Bookmark } from '../models/Resource';
import { User } from '../models/User';
import { logger } from '../utils/logger';
import { HTTP_STATUS } from '../types/common.types';

export class AnalyticsController {
  /**
   * Get comprehensive dashboard analytics
   */
  static async getDashboardAnalytics(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const { period = '30d' } = req.query;
      const userId = req.user._id;

      // Calculate date range
      const now = new Date();
      const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
      const startDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));

      // Get all analytics data in parallel
      const [
        interviewStats,
        testStats,
        resourceStats,
        performanceTrend,
        categoryBreakdown,
        recentActivity,
        achievements,
        recommendations
      ] = await Promise.all([
        this.getInterviewStats(userId, startDate),
        this.getTestStats(userId, startDate),
        this.getResourceStats(userId, startDate),
        this.getPerformanceTrend(userId, startDate),
        this.getCategoryBreakdown(userId, startDate),
        this.getRecentActivity(userId, 10),
        this.getUserAchievements(userId),
        this.getPersonalizedRecommendations(userId)
      ]);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Dashboard analytics retrieved successfully',
        data: {
          period,
          overview: {
            total_interviews: interviewStats.totalInterviews,
            total_tests: testStats.totalTests,
            total_resources: resourceStats.totalResources,
            average_score: Math.round((interviewStats.averageScore + testStats.averageScore) / 2),
            total_time_spent: interviewStats.totalTimeSpent + testStats.totalTimeSpent,
            current_streak: await this.getCurrentStreak(userId)
          },
          interviews: interviewStats,
          tests: testStats,
          resources: resourceStats,
          performance: {
            trend: performanceTrend,
            category_breakdown: categoryBreakdown,
            improvement_areas: this.getImprovementAreas(categoryBreakdown),
            strengths: this.getStrengths(categoryBreakdown)
          },
          activity: {
            recent: recentActivity,
            achievements: achievements,
            recommendations: recommendations
          },
          insights: {
            study_consistency: this.calculateStudyConsistency(recentActivity),
            skill_progression: this.calculateSkillProgression(performanceTrend),
            next_goals: this.generateNextGoals(achievements, categoryBreakdown)
          }
        }
      });
    } catch (error) {
      logger.logError(error as Error, { 
        endpoint: 'GET /api/analytics/dashboard',
        userId: req.user?._id 
      });
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get interview statistics
   */
  private static async getInterviewStats(userId: string, startDate: Date) {
    const stats = await Interview.aggregate([
      {
        $match: {
          user_id: userId,
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
              score: '$overall_feedback.total_score',
              difficulty: '$difficulty'
            }
          }
        }
      }
    ]);

    const result = stats[0] || {
      totalInterviews: 0,
      averageScore: 0,
      totalQuestions: 0,
      totalTimeSpent: 0,
      categoryBreakdown: []
    };

    return {
      total_interviews: result.totalInterviews,
      average_score: Math.round(result.averageScore || 0),
      total_questions: result.totalQuestions,
      total_time_spent: result.totalTimeSpent,
      category_breakdown: result.categoryBreakdown
    };
  }

  /**
   * Get test statistics
   */
  private static async getTestStats(userId: string, startDate: Date) {
    const stats = await TestSession.aggregate([
      {
        $match: {
          user_id: userId,
          status: 'completed',
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalTests: { $sum: 1 },
          averageScore: { $avg: '$score' },
          totalQuestions: { $sum: '$total_questions' },
          totalTimeSpent: { $sum: '$time_spent' },
          passedTests: {
            $sum: { $cond: [{ $gte: ['$score', 70] }, 1, 0] }
          }
        }
      }
    ]);

    const result = stats[0] || {
      totalTests: 0,
      averageScore: 0,
      totalQuestions: 0,
      totalTimeSpent: 0,
      passedTests: 0
    };

    return {
      total_tests: result.totalTests,
      average_score: Math.round(result.averageScore || 0),
      total_questions: result.totalQuestions,
      total_time_spent: result.totalTimeSpent,
      passed_tests: result.passedTests,
      pass_rate: result.totalTests > 0 ? Math.round((result.passedTests / result.totalTests) * 100) : 0
    };
  }

  /**
   * Get resource statistics
   */
  private static async getResourceStats(userId: string, startDate: Date) {
    const [bookmarkStats, viewStats] = await Promise.all([
      Bookmark.aggregate([
        {
          $match: {
            user_id: userId,
            created_at: { $gte: startDate }
          }
        },
        {
          $lookup: {
            from: 'resources',
            localField: 'resource_id',
            foreignField: '_id',
            as: 'resource'
          }
        },
        {
          $unwind: '$resource'
        },
        {
          $group: {
            _id: null,
            totalBookmarks: { $sum: 1 },
            categoryBreakdown: {
              $push: '$resource.category'
            },
            typeBreakdown: {
              $push: '$resource.type'
            }
          }
        }
      ]),
      // This would require tracking resource views in a separate collection
      // For now, return mock data
      Promise.resolve([{
        totalViews: 0,
        categoryBreakdown: []
      }])
    ]);

    const bookmarkResult = bookmarkStats[0] || {
      totalBookmarks: 0,
      categoryBreakdown: [],
      typeBreakdown: []
    };

    return {
      total_bookmarks: bookmarkResult.totalBookmarks,
      total_views: 0, // Would be tracked separately
      category_breakdown: this.countOccurrences(bookmarkResult.categoryBreakdown),
      type_breakdown: this.countOccurrences(bookmarkResult.typeBreakdown)
    };
  }

  /**
   * Get performance trend over time
   */
  private static async getPerformanceTrend(userId: string, startDate: Date) {
    const [interviewTrend, testTrend] = await Promise.all([
      Interview.aggregate([
        {
          $match: {
            user_id: userId,
            status: 'completed',
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' }
            },
            averageScore: { $avg: '$overall_feedback.total_score' },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
      ]),
      TestSession.aggregate([
        {
          $match: {
            user_id: userId,
            status: 'completed',
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' }
            },
            averageScore: { $avg: '$score' },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
      ])
    ]);

    return {
      interviews: interviewTrend.map(item => ({
        date: new Date(item._id.year, item._id.month - 1, item._id.day).toISOString(),
        score: Math.round(item.averageScore),
        count: item.count
      })),
      tests: testTrend.map(item => ({
        date: new Date(item._id.year, item._id.month - 1, item._id.day).toISOString(),
        score: Math.round(item.averageScore),
        count: item.count
      }))
    };
  }

  /**
   * Get category breakdown
   */
  private static async getCategoryBreakdown(userId: string, startDate: Date) {
    const [interviewCategories, testCategories] = await Promise.all([
      Interview.aggregate([
        {
          $match: {
            user_id: userId,
            status: 'completed',
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: '$category',
            averageScore: { $avg: '$overall_feedback.total_score' },
            count: { $sum: 1 }
          }
        }
      ]),
      TestSession.aggregate([
        {
          $match: {
            user_id: userId,
            status: 'completed',
            createdAt: { $gte: startDate }
          }
        },
        {
          $lookup: {
            from: 'tests',
            localField: 'test_id',
            foreignField: '_id',
            as: 'test'
          }
        },
        {
          $unwind: '$test'
        },
        {
          $group: {
            _id: '$test.category',
            averageScore: { $avg: '$score' },
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    return {
      interviews: interviewCategories.map(item => ({
        category: item._id,
        average_score: Math.round(item.averageScore),
        count: item.count
      })),
      tests: testCategories.map(item => ({
        category: item._id,
        average_score: Math.round(item.averageScore),
        count: item.count
      }))
    };
  }

  /**
   * Get recent activity
   */
  private static async getRecentActivity(userId: string, limit: number) {
    const [recentInterviews, recentTests, recentBookmarks] = await Promise.all([
      Interview.find({ user_id: userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .select('category difficulty status createdAt overall_feedback.total_score'),
      TestSession.find({ user_id: userId })
        .populate('test_id', 'title category')
        .sort({ createdAt: -1 })
        .limit(limit)
        .select('score status createdAt test_id'),
      Bookmark.find({ user_id: userId })
        .populate('resource_id', 'title type category')
        .sort({ created_at: -1 })
        .limit(limit)
        .select('resource_id folder created_at')
    ]);

    const activities = [
      ...recentInterviews.map(interview => ({
        type: 'interview',
        id: interview._id,
        title: `${interview.category} Interview`,
        category: interview.category,
        score: interview.overall_feedback?.total_score || 0,
        status: interview.status,
        date: interview.createdAt
      })),
      ...recentTests.map(test => ({
        type: 'test',
        id: test._id,
        title: (test.test_id as any)?.title || 'Practice Test',
        category: (test.test_id as any)?.category || 'General',
        score: test.score,
        status: test.status,
        date: test.createdAt
      })),
      ...recentBookmarks.map(bookmark => ({
        type: 'bookmark',
        id: bookmark._id,
        title: (bookmark.resource_id as any)?.title || 'Resource',
        category: (bookmark.resource_id as any)?.category || 'General',
        folder: bookmark.folder,
        date: bookmark.created_at
      }))
    ];

    return activities
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit);
  }

  /**
   * Get user achievements
   */
  private static async getUserAchievements(userId: string) {
    const user = await User.findById(userId).select('statistics');
    if (!user) return [];

    const achievements = [];

    // Interview achievements
    if (user.statistics.interviews_completed >= 1) {
      achievements.push({
        id: 'first_interview',
        name: 'First Interview',
        description: 'Completed your first interview',
        icon: '🎯',
        unlocked_at: new Date(),
        category: 'milestone'
      });
    }

    if (user.statistics.interviews_completed >= 10) {
      achievements.push({
        id: 'interview_veteran',
        name: 'Interview Veteran',
        description: 'Completed 10 interviews',
        icon: '🏆',
        unlocked_at: new Date(),
        category: 'milestone'
      });
    }

    // Streak achievements
    if (user.statistics.current_streak >= 7) {
      achievements.push({
        id: 'week_streak',
        name: 'Week Warrior',
        description: '7-day study streak',
        icon: '🔥',
        unlocked_at: new Date(),
        category: 'consistency'
      });
    }

    if (user.statistics.current_streak >= 30) {
      achievements.push({
        id: 'month_streak',
        name: 'Monthly Master',
        description: '30-day study streak',
        icon: '💪',
        unlocked_at: new Date(),
        category: 'consistency'
      });
    }

    // Score achievements
    if (user.statistics.average_score >= 80) {
      achievements.push({
        id: 'high_performer',
        name: 'High Performer',
        description: 'Average score above 80%',
        icon: '⭐',
        unlocked_at: new Date(),
        category: 'performance'
      });
    }

    return achievements;
  }

  /**
   * Get personalized recommendations
   */
  private static async getPersonalizedRecommendations(userId: string) {
    const user = await User.findById(userId).select('statistics preferences');
    if (!user) return [];

    const recommendations = [];

    // Based on study consistency
    if (user.statistics.current_streak < 3) {
      recommendations.push({
        type: 'consistency',
        title: 'Build a Study Habit',
        description: 'Try to practice for at least 10 minutes daily',
        priority: 'high',
        action: 'Start a daily practice routine'
      });
    }

    // Based on performance
    if (user.statistics.average_score < 70) {
      recommendations.push({
        type: 'performance',
        title: 'Focus on Fundamentals',
        description: 'Review basic concepts to improve your scores',
        priority: 'high',
        action: 'Take beginner-level practice tests'
      });
    }

    // Based on category performance
    const categoryBreakdown = await this.getCategoryBreakdown(userId, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
    const weakCategories = categoryBreakdown.interviews
      .filter(cat => cat.average_score < 70)
      .map(cat => cat.category);

    if (weakCategories.length > 0) {
      recommendations.push({
        type: 'skill_development',
        title: 'Strengthen Weak Areas',
        description: `Focus on improving: ${weakCategories.join(', ')}`,
        priority: 'medium',
        action: 'Practice more questions in these categories'
      });
    }

    return recommendations;
  }

  /**
   * Get current streak
   */
  private static async getCurrentStreak(userId: string) {
    const user = await User.findById(userId).select('statistics');
    return user?.statistics.current_streak || 0;
  }

  /**
   * Get improvement areas
   */
  private static getImprovementAreas(categoryBreakdown: any) {
    const allCategories = [
      ...categoryBreakdown.interviews,
      ...categoryBreakdown.tests
    ];

    return allCategories
      .filter(cat => cat.average_score < 70)
      .map(cat => ({
        category: cat.category,
        score: cat.average_score,
        improvement_needed: 70 - cat.average_score
      }));
  }

  /**
   * Get strengths
   */
  private static getStrengths(categoryBreakdown: any) {
    const allCategories = [
      ...categoryBreakdown.interviews,
      ...categoryBreakdown.tests
    ];

    return allCategories
      .filter(cat => cat.average_score >= 80)
      .map(cat => ({
        category: cat.category,
        score: cat.average_score,
        strength_level: cat.average_score >= 90 ? 'excellent' : 'good'
      }));
  }

  /**
   * Calculate study consistency
   */
  private static calculateStudyConsistency(recentActivity: any[]) {
    const last7Days = recentActivity.filter(activity => {
      const activityDate = new Date(activity.date);
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return activityDate >= sevenDaysAgo;
    });

    const uniqueDays = new Set(
      last7Days.map(activity => 
        new Date(activity.date).toDateString()
      )
    ).size;

    return {
      days_active: uniqueDays,
      consistency_score: Math.round((uniqueDays / 7) * 100),
      streak: uniqueDays
    };
  }

  /**
   * Calculate skill progression
   */
  private static calculateSkillProgression(performanceTrend: any) {
    const interviewScores = performanceTrend.interviews.map(item => item.score);
    const testScores = performanceTrend.tests.map(item => item.score);

    const interviewProgression = this.calculateProgression(interviewScores);
    const testProgression = this.calculateProgression(testScores);

    return {
      interviews: interviewProgression,
      tests: testProgression,
      overall: (interviewProgression + testProgression) / 2
    };
  }

  /**
   * Calculate progression trend
   */
  private static calculateProgression(scores: number[]) {
    if (scores.length < 2) return 0;

    const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
    const secondHalf = scores.slice(Math.floor(scores.length / 2));

    const firstAvg = firstHalf.reduce((sum, score) => sum + score, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, score) => sum + score, 0) / secondHalf.length;

    return Math.round(secondAvg - firstAvg);
  }

  /**
   * Generate next goals
   */
  private static generateNextGoals(achievements: any[], categoryBreakdown: any) {
    const goals = [];

    // Streak goals
    if (!achievements.find(a => a.id === 'week_streak')) {
      goals.push({
        type: 'streak',
        title: 'Build a 7-day streak',
        description: 'Practice daily for a week',
        target: 7,
        current: 0, // Would be calculated from user data
        priority: 'high'
      });
    }

    // Performance goals
    const weakCategories = this.getImprovementAreas(categoryBreakdown);
    if (weakCategories.length > 0) {
      goals.push({
        type: 'performance',
        title: 'Improve weak areas',
        description: `Focus on: ${weakCategories.map(c => c.category).join(', ')}`,
        target: 70,
        current: Math.round(weakCategories.reduce((sum, c) => sum + c.score, 0) / weakCategories.length),
        priority: 'medium'
      });
    }

    return goals;
  }

  /**
   * Count occurrences in array
   */
  private static countOccurrences(arr: string[]) {
    const counts: { [key: string]: number } = {};
    arr.forEach(item => {
      counts[item] = (counts[item] || 0) + 1;
    });
    return counts;
  }
}

export default AnalyticsController;
