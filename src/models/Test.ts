import mongoose, { Schema, Document } from 'mongoose';

export interface ITest extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  questions: TestQuestion[];
  duration: number; // in minutes
  passing_score: number; // percentage
  total_questions: number;
  is_active: boolean;
  created_by: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

export interface TestQuestion {
  question_id: mongoose.Types.ObjectId;
  question_text: string;
  question_type: 'multiple_choice' | 'true_false' | 'fill_blank' | 'coding' | 'essay';
  options?: string[]; // for multiple choice
  correct_answer: number | string; // index for multiple choice, answer for others
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
  time_limit: number; // in seconds
  tags: string[];
  order: number;
}

export interface ITestSession extends Document {
  _id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  test_id: mongoose.Types.ObjectId;
  session_id: string;
  answers: UserAnswer[];
  score: number;
  total_questions: number;
  correct_answers: number;
  time_spent: number; // in seconds
  status: 'in_progress' | 'completed' | 'abandoned' | 'timeout';
  started_at: Date;
  completed_at?: Date;
  created_at: Date;
}

export interface UserAnswer {
  question_id: mongoose.Types.ObjectId;
  selected_answer: number | string;
  is_correct: boolean;
  time_spent: number; // in seconds
  points_earned: number;
}

// Test Question Schema
const TestQuestionSchema = new Schema<TestQuestion>({
  question_id: { type: Schema.Types.ObjectId, ref: 'QuestionBank', required: true },
  question_text: { type: String, required: true, maxlength: 1000 },
  question_type: { 
    type: String, 
    enum: ['multiple_choice', 'true_false', 'fill_blank', 'coding', 'essay'],
    required: true 
  },
  options: [{ type: String, maxlength: 500 }],
  correct_answer: { type: Schema.Types.Mixed, required: true },
  explanation: { type: String, maxlength: 1000 },
  difficulty: { 
    type: String, 
    enum: ['easy', 'medium', 'hard'],
    required: true 
  },
  points: { type: Number, min: 1, max: 10, default: 1 },
  time_limit: { type: Number, min: 30, max: 600, default: 120 },
  tags: [{ type: String, maxlength: 50 }],
  order: { type: Number, required: true }
}, { _id: false });

// Test Schema
const TestSchema = new Schema<ITest>({
  title: {
    type: String,
    required: true,
    maxlength: 200,
    trim: true
  },
  description: {
    type: String,
    maxlength: 1000,
    trim: true
  },
  category: {
    type: String,
    required: true,
    maxlength: 100,
    index: true
  },
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    required: true,
    index: true
  },
  questions: [TestQuestionSchema],
  duration: {
    type: Number,
    required: true,
    min: 5,
    max: 180 // 3 hours max
  },
  passing_score: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
    default: 70
  },
  total_questions: {
    type: Number,
    required: true,
    min: 1,
    max: 100
  },
  is_active: {
    type: Boolean,
    default: true,
    index: true
  },
  created_by: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Test Session Schema
const TestSessionSchema = new Schema<ITestSession>({
  user_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  test_id: {
    type: Schema.Types.ObjectId,
    ref: 'Test',
    required: true,
    index: true
  },
  session_id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  answers: [{
    question_id: { type: Schema.Types.ObjectId, required: true },
    selected_answer: { type: Schema.Types.Mixed, required: true },
    is_correct: { type: Boolean, required: true },
    time_spent: { type: Number, min: 0, default: 0 },
    points_earned: { type: Number, min: 0, default: 0 }
  }],
  score: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  total_questions: {
    type: Number,
    required: true,
    min: 1
  },
  correct_answers: {
    type: Number,
    min: 0,
    default: 0
  },
  time_spent: {
    type: Number,
    min: 0,
    default: 0
  },
  status: {
    type: String,
    enum: ['in_progress', 'completed', 'abandoned', 'timeout'],
    default: 'in_progress',
    index: true
  },
  started_at: {
    type: Date,
    default: Date.now,
    required: true
  },
  completed_at: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
TestSchema.index({ category: 1, difficulty: 1 });
TestSchema.index({ is_active: 1, created_at: -1 });
TestSchema.index({ created_by: 1 });

TestSessionSchema.index({ user_id: 1, created_at: -1 });
TestSessionSchema.index({ test_id: 1, status: 1 });
TestSessionSchema.index({ session_id: 1 });

// Virtuals
TestSchema.virtual('isPassed').get(function() {
  return this.score >= this.passing_score;
});

TestSessionSchema.virtual('isPassed').get(function() {
  return this.score >= 70; // Default passing score
});

TestSessionSchema.virtual('completionRate').get(function() {
  return Math.round((this.answers.length / this.total_questions) * 100);
});

TestSessionSchema.virtual('averageTimePerQuestion').get(function() {
  if (this.answers.length === 0) return 0;
  return Math.round(this.time_spent / this.answers.length);
});

// Instance methods
TestSchema.methods.addQuestion = function(questionData: Partial<TestQuestion>) {
  const question = {
    ...questionData,
    order: this.questions.length + 1
  } as TestQuestion;
  
  this.questions.push(question);
  this.total_questions = this.questions.length;
  return this.save();
};

TestSchema.methods.removeQuestion = function(questionId: string) {
  this.questions = this.questions.filter(q => q.question_id.toString() !== questionId);
  this.total_questions = this.questions.length;
  return this.save();
};

TestSessionSchema.methods.addAnswer = function(questionId: string, answer: any, timeSpent: number) {
  const question = this.test_id.questions.find(q => q.question_id.toString() === questionId);
  if (!question) return false;

  const isCorrect = this.checkAnswer(question, answer);
  const pointsEarned = isCorrect ? question.points : 0;

  this.answers.push({
    question_id,
    selected_answer: answer,
    is_correct: isCorrect,
    time_spent: timeSpent,
    points_earned: pointsEarned
  });

  this.correct_answers += isCorrect ? 1 : 0;
  this.time_spent += timeSpent;
  this.score = Math.round((this.correct_answers / this.total_questions) * 100);

  return this.save();
};

TestSessionSchema.methods.checkAnswer = function(question: TestQuestion, answer: any): boolean {
  switch (question.question_type) {
    case 'multiple_choice':
    case 'true_false':
      return answer === question.correct_answer;
    case 'fill_blank':
      return answer.toString().toLowerCase().trim() === question.correct_answer.toString().toLowerCase().trim();
    case 'coding':
      // For coding questions, this would be more complex
      return answer.toString().toLowerCase().includes(question.correct_answer.toString().toLowerCase());
    case 'essay':
      // For essay questions, this would require AI analysis
      return true; // Placeholder
    default:
      return false;
  }
};

TestSessionSchema.methods.completeSession = function() {
  this.status = 'completed';
  this.completed_at = new Date();
  return this.save();
};

// Static methods
TestSchema.statics.findByCategory = function(category: string) {
  return this.find({ category, is_active: true }).sort({ created_at: -1 });
};

TestSchema.statics.findByDifficulty = function(difficulty: string) {
  return this.find({ difficulty, is_active: true }).sort({ created_at: -1 });
};

TestSchema.statics.findPopular = function(limit: number = 10) {
  return this.aggregate([
    { $match: { is_active: true } },
    {
      $lookup: {
        from: 'testsessions',
        localField: '_id',
        foreignField: 'test_id',
        as: 'sessions'
      }
    },
    {
      $addFields: {
        attemptCount: { $size: '$sessions' }
      }
    },
    { $sort: { attemptCount: -1 } },
    { $limit: limit }
  ]);
};

TestSessionSchema.statics.findByUser = function(userId: string) {
  return this.find({ user_id: userId }).sort({ created_at: -1 });
};

TestSessionSchema.statics.getUserStats = function(userId: string) {
  return this.aggregate([
    { $match: { user_id: new mongoose.Types.ObjectId(userId), status: 'completed' } },
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
};

TestSessionSchema.statics.getLeaderboard = function(testId: string, limit: number = 10) {
  return this.aggregate([
    { $match: { test_id: new mongoose.Types.ObjectId(testId), status: 'completed' } },
    {
      $lookup: {
        from: 'users',
        localField: 'user_id',
        foreignField: '_id',
        as: 'user'
      }
    },
    {
      $addFields: {
        user_name: { $arrayElemAt: ['$user.profile.firstName', 0] },
        user_avatar: { $arrayElemAt: ['$user.profile.avatar', 0] }
      }
    },
    {
      $project: {
        user_name: 1,
        user_avatar: 1,
        score: 1,
        time_spent: 1,
        completed_at: 1
      }
    },
    { $sort: { score: -1, time_spent: 1 } },
    { $limit: limit }
  ]);
};

// Pre-save middleware
TestSchema.pre('save', function(next) {
  this.total_questions = this.questions.length;
  next();
});

TestSessionSchema.pre('save', function(next) {
  if (this.isModified('answers') && this.answers.length > 0) {
    this.correct_answers = this.answers.filter(a => a.is_correct).length;
    this.score = Math.round((this.correct_answers / this.total_questions) * 100);
  }
  next();
});

// Export models
export const Test = mongoose.model<ITest>('Test', TestSchema);
export const TestSession = mongoose.model<ITestSession>('TestSession', TestSessionSchema);
export default Test;
