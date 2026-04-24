import { PrometheusRegistry } from './prometheus-registry';

export interface IngestRequestMetric {
  durationMs: number;
  errorCode: string | null;
  route: string;
  statusCode: number;
}

export interface IngestMetrics {
  recordEventsWritten(count: number): void;
  recordRequest(metric: IngestRequestMetric): void;
  render(): string;
}

const statusClass = (statusCode: number) => `${Math.floor(statusCode / 100)}xx`;

const requestOutcome = (metric: IngestRequestMetric) => {
  if (metric.errorCode) {
    return metric.errorCode;
  }

  return metric.route === '/events' && metric.statusCode === 202 ? 'accepted' : 'ok';
};

export const createIngestMetrics = (): IngestMetrics => {
  const registry = new PrometheusRegistry();

  return {
    recordEventsWritten: (count) => {
      registry.incrementCounter(
        'ingest_events_written_total',
        'Accepted events written to the raw event store.',
        ['source'],
        { source: 'godot_sdk' },
        count
      );
    },
    recordRequest: (metric) => {
      const labels = {
        outcome: requestOutcome(metric),
        status_class: statusClass(metric.statusCode),
      };

      registry.incrementCounter(
        'ingest_requests_total',
        'Ingest HTTP requests by status class and outcome.',
        ['status_class', 'outcome'],
        labels
      );
      registry.observeHistogram(
        'ingest_request_duration_seconds',
        'Ingest HTTP request duration in seconds.',
        ['route', 'status_class'],
        {
          route: metric.route,
          status_class: statusClass(metric.statusCode),
        },
        metric.durationMs / 1000
      );

      if (metric.errorCode === 'rate_limited_ip' || metric.errorCode === 'rate_limited_key') {
        registry.incrementCounter(
          'ingest_rate_limit_hits_total',
          'Ingest rate-limit decisions by limit type.',
          ['limit_type'],
          { limit_type: metric.errorCode === 'rate_limited_ip' ? 'ip' : 'key' }
        );
      }

      if (
        metric.errorCode === 'signature_invalid' ||
        metric.errorCode === 'timestamp_out_of_window' ||
        metric.errorCode === 'replay_detected'
      ) {
        registry.incrementCounter(
          'ingest_signature_failures_total',
          'Ingest signature and replay protection failures by reason.',
          ['reason'],
          { reason: metric.errorCode }
        );
      }
    },
    render: () => registry.render(),
  };
};
