import mongoose, { Schema, Document } from 'mongoose';
import { IInterview, InterviewQuestion, InterviewFeedback, InterviewMetadata } from '../types/interview.types';
import { Category, CATEGORY_VALUES, Difficulty, DIFFICULTY_VALUES } from '../types/common.types';

// Sub-schemas
const QuestionFeedbackSchema = new Schema({
  strengths: [{ type: String, maxlength: 200 }],
  improvements: [{ type: String, maxlength: 200 }],
  suggestions: [{ type: String, maxlength: 200 }],
  keyword_matches: { type: Number, min: 0, max: 100 },
  keyword_missed: [{ type: String, maxlength: 50 }],
  clarity_score: { type: Number, min: 0, max: 100 },
  completeness_score: { type: Number, min: 0, max: 100 },
  relevance_score: { type: Number, min: 0, max: 100 }
}, { _id: false });

const InterviewQuestionSchema = new Schema<InterviewQuestion>({
  question_id: { type: Schema.Types.ObjectId, ref: 'QuestionBank', required: true },
  question_text: { type: String, required: true, maxlength: 1000 },
  question_type: { 
    type: String, 
    enum: ['behavioral', 'technical', 'situational', 'system_design'],
    required: true 
  },
  expected_keywords: [{ type: String, maxlength: 50 }],
  difficulty_weight: { type: Number, min: 1, max: 10, default: 5 },
  time_allocated: { type: Number, min: 30, max: 1800, required: true }, // 30 seconds to 30 minutes
  time_taken: { type: Number, min: 0, default: 0 },
  user_answer: { type: String, maxlength: 5000, default: '' },
  ai_score: { type: Number, min: 0, max: 100, default: 0 },
  feedback: { type: QuestionFeedbackSchema, default: {} },
  order: { type: Number, required: true }
}, { _id: false });

const CategoryScoresSchema = new Schema({
  communication: { type: Number, min: 0, max: 100, default: 0 },
  technical_knowledge: { type: Number, min: 0, max: 100, default: 0 },
  confidence: { type: Number, min: 0, max: 100, default: 0 },
  clarity: { type: Number, min: 0, max: 100, default: 0 },
  problem_solving: { type: Number, min: 0, max: 100, default: 0 },
  time_management: { type: Number, min: 0, max: 100, default: 0 }
}, { _id: false });

const InterviewFeedbackSchema = new Schema<InterviewFeedback>({
  total_score: { type: Number, min: 0, max: 100, required: true },
  category_scores: { type: CategoryScoresSchema, required: true },
  strengths: [{ type: String, maxlength: 200 }],
  areas_for_improvement: [{ type: String, maxlength: 200 }],
  recommendations: [{ type: String, maxlength: 200 }],
  next_steps: [{ type: String, maxlength: 200 }],
  overall_rating: { 
    type: String, 
    enum: ['excellent', 'good', 'average', 'needs_improvement'],
    required: true 
  },
  detailed_analysis: { type: String, maxlength: 2000 }
}, { _id: false });

const DeviceInfoSchema = new Schema({
  platform: { type: String, maxlength: 50 },
  browser: { type: String, maxlength: 50 },
  screen_resolution: { type: String, maxlength: 20 }
}, { _id: false });

const SessionDataSchema = new Schema({
  total_questions: { type: Number, min: 1, required: true },
  answered_questions: { type: Number, min: 0, default: 0 },
  skipped_questions: { type: Number, min: 0, default: 0 },
  average_time_per_question: { type: Number, min: 0, default: 0 }
}, { _id: false });

const InterviewMetadataSchema = new Schema<InterviewMetadata>({
  duration: { type: Number, min: 0, required: true }, // in seconds
  paused_times: { type: Number, min: 0, default: 0 },
  completion_rate: { type: Number, min: 0, max: 100, required: true },
  started_at: { type: Date, required: true },
  completed_at: { type: Date },
  device_info: { type: DeviceInfoSchema },
  session_data: { type: SessionDataSchema, required: true }
}, { _id: false });

