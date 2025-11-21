import mongoose, { Schema, Document } from 'mongoose';
import { IQuestionBank } from '../types/interview.types';
import { Category, CATEGORY_VALUES, Difficulty, DIFFICULTY_VALUES } from '../types/common.types';

const QuestionBankSchema = new Schema<IQuestionBank>({
  question_text: {
    type: String,
    required: true,
    maxlength: 1000,
    trim: true
  },
  question_type: {
    type: String,
    enum: ['behavioral', 'technical', 'situational', 'system_design'],
    required: true,
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
  expected_keywords: [{
    type: String,
    maxlength: 50,
    trim: true
  }],
  sample_answer: {
    type: String,
    maxlength: 2000,
    trim: true
  },
  time_limit: {
    type: Number,
    min: 30,
    max: 1800, // 30 seconds to 30 minutes
    default: 120
  },
  tags: [{
    type: String,
    maxlength: 30,
    trim: true
  }],
  is_active: {
    type: Boolean,
    default: true,
    index: true
  },
  usage_count: {
    type: Number,
    default: 0,
    min: 0
  },
  success_rate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  created_by: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
QuestionBankSchema.index({ category: 1, difficulty: 1 });
QuestionBankSchema.index({ question_type: 1, is_active: 1 });
QuestionBankSchema.index({ tags: 1 });
QuestionBankSchema.index({ created_by: 1 });
QuestionBankSchema.index({ usage_count: -1 });
QuestionBankSchema.index({ success_rate: -1 });

// Text search index
QuestionBankSchema.index({
  question_text: 'text',
  sample_answer: 'text',
  tags: 'text'
});

// Virtuals
QuestionBankSchema.virtual('isPopular').get(function() {
  return this.usage_count > 100;
});

QuestionBankSchema.virtual('isHighQuality').get(function() {
  return this.success_rate > 80;
});

// Instance methods
QuestionBankSchema.methods.incrementUsage = function() {
  this.usage_count += 1;
  return this.save();
};

QuestionBankSchema.methods.updateSuccessRate = function(newSuccessRate: number) {
  // Calculate weighted average
  const totalUses = this.usage_count;
  const currentRate = this.success_rate;
  
  this.success_rate = ((currentRate * (totalUses - 1)) + newSuccessRate) / totalUses;
  return this.save();
};

QuestionBankSchema.methods.addTag = function(tag: string) {
  if (!this.tags.includes(tag)) {
    this.tags.push(tag);
    return this.save();
  }
  return Promise.resolve(this);
};

QuestionBankSchema.methods.removeTag = function(tag: string) {
  this.tags = this.tags.filter(t => t !== tag);
  return this.save();
};

// Static methods
QuestionBankSchema.statics.findByCategory = function(category: string) {
  return this.find({ category, is_active: true }).sort({ usage_count: -1 });
};

QuestionBankSchema.statics.findByDifficulty = function(difficulty: string) {
  return this.find({ difficulty, is_active: true }).sort({ success_rate: -1 });
};

QuestionBankSchema.statics.findByType = function(questionType: string) {
  return this.find({ question_type: questionType, is_active: true }).sort({ usage_count: -1 });
};

QuestionBankSchema.statics.findPopular = function(limit: number = 10) {
  return this.find({ is_active: true })
    .sort({ usage_count: -1 })
    .limit(limit);
};

QuestionBankSchema.statics.findHighQuality = function(limit: number = 10) {
  return this.find({ 
    is_active: true, 
    success_rate: { $gte: 80 },
    usage_count: { $gte: 5 }
  })
  .sort({ success_rate: -1 })
  .limit(limit);
};

QuestionBankSchema.statics.searchQuestions = function(query: string, filters: any = {}) {
  const searchQuery: any = {
    is_active: true,
    $text: { $search: query }
  };

  if (filters.category) {
    searchQuery.category = filters.category;
  }

  if (filters.difficulty) {
    searchQuery.difficulty = filters.difficulty;
  }

  if (filters.question_type) {
    searchQuery.question_type = filters.question_type;
  }

  if (filters.tags && filters.tags.length > 0) {
    searchQuery.tags = { $in: filters.tags };
  }

  return this.find(searchQuery, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } });
};

QuestionBankSchema.statics.getRandomQuestions = function(
  category: string,
  difficulty: string,
  count: number = 5
) {
  return this.aggregate([
    {
      $match: {
        category,
        difficulty,
        is_active: true
      }
    },
    { $sample: { size: count } }
  ]);
};

QuestionBankSchema.statics.getQuestionStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        totalQuestions: { $sum: 1 },
        activeQuestions: {
          $sum: { $cond: ['$is_active', 1, 0] }
        },
        averageUsage: { $avg: '$usage_count' },
        averageSuccessRate: { $avg: '$success_rate' },
        categoryStats: {
          $push: {
            category: '$category',
            difficulty: '$difficulty',
            usage_count: '$usage_count',
            success_rate: '$success_rate'
          }
        }
      }
    }
  ]);
};

// Pre-save middleware
QuestionBankSchema.pre('save', function(next) {
  // Ensure tags are unique
  this.tags = [...new Set(this.tags)];
  
  // Ensure expected_keywords are unique
  this.expected_keywords = [...new Set(this.expected_keywords)];
  
  next();
});

// Export the model
export const QuestionBank = mongoose.model<IQuestionBank>('QuestionBank', QuestionBankSchema);
export default QuestionBank;
