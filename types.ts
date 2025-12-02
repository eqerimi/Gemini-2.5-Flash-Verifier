export enum TestStatus {
  IDLE = 'IDLE',
  RUNNING = 'RUNNING',
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE'
}

export enum LogLevel {
  INFO = 'INFO',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
  WARN = 'WARN'
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  message: string;
  level: LogLevel;
  details?: string;
}

export interface TestResult {
  latencyMs: number;
  model: string;
  responsePreview: string;
  success: boolean;
  error?: string;
}

export interface DiagnosticStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  duration?: number;
}