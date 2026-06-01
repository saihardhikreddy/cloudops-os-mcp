'use client';

import React, { useState, useEffect } from 'react';
import { useTheme, useWidgetState, useWidgetSDK } from '@nitrostack/widgets';

interface Diagnostic {
  id: string;
  agent: 'ResourceRoute' | 'CostOptimization' | 'PolicyGovernance' | 'Release';
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  file: string;
  lineStart: number;
  lineEnd: number;
  flaggedSnippet: string;
  explanation: string;
  diagnosis: string;
  resolvedSnippet: string;
  remediation: string;
}

interface CostItem {
  resource: string;
  originalCost: number;
  optimizedCost: number;
  savings: number;
  details: string;
}

interface CostSummary {
  originalCost: number;
  optimizedCost: number;
  monthlySavings: number;
  annualSavings: number;
  items: CostItem[];
  strategicSavings: {
    spotPrice: number;
    spotSavings: number;
    schedulePrice: number;
    scheduleSavings: number;
  };
}

interface ReasoningLog {
  timestamp: string;
  agent: 'ResourceRoute' | 'CostOptimization' | 'PolicyGovernance' | 'Release';
  message: string;
  details?: string;
}

interface TerraformPRData {
  status: string;
  originalCode: string;
  modifiedCode: string;
  diagnostics: Diagnostic[];
  costSummary: CostSummary;
  planSummary: string;
  logs: ReasoningLog[];
  executionSource?: { mode: string; agents: Record<string, string> };
}

