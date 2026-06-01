'use client';

import React, { useState, useEffect } from 'react';
import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

export const dynamic = 'force-dynamic';

interface AgentState {
  id: string;
  state: string;
  queueDepth: number;
  activeCount: number;
  totalProcessed: number;
  totalFailed: number;
  errorRate: string;
  averageLatencyMs: number;
  lastHeartbeat: string;
  degradationReason?: string;
}

interface AgentStatusData {
  timestamp: string;
  agents: AgentState[];
  summary: {
    totalAgents: number;
    healthyAgents: number;
    degradedAgents: number;
    failedAgents: number;
  };
}

export default function AgentStatusDashboard() {
  const theme = useTheme();
  const { isReady, getToolOutput, callTool } = useWidgetSDK();
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5000);

  const data = getToolOutput<AgentStatusData>();

  useEffect(() => {
    if (!autoRefresh || !isReady) return;
    const interval = setInterval(() => {
      callTool('get_agent_status', {});
    }, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, isReady, callTool]);

  if (!isReady || !data) {
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
        <div style={{ fontSize: '32px', marginBottom: '20px' }}>📊</div>
        <div style={{ fontSize: '16px', fontWeight: '600', color: '#c9d1d9', marginBottom: '8px' }}>
          Loading Agent Dashboard
        </div>
        <div style={{ fontSize: '13px', color: '#8b949e' }}>
          Connecting to real-time agent monitoring...
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, #090b10 0%, #0f121a 100%)',
      border: '1px solid #1a2233',
      borderRadius: '20px',
      color: '#c9d1d9',
      padding: '24px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      maxWidth: '1200px',
      margin: '0 auto',
      boxShadow: '0 25px 60px rgba(0, 0, 0, 0.65)'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #1a2233',
        paddingBottom: '20px',
        marginBottom: '24px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span style={{
              background: 'rgba(16, 185, 129, 0.12)',
              color: '#10b981',
              fontSize: '11px',
              fontWeight: '700',
              padding: '4px 10px',
              borderRadius: '20px',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              border: '1px solid rgba(16, 185, 129, 0.25)'
            }}>
              Real-Time Monitoring
            </span>
          </div>
          <h1 style={{ margin: '0', fontSize: '24px', fontWeight: '800', color: '#f0f6fc' }}>
            Agent Status Dashboard
          </h1>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#c9d1d9', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              style={{ cursor: 'pointer', accentColor: '#10b981' }}
            />
            Auto-refresh
          </label>
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            disabled={!autoRefresh}
            style={{
              background: '#0d1117',
              border: '1px solid #1f242e',
              color: '#c9d1d9',
              padding: '6px 10px',
              borderRadius: '6px',
              fontSize: '12px',
              cursor: autoRefresh ? 'pointer' : 'not-allowed',
              opacity: autoRefresh ? 1 : 0.5
            }}
          >
            <option value={2000}>2s</option>
            <option value={5000}>5s</option>
            <option value={10000}>10s</option>
            <option value={30000}>30s</option>
          </select>
          <button
            onClick={() => callTool('get_agent_status', {})}
            style={{
              background: '#3b82f6',
              border: 'none',
              color: '#fff',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {[
          { label: 'Total Agents', value: data.summary.totalAgents, color: '#3b82f6' },
          { label: 'Healthy', value: data.summary.healthyAgents, color: '#10b981' },
          { label: 'Degraded', value: data.summary.degradedAgents, color: '#f59e0b' },
          { label: 'Failed', value: data.summary.failedAgents, color: '#ff5f56' }
        ].map((card, idx) => (
          <div
            key={idx}
            style={{
              background: '#141822',
              border: `1px solid ${card.color}20`,
              borderRadius: '12px',
              padding: '16px',
              textAlign: 'center'
            }}
          >
            <div style={{ fontSize: '12px', color: '#8b949e', fontWeight: '600', marginBottom: '8px' }}>
              {card.label}
            </div>
            <div style={{ fontSize: '28px', fontWeight: '800', color: card.color }}>
              {card.value}
            </div>
          </div>
        ))}
      </div>

      <div style={{
        background: '#0d1117',
        border: '1px solid #1a2233',
        borderRadius: '12px',
        overflow: 'hidden'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '150px 100px 80px 80px 100px 120px 100px 1fr',
          background: '#141822',
          borderBottom: '1px solid #1a2233',
          padding: '12px 16px',
          fontSize: '11px',
          fontWeight: '700',
          color: '#8b949e',
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }}>
          <div>Agent</div>
          <div>State</div>
          <div>Queue</div>
          <div>Active</div>
          <div>Processed</div>
          <div>Error Rate</div>
          <div>Latency (ms)</div>
          <div>Details</div>
        </div>

        {data.agents.map((agent, idx) => (
          <div
            key={idx}
            style={{
              display: 'grid',
              gridTemplateColumns: '150px 100px 80px 80px 100px 120px 100px 1fr',
              borderBottom: idx < data.agents.length - 1 ? '1px solid #1f242e' : 'none',
              padding: '12px 16px',
              alignItems: 'center',
              fontSize: '13px',
              background: idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.01)'
            }}
          >
            <div style={{ fontWeight: '600', color: '#f0f6fc' }}>{agent.id}</div>
            <div style={{ color: '#10b981' }}>{agent.state}</div>
            <div style={{ color: agent.queueDepth > 0 ? '#f59e0b' : '#8b949e' }}>{agent.queueDepth}</div>
            <div style={{ color: agent.activeCount > 0 ? '#3b82f6' : '#8b949e' }}>{agent.activeCount}</div>
            <div style={{ color: '#10b981' }}>{agent.totalProcessed}</div>
            <div style={{ color: parseFloat(agent.errorRate) > 10 ? '#ff5f56' : '#10b981', fontWeight: '600' }}>
              {agent.errorRate}
            </div>
            <div style={{ color: agent.averageLatencyMs > 1000 ? '#f59e0b' : '#8b949e' }}>
              {agent.averageLatencyMs}
            </div>
            <div style={{ color: '#8b949e', fontSize: '12px' }}>
              {agent.degradationReason ? `⚠️ ${agent.degradationReason}` : new Date(agent.lastHeartbeat).toLocaleTimeString()}
            </div>
          </div>
        ))}
      </div>

      <div style={{
        marginTop: '16px',
        fontSize: '11px',
        color: '#8b949e',
        textAlign: 'center'
      }}>
        Last updated: {new Date(data.timestamp).toLocaleTimeString()}
      </div>
    </div>
  );
}
