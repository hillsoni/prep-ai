import { Document, ObjectId } from 'mongoose';
import { Difficulty, Category } from './common.types';

// Interview interfaces
export interface IInterview extends Document {
  _id: ObjectId;
  user_id: ObjectId;
  session_id: string;
  category: Category;
  difficulty: Difficulty;
  questions: InterviewQuestion[];
  overall_feedback: InterviewFeedback;
  metadata: InterviewMetadata;
  status: 'in_progress' | 'completed' | 'abandoned' | 'paused';
  created_at: Date;
  updated_at: Date;
  completed_at?: Date;
}

export interface InterviewQuestion {
  question_id: ObjectId;
  question_text: string;
  question_type: 'behavioral' | 'technical' | 'situational' | 'system_design';
  expected_keywords: string[];
  difficulty_weight: number;
  time_allocated: number; // in seconds
  time_taken: number; // in seconds
  user_answer: string;
  ai_score: number;
  feedback: QuestionFeedback;
  order: number;
}

export interface QuestionFeedback {
  strengths: string[];
  improvements: string[];
  suggestions: string[];
  keyword_matches: number;
  keyword_missed: string[];
  clarity_score: number;
  completeness_score: number;
  relevance_score: number;
}

export interface InterviewFeedback {
  total_score: number;
  category_scores: {
    communication: number;
    technical_knowledge: number;
    confidence: number;
    clarity: number;
    problem_solving: number;
    time_management: number;
  };
  strengths: string[];
  areas_for_improvement: string[];
  recommendations: string[];
  next_steps: string[];
  overall_rating: 'excellent' | 'good' | 'average' | 'needs_improvement';
  detailed_analysis: string;
}

export interface InterviewMetadata {
  duration: number; // total duration in seconds
  paused_times: number;
  completion_rate: number; // percentage
  started_at: Date;
  completed_at?: Date;
  device_info: {
    platform: string;
    browser: string;
    screen_resolution: string;
  };
  session_data: {
    total_questions: number;
    answered_questions: number;
    skipped_questions: number;
    average_time_per_question: number;
  };
}

// Interview session interfaces
export interface InterviewSession {
  session_id: string;
  user_id: string;
  interview_type: string;
  status: 'active' | 'paused' | 'completed' | 'abandoned';
  current_question: number;
  total_questions: number;
  time_remaining: number;
  started_at: Date;
  last_activity: Date;
}

export interface InterviewProgress {
  session_id: string;
  question_number: number;
  time_remaining: number;
  current_score: number;
  progress_percentage: number;
  status: 'in_progress' | 'paused' | 'completed';
}

// Question bank interfaces
export interface IQuestionBank extends Document {
  _id: ObjectId;
  question_text: string;
  question_type: 'behavioral' | 'technical' | 'situational' | 'system_design';
  category: Category;
  difficulty: Difficulty;
  expected_keywords: string[];
  sample_answer: string;
  time_limit: number; // in seconds
  tags: string[];
  is_active: boolean;
  usage_count: number;
  success_rate: number;
  created_by: ObjectId;
  created_at: Date;
  updated_at: Date;
}

// Interview templates
export interface InterviewTemplate {
  id: string;
  name: string;
  description: string;
  category: Category;
  difficulty: Difficulty;
  duration: number; // in minutes
  question_count: number;
  questions: TemplateQuestion[];
  prerequisites: string[];
  skills_tested: string[];
  target_audience: string[];
}

export interface TemplateQuestion {
  question_id: string;
  question_text: string;
  question_type: string;
  time_limit: number;
  difficulty: Difficulty;
  keywords: string[];
  order: number;
}

// AI Integration interfaces
export interface AIAnalysisRequest {
  question: string;
  user_answer: string;
  expected_keywords: string[];
  question_type: string;
  difficulty: Difficulty;
  context?: string;
}

export interface AIAnalysisResponse {
  score: number;
  feedback: QuestionFeedback;
  suggestions: string[];
  keyword_analysis: {
    matched: string[];
    missed: string[];
    score: number;
  };
  confidence_level: number;
  processing_time: number;
}

// Interview analytics interfaces
export interface InterviewAnalytics {
  user_id: string;
  total_interviews: number;
  average_score: number;
  improvement_rate: number;
  category_performance: CategoryPerformance[];
  skill_progress: SkillProgress[];
  time_analysis: TimeAnalysis;
  recommendations: string[];
}

export interface CategoryPerformance {
  category: Category;
  average_score: number;
  total_attempts: number;
  improvement_trend: number;
  strengths: string[];
  weaknesses: string[];
}

export interface SkillProgress {
  skill: string;
  current_level: number;
  target_level: number;
  progress_percentage: number;
  last_updated: Date;
  trend: 'improving' | 'stable' | 'declining';
}

export interface TimeAnalysis {
  average_time_per_question: number;
  time_management_score: number;
  rushed_questions: number;
  over_thinking_questions: number;
  optimal_pacing: number;
}

// Real-time interfaces
export interface InterviewEvent {
  type: 'question_started' | 'question_answered' | 'interview_paused' | 'interview_resumed' | 'interview_completed';
  session_id: string;
  user_id: string;
  data: any;
  timestamp: Date;
}

export interface LiveFeedback {
  session_id: string;
  question_id: string;
  real_time_score: number;
  suggestions: string[];
  time_warning: boolean;
  keyword_hints: string[];
}

// API Request/Response interfaces
export interface StartInterviewRequest {
  category: Category;
  difficulty: Difficulty;
  question_count?: number;
  time_limit?: number;
  focus_areas?: string[];
}

export interface StartInterviewResponse {
  session_id: string;
  interview: IInterview;
  first_question: InterviewQuestion;
  time_remaining: number;
}

export interface SubmitAnswerRequest {
  session_id: string;
  question_id: string;
  answer: string;
  time_taken: number;
}

export interface SubmitAnswerResponse {
  feedback: QuestionFeedback;
  next_question?: InterviewQuestion;
  is_complete: boolean;
  current_score: number;
}

export interface CompleteInterviewRequest {
  session_id: string;
  reason?: 'completed' | 'abandoned' | 'timeout';
}

export interface CompleteInterviewResponse {
  interview: IInterview;
  overall_feedback: InterviewFeedback;
  analytics: InterviewAnalytics;
  recommendations: string[];
}

// Search and filter interfaces
export interface InterviewFilters {
  category?: Category;
  difficulty?: Difficulty;
  status?: string;
  date_from?: Date;
  date_to?: Date;
  min_score?: number;
  max_score?: number;
}

export interface InterviewSearchParams {
  query?: string;
  filters?: InterviewFilters;
  sort?: 'date' | 'score' | 'duration';
  order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// Export interfaces
export interface InterviewExport {
  interview_id: string;
  user_info: {
    name: string;
    email: string;
  };
  interview_details: {
    category: Category;
    difficulty: Difficulty;
    duration: number;
    total_score: number;
    completed_at: Date;
  };
  questions_and_answers: Array<{
    question: string;
    answer: string;
    score: number;
    feedback: QuestionFeedback;
  }>;
  overall_feedback: InterviewFeedback;
  analytics: InterviewAnalytics;
}
