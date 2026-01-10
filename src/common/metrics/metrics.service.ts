import { Injectable, OnModuleInit } from '@nestjs/common';


interface MetricPoint {
  timestamp: number;
  value: number;
}

interface CounterMetric {
  name: string;
  description: string;
  value: number;
  labels?: Record<string, string>;
}

interface HistogramMetric {
  name: string;
  description: string;
  buckets: number[];
  values: MetricPoint[];
}

@Injectable()
export class MetricsService {
  private metrics = {
    totalRequests: 0,
    failedRequests: 0,
    authFailures: 0,
  };

  incTotal() {
    this.metrics.totalRequests++;
  }

  incFailed() {
    this.metrics.failedRequests++;
  }

  incAuthFail() {
    this.metrics.authFailures++;
  }

  snapshot() {
    return this.metrics;
  }

  
}