// Main Interview Schema
const InterviewSchema = new Schema<IInterview>({
  user_id: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true 
  },
  session_id: { 
    type: String, 
    required: true, 
    unique: true,
    index: true 
  },
  category: { 
    type: String, 
    enum: CATEGORY_VALUES, 
    required: true,
    index: true 
  },
  difficulty: { 
    type: String, 
    enum: DIFFICULTY_VALUES, 
    required: true,
    index: true 
  },
  questions: [InterviewQuestionSchema],
  overall_feedback: { type: InterviewFeedbackSchema },
  metadata: { type: InterviewMetadataSchema, required: true },
  status: { 
    type: String, 
    enum: ['in_progress', 'completed', 'abandoned', 'paused'],
    default: 'in_progress',
    index: true 
  },
  completed_at: { type: Date }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
InterviewSchema.index({ user_id: 1, createdAt: -1 });
InterviewSchema.index({ category: 1, difficulty: 1 });
InterviewSchema.index({ status: 1, createdAt: -1 });
InterviewSchema.index({ 'metadata.started_at': -1 });
InterviewSchema.index({ 'overall_feedback.total_score': -1 });

// Compound indexes
InterviewSchema.index({ user_id: 1, status: 1 });
InterviewSchema.index({ user_id: 1, category: 1 });
InterviewSchema.index({ user_id: 1, difficulty: 1 });

// Virtuals
InterviewSchema.virtual('totalQuestions').get(function() {
  return this.questions.length;
});

InterviewSchema.virtual('answeredQuestions').get(function() {
  return this.questions.filter(q => q.user_answer && q.user_answer.trim().length > 0).length;
});

InterviewSchema.virtual('averageScore').get(function() {
  if (this.questions.length === 0) return 0;
  const totalScore = this.questions.reduce((sum, q) => sum + q.ai_score, 0);
  return Math.round(totalScore / this.questions.length);
});

InterviewSchema.virtual('completionRate').get(function() {
  if (this.questions.length === 0) return 0;
  return Math.round((this.answeredQuestions / this.totalQuestions) * 100);
});

InterviewSchema.virtual('totalTimeSpent').get(function() {
  return this.questions.reduce((sum, q) => sum + q.time_taken, 0);
});

InterviewSchema.virtual('isCompleted').get(function() {
  return this.status === 'completed';
});

InterviewSchema.virtual('isInProgress').get(function() {
  return this.status === 'in_progress';
});

// Pre-save middleware
InterviewSchema.pre('save', function(next) {
  // Update completion rate
  if (this.questions.length > 0) {
    this.metadata.completion_rate = this.completionRate;
    this.metadata.session_data.answered_questions = this.answeredQuestions;
    this.metadata.session_data.average_time_per_question = this.totalTimeSpent / this.questions.length;
  }
  
  // Set completed_at when status changes to completed
  if (this.isModified('status') && this.status === 'completed' && !this.completed_at) {
    this.completed_at = new Date();
    this.metadata.completed_at = new Date();
  }
  
  next();
});

// Instance methods
InterviewSchema.methods.addQuestion = function(questionData: Partial<InterviewQuestion>) {
  const question = {
    ...questionData,
    order: this.questions.length + 1
  } as InterviewQuestion;
  
  this.questions.push(question);
  return this.save();
};

InterviewSchema.methods.updateQuestionAnswer = function(questionId: string, answer: string, timeTaken: number) {
  const question = this.questions.id(questionId);
  if (question) {
    question.user_answer = answer;
    question.time_taken = timeTaken;
    return this.save();
  }
  throw new Error('Question not found');
};

InterviewSchema.methods.calculateOverallScore = function() {
  if (this.questions.length === 0) return 0;
  
  const totalScore = this.questions.reduce((sum, q) => sum + q.ai_score, 0);
  const averageScore = totalScore / this.questions.length;
  
  // Weight by difficulty and completion
  const difficultyWeight = this.difficulty === 'beginner' ? 1.0 : 
                          this.difficulty === 'intermediate' ? 1.2 : 1.5;
  
  const completionWeight = this.completionRate / 100;
  
  return Math.round(averageScore * difficultyWeight * completionWeight);
};

InterviewSchema.methods.generateFeedback = function() {
  const totalScore = this.calculateOverallScore();
  
  // Calculate category scores based on question types and performance
  const categoryScores = {
    communication: this.calculateCategoryScore(['behavioral', 'situational']),
    technical_knowledge: this.calculateCategoryScore(['technical', 'system_design']),
    confidence: this.calculateConfidenceScore(),
    clarity: this.calculateClarityScore(),
    problem_solving: this.calculateProblemSolvingScore(),
    time_management: this.calculateTimeManagementScore()
  };
  
  // Generate strengths and improvements
  const strengths = this.generateStrengths(categoryScores);
  const improvements = this.generateImprovements(categoryScores);
  const recommendations = this.generateRecommendations(categoryScores);
  
  this.overall_feedback = {
    total_score: totalScore,
    category_scores,
    strengths,
    areas_for_improvement: improvements,
    recommendations,
    next_steps: this.generateNextSteps(improvements),
    overall_rating: this.getOverallRating(totalScore),
    detailed_analysis: this.generateDetailedAnalysis()
  };
  
  return this.overall_feedback;
};

InterviewSchema.methods.calculateCategoryScore = function(questionTypes: string[]) {
  const relevantQuestions = this.questions.filter(q => questionTypes.includes(q.question_type));
  if (relevantQuestions.length === 0) return 0;
  
  const totalScore = relevantQuestions.reduce((sum, q) => sum + q.ai_score, 0);
  return Math.round(totalScore / relevantQuestions.length);
};

InterviewSchema.methods.calculateConfidenceScore = function() {
  // Based on answer length, keyword usage, and response time
  const avgAnswerLength = this.questions.reduce((sum, q) => sum + q.user_answer.length, 0) / this.questions.length;
  const avgResponseTime = this.totalTimeSpent / this.questions.length;
  
  let score = 50; // Base score
  
  // Longer answers might indicate more confidence
  if (avgAnswerLength > 100) score += 20;
  else if (avgAnswerLength > 50) score += 10;
  
  // Appropriate response time indicates confidence
  const avgTimeAllocated = this.questions.reduce((sum, q) => sum + q.time_allocated, 0) / this.questions.length;
  if (avgResponseTime < avgTimeAllocated * 0.8) score += 15;
  else if (avgResponseTime < avgTimeAllocated) score += 10;
  
  return Math.min(100, Math.max(0, score));
};

InterviewSchema.methods.calculateClarityScore = function() {
  // Based on keyword matches and answer structure
  const avgKeywordMatches = this.questions.reduce((sum, q) => sum + q.feedback.keyword_matches, 0) / this.questions.length;
  return Math.round(avgKeywordMatches);
};

InterviewSchema.methods.calculateProblemSolvingScore = function() {
  // Based on technical questions performance
  const technicalQuestions = this.questions.filter(q => q.question_type === 'technical' || q.question_type === 'system_design');
  if (technicalQuestions.length === 0) return 0;
  
  const avgScore = technicalQuestions.reduce((sum, q) => sum + q.ai_score, 0) / technicalQuestions.length;
  return Math.round(avgScore);
};

InterviewSchema.methods.calculateTimeManagementScore = function() {
  const totalAllocated = this.questions.reduce((sum, q) => sum + q.time_allocated, 0);
  const totalUsed = this.totalTimeSpent;
  const efficiency = totalAllocated > 0 ? (totalAllocated - totalUsed) / totalAllocated : 0;
  
  // Convert efficiency to 0-100 score
  return Math.round(Math.max(0, Math.min(100, 50 + (efficiency * 50))));
};

InterviewSchema.methods.generateStrengths = function(categoryScores: any) {
  const strengths = [];
  
  if (categoryScores.communication >= 80) strengths.push('Excellent communication skills');
  if (categoryScores.technical_knowledge >= 80) strengths.push('Strong technical knowledge');
  if (categoryScores.confidence >= 80) strengths.push('High confidence in responses');
  if (categoryScores.clarity >= 80) strengths.push('Clear and articulate answers');
  if (categoryScores.problem_solving >= 80) strengths.push('Strong problem-solving abilities');
  if (categoryScores.time_management >= 80) strengths.push('Good time management');
  
  return strengths.length > 0 ? strengths : ['Shows potential for improvement'];
};

InterviewSchema.methods.generateImprovements = function(categoryScores: any) {
  const improvements = [];
  
  if (categoryScores.communication < 70) improvements.push('Work on communication clarity');
  if (categoryScores.technical_knowledge < 70) improvements.push('Strengthen technical knowledge');
  if (categoryScores.confidence < 70) improvements.push('Build confidence in responses');
  if (categoryScores.clarity < 70) improvements.push('Improve answer structure and clarity');
  if (categoryScores.problem_solving < 70) improvements.push('Enhance problem-solving approach');
  if (categoryScores.time_management < 70) improvements.push('Better time management during interviews');
  
  return improvements.length > 0 ? improvements : ['Continue practicing to maintain current level'];
};

InterviewSchema.methods.generateRecommendations = function(categoryScores: any) {
  const recommendations = [];
  
  if (categoryScores.communication < 70) {
    recommendations.push('Practice the STAR method for behavioral questions');
    recommendations.push('Record yourself answering questions to improve articulation');
  }
  
  if (categoryScores.technical_knowledge < 70) {
    recommendations.push('Review core technical concepts in your field');
    recommendations.push('Practice coding problems and system design');
  }
  
  if (categoryScores.confidence < 70) {
    recommendations.push('Practice mock interviews regularly');
    recommendations.push('Prepare common interview questions in advance');
  }
  
  return recommendations;
};

InterviewSchema.methods.generateNextSteps = function(improvements: string[]) {
  return improvements.map(improvement => `Focus on: ${improvement}`);
};

InterviewSchema.methods.getOverallRating = function(totalScore: number) {
  if (totalScore >= 90) return 'excellent';
  if (totalScore >= 75) return 'good';
  if (totalScore >= 60) return 'average';
  return 'needs_improvement';
};

InterviewSchema.methods.generateDetailedAnalysis = function() {
  const analysis = [];
  
  analysis.push(`You completed ${this.answeredQuestions} out of ${this.totalQuestions} questions.`);
  analysis.push(`Your overall performance score is ${this.calculateOverallScore()}%.`);
  
  if (this.completionRate < 50) {
    analysis.push('Consider practicing time management to complete more questions.');
  }
  
  if (this.averageScore < 60) {
    analysis.push('Focus on improving your technical knowledge and communication skills.');
  }
  
  return analysis.join(' ');
};

// Static methods
InterviewSchema.statics.findByUser = function(userId: string) {
  return this.find({ user_id: userId }).sort({ createdAt: -1 });
};

InterviewSchema.statics.findByCategory = function(category: string) {
  return this.find({ category }).sort({ createdAt: -1 });
};

InterviewSchema.statics.findCompleted = function() {
  return this.find({ status: 'completed' }).sort({ completed_at: -1 });
};

InterviewSchema.statics.getUserStats = function(userId: string) {
  return this.aggregate([
    { $match: { user_id: new mongoose.Types.ObjectId(userId), status: 'completed' } },
    {
      $group: {
        _id: null,
        totalInterviews: { $sum: 1 },
        averageScore: { $avg: '$overall_feedback.total_score' },
        totalQuestions: { $sum: { $size: '$questions' } },
        totalTimeSpent: { $sum: '$metadata.duration' }
      }
    }
  ]);
};

// Export the model
export const Interview = mongoose.model<IInterview>('Interview', InterviewSchema);
export default Interview;
