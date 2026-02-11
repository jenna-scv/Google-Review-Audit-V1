
export interface Review {
  date: string;
  reviewer: string;
  rating: number;
  text: string;
  sourceDate: Date; // Parsed date object
}

export interface QuarterData {
  id: string; // e.g., "Q1 2024"
  label: string;
  year: number;
  quarter: number; // 1-4
  reviewCount: number;
  averageRating: number;
}

export interface YearData {
  year: number;
  reviewCount: number;
  averageRating: number;
}

export interface AnalysisResult {
  trends: string[];
  opportunities: string[];
  wins: string[];
  executiveSummary: string[];
  seoImpact: string; 
  quotes: {
    category: string;
    text: string;
    author: string;
  }[];
  emailContent: {
    feedbackHighlights: string; // Gentle summary of feedback
    opportunities: string; // Optimistic forward looking statement
  };
}

export interface AppData {
  clientName: string;
  year: number;
  quarter: number; // 1-4
  reviews: Review[]; // All YTD reviews
  quarterlyReviews: Review[]; // Just the target quarter
  metrics: {
    allTimeTotal: number;
    ytdTotal: number;
    ytdAvg: number;
    currentQuarterTotal: number;
    currentQuarterAvg: number;
    distribution: { name: string; value: number }[];
    quarterlyTrend: QuarterData[];
    yearlyTrend: YearData[]; // Added for long-term context
    reviewsToImprove: number;
  };
  topReviews: Review[]; 
  analysis: AnalysisResult | null;
}

export interface ManualOverrides {
  clientName: string;
  quarter: string;
  year: string;
  reviewsToImproveOverride?: number;
}
