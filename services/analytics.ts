
import { Review, AppData, QuarterData, YearData } from '../types';

const getQuarter = (date: Date): number => {
  return Math.floor(date.getMonth() / 3) + 1;
};

const getPreviousPeriod = (year: number, quarter: number) => {
  if (quarter === 1) return { year: year - 1, quarter: 4 };
  return { year, quarter: quarter - 1 };
};

const calculateReviewsToImprove = (currentAvg: number, totalReviews: number): number => {
  if (currentAvg >= 5.0) return 0;
  
  const currentSum = currentAvg * totalReviews;
  const target = parseFloat((currentAvg + 0.1).toFixed(1));
  
  if (target > 5) return 0;

  const numerator = (target * totalReviews) - currentSum;
  const denominator = 5 - target;
  
  if (denominator <= 0) return 0;

  const needed = Math.ceil(numerator / denominator);
  return needed > 0 ? needed : 0;
};

export const processReviews = (
  reviews: Review[], 
  manualClientName: string = "Client Name",
  targetYear?: number,
  targetQuarter?: number
): AppData & { previousQuarterReviews: Review[] } => {
  if (reviews.length === 0) {
     throw new Error("No valid reviews found.");
  }

  const sorted = [...reviews].sort((a, b) => b.sourceDate.getTime() - a.sourceDate.getTime());
  const allTimeTotal = sorted.length;
  
  const latestDate = sorted[0].sourceDate;
  const yearToUse = targetYear || latestDate.getFullYear();
  const quarterToUse = targetQuarter || getQuarter(latestDate);

  // 1. Filter for YTD (The selected year)
  const ytdReviews = sorted.filter(r => r.sourceDate.getFullYear() === yearToUse);

  // 2. Filter for Target Quarter
  const quarterlyReviews = sorted.filter(r => 
    r.sourceDate.getFullYear() === yearToUse && getQuarter(r.sourceDate) === quarterToUse
  );

  // 3. Filter for Previous Quarter
  const prev = getPreviousPeriod(yearToUse, quarterToUse);
  const previousQuarterReviews = sorted.filter(r => 
    r.sourceDate.getFullYear() === prev.year && getQuarter(r.sourceDate) === prev.quarter
  );

  // 4. Basic Metrics
  const ytdTotal = ytdReviews.length;
  const ytdSum = ytdReviews.reduce((acc, r) => acc + r.rating, 0);
  const ytdAvg = ytdTotal > 0 ? parseFloat((ytdSum / ytdTotal).toFixed(2)) : 0;

  const qTotal = quarterlyReviews.length;
  const qSum = quarterlyReviews.reduce((acc, r) => acc + r.rating, 0);
  const qAvg = qTotal > 0 ? parseFloat((qSum / qTotal).toFixed(2)) : 0;

  // 5. Star Distribution
  const distMap = [0, 0, 0, 0, 0, 0];
  ytdReviews.forEach(r => {
    const star = Math.round(r.rating);
    if (star >= 1 && star <= 5) distMap[star]++;
  });
  
  const distribution = [
    { name: '1 Star', value: distMap[1] },
    { name: '2 Stars', value: distMap[2] },
    { name: '3 Stars', value: distMap[3] },
    { name: '4 Stars', value: distMap[4] },
    { name: '5 Stars', value: distMap[5] },
  ];

  // 6. Quarterly Trend (Q1-Q4 for selected year)
  const qStats: Record<number, { count: number; sum: number }> = {
    1: { count: 0, sum: 0 }, 2: { count: 0, sum: 0 }, 3: { count: 0, sum: 0 }, 4: { count: 0, sum: 0 },
  };
  ytdReviews.forEach(r => {
    const q = getQuarter(r.sourceDate);
    if (qStats[q]) { qStats[q].count++; qStats[q].sum += r.rating; }
  });

  const quarterlyTrend: QuarterData[] = [1, 2, 3, 4].map(q => ({
    id: `Q${q}`, label: `Q${q}`, year: yearToUse, quarter: q,
    reviewCount: qStats[q].count,
    averageRating: qStats[q].count > 0 ? parseFloat((qStats[q].sum / qStats[q].count).toFixed(2)) : 0
  }));

  // 7. Yearly Trend (Last 5 years)
  const yearlyStats: Record<number, { count: number; sum: number }> = {};
  sorted.forEach(r => {
    const yr = r.sourceDate.getFullYear();
    if (!yearlyStats[yr]) yearlyStats[yr] = { count: 0, sum: 0 };
    yearlyStats[yr].count++;
    yearlyStats[yr].sum += r.rating;
  });

  const yearsInRange = Object.keys(yearlyStats)
    .map(Number)
    .sort()
    .slice(-5); // Last 5 years available

  const yearlyTrend: YearData[] = yearsInRange.map(yr => ({
    year: yr,
    reviewCount: yearlyStats[yr].count,
    averageRating: parseFloat((yearlyStats[yr].sum / yearlyStats[yr].count).toFixed(2))
  }));

  const reviewsToImprove = calculateReviewsToImprove(ytdAvg, ytdTotal);

  const topReviews = [...quarterlyReviews]
    .filter(r => r.rating === 5 && r.text.length > 20)
    .sort((a, b) => b.text.length - a.text.length)
    .slice(0, 3);
  
  if (topReviews.length < 3) {
      const moreReviews = [...ytdReviews]
        .filter(r => r.rating === 5 && r.text.length > 20 && !topReviews.includes(r))
        .sort((a, b) => b.text.length - a.text.length)
        .slice(0, 3 - topReviews.length);
      topReviews.push(...moreReviews);
  }

  return {
    clientName: manualClientName,
    year: yearToUse,
    quarter: quarterToUse,
    reviews: ytdReviews,
    quarterlyReviews: quarterlyReviews,
    previousQuarterReviews,
    metrics: {
      allTimeTotal,
      ytdTotal,
      ytdAvg,
      currentQuarterTotal: qTotal,
      currentQuarterAvg: qAvg,
      distribution,
      quarterlyTrend,
      yearlyTrend,
      reviewsToImprove
    },
    topReviews,
    analysis: null
  };
};
