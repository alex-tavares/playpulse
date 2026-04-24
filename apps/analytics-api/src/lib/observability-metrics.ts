import { PrometheusRegistry } from './prometheus-registry';

export interface AnalyticsRequestMetric {
  durationMs: number;
  endpoint: string;
  statusCode: number;
}

export interface AnalyticsMetrics {
  recordRequest(metric: AnalyticsRequestMetric): void;
  render(): string;
}

const statusClass = (statusCode: number) => `${Math.floor(statusCode / 100)}xx`;

export const createAnalyticsObservabilityMetrics = (): AnalyticsMetrics => {
  const registry = new PrometheusRegistry();

  return {
    recordRequest: (metric) => {
      const labels = {
        endpoint: metric.endpoint,
        status_class: statusClass(metric.statusCode),
      };

      registry.incrementCounter(
        'analytics_requests_total',
        'Analytics API HTTP requests by endpoint and status class.',
        ['endpoint', 'status_class'],
        labels
      );
      registry.observeHistogram(
        'analytics_request_duration_seconds',
        'Analytics API HTTP request duration in seconds.',
        ['endpoint'],
        { endpoint: metric.endpoint },
        metric.durationMs / 1000
      );
    },
    render: () => registry.render(),
  };
};
