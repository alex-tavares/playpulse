type Labels = Record<string, string>;

interface CounterMetric {
  help: string;
  labelNames: string[];
  values: Map<string, { labels: Labels; value: number }>;
}

interface HistogramValue {
  bucketCounts: number[];
  count: number;
  labels: Labels;
  sum: number;
}

interface HistogramMetric {
  buckets: number[];
  help: string;
  labelNames: string[];
  values: Map<string, HistogramValue>;
}

const escapeLabelValue = (value: string) =>
  value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/"/g, '\\"');

const labelsKey = (labelNames: string[], labels: Labels) =>
  labelNames.map((name) => `${name}:${labels[name] ?? ''}`).join('|');

const orderedLabels = (labelNames: string[], labels: Labels): Labels =>
  Object.fromEntries(labelNames.map((name) => [name, labels[name] ?? '']));

const formatLabels = (labels: Labels) => {
  const entries = Object.entries(labels);

  if (entries.length === 0) {
    return '';
  }

  return `{${entries
    .map(([name, value]) => `${name}="${escapeLabelValue(value)}"`)
    .join(',')}}`;
};

export class PrometheusRegistry {
  private readonly counters = new Map<string, CounterMetric>();
  private readonly histograms = new Map<string, HistogramMetric>();

  incrementCounter(name: string, help: string, labelNames: string[], labels: Labels, value = 1) {
    const metric = this.counters.get(name) ?? {
      help,
      labelNames,
      values: new Map<string, { labels: Labels; value: number }>(),
    };
    const normalizedLabels = orderedLabels(labelNames, labels);
    const key = labelsKey(labelNames, normalizedLabels);
    const current = metric.values.get(key) ?? { labels: normalizedLabels, value: 0 };

    current.value += value;
    metric.values.set(key, current);
    this.counters.set(name, metric);
  }

  observeHistogram(
    name: string,
    help: string,
    labelNames: string[],
    labels: Labels,
    value: number,
    buckets = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
  ) {
    const metric = this.histograms.get(name) ?? {
      buckets,
      help,
      labelNames,
      values: new Map<string, HistogramValue>(),
    };
    const normalizedLabels = orderedLabels(labelNames, labels);
    const key = labelsKey(labelNames, normalizedLabels);
    const current =
      metric.values.get(key) ??
      {
        bucketCounts: buckets.map(() => 0),
        count: 0,
        labels: normalizedLabels,
        sum: 0,
      };

    for (let index = 0; index < buckets.length; index += 1) {
      if (value <= buckets[index]) {
        current.bucketCounts[index] += 1;
      }
    }

    current.count += 1;
    current.sum += value;
    metric.values.set(key, current);
    this.histograms.set(name, metric);
  }

  render() {
    const lines: string[] = [];

    for (const [name, metric] of this.counters) {
      lines.push(`# HELP ${name} ${metric.help}`, `# TYPE ${name} counter`);
      for (const { labels, value } of metric.values.values()) {
        lines.push(`${name}${formatLabels(labels)} ${value}`);
      }
    }

    for (const [name, metric] of this.histograms) {
      lines.push(`# HELP ${name} ${metric.help}`, `# TYPE ${name} histogram`);
      for (const value of metric.values.values()) {
        for (let index = 0; index < metric.buckets.length; index += 1) {
          lines.push(
            `${name}_bucket${formatLabels({
              ...value.labels,
              le: String(metric.buckets[index]),
            })} ${value.bucketCounts[index]}`
          );
        }
        lines.push(
          `${name}_bucket${formatLabels({ ...value.labels, le: '+Inf' })} ${value.count}`,
          `${name}_sum${formatLabels(value.labels)} ${value.sum}`,
          `${name}_count${formatLabels(value.labels)} ${value.count}`
        );
      }
    }

    return `${lines.join('\n')}\n`;
  }
}
