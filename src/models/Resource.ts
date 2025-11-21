import mongoose, { Schema, Document } from 'mongoose';

export interface IResource extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  description: string;
  content: string;
  type: 'article' | 'video' | 'tutorial' | 'cheatsheet' | 'book' | 'course' | 'tool';
  category: string;
  subcategory?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  url?: string;
  thumbnail_url?: string;
  duration?: number; // in minutes
  author: string;
  source: string;
  is_featured: boolean;
  is_premium: boolean;
  view_count: number;
  bookmark_count: number;
  rating: number;
  rating_count: number;
  created_by: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

export interface IBookmark extends Document {
  _id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  resource_id: mongoose.Types.ObjectId;
  folder?: string;
  notes?: string;
  created_at: Date;
}

export interface IResourceRating extends Document {
  _id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  resource_id: mongoose.Types.ObjectId;
  rating: number; // 1-5
  review?: string;
  created_at: Date;
  updated_at: Date;
}

// Resource Schema
const ResourceSchema = new Schema<IResource>({
  title: {
    type: String,
    required: true,
    maxlength: 200,
    trim: true,
    index: true
  },
  description: {
    type: String,
    required: true,
    maxlength: 1000,
    trim: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 50000
  },
  type: {
    type: String,
    enum: ['article', 'video', 'tutorial', 'cheatsheet', 'book', 'course', 'tool'],
    required: true,
    index: true
  },
  category: {
    type: String,
    required: true,
    maxlength: 100,
    index: true
  },
  subcategory: {
    type: String,
    maxlength: 100,
    index: true
  },
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    required: true,
    index: true
  },
  tags: [{
    type: String,
    maxlength: 50,
    trim: true
  }],
  url: {
    type: String,
    maxlength: 500,
    validate: {
      validator: function(v: string) {
        return !v || /^https?:\/\/.+/.test(v);
      },
      message: 'URL must be a valid HTTP/HTTPS URL'
    }
  },
  thumbnail_url: {
    type: String,
    maxlength: 500,
    validate: {
      validator: function(v: string) {
        return !v || /^https?:\/\/.+/.test(v);
      },
      message: 'Thumbnail URL must be a valid HTTP/HTTPS URL'
    }
  },
  duration: {
    type: Number,
    min: 1,
    max: 10080 // 1 week in minutes
  },
  author: {
    type: String,
    required: true,
    maxlength: 200,
    trim: true
  },
  source: {
    type: String,
    required: true,
    maxlength: 200,
    trim: true
  },
  is_featured: {
    type: Boolean,
    default: false,
    index: true
  },
  is_premium: {
    type: Boolean,
    default: false,
    index: true
  },
  view_count: {
    type: Number,
    default: 0,
    min: 0
  },
  bookmark_count: {
    type: Number,
    default: 0,
    min: 0
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  rating_count: {
    type: Number,
    default: 0,
    min: 0
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

// Bookmark Schema
const BookmarkSchema = new Schema<IBookmark>({
  user_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  resource_id: {
    type: Schema.Types.ObjectId,
    ref: 'Resource',
    required: true,
    index: true
  },
  folder: {
    type: String,
    maxlength: 100,
    trim: true,
    default: 'General'
  },
  notes: {
    type: String,
    maxlength: 1000,
    trim: true
  }
}, {
  timestamps: { createdAt: true, updatedAt: false },
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Resource Rating Schema
const ResourceRatingSchema = new Schema<IResourceRating>({
  user_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  resource_id: {
    type: Schema.Types.ObjectId,
    ref: 'Resource',
    required: true,
    index: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  review: {
    type: String,
    maxlength: 1000,
    trim: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
ResourceSchema.index({ category: 1, difficulty: 1 });
ResourceSchema.index({ type: 1, category: 1 });
ResourceSchema.index({ is_featured: 1, created_at: -1 });
ResourceSchema.index({ is_premium: 1, created_at: -1 });
ResourceSchema.index({ view_count: -1 });
ResourceSchema.index({ rating: -1, rating_count: -1 });
ResourceSchema.index({ tags: 1 });

BookmarkSchema.index({ user_id: 1, resource_id: 1 }, { unique: true });
BookmarkSchema.index({ user_id: 1, folder: 1 });

ResourceRatingSchema.index({ user_id: 1, resource_id: 1 }, { unique: true });
ResourceRatingSchema.index({ resource_id: 1, rating: -1 });

// Virtuals
ResourceSchema.virtual('isPopular').get(function() {
  return this.view_count > 100 || this.bookmark_count > 50;
});

ResourceSchema.virtual('isHighlyRated').get(function() {
  return this.rating >= 4.0 && this.rating_count >= 10;
});

BookmarkSchema.virtual('resource', {
  ref: 'Resource',
  localField: 'resource_id',
  foreignField: '_id',
  justOne: true
});

// Instance methods
ResourceSchema.methods.incrementViewCount = function() {
  this.view_count += 1;
  return this.save();
};

ResourceSchema.methods.updateRating = function(newRating: number) {
  const totalRating = (this.rating * this.rating_count) + newRating;
  this.rating_count += 1;
  this.rating = totalRating / this.rating_count;
  return this.save();
};

ResourceSchema.methods.addBookmark = function() {
  this.bookmark_count += 1;
  return this.save();
};

ResourceSchema.methods.removeBookmark = function() {
  this.bookmark_count = Math.max(0, this.bookmark_count - 1);
  return this.save();
};

// Static methods
ResourceSchema.statics.findByCategory = function(category: string, limit: number = 10) {
  return this.find({ category, is_featured: true })
    .sort({ created_at: -1 })
    .limit(limit);
};

ResourceSchema.statics.findByDifficulty = function(difficulty: string, limit: number = 10) {
  return this.find({ difficulty, is_featured: true })
    .sort({ created_at: -1 })
    .limit(limit);
};

ResourceSchema.statics.findByType = function(type: string, limit: number = 10) {
  return this.find({ type, is_featured: true })
    .sort({ created_at: -1 })
    .limit(limit);
};

ResourceSchema.statics.searchResources = function(query: string, filters: any = {}) {
  const searchQuery: any = {
    $or: [
      { title: { $regex: query, $options: 'i' } },
      { description: { $regex: query, $options: 'i' } },
      { content: { $regex: query, $options: 'i' } },
      { tags: { $in: [new RegExp(query, 'i')] } }
    ]
  };

  // Apply filters
  if (filters.category) searchQuery.category = filters.category;
  if (filters.difficulty) searchQuery.difficulty = filters.difficulty;
  if (filters.type) searchQuery.type = filters.type;
  if (filters.is_premium !== undefined) searchQuery.is_premium = filters.is_premium;

  return this.find(searchQuery)
    .sort({ rating: -1, view_count: -1 })
    .limit(filters.limit || 20);
};

ResourceSchema.statics.getPopularResources = function(limit: number = 10) {
  return this.find({ is_featured: true })
    .sort({ view_count: -1, rating: -1 })
    .limit(limit);
};

ResourceSchema.statics.getFeaturedResources = function(limit: number = 10) {
  return this.find({ is_featured: true })
    .sort({ created_at: -1 })
    .limit(limit);
};

ResourceSchema.statics.getResourcesByTag = function(tag: string, limit: number = 10) {
  return this.find({ tags: { $in: [new RegExp(tag, 'i')] } })
    .sort({ rating: -1, view_count: -1 })
    .limit(limit);
};

BookmarkSchema.statics.findByUser = function(userId: string, folder?: string) {
  const query: any = { user_id: userId };
  if (folder) query.folder = folder;
  
  return this.find(query)
    .populate('resource_id')
    .sort({ created_at: -1 });
};

BookmarkSchema.statics.getUserFolders = function(userId: string) {
  return this.distinct('folder', { user_id: userId });
};

ResourceRatingSchema.statics.getResourceRatings = function(resourceId: string) {
  return this.find({ resource_id: resourceId })
    .populate('user_id', 'profile.firstName profile.lastName profile.avatar')
    .sort({ created_at: -1 });
};

ResourceRatingSchema.statics.getUserRatings = function(userId: string) {
  return this.find({ user_id: userId })
    .populate('resource_id', 'title type category')
    .sort({ created_at: -1 });
};

// Pre-save middleware
ResourceSchema.pre('save', function(next) {
  // Ensure rating is calculated correctly
  if (this.rating_count > 0) {
    this.rating = Math.round((this.rating * 100) / this.rating_count) / 100;
  }
  next();
});

// Export models
export const Resource = mongoose.model<IResource>('Resource', ResourceSchema);
export const Bookmark = mongoose.model<IBookmark>('Bookmark', BookmarkSchema);
export const ResourceRating = mongoose.model<IResourceRating>('ResourceRating', ResourceRatingSchema);
export default Resource;