export default function TerraformPRWidget() {
  const theme = useTheme();
  const { getToolOutput, callTool, isReady } = useWidgetSDK();

  // Widget Persisted State
  const [widgetState, setWidgetState] = useWidgetState<{
    activeTab: 'diff' | 'draft' | 'diagnostics' | 'plan' | 'logs';
    selectedDiagnosticId: string | null;
    customInstructions: string;
    status: 'pending_approval' | 're-running' | 'approving' | 'merged';
    mergedLog: string | null;
    commitHash: string | null;
    notifySlack: boolean;
    slackStatus: string | null;
    slackPayload: any | null;
  }>(() => ({
    activeTab: 'diff',
    selectedDiagnosticId: null,
    customInstructions: '',
    status: 'pending_approval',
    mergedLog: null,
    commitHash: null,
    notifySlack: true,
    slackStatus: null,
    slackPayload: null
  }));

  const data = getToolOutput<TerraformPRData>();

  // Local state for interactive agent simulation steps
  const [activeSimulationStep, setActiveSimulationStep] = useState<number | null>(null);
  const [simulationLog, setSimulationLog] = useState<string>('');
  const [instructionsText, setInstructionsText] = useState(widgetState?.customInstructions || '');

  useEffect(() => {
    if (widgetState?.customInstructions !== undefined && widgetState.customInstructions !== instructionsText) {
      setInstructionsText(widgetState.customInstructions);
    }
  }, [widgetState?.customInstructions]);

  if (!data) {
    return (
      <div style={{
        padding: '60px 40px',
        textAlign: 'center',
        background: 'linear-gradient(135deg, #0d0f14 0%, #151922 100%)',
        color: '#8b949e',
        borderRadius: '16px',
        fontFamily: 'system-ui, sans-serif',
        border: '1px solid #1f242e',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)'
      }}>
        <div className="spinner-glow" style={{ marginBottom: '20px', fontSize: '32px' }}>⚙️</div>
        <div style={{ fontSize: '16px', fontWeight: '600', color: '#c9d1d9', marginBottom: '8px' }}>
          Initializing CloudOps OS Environment
        </div>
        <div style={{ fontSize: '13px', color: '#8b949e' }}>
          Spinning up multi-agent message broker and validating schemas...
        </div>
        <style jsx>{`
          .spinner-glow {
            display: inline-block;
            animation: spin-pulse 2s infinite linear;
          }
          @keyframes spin-pulse {
            0% { transform: rotate(0deg) scale(1); filter: drop-shadow(0 0 5px rgba(59, 130, 246, 0.5)); }
            50% { transform: rotate(180deg) scale(1.1); filter: drop-shadow(0 0 15px rgba(16, 185, 129, 0.8)); }
            100% { transform: rotate(360deg) scale(1); filter: drop-shadow(0 0 5px rgba(59, 130, 246, 0.5)); }
          }
        `}</style>
      </div>
    );
  }

  if (!data || data.status === undefined || !data.diagnostics) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        background: '#0d1117',
        color: '#ff5f56',
        borderRadius: '16px',
        fontFamily: 'system-ui, sans-serif',
        border: '1px solid rgba(255, 95, 86, 0.2)',
        maxWidth: '920px',
        margin: '0 auto',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)'
      }}>
        <div style={{ marginBottom: '16px', fontSize: '32px' }}>⚠️</div>
        <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#f0f6fc', marginBottom: '8px' }}>
          CloudOps OS Agent Pipeline Failed
        </div>
        <div style={{ fontSize: '13px', color: '#8b949e', lineHeight: '1.5' }}>
          { (data as any)?.error || "The sequential multi-agent execution returned an error or timed out. Please verify your GEMINI_API_KEY configuration in your .env file." }
        </div>
      </div>
    );
  }

  // Multi-Agent Configuration Details
  const agents = [
    {
      key: 'ResourceRoute',
      name: 'Resource & Route Agent',
      icon: '⚙️',
      color: '#3b82f6',
      desc: 'Optimizes networking topology, replaces expensive gateways, and reroutes AWS internal API traffic.',
      task: 'Inspecting route tables and resolving $0.045/GB NAT gateway taxes...'
    },
    {
      key: 'CostOptimization',
      name: 'Cost Optimization Agent',
      icon: '💰',
      color: '#fbbf24',
      desc: 'Rightsizes EC2 compute instances, identifies Spot/Scheduler policies, and upgrades storage blocks from gp2 to gp3.',
      task: 'Analyzing compute workload telemetry and calculating gp2 ➔ gp3 cost reductions...'
    },
    {
      key: 'PolicyGovernance',
      name: 'Policy & Governance Agent',
      icon: '🛡️',
      color: '#ff5f56',
      desc: 'Audits provider configuration regions against SCP contracts and seals security group ingress ranges to SOC2 specifications.',
      task: 'Validating AWS provider region boundaries and administrative firewall ports...'
    },
    {
      key: 'Release',
      name: 'Platform Release Agent',
      icon: '🚀',
      color: '#8b5cf6',
      desc: 'Deterministically formats block layouts, runs syntax syntax parsing, and designs final plan outputs.',
      task: 'Parsing braces, formatting HCL blocks, and building deployment ledger states...'
    }
  ];

  // Run the visual step-by-step agent simulation
  const runAgentSimulation = (finalCallback: () => void) => {
    setActiveSimulationStep(0);
    setSimulationLog(agents[0].task);

    const stepIntervals = [1200, 2400, 3600, 4800];
    
    stepIntervals.forEach((delay, index) => {
      setTimeout(() => {
        if (index < 3) {
          setActiveSimulationStep(index + 1);
          setSimulationLog(agents[index + 1].task);
        } else {
          setActiveSimulationStep(null);
          setSimulationLog('');
          finalCallback();
        }
      }, delay);
    });
  };

  // Handler for Requesting Changes
  const handleRequestChanges = async () => {
    if (!isReady || !instructionsText.trim()) return;
    
    setWidgetState({
      ...widgetState,
      status: 're-running',
      customInstructions: instructionsText
    });

    runAgentSimulation(async () => {
      try {
        await callTool('analyze_terraform', {
          terraform_code: data.originalCode,
          user_instructions: instructionsText
        });
        setWidgetState({
          ...widgetState,
          status: 'pending_approval',
          customInstructions: instructionsText
        });
      } catch (err) {
        console.error('Failed to request changes:', err);
        alert('Error requesting changes from agents.');
        setWidgetState({
          ...widgetState,
          status: 'pending_approval'
        });
      }
    });
  };

  // Handler for Approve & Merge
  const handleApproveMerge = async () => {
    if (!isReady) return;
    
    setWidgetState({
      ...widgetState,
      status: 'approving'
    });

    try {
      const response = await callTool('finalize_terraform', {
        terraform_code: data.modifiedCode,
        notify_slack: widgetState?.notifySlack ?? true
      });
      
      const resData = response as unknown as {
        status: string;
        commitHash: string;
        deploymentLog: string;
        slackStatus: string;
        slackPayload: any;
      };

      setWidgetState({
        ...widgetState,
        status: 'merged',
        mergedLog: resData.deploymentLog,
        commitHash: resData.commitHash,
        slackStatus: resData.slackStatus,
        slackPayload: resData.slackPayload
      });
    } catch (err) {
      console.error('Failed to approve merge:', err);
      alert('Error merging Terraform PR.');
      setWidgetState({
        ...widgetState,
        status: 'pending_approval'
      });
    }
  };

  const getAgentColor = (agentKey: string) => {
    return agents.find(a => a.key === agentKey)?.color || '#9ca3af';
  };

  const getAgentLabel = (agentKey: string) => {
    return agents.find(a => a.key === agentKey)?.name || agentKey;
  };

  const selectedDiagnostic = data.diagnostics.find(d => d.id === widgetState?.selectedDiagnosticId) || data.diagnostics[0];

  const originalLines = (data.originalCode ?? '').split('\n');
  const modifiedLines = (data.modifiedCode ?? '').split('\n');
  const maxLines = Math.max(originalLines.length, modifiedLines.length);

  return (
    <div style={{
      background: 'linear-gradient(135deg, #090b10 0%, #0f121a 100%)',
      border: '1px solid #1a2233',
      borderRadius: '20px',
      color: '#c9d1d9',
      padding: '24px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
      maxWidth: '960px',
      margin: '0 auto',
      boxShadow: '0 25px 60px rgba(0, 0, 0, 0.65)',
      overflow: 'hidden'
    }}>
      {/* 1. HEADER */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #1a2233',
        paddingBottom: '20px',
        marginBottom: '20px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              background: 'rgba(16, 185, 129, 0.12)',
              color: '#10b981',
              fontSize: '11px',
              fontWeight: '700',
              padding: '4px 10px',
              borderRadius: '20px',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              boxShadow: '0 0 12px rgba(16, 185, 129, 0.15)'
            }}>
              Interactive Optimization Console
            </span>
            <span style={{ color: '#6e7681', fontSize: '13px', fontWeight: '500' }}>
              PR-104 • CloudOps OS Engine
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h2 style={{ margin: '8px 0 0 0', fontSize: '22px', fontWeight: '800', color: '#f0f6fc', letterSpacing: '-0.02em' }}>
              Autonomous Multi-Agent IaC Governance Pipeline
            </h2>
            <span style={{ 
              marginTop: '8px',
              background: data?.executionSource?.mode?.includes('fallback') ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
              color: data?.executionSource?.mode?.includes('fallback') ? '#fbbf24' : '#10b981',
              padding: '4px 10px', 
              borderRadius: '6px', 
              fontSize: '11px', 
              fontWeight: '700',
              textTransform: 'uppercase',
              border: `1px solid ${data?.executionSource?.mode?.includes('fallback') ? 'rgba(245, 158, 11, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`
            }}>
              {data?.executionSource?.mode || 'LOCAL REGEX'} Engine
            </span>
          </div>
        </div>

        {/* Status Badge */}
        <div>
          {widgetState?.status === 'merged' ? (
            <span style={{
              background: 'rgba(16, 185, 129, 0.12)',
              color: '#10b981',
              padding: '8px 16px',
              borderRadius: '30px',
              fontWeight: '700',
              fontSize: '13px',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span className="pulse-dot" style={{ background: '#10b981' }} /> Approved & Merged
            </span>
          ) : widgetState?.status === 're-running' ? (
            <span style={{
              background: 'rgba(245, 158, 11, 0.12)',
              color: '#f59e0b',
              padding: '8px 16px',
              borderRadius: '30px',
              fontWeight: '700',
              fontSize: '13px',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span className="pulse-dot-orange" /> Executing Pipeline...
            </span>
          ) : (
            <span style={{
              background: 'rgba(59, 130, 246, 0.12)',
              color: '#3b82f6',
              padding: '8px 16px',
              borderRadius: '30px',
              fontWeight: '700',
              fontSize: '13px',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span className="pulse-dot-blue" /> Under AI Review
            </span>
          )}
        </div>
      </div>

      {/* 2. PIPELINE PROGRESS MONITOR BOARD */}
      <div style={{
        background: '#0d1117',
        border: '1px solid #1a2233',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '20px',
        position: 'relative'
      }}>
        {/* Stepper Steps */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          zIndex: 2,
          position: 'relative'
        }}>
          {agents.map((step, idx) => {
            const hasLogs = data.logs.some(l => l.agent === step.key);
            const isFinished = widgetState?.status === 'merged' || (hasLogs && activeSimulationStep === null);
            const isProcessing = activeSimulationStep === idx;
            
            return (
              <React.Fragment key={step.key}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: '12px',
                  background: isProcessing ? 'rgba(255, 255, 255, 0.03)' : 'transparent',
                  border: isProcessing ? `1px solid ${step.color}40` : '1px solid transparent',
                  opacity: isFinished || isProcessing ? 1 : 0.35,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}>
                  {/* Glowing Icon */}
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    background: isFinished ? step.color : isProcessing ? '#1f2937' : '#141b24',
                    color: isFinished ? '#fff' : '#8b949e',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    border: isProcessing ? `2px solid ${step.color}` : '2px solid transparent',
                    boxShadow: isFinished ? `0 0 15px ${step.color}50` : isProcessing ? `0 0 15px ${step.color}70` : 'none',
                    animation: isProcessing ? 'glowing-pulse 1.2s infinite ease-in-out' : 'none',
                    transition: 'all 0.3s ease'
                  }}>
                    {isFinished ? '✓' : step.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: '#6e7681', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 'bold' }}>
                      Agent 0{idx + 1}
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: isProcessing ? step.color : '#f0f6fc' }}>
                      {step.name}
                    </div>
                    <div style={{ fontSize: '10px', color: '#8b949e', marginTop: '2px', fontWeight: '500' }}>
                      {isProcessing ? 'Processing...' : isFinished ? 'Analysis Ready' : 'Standby'}
                    </div>
                  </div>
                </div>
                {idx < 3 && (
                  <div style={{
                    width: '18px',
                    height: '2px',
                    background: isFinished ? '#388bfd' : '#21262d',
                    transition: 'all 0.3s ease'
                  }} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Live Operations Alert Overlay (Active when re-running) */}
        {activeSimulationStep !== null && (
          <div style={{
            marginTop: '16px',
            background: 'rgba(9, 11, 16, 0.85)',
            backdropFilter: 'blur(8px)',
            border: `1px solid ${agents[activeSimulationStep].color}50`,
            borderRadius: '10px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            animation: 'fadeInUp 0.3s ease-out'
          }}>
            <span style={{ fontSize: '20px', animation: 'spin 1.5s infinite linear' }}>⚙️</span>
            <div>
              <div style={{ fontSize: '11px', color: agents[activeSimulationStep].color, fontWeight: '800', textTransform: 'uppercase' }}>
                Active Agent Thread: {agents[activeSimulationStep].name}
              </div>
              <div style={{ fontSize: '13px', color: '#f0f6fc', marginTop: '2px', fontFamily: 'monospace' }}>
                {simulationLog}
              </div>
            </div>
          </div>
        )}
      </div>

      {widgetState?.status === 'merged' && widgetState.mergedLog ? (
        /* SUCCESS DISPLAY */
        <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
          <div style={{
            background: 'rgba(16, 185, 129, 0.04)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            borderRadius: '16px',
            padding: '24px',
            textAlign: 'center',
            marginBottom: '20px',
            boxShadow: 'inset 0 0 20px rgba(16, 185, 129, 0.05)'
          }}>
            <span style={{ fontSize: '54px', display: 'block', marginBottom: '12px', filter: 'drop-shadow(0 0 10px rgba(16, 185, 129, 0.2))' }}>🎉</span>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '19px', color: '#10b981', fontWeight: '800' }}>
              Terraform Governance Checklist Approved!
            </h3>
            <p style={{ margin: 0, fontSize: '14px', color: '#8b949e' }}>
              All recommendations compiled. Commit reference: <code style={{ background: '#1c2128', padding: '3px 8px', borderRadius: '6px', color: '#58a6ff', border: '1px solid #30363d', fontSize: '13px', fontWeight: 'bold' }}>{widgetState.commitHash}</code>
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'start', marginBottom: '20px' }}>
            
            {/* Visual Deployment Log */}
            <div>
              <h4 style={{ fontSize: '14px', color: '#f0f6fc', margin: '0 0 10px 0', fontWeight: '700' }}>Simulated Deployment Execution Log</h4>
              <pre style={{
                background: '#04060a',
                padding: '18px',
                borderRadius: '12px',
                fontFamily: 'monospace',
                fontSize: '12px',
                color: '#10b981',
                lineHeight: '1.6',
                overflowX: 'auto',
                border: '1px solid #1f242e',
                maxHeight: '280px',
                boxShadow: 'inset 0 10px 30px rgba(0,0,0,0.5)'
              }}>
                {widgetState.mergedLog}
              </pre>
            </div>

            {/* Visual Slack Mockup Card */}
            {widgetState.slackPayload && (
              <div>
                <h4 style={{ fontSize: '14px', color: '#f0f6fc', margin: '0 0 10px 0', fontWeight: '700' }}>Slack Notification Dispatch Preview</h4>
                <div style={{
                  background: '#1a1d21',
                  border: '1px solid #2e3034',
                  borderRadius: '12px',
                  padding: '18px',
                  fontFamily: 'Lato, system-ui, -apple-system, sans-serif',
                  color: '#d1d2d3',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
                }}>
                  {/* Channel header */}
                  <div style={{
                    fontSize: '13px',
                    fontWeight: 'bold',
                    color: '#ababad',
                    borderBottom: '1px solid #2e3034',
                    paddingBottom: '10px',
                    marginBottom: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <span style={{ color: '#10b981', fontSize: '15px', fontWeight: 'bold' }}>#</span> infrastructure-alerts
                  </div>

                  <div style={{ display: 'flex', gap: '12px' }}>
                    {/* Bot Icon */}
                    <div style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '6px',
                      background: '#10b981',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '20px',
                      fontWeight: 'bold',
                      boxShadow: '0 4px 10px rgba(16, 185, 129, 0.3)'
                    }}>
                      ☁️
                    </div>

                    <div style={{ flex: 1 }}>
                      {/* Name and time */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                        <span style={{ fontWeight: '900', color: '#f8f8f8', fontSize: '14px' }}>CloudOps OS Bot</span>
                        <span style={{
                          background: '#35373b',
                          color: '#d1d2d3',
                          fontSize: '9px',
                          padding: '1px 4px',
                          borderRadius: '3px',
                          fontWeight: 'bold'
                        }}>APP</span>
                        <span style={{ color: '#868686', fontSize: '12px' }}>{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>

                      {/* Message Content */}
                      <div style={{
                        borderLeft: '4px solid #10b981',
                        paddingLeft: '12px',
                        marginTop: '6px'
                      }}>
                        <div style={{ fontWeight: 'bold', color: '#f8f8f8', fontSize: '14px', marginBottom: '6px' }}>
                          🟢 IaC Governance Approved & Merged
                        </div>
                        <div style={{ fontSize: '13px', color: '#d1d2d3', marginBottom: '10px' }}>
                          Ref reference: <code style={{ background: '#222529', color: '#e01e5a', padding: '2px 5px', borderRadius: '4px', fontSize: '12px' }}>{widgetState.commitHash}</code> • Status: <code style={{ background: '#222529', color: '#2eb67d', padding: '2px 5px', borderRadius: '4px', fontSize: '12px' }}>Merged & Deployed</code>
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', margin: '10px 0', fontSize: '13px' }}>
                          <div>
                            <span style={{ color: '#ababad', display: 'block', fontSize: '10px', fontWeight: 'bold', letterSpacing: '0.03em' }}>💰 FINOPS SAVINGS:</span>
                            <code style={{ background: '#222529', color: '#2eb67d', padding: '2px 5px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>$119.12/month</code>
                          </div>
                          <div>
                            <span style={{ color: '#ababad', display: 'block', fontSize: '10px', fontWeight: 'bold', letterSpacing: '0.03em' }}>📈 ANNUALIZED SAVINGS:</span>
                            <code style={{ background: '#222529', color: '#ecb22e', padding: '2px 5px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>$1,429.44/year</code>
                          </div>
                        </div>

                        <div style={{ fontSize: '12px', color: '#ababad', marginTop: '12px', lineHeight: '1.4' }}>
                          <strong style={{ color: '#f8f8f8' }}>🛠️ Resolution Summary:</strong><br />
                          • Provider region aligned to <code style={{ background: '#222529', color: '#f8f8f8', padding: '1px 3px' }}>us-east-1</code> (SCP Compliance)<br />
                          • Ingress locked down to secure corporate subnets<br />
                          • Compute instance types rightsized to burstable general-purpose<br />
                          • Storage upgraded from legacy <code style={{ background: '#222529', color: '#f8f8f8', padding: '1px 3px' }}>gp2</code> to <code style={{ background: '#222529', color: '#f8f8f8', padding: '1px 3px' }}>gp3</code> (20% price drop)<br />
                          • NAT Gateway replaced with internal VPC Endpoints
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#868686', marginTop: '10px' }}>
                        🛡️ CloudOps OS Engine • status: <span style={{ color: '#2eb67d', fontWeight: 'bold' }}>{widgetState.slackStatus === 'simulated_no_webhook_in_env' ? 'Simulated (Webhook Pending)' : 'Dispatched' }</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      ) : (
        /* INTERACTIVE REVIEW WORKFLOW */
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px', alignItems: 'start' }}>
          
          {/* LEFT PANEL: TABBED CODE / METRICS VIEW */}
          <div>
            <div style={{
              display: 'flex',
              background: '#0d1117',
              padding: '4px',
              borderRadius: '10px',
              border: '1px solid #1f242e',
              marginBottom: '16px',
              gap: '4px'
            }}>
              {[
                { id: 'diff', name: '📝 Code Diff' },
                { id: 'draft', name: '📥 Draft Input HCL' },
                { id: 'diagnostics', name: '🔍 Audit Findings' },
                { id: 'plan', name: '🚀 Dry Run Plan' },
                { id: 'logs', name: '📋 Reasoning Log' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setWidgetState({ ...widgetState, activeTab: tab.id as any })}
                  style={{
                    padding: '8px 12px',
                    background: widgetState?.activeTab === tab.id ? '#1a2233' : 'transparent',
                    border: 'none',
                    borderRadius: '6px',
                    color: widgetState?.activeTab === tab.id ? '#58a6ff' : '#8b949e',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontSize: '13px',
                    transition: 'all 0.2s ease',
                    outline: 'none',
                    flex: 1
                  }}
                >
                  {tab.name}
                </button>
              ))}
            </div>

            <div style={{ minHeight: '380px' }}>
              
              {/* Tab: DIFF VIEW */}
              {widgetState?.activeTab === 'diff' && (
                <div style={{
                  background: '#04060a',
                  borderRadius: '12px',
                  border: '1px solid #1f242e',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    background: '#141822',
                    borderBottom: '1px solid #1f242e',
                    fontSize: '12px',
                    color: '#8b949e',
                    padding: '8px 16px',
                    fontWeight: 'bold'
                  }}>
                    <div>DRAFT TF CODE</div>
                    <div>SANITIZED TF CODE (Ready to Export)</div>
                  </div>
                  
                  <div style={{
                    maxHeight: '360px',
                    overflowY: 'auto',
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    lineHeight: '1.6',
                    padding: '12px'
                  }}>
                    {Array.from({ length: maxLines }).map((_, idx) => {
                      const origLine = originalLines[idx] || '';
                      const modLine = modifiedLines[idx] || '';
                      
                      const isLineDiff = origLine !== modLine;
                      const isRegionFix = isLineDiff && (origLine.includes('us-west-1') || modLine.includes('us-east-1'));
                      const isSgFix = isLineDiff && (origLine.includes('0.0.0.0/0') || modLine.includes('10.0.0.0'));
                      const isComputeFix = isLineDiff && (origLine.includes('m5.large') || modLine.includes('t3.'));
                      const isStorageFix = isLineDiff && (origLine.includes('gp2') || modLine.includes('gp3'));
                      const isNatFix = isLineDiff && (origLine.includes('aws_nat_gateway') || modLine.includes('aws_vpc_endpoint') || origLine.includes('nat'));

                      let leftBg = 'transparent';
                      let rightBg = 'transparent';
                      if (isLineDiff) {
                        if (origLine && !modLine) {
                          leftBg = 'rgba(255, 95, 86, 0.15)';
                        } else if (!origLine && modLine) {
                          rightBg = 'rgba(16, 185, 129, 0.15)';
                        } else {
                          leftBg = 'rgba(255, 95, 86, 0.1)';
                          rightBg = 'rgba(16, 185, 129, 0.1)';
                        }
                      }

                      return (
                        <div key={idx} style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          borderBottom: '1px solid #0d1117',
                          cursor: isLineDiff ? 'pointer' : 'default',
                          transition: 'background 0.2s'
                        }}
                        onClick={() => {
                          if (isRegionFix) {
                            setWidgetState({ ...widgetState, selectedDiagnosticId: 'GOV-001' });
                          } else if (isSgFix) {
                            setWidgetState({ ...widgetState, selectedDiagnosticId: 'GOV-002' });
                          } else if (isComputeFix) {
                            setWidgetState({ ...widgetState, selectedDiagnosticId: 'CST-001' });
                          } else if (isStorageFix) {
                            setWidgetState({ ...widgetState, selectedDiagnosticId: 'CST-002' });
                          } else if (isNatFix) {
                            setWidgetState({ ...widgetState, selectedDiagnosticId: 'RTE-001' });
                          }
                        }}
                        title={isLineDiff ? "Click to view AI reasoning" : ""}
                        >
                          <div style={{
                            padding: '0 8px',
                            background: leftBg,
                            borderRight: '1px solid #1f242e',
                            whiteSpace: 'pre-wrap',
                            color: origLine ? '#f85149' : 'transparent',
                            textDecoration: origLine && isLineDiff ? 'line-through' : 'none'
                          }}>
                            {origLine || ' '}
                          </div>
                          
                          <div style={{
                            padding: '0 8px',
                            background: rightBg,
                            whiteSpace: 'pre-wrap',
                            color: modLine ? '#3fb950' : 'transparent',
                            fontWeight: isLineDiff ? 'bold' : 'normal'
                          }}>
                            {modLine || ' '}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{
                    padding: '8px 16px',
                    background: '#141822',
                    borderTop: '1px solid #1f242e',
                    fontSize: '11px',
                    color: '#8b949e',
                    textAlign: 'center'
                  }}>
                    💡 Click on any highlighted line diff to open its Flag ➔ Explain ➔ Diagnose ➔ Resolve card.
                  </div>
                </div>
              )}

              {/* Tab: DRAFT HCL */}
              {widgetState?.activeTab === 'draft' && (
                <div style={{
                  background: '#04060a',
                  border: '1px solid #1f242e',
                  borderRadius: '12px',
                  padding: '16px',
                  maxHeight: '360px',
                  overflowY: 'auto'
                }}>
                  <div style={{ fontSize: '11px', color: '#ff5f56', fontWeight: 'bold', marginBottom: '8px', textTransform: 'uppercase' }}>
                    📥 Inbuilt Draft Input HCL (main.tf)
                  </div>
                  <pre style={{
                    margin: 0,
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    lineHeight: '1.5',
                    color: '#d1d5db',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {data.originalCode}
                  </pre>
                </div>
              )}

              {/* Tab: DIAGNOSTICS */}
              {widgetState?.activeTab === 'diagnostics' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '380px', overflowY: 'auto' }}>
                  {data.diagnostics.map((diag) => (
                    <div
                      key={diag.id}
                      onClick={() => setWidgetState({ ...widgetState, selectedDiagnosticId: diag.id })}
                      style={{
                        background: '#141822',
                        border: '1px solid #1f242e',
                        borderRadius: '12px',
                        padding: '16px',
                        cursor: 'pointer',
                        borderColor: widgetState?.selectedDiagnosticId === diag.id ? getAgentColor(diag.agent) : '#1f242e',
                        transition: 'border-color 0.2s',
                        boxShadow: widgetState?.selectedDiagnosticId === diag.id ? `0 0 10px ${getAgentColor(diag.agent)}15` : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', marginBottom: '8px', width: '100%' }}>
                        <span style={{
                          background: `rgba(${diag.severity === 'CRITICAL' ? '255,95,86' : diag.severity === 'WARNING' ? '245,158,11' : '16,185,129'}, 0.1)`,
                          color: diag.severity === 'CRITICAL' ? '#ff5f56' : diag.severity === 'WARNING' ? '#f59e0b' : '#10b981',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          border: `1px solid rgba(${diag.severity === 'CRITICAL' ? '255,95,86' : diag.severity === 'WARNING' ? '245,158,11' : '16,185,129'}, 0.2)`
                        }}>
                          {diag.severity}
                        </span>
                        <span style={{ fontSize: '11px', color: getAgentColor(diag.agent), fontWeight: 'bold' }}>
                          {getAgentLabel(diag.agent)}
                        </span>
                      </div>
                      <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', color: '#f0f6fc' }}>
                        {diag.diagnosis}
                      </h4>
                      <p style={{ margin: 0, fontSize: '12px', color: '#8b949e', lineHeight: '1.4' }}>
                        {diag.remediation}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Tab: DRY RUN PLAN */}
              {widgetState?.activeTab === 'plan' && (
                <div style={{
                  background: '#04060a',
                  border: '1px solid #1f242e',
                  borderRadius: '12px',
                  padding: '16px',
                  maxHeight: '360px',
                  overflowY: 'auto'
                }}>
                  <pre style={{
                    margin: 0,
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    lineHeight: '1.5',
                    color: '#8b949e',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {data.planSummary}
                  </pre>
                </div>
              )}

              {/* Tab: REASONING LOG */}
              {widgetState?.activeTab === 'logs' && (
                <div style={{
                  background: '#04060a',
                  border: '1px solid #1f242e',
                  borderRadius: '12px',
                  padding: '16px',
                  maxHeight: '360px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  {data.logs.map((log, idx) => (
                    <div key={idx} style={{
                      display: 'flex',
                      gap: '12px',
                      borderBottom: '1px solid #1f242e',
                      paddingBottom: '8px',
                      fontSize: '12px'
                    }}>
                      <span style={{ color: '#8b949e', fontFamily: 'monospace' }}>
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                      <span style={{ color: getAgentColor(log.agent), fontWeight: 'bold', width: '130px' }}>
                        [{log.agent}]
                      </span>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: '#f0f6fc', fontWeight: '500' }}>{log.message}</div>
                        {log.details && (
                          <div style={{ color: '#8b949e', marginTop: '2px', fontSize: '11px' }}>{log.details}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          </div>

          {/* RIGHT PANEL: XAI REASONING CARD & FINOPS SUMMARY */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* CARD 1: XAI Explanation (Flag -> Explain -> Diagnose -> Resolve) */}
            {selectedDiagnostic && (
              <div style={{
                background: '#141822',
                border: `1px solid ${getAgentColor(selectedDiagnostic.agent)}30`,
                borderLeft: `4px solid ${getAgentColor(selectedDiagnostic.agent)}`,
                borderRadius: '12px',
                padding: '16px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                animation: 'slideIn 0.3s ease-out'
              }}>
                <div style={{ fontSize: '11px', color: getAgentColor(selectedDiagnostic.agent), fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '12px' }}>
                  Explainable AI (XAI) Console
                </div>

                {/* 1. FLAG */}
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ fontSize: '10px', color: '#ff5f56', fontWeight: 'bold', letterSpacing: '0.02em' }}>🚩 FLAGGED ANOMALY</div>
                  <div style={{ fontSize: '12px', background: 'rgba(255, 95, 86, 0.05)', padding: '6px', borderRadius: '6px', fontFamily: 'monospace', color: '#ff5f56', marginTop: '3px', border: '1px solid rgba(255,95,86,0.15)' }}>
                    {selectedDiagnostic.flaggedSnippet}
                  </div>
                </div>

                {/* 2. EXPLAIN */}
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ fontSize: '10px', color: '#8b949e', fontWeight: 'bold', letterSpacing: '0.02em' }}>💬 EXPLAIN (THE WHY)</div>
                  <div style={{ fontSize: '12px', color: '#c9d1d9', lineHeight: '1.4', marginTop: '3px' }}>
                    {selectedDiagnostic.explanation}
                  </div>
                </div>

                {/* 3. DIAGNOSE */}
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ fontSize: '10px', color: '#fbbf24', fontWeight: 'bold', letterSpacing: '0.02em' }}>🔍 DIAGNOSIS</div>
                  <div style={{ fontSize: '12px', color: '#f0f6fc', fontWeight: '600', marginTop: '3px' }}>
                    {selectedDiagnostic.diagnosis}
                  </div>
                </div>

                {/* 4. RESOLVE */}
                <div>
                  <div style={{ fontSize: '10px', color: '#10b981', fontWeight: 'bold', letterSpacing: '0.02em' }}>✔️ RESOLVED CODE</div>
                  <div style={{ fontSize: '12px', background: 'rgba(16, 185, 129, 0.05)', padding: '6px', borderRadius: '6px', fontFamily: 'monospace', color: '#10b981', marginTop: '3px', border: '1px solid rgba(16,185,129,0.15)' }}>
                    {selectedDiagnostic.resolvedSnippet}
                  </div>
                </div>
              </div>
            )}

            {/* CARD 2: FinOps Costing Ledger */}
            <div style={{
              background: '#141822',
              border: '1px solid #1f242e',
              borderRadius: '12px',
              padding: '16px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
            }}>
              <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '12px' }}>
                💰 Live Costing Deltas
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div style={{ background: '#0d1117', padding: '10px', borderRadius: '8px', textAlign: 'center', border: '1px solid #1f242e' }}>
                  <div style={{ fontSize: '10px', color: '#8b949e', fontWeight: 'bold' }}>MONTHLY SAVINGS</div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#10b981', marginTop: '4px' }}>
                    ${data.costSummary.monthlySavings.toFixed(2)}
                  </div>
                </div>
                <div style={{ background: '#0d1117', padding: '10px', borderRadius: '8px', textAlign: 'center', border: '1px solid #1f242e' }}>
                  <div style={{ fontSize: '10px', color: '#8b949e', fontWeight: 'bold' }}>ANNUAL SAVINGS</div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#fbbf24', marginTop: '4px' }}>
                    ${data.costSummary.annualSavings.toFixed(2)}
                  </div>
                </div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: '#8b949e' }}>Original Monthly Cost:</span>
                  <span style={{ color: '#ff5f56', textDecoration: 'line-through' }}>${data.costSummary.originalCost.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: '#8b949e' }}>Optimized Monthly Cost:</span>
                  <span style={{ color: '#f0f6fc', fontWeight: 'bold' }}>${data.costSummary.optimizedCost.toFixed(2)}</span>
                </div>
              </div>

              {/* Strategic Options Breakdown */}
              {data.costSummary.strategicSavings && (
                <div style={{
                  background: '#0d1117',
                  borderRadius: '8px',
                  padding: '10px',
                  fontSize: '11px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  border: '1px dashed rgba(16,185,129,0.3)',
                  marginBottom: '12px'
                }}>
                  <div style={{ fontWeight: 'bold', color: '#10b981', textTransform: 'uppercase', fontSize: '9px' }}>
                    💡 Cost reduction Opportunities:
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#8b949e' }}>1. AWS Spot Tiers (saves 90%):</span>
                    <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>
                      ${data.costSummary.strategicSavings.spotPrice.toFixed(2)}/mo
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#8b949e' }}>2. Instance Scheduler (saves 70%):</span>
                    <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>
                      ${data.costSummary.strategicSavings.schedulePrice.toFixed(2)}/mo
                    </span>
                  </div>
                  <span style={{ fontSize: '9px', color: '#8b949e', fontStyle: 'italic', marginTop: '2px' }}>
                    Type "use spot pricing" in the override block to apply.
                  </span>
                </div>
              )}

              {/* Financial Ledger Items */}
              <div style={{
                borderTop: '1px solid #1f242e',
                paddingTop: '12px',
                fontSize: '11px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                {data.costSummary.items.map((item, idx) => (
                  <div key={idx} style={{ background: 'rgba(255,255,255,0.02)', padding: '6px 8px', borderRadius: '6px', border: '1px solid #1c212e' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: '#f0f6fc' }}>
                      <span>{item.resource}</span>
                      <span style={{ color: '#10b981' }}>-${item.savings.toFixed(2)}</span>
                    </div>
                    <div style={{ color: '#8b949e', marginTop: '2px', fontSize: '10px' }}>{item.details}</div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 3. HUMAN-IN-THE-LOOP ACTION PANEL */}
      {widgetState?.status !== 'merged' && (
        <div style={{
          borderTop: '1px solid #1f242e',
          marginTop: '20px',
          paddingTop: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <textarea
              value={instructionsText}
              onChange={(e) => setInstructionsText(e.target.value)}
              placeholder="Request custom overrides (e.g. 'use spot pricing', 'keep m5.large instance' or 'restrict SSH to 192.168.1.0/24')..."
              style={{
                flex: 1,
                background: '#04060a',
                border: '1px solid #1f242e',
                borderRadius: '8px',
                padding: '12px',
                color: '#f0f6fc',
                fontFamily: 'inherit',
                fontSize: '13px',
                resize: 'none',
                height: '44px',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#388bfd'}
              onBlur={(e) => e.target.style.borderColor = '#1f242e'}
            />
            <button
              onClick={handleRequestChanges}
              disabled={widgetState?.status === 're-running' || !instructionsText.trim() || activeSimulationStep !== null}
              style={{
                background: 'transparent',
                border: '1px solid #f59e0b',
                color: '#f59e0b',
                borderRadius: '8px',
                padding: '0 18px',
                fontWeight: '600',
                fontSize: '13px',
                cursor: widgetState?.status === 're-running' || !instructionsText.trim() || activeSimulationStep !== null ? 'not-allowed' : 'pointer',
                opacity: widgetState?.status === 're-running' || !instructionsText.trim() || activeSimulationStep !== null ? 0.5 : 1,
                transition: 'all 0.2s',
                outline: 'none'
              }}
            >
              🔄 Request Changes
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                id="slack-notify"
                checked={widgetState?.notifySlack ?? true}
                onChange={(e) => setWidgetState({ ...widgetState, notifySlack: e.target.checked })}
                style={{ cursor: 'pointer', accentColor: '#10b981' }}
              />
              <label htmlFor="slack-notify" style={{ fontSize: '13px', color: '#c9d1d9', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                💬 Notify Slack channel <span style={{ color: '#8b949e', fontSize: '11px' }}>(#infrastructure-alerts)</span>
              </label>
            </div>
            
            <button
              onClick={handleApproveMerge}
              disabled={widgetState?.status === 'approving' || widgetState?.status === 're-running' || activeSimulationStep !== null}
              style={{
                background: '#10b981',
                border: 'none',
                color: '#ffffff',
                borderRadius: '8px',
                padding: '12px 24px',
                fontWeight: 'bold',
                fontSize: '14px',
                cursor: widgetState?.status === 'approving' || widgetState?.status === 're-running' || activeSimulationStep !== null ? 'not-allowed' : 'pointer',
                opacity: widgetState?.status === 'approving' || widgetState?.status === 're-running' || activeSimulationStep !== null ? 0.6 : 1,
                transition: 'background 0.2s',
                outline: 'none',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
              }}
            >
              {widgetState?.status === 'approving' ? '⌛ Dispatching Slack Alert...' : '✔️ Approve & Save Changes'}
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(10px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .spin {
          display: inline-block;
          animation: spin 1.5s linear infinite;
        }
        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
        @keyframes glowing-pulse {
          0% { box-shadow: 0 0 5px currentColor; }
          50% { box-shadow: 0 0 20px currentColor; }
          100% { box-shadow: 0 0 5px currentColor; }
        }
        .pulse-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          display: inline-block;
          animation: pulse-green 1.5s infinite ease-in-out;
        }
        @keyframes pulse-green {
          0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
          70% { box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); }
          100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
        .pulse-dot-orange {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #f59e0b;
          display: inline-block;
          animation: pulse-orange 1.5s infinite ease-in-out;
        }
        @keyframes pulse-orange {
          0% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.7); }
          70% { box-shadow: 0 0 0 8px rgba(245, 158, 11, 0); }
          100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); }
        }
        .pulse-dot-blue {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #3b82f6;
          display: inline-block;
          animation: pulse-blue 1.5s infinite ease-in-out;
        }
        @keyframes pulse-blue {
          0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
          70% { box-shadow: 0 0 0 8px rgba(59, 130, 246, 0); }
          100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
        }
      `}</style>
    </div>
  );
}
