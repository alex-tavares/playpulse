import type {
  AnalyticsCharacterPopularityResponse,
  AnalyticsSessionsDailyResponse,
} from '@playpulse/schemas';

export const shouldRenderSuppressedTimeseriesEmptyState = (
  points: AnalyticsSessionsDailyResponse['data']['points']
) => {
  if (points.length === 0) {
    return true;
  }

  const suppressedCount = points.filter((point) => point.suppressed).length;
  return suppressedCount > points.length / 2;
};

export const shouldRenderPopularityEmptyState = (
  characters: AnalyticsCharacterPopularityResponse['data']['characters']
) => characters.length === 0 || characters.every((character) => character.suppressed);
