import React from 'react';
import { CheckCircle2, XCircle, Clock, Activity, Terminal, ShieldCheck, AlertTriangle } from 'lucide-react';
import { LogEntry, LogLevel, DiagnosticStep } from '../types';

export const StatusIndicator: React.FC<{ status: 'pending' | 'running' | 'completed' | 'failed' }> = ({ status }) => {
  switch (status) {
    case 'running':
      return <Activity className="w-5 h-5 text-blue-400 animate-pulse-fast" />;
    case 'completed':
      return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
    case 'failed':
      return <XCircle className="w-5 h-5 text-red-400" />;
    default:
      return <div className="w-5 h-5 rounded-full border-2 border-slate-700" />;
  }
};

export const LogViewer: React.FC<{ logs: LogEntry[] }> = ({ logs }) => {
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="flex flex-col h-full bg-[#0d1117] rounded-lg border border-slate-800 overflow-hidden font-mono text-sm shadow-inner">
      <div className="flex items-center px-4 py-2 bg-slate-900 border-b border-slate-800">
        <Terminal className="w-4 h-4 text-slate-400 mr-2" />
        <span className="text-slate-400 text-xs uppercase tracking-wider">System Output</span>
      </div>
      <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-2">
        {logs.length === 0 && (
          <div className="text-slate-600 italic">Ready to initialize diagnostics...</div>
        )}
        {logs.map((log) => (
          <div key={log.id} className="flex items-start group">
            <span className="text-slate-600 mr-3 text-xs shrink-0 select-none">
              {`${log.timestamp.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}.${log.timestamp.getMilliseconds().toString().padStart(3, '0')}`}
            </span>
            <div className="break-all">
              <span className={`
                ${log.level === LogLevel.INFO ? 'text-blue-300' : ''}
                ${log.level === LogLevel.SUCCESS ? 'text-emerald-300' : ''}
                ${log.level === LogLevel.WARN ? 'text-amber-300' : ''}
                ${log.level === LogLevel.ERROR ? 'text-red-400 font-bold' : ''}
              `}>
                {log.level === LogLevel.INFO && 'ℹ '}
                {log.level === LogLevel.SUCCESS && '✔ '}
                {log.level === LogLevel.WARN && '⚠ '}
                {log.level === LogLevel.ERROR && '✖ '}
                {log.message}
              </span>
              {log.details && (
                <div className="mt-1 ml-4 text-slate-500 text-xs whitespace-pre-wrap border-l-2 border-slate-800 pl-2">
                  {log.details}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const MetricCard: React.FC<{ label: string; value: string | number; icon: React.ReactNode; subValue?: string }> = ({ label, value, icon, subValue }) => (
  <div className="glass-panel p-4 rounded-xl flex items-center space-x-4 hover:bg-slate-800/50 transition-colors">
    <div className="p-3 bg-slate-800 rounded-lg text-blue-400">
      {icon}
    </div>
    <div>
      <div className="text-slate-400 text-xs uppercase tracking-wider font-semibold">{label}</div>
      <div className="text-white text-xl font-mono font-medium">{value}</div>
      {subValue && <div className="text-slate-500 text-xs mt-1">{subValue}</div>}
    </div>
  </div>
);

interface StepItemProps {
  step: DiagnosticStep;
}

export const StepItem: React.FC<StepItemProps> = ({ step }) => (
  <div className={`flex items-center justify-between p-3 rounded-lg border ${
    step.status === 'running' ? 'bg-blue-500/10 border-blue-500/20' : 
    step.status === 'completed' ? 'bg-emerald-500/5 border-emerald-500/10' :
    step.status === 'failed' ? 'bg-red-500/5 border-red-500/10' :
    'bg-slate-800/30 border-slate-700/30'
  }`}>
    <div className="flex items-center space-x-3">
      <StatusIndicator status={step.status} />
      <span className={`font-medium ${
        step.status === 'completed' ? 'text-emerald-100' : 
        step.status === 'failed' ? 'text-red-100' :
        'text-slate-300'
      }`}>
        {step.name}
      </span>
    </div>
    {step.duration && (
      <span className="text-xs font-mono text-slate-500 bg-slate-900 px-2 py-1 rounded">
        {step.duration}ms
      </span>
    )}
  </div>
);