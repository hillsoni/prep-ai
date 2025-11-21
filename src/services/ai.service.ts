import { logger } from '../utils/logger';
import { AIAnalysisRequest, AIAnalysisResponse } from '../types/interview.types';

export class AIService {
  /**
   * Analyze user's interview answer and provide feedback
   */
  static async analyzeAnswer(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    try {
      const startTime = Date.now();
      
      // Simulate AI analysis (in production, this would call OpenAI API)
      const analysis = await this.simulateAIAnalysis(request);
      
      const processingTime = Date.now() - startTime;
      
      logger.logPerformance('ai_analysis', processingTime, {
        question_type: request.question_type,
        difficulty: request.difficulty,
        answer_length: request.user_answer.length
      });

      return {
        ...analysis,
        processing_time: processingTime
      };
    } catch (error) {
      logger.logError(error as Error, { 
        context: 'ai_analysis',
        question: request.question,
        question_type: request.question_type
      });
      
      // Return fallback analysis
      return this.getFallbackAnalysis(request);
    }
  }

  /**
   * Generate interview questions based on category and difficulty
   */
  static async generateQuestions(
    category: string,
    difficulty: string,
    count: number = 5
  ): Promise<any[]> {
    try {
      // Simulate AI question generation
      const questions = await this.simulateQuestionGeneration(category, difficulty, count);
      
      logger.logPerformance('ai_question_generation', Date.now(), {
        category,
        difficulty,
        count
      });

      return questions;
    } catch (error) {
      logger.logError(error as Error, { 
        context: 'ai_question_generation',
        category,
        difficulty
      });
      
      return this.getFallbackQuestions(category, difficulty, count);
    }
  }

  /**
   * Generate personalized recommendations based on user performance
   */
  static async generateRecommendations(
    userHistory: any[],
    currentPerformance: any
  ): Promise<string[]> {
    try {
      // Analyze user's performance patterns
      const analysis = this.analyzePerformancePatterns(userHistory, currentPerformance);
      
      // Generate personalized recommendations
      const recommendations = this.generatePersonalizedRecommendations(analysis);
      
      logger.logPerformance('ai_recommendations', Date.now(), {
        history_count: userHistory.length,
        performance_score: currentPerformance.score
      });

      return recommendations;
    } catch (error) {
      logger.logError(error as Error, { 
        context: 'ai_recommendations',
        history_count: userHistory.length
      });
      
      return this.getFallbackRecommendations();
    }
  }

  /**
   * Simulate AI analysis (replace with actual OpenAI integration)
   */
  private static async simulateAIAnalysis(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    const { question, user_answer, expected_keywords, question_type, difficulty } = request;
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
    
    // Calculate keyword matches
    const keywordMatches = this.calculateKeywordMatches(user_answer, expected_keywords);
    const keywordScore = (keywordMatches / expected_keywords.length) * 100;
    
    // Calculate content quality scores
    const clarityScore = this.calculateClarityScore(user_answer);
    const completenessScore = this.calculateCompletenessScore(user_answer, question);
    const relevanceScore = this.calculateRelevanceScore(user_answer, question);
    
    // Calculate overall score
    const overallScore = Math.round(
      (keywordScore * 0.4) + 
      (clarityScore * 0.3) + 
      (completenessScore * 0.2) + 
      (relevanceScore * 0.1)
    );
    
    // Generate feedback based on score
    const feedback = this.generateFeedback(overallScore, keywordMatches, expected_keywords);
    
    return {
      score: Math.min(100, Math.max(0, overallScore)),
      feedback: {
        strengths: feedback.strengths,
        improvements: feedback.improvements,
        suggestions: feedback.suggestions,
        keyword_matches: keywordMatches,
        keyword_missed: expected_keywords.filter(k => !this.containsKeyword(user_answer, k)),
        clarity_score: Math.round(clarityScore),
        completeness_score: Math.round(completenessScore),
        relevance_score: Math.round(relevanceScore)
      },
      suggestions: feedback.suggestions,
      keyword_analysis: {
        matched: expected_keywords.filter(k => this.containsKeyword(user_answer, k)),
        missed: expected_keywords.filter(k => !this.containsKeyword(user_answer, k)),
        score: Math.round(keywordScore)
      },
      confidence_level: this.calculateConfidenceLevel(overallScore, user_answer.length),
      processing_time: 0 // Will be set by caller
    };
  }

  /**
   * Calculate keyword matches in user answer
   */
  private static calculateKeywordMatches(answer: string, keywords: string[]): number {
    const answerLower = answer.toLowerCase();
    return keywords.filter(keyword => 
      this.containsKeyword(answerLower, keyword.toLowerCase())
    ).length;
  }

  /**
   * Check if answer contains keyword (with variations)
   */
  private static containsKeyword(answer: string, keyword: string): boolean {
    const variations = this.getKeywordVariations(keyword);
    return variations.some(variation => answer.includes(variation));
  }

  /**
   * Get keyword variations for better matching
   */
  private static getKeywordVariations(keyword: string): string[] {
    const variations = [keyword];
    
    // Add common variations
    if (keyword.includes(' ')) {
      variations.push(keyword.replace(/\s+/g, ''));
    }
    
    // Add singular/plural forms
    if (keyword.endsWith('s')) {
      variations.push(keyword.slice(0, -1));
    } else {
      variations.push(keyword + 's');
    }
    
    return variations;
  }

  /**
   * Calculate clarity score based on answer structure
   */
  private static calculateClarityScore(answer: string): number {
    let score = 50; // Base score
    
    // Length factor
    if (answer.length > 100) score += 20;
    else if (answer.length > 50) score += 10;
    
    // Structure indicators
    if (answer.includes('.')) score += 10; // Sentences
    if (answer.includes(',')) score += 5;  // Proper punctuation
    if (answer.includes('because') || answer.includes('therefore')) score += 10; // Explanations
    
    // Technical terms usage
    const technicalTerms = ['algorithm', 'data structure', 'optimization', 'complexity', 'implementation'];
    const technicalCount = technicalTerms.filter(term => 
      answer.toLowerCase().includes(term)
    ).length;
    score += technicalCount * 5;
    
    return Math.min(100, score);
  }

  /**
   * Calculate completeness score
   */
  private static calculateCompletenessScore(answer: string, question: string): number {
    let score = 50;
    
    // Answer length relative to question complexity
    const questionWords = question.split(' ').length;
    const answerWords = answer.split(' ').length;
    const ratio = answerWords / questionWords;
    
    if (ratio > 2) score += 20;
    else if (ratio > 1) score += 10;
    
    // Check for specific question types
    if (question.includes('explain') && answer.length > 100) score += 15;
    if (question.includes('describe') && answer.includes('step')) score += 15;
    if (question.includes('compare') && answer.includes('vs')) score += 15;
    
    return Math.min(100, score);
  }

  /**
   * Calculate relevance score
   */
  private static calculateRelevanceScore(answer: string, question: string): number {
    let score = 50;
    
    // Extract key terms from question
    const questionTerms = question.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(' ')
      .filter(term => term.length > 3);
    
    // Check if answer addresses question terms
    const answerLower = answer.toLowerCase();
    const addressedTerms = questionTerms.filter(term => 
      answerLower.includes(term)
    ).length;
    
    score += (addressedTerms / questionTerms.length) * 30;
    
    return Math.min(100, score);
  }

  /**
   * Generate feedback based on analysis
   */
  private static generateFeedback(
    score: number, 
    keywordMatches: number, 
    expectedKeywords: string[]
  ): { strengths: string[]; improvements: string[]; suggestions: string[] } {
    const strengths: string[] = [];
    const improvements: string[] = [];
    const suggestions: string[] = [];
    
    if (score >= 80) {
      strengths.push('Excellent technical knowledge');
      strengths.push('Clear and well-structured response');
      if (keywordMatches >= expectedKeywords.length * 0.8) {
        strengths.push('Comprehensive coverage of key concepts');
      }
    } else if (score >= 60) {
      strengths.push('Good understanding of the topic');
      if (score < 70) {
        improvements.push('Provide more specific examples');
        suggestions.push('Try to include more technical details');
      }
    } else {
      improvements.push('Need to improve technical knowledge');
      improvements.push('Provide more detailed explanations');
      suggestions.push('Review the fundamentals of this topic');
      suggestions.push('Practice explaining concepts out loud');
    }
    
    if (keywordMatches < expectedKeywords.length * 0.5) {
      improvements.push('Cover more key concepts');
      suggestions.push('Focus on the main topics: ' + expectedKeywords.slice(0, 3).join(', '));
    }
    
    return { strengths, improvements, suggestions };
  }

  /**
   * Calculate confidence level
   */
  private static calculateConfidenceLevel(score: number, answerLength: number): number {
    let confidence = score;
    
    // Adjust based on answer length
    if (answerLength > 200) confidence += 10;
    else if (answerLength < 50) confidence -= 20;
    
    return Math.min(100, Math.max(0, confidence));
  }

