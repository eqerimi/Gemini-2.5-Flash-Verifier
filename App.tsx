import React, { useState, useCallback } from 'react';
import { checkApiKeyPresence, runBasicGenerationTest, runStreamingTest } from './services/geminiService';
import { LogEntry, LogLevel, TestStatus, DiagnosticStep } from './types';
import { LogViewer, MetricCard, StepItem } from './components/TestComponents';
import { Zap, Shield, Server, Activity, Play, RefreshCw, Key, Send, MessageSquare } from 'lucide-react';

const App: React.FC = () => {
  const [status, setStatus] = useState<TestStatus>(TestStatus.IDLE);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [steps, setSteps] = useState<DiagnosticStep[]>([
    { id: 'env-check', name: 'Environment Variable Check', status: 'pending' },
    { id: 'auth-check', name: 'Authentication & Model Access', status: 'pending' },
    { id: 'stream-check', name: 'Token Streaming Capability', status: 'pending' },
  ]);
  const [latency, setLatency] = useState<number>(0);
  const [streamPreview, setStreamPreview] = useState<string>('');
  
  // Manual Prompt State
  const [manualPrompt, setManualPrompt] = useState<string>('');
  const [isManualRunning, setIsManualRunning] = useState<boolean>(false);
  
  const addLog = useCallback((message: string, level: LogLevel = LogLevel.INFO, details?: string) => {
    // Using a simple counter + random string for ID to avoid crypto issues in some envs
    const id = Date.now().toString() + Math.random().toString(36).substring(2);
    setLogs(prev => [...prev, {
      id,
      timestamp: new Date(),
      message,
      level,
      details
    }]);
  }, []);

  const updateStep = (id: string, updates: Partial<DiagnosticStep>) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const runDiagnostics = async () => {
    if (status === TestStatus.RUNNING || isManualRunning) return;

    // Reset State
    setStatus(TestStatus.RUNNING);
    setLogs([]);
    setLatency(0);
    setStreamPreview('');
    setSteps(prev => prev.map(s => ({ ...s, status: 'pending', duration: undefined })));
    
    addLog("Initializing diagnostic sequence...", LogLevel.INFO);

    // Step 1: Env Check
    updateStep('env-check', { status: 'running' });
    const startEnv = performance.now();
    const hasKey = checkApiKeyPresence();
    const envDuration = Math.round(performance.now() - startEnv);
    
    if (hasKey) {
      updateStep('env-check', { status: 'completed', duration: envDuration });
      addLog("API Key detected in environment variables", LogLevel.SUCCESS);
    } else {
      updateStep('env-check', { status: 'failed', duration: envDuration });
      addLog("API Key missing. Please set process.env.API_KEY.", LogLevel.ERROR);
      setStatus(TestStatus.FAILURE);
      return;
    }

    // Step 2: Basic Gen Check
    updateStep('auth-check', { status: 'running' });
    addLog("Sending handshake request to gemini-2.5-flash...", LogLevel.INFO);
    
    const basicResult = await runBasicGenerationTest();
    
    if (basicResult.success) {
      updateStep('auth-check', { status: 'completed', duration: basicResult.latencyMs });
      addLog(`Handshake successful. Received: "${basicResult.responsePreview}"`, LogLevel.SUCCESS);
      setLatency(basicResult.latencyMs);
    } else {
      updateStep('auth-check', { status: 'failed', duration: basicResult.latencyMs });
      addLog("Handshake failed.", LogLevel.ERROR, basicResult.error);
      setStatus(TestStatus.FAILURE);
      return;
    }

    // Step 3: Streaming Check
    updateStep('stream-check', { status: 'running' });
    addLog("Testing token streaming...", LogLevel.INFO);
    
    const streamResult = await runStreamingTest((text) => {
      setStreamPreview(prev => prev + text);
    });

    if (streamResult.success) {
      updateStep('stream-check', { status: 'completed', duration: streamResult.latencyMs });
      addLog("Streaming complete.", LogLevel.SUCCESS);
      setStatus(TestStatus.SUCCESS);
    } else {
      updateStep('stream-check', { status: 'failed', duration: streamResult.latencyMs });
      addLog("Streaming failed.", LogLevel.ERROR, streamResult.error);
      setStatus(TestStatus.FAILURE);
    }
  };

  const handleManualRun = async () => {
    if (!manualPrompt.trim() || isManualRunning || status === TestStatus.RUNNING) return;
    
    if (!checkApiKeyPresence()) {
      addLog("Cannot run manual prompt: API Key missing in environment variables", LogLevel.ERROR);
      return;
    }

    setIsManualRunning(true);
    setStreamPreview(''); // Clear for new response
    addLog(`Sending manual prompt: "${manualPrompt.length > 50 ? manualPrompt.substring(0, 50) + '...' : manualPrompt}"`, LogLevel.INFO);

    const result = await runStreamingTest((text) => {
      setStreamPreview(prev => prev + text);
    }, manualPrompt);

    if (result.success) {
      setLatency(result.latencyMs);
      addLog("Manual generation complete.", LogLevel.SUCCESS);
    } else {
      addLog("Manual generation failed.", LogLevel.ERROR, result.error);
    }
    
    setIsManualRunning(false);
  };

  return (
    <div className="min-h-screen p-6 md:p-12 flex items-center justify-center">
      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Header Section */}
        <div className="lg:col-span-12 mb-4">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
              Gemini 2.5 Flash Verifier
            </h1>
          </div>
          <p className="text-slate-400 ml-1">
            Diagnostic tool for validating API configuration and network connectivity.
          </p>
        </div>

        {/* Left Column: Controls & Metrics */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Key Status Card */}
          <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
              <Key className="w-24 h-24 text-blue-400" />
            </div>
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Configuration</h3>
            <div className="flex items-center space-x-3 mb-6">
              <div className={`w-3 h-3 rounded-full ${checkApiKeyPresence() ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]' : 'bg-red-500'}`} />
              <span className="font-mono text-sm text-slate-200">
                process.env.API_KEY
              </span>
            </div>
            <button
              onClick={runDiagnostics}
              disabled={status === TestStatus.RUNNING || isManualRunning}
              className={`w-full py-3 px-4 rounded-lg flex items-center justify-center space-x-2 font-semibold transition-all duration-200 
                ${status === TestStatus.RUNNING || isManualRunning
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20 active:scale-[0.98]'
                }`}
            >
              {status === TestStatus.RUNNING ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Running...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Start Diagnostics</span>
                </>
              )}
            </button>
          </div>

          {/* Steps List */}
          <div className="glass-panel p-6 rounded-2xl">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Test Sequence</h3>
            <div className="space-y-3">
              {steps.map(step => (
                <StepItem key={step.id} step={step} />
              ))}
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-1 gap-4">
            <MetricCard 
              label="Latency (Last Req)" 
              value={`${latency}ms`} 
              icon={<Activity className="w-5 h-5" />} 
              subValue={latency > 0 ? (latency < 800 ? "Excellent" : "Normal") : undefined}
            />
            <MetricCard 
              label="Model" 
              value="Gemini 2.5 Flash" 
              icon={<Server className="w-5 h-5" />}
            />
          </div>
        </div>

        {/* Right Column: Logs & Output */}
        <div className="lg:col-span-8 flex flex-col space-y-6 h-auto">
          {/* Main Log Viewer */}
          <div className="h-[300px]">
            <LogViewer logs={logs} />
          </div>

          {/* Response Viewer */}
          <div className="glass-panel rounded-xl flex flex-col overflow-hidden min-h-[200px]">
             <div className="flex items-center justify-between px-4 py-3 bg-slate-800/50 border-b border-slate-700/50">
                <div className="flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Response Output</span>
                </div>
                {streamPreview && <span className="text-xs text-slate-500">{streamPreview.length} chars</span>}
             </div>
             <div className="flex-1 p-4 overflow-y-auto font-serif text-slate-300 italic leading-relaxed max-h-[300px]">
               {streamPreview ? (
                 <p className="whitespace-pre-wrap">{streamPreview}</p>
               ) : (
                 <div className="h-full py-8 flex items-center justify-center text-slate-600 text-sm">
                   Output will appear here...
                 </div>
               )}
             </div>
          </div>

          {/* Manual Input Area */}
          <div className="glass-panel p-4 rounded-xl">
            <div className="flex items-center space-x-2 mb-2">
              <MessageSquare className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Manual Prompt</span>
            </div>
            <div className="relative">
              <textarea
                value={manualPrompt}
                onChange={(e) => setManualPrompt(e.target.value)}
                disabled={isManualRunning || status === TestStatus.RUNNING}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleManualRun();
                  }
                }}
                placeholder="Enter a prompt to test the model (e.g. 'Tell me a joke')..."
                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg p-3 pr-12 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none h-24 placeholder:text-slate-600"
              />
              <button
                onClick={handleManualRun}
                disabled={!manualPrompt.trim() || isManualRunning || status === TestStatus.RUNNING}
                className="absolute bottom-3 right-3 p-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg transition-colors shadow-lg"
              >
                {isManualRunning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default App;