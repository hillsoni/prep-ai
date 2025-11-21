import mongoose, { Schema, Document } from 'mongoose';

export interface IAchievement extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  description: string;
  icon: string;
  category: 'streak' | 'score' | 'completion' | 'social' | 'skill' | 'time';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  criteria: {
    type: 'interview_count' | 'score_threshold' | 'streak' | 'skill_mastery' | 'time_spent' | 'category_mastery';
    value: number;
    category?: string;
    skill?: string;
  };
  rewards: {
    xp: number;
    badge: string;
    unlocks?: string[];
    title?: string;
  };
  is_active: boolean;
  is_hidden: boolean;
  created_at: Date;
  updated_at: Date;
}

const CriteriaSchema = new Schema({
  type: {
    type: String,
    enum: ['interview_count', 'score_threshold', 'streak', 'skill_mastery', 'time_spent', 'category_mastery'],
    required: true
  },
  value: {
    type: Number,
    required: true,
    min: 1
  },
  category: {
    type: String,
    maxlength: 50
  },
  skill: {
    type: String,
    maxlength: 50
  }
}, { _id: false });

const RewardsSchema = new Schema({
  xp: {
    type: Number,
    required: true,
    min: 0
  },
  badge: {
    type: String,
    required: true,
    maxlength: 100
  },
  unlocks: [{
    type: String,
    maxlength: 100
  }],
  title: {
    type: String,
    maxlength: 50
  }
}, { _id: false });

const AchievementSchema = new Schema<IAchievement>({
  name: {
    type: String,
    required: true,
    maxlength: 100,
    trim: true,
    unique: true
  },
  description: {
    type: String,
    required: true,
    maxlength: 500,
    trim: true
  },
  icon: {
    type: String,
    required: true,
    maxlength: 100
  },
  category: {
    type: String,
    enum: ['streak', 'score', 'completion', 'social', 'skill', 'time'],
    required: true,
    index: true
  },
  rarity: {
    type: String,
    enum: ['common', 'rare', 'epic', 'legendary'],
    required: true,
    index: true
  },
  criteria: {
    type: CriteriaSchema,
    required: true
  },
  rewards: {
    type: RewardsSchema,
    required: true
  },
  is_active: {
    type: Boolean,
    default: true,
    index: true
  },
  is_hidden: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
AchievementSchema.index({ category: 1, rarity: 1 });
AchievementSchema.index({ 'criteria.type': 1 });
AchievementSchema.index({ is_active: 1, is_hidden: 1 });

// Virtuals
AchievementSchema.virtual('rarityColor').get(function() {
  const colors = {
    common: '#gray',
    rare: '#blue',
    epic: '#purple',
    legendary: '#gold'
  };
  return colors[this.rarity];
});

AchievementSchema.virtual('rarityWeight').get(function() {
  const weights = {
    common: 1,
    rare: 2,
    epic: 3,
    legendary: 4
  };
  return weights[this.rarity];
});

// Static methods
AchievementSchema.statics.findByCategory = function(category: string) {
  return this.find({ category, is_active: true }).sort({ rarity: 1, name: 1 });
};

AchievementSchema.statics.findByRarity = function(rarity: string) {
  return this.find({ rarity, is_active: true }).sort({ name: 1 });
};

AchievementSchema.statics.findVisible = function() {
  return this.find({ is_active: true, is_hidden: false }).sort({ category: 1, rarity: 1 });
};

AchievementSchema.statics.findByCriteriaType = function(criteriaType: string) {
  return this.find({ 
    'criteria.type': criteriaType, 
    is_active: true 
  }).sort({ 'criteria.value': 1 });
};

AchievementSchema.statics.getRarityDistribution = function() {
  return this.aggregate([
    {
      $match: { is_active: true }
    },
    {
      $group: {
        _id: '$rarity',
        count: { $sum: 1 },
        totalXp: { $sum: '$rewards.xp' }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);
};

// Instance methods
AchievementSchema.methods.checkEligibility = function(userStats: any, userProgress: any) {
  const { type, value, category, skill } = this.criteria;
  
  switch (type) {
    case 'interview_count':
      return userStats.interviews_completed >= value;
    
    case 'score_threshold':
      return userStats.average_score >= value;
    
    case 'streak':
      return userStats.current_streak >= value;
    
    case 'skill_mastery':
      if (!skill) return false;
      const skillProgress = userProgress.skills?.find((s: any) => s.skill === skill);
      return skillProgress?.currentLevel >= value;
    
    case 'time_spent':
      return userStats.total_study_time >= value;
    
    case 'category_mastery':
      if (!category) return false;
      const categoryProgress = userProgress.categories?.find((c: any) => c.category === category);
      return categoryProgress?.score >= value;
    
    default:
      return false;
  }
};

AchievementSchema.methods.getProgress = function(userStats: any, userProgress: any) {
  const { type, value, category, skill } = this.criteria;
  
  switch (type) {
    case 'interview_count':
      return Math.min(userStats.interviews_completed / value, 1);
    
    case 'score_threshold':
      return Math.min(userStats.average_score / value, 1);
    
    case 'streak':
      return Math.min(userStats.current_streak / value, 1);
    
    case 'skill_mastery':
      if (!skill) return 0;
      const skillProgress = userProgress.skills?.find((s: any) => s.skill === skill);
      return skillProgress ? Math.min(skillProgress.currentLevel / value, 1) : 0;
    
    case 'time_spent':
      return Math.min(userStats.total_study_time / value, 1);
    
    case 'category_mastery':
      if (!category) return 0;
      const categoryProgress = userProgress.categories?.find((c: any) => c.category === category);
      return categoryProgress ? Math.min(categoryProgress.score / value, 1) : 0;
    
    default:
      return 0;
  }
};

// Pre-save middleware
AchievementSchema.pre('save', function(next) {
  // Ensure unlocks array is unique
  if (this.rewards.unlocks) {
    this.rewards.unlocks = [...new Set(this.rewards.unlocks)];
  }
  
  next();
});

// Export the model
export const Achievement = mongoose.model<IAchievement>('Achievement', AchievementSchema);
export default Achievement;