  /**
   * Simulate question generation
   */
  private static async simulateQuestionGeneration(
    category: string,
    difficulty: string,
    count: number
  ): Promise<any[]> {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 500));
    
    const questionTemplates = this.getQuestionTemplates(category, difficulty);
    const questions = [];
    
    for (let i = 0; i < count; i++) {
      const template = questionTemplates[Math.floor(Math.random() * questionTemplates.length)];
      questions.push({
        question_text: template.question,
        question_type: template.type,
        difficulty: difficulty,
        expected_keywords: template.keywords,
        time_limit: template.timeLimit,
        category: category
      });
    }
    
    return questions;
  }

  /**
   * Get question templates for different categories
   */
  private static getQuestionTemplates(category: string, difficulty: string): any[] {
    const templates: { [key: string]: any[] } = {
      technical: [
        {
          question: "Explain the difference between a stack and a queue. When would you use each?",
          type: "conceptual",
          keywords: ["stack", "queue", "LIFO", "FIFO", "data structure"],
          timeLimit: 120
        },
        {
          question: "Write a function to find the longest common subsequence between two strings.",
          type: "coding",
          keywords: ["dynamic programming", "algorithm", "string manipulation"],
          timeLimit: 300
        }
      ],
      behavioral: [
        {
          question: "Tell me about a time when you had to work with a difficult team member.",
          type: "situational",
          keywords: ["teamwork", "conflict resolution", "communication"],
          timeLimit: 180
        }
      ]
    };
    
    return templates[category] || templates.technical;
  }

  /**
   * Analyze performance patterns
   */
  private static analyzePerformancePatterns(history: any[], current: any): any {
    const analysis = {
      averageScore: 0,
      weakAreas: [],
      strongAreas: [],
      improvementTrend: 0,
      commonMistakes: []
    };
    
    if (history.length === 0) return analysis;
    
    // Calculate average score
    analysis.averageScore = history.reduce((sum, h) => sum + h.score, 0) / history.length;
    
    // Identify weak areas
    const categoryScores: { [key: string]: number[] } = {};
    history.forEach(h => {
      if (!categoryScores[h.category]) categoryScores[h.category] = [];
      categoryScores[h.category].push(h.score);
    });
    
    Object.entries(categoryScores).forEach(([category, scores]) => {
      const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
      if (avgScore < 60) analysis.weakAreas.push(category);
      if (avgScore > 80) analysis.strongAreas.push(category);
    });
    
    return analysis;
  }

  /**
   * Generate personalized recommendations
   */
  private static generatePersonalizedRecommendations(analysis: any): string[] {
    const recommendations: string[] = [];
    
    if (analysis.averageScore < 60) {
      recommendations.push("Focus on fundamental concepts and practice basic problems");
    }
    
    if (analysis.weakAreas.length > 0) {
      recommendations.push(`Strengthen your knowledge in: ${analysis.weakAreas.join(', ')}`);
    }
    
    if (analysis.strongAreas.length > 0) {
      recommendations.push(`Leverage your strengths in: ${analysis.strongAreas.join(', ')}`);
    }
    
    recommendations.push("Practice explaining your thought process out loud");
    recommendations.push("Review common interview questions in your field");
    
    return recommendations;
  }

  /**
   * Get fallback analysis when AI service fails
   */
  private static getFallbackAnalysis(request: AIAnalysisRequest): AIAnalysisResponse {
    return {
      score: 50,
      feedback: {
        strengths: ['Attempted to answer the question'],
        improvements: ['Provide more detailed explanation'],
        suggestions: ['Practice explaining concepts clearly'],
        keyword_matches: 0,
        keyword_missed: request.expected_keywords,
        clarity_score: 50,
        completeness_score: 50,
        relevance_score: 50
      },
      suggestions: ['Try to be more specific in your answers'],
      keyword_analysis: {
        matched: [],
        missed: request.expected_keywords,
        score: 0
      },
      confidence_level: 30,
      processing_time: 0
    };
  }

  /**
   * Get fallback questions when AI service fails
   */
  private static getFallbackQuestions(category: string, difficulty: string, count: number): any[] {
    return [
      {
        question_text: `Explain a key concept in ${category}`,
        question_type: 'conceptual',
        difficulty: difficulty,
        expected_keywords: ['concept', 'explanation', 'understanding'],
        time_limit: 120,
        category: category
      }
    ];
  }

  /**
   * Get fallback recommendations
   */
  private static getFallbackRecommendations(): string[] {
    return [
      'Practice explaining technical concepts clearly',
      'Review fundamental concepts in your field',
      'Practice with mock interviews',
      'Focus on problem-solving approach'
    ];
  }
}

export default AIService;
