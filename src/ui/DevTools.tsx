/**
 * Development tools for testing fragmentation UX across all chronotypes.
 *
 * IMPORTANT: Only visible in development mode (import.meta.env.DEV).
 *
 * Features:
 * - Chronotype switcher with immediate effect
 * - Chronotype-specific test scenarios
 * - Quick unavailable time injection
 * - Clear all button
 */

import { useState } from 'react';
import type { Chronotype, ChronotypeProfile } from '../types.js';
import type { V1Constraint } from '../constraints/types.js';
import { saveChronotypeProfile } from '../storage/chronotypeStorage.js';
import { saveConstraints } from '../storage/index.js';
import { radius, spacing, transitions } from './tokens.js';

interface DevToolsProps {
  currentProfile: ChronotypeProfile | null;
  currentConstraints: V1Constraint[];
  selectedDate: string;
  onProfileChange: () => void;
  onConstraintsChange: () => void;
}

// Chronotype descriptions with start times
const CHRONOTYPE_INFO: Record<Chronotype, { label: string; startTime: string }> = {
  AURORA: { label: 'Aurora (Early)', startTime: '05:30' },
  DAYBREAK: { label: 'Daybreak (Slightly Early)', startTime: '07:00' },
  MERIDIAN: { label: 'Meridian (Midday)', startTime: '10:00' },
  TWILIGHT: { label: 'Twilight (Slightly Late)', startTime: '13:00' },
  NOCTURNE: { label: 'Nocturne (Late)', startTime: '18:30' },
};

// Chronotype-specific test scenarios
// Each scenario has a label and time blocks that test specific edge cases
const TEST_SCENARIOS: Record<Chronotype, Array<{ label: string; times: string[] }>> = {
  AURORA: [
    { label: 'Fragment SYNTHESIS (30min window, 50% loss)', times: ['09:00-09:15'] },
    { label: 'Block FRAMING start (context-building)', times: ['05:30-06:30'] },
    { label: 'Heavy EXECUTION fragmentation (3 blocks)', times: ['09:30-10:00', '11:00-11:30', '12:00-12:15'] },
    { label: 'Same-start collision (SYN+EXE at 09:00)', times: ['09:00-09:10'] },
    { label: 'Completely block SYNTHESIS', times: ['09:00-09:30'] },
  ],
  DAYBREAK: [
    { label: 'Overlap collision (SYN+EVA at 08:30)', times: ['08:30-09:00'] },
    { label: 'Lunch meeting (multiple modes)', times: ['12:00-13:00'] },
    { label: 'Long EXECUTION heavy fragment (3 blocks)', times: ['11:30-12:00', '13:00-13:30', '14:00-14:30'] },
    { label: 'Morning standup impact', times: ['09:00-09:30'] },
  ],
  MERIDIAN: [
    { label: 'Lunch conflicts (hits 3 modes)', times: ['12:00-13:00'] },
    { label: 'Afternoon meeting block', times: ['14:00-15:00'] },
    { label: 'SYNTHESIS heavy overlap test', times: ['11:00-11:30', '12:30-13:00'] },
    { label: 'Late morning fragmentation', times: ['10:30-11:00', '11:30-12:00'] },
  ],
  TWILIGHT: [
    { label: 'Afternoon fragmentation', times: ['15:00-16:00'] },
    { label: 'Heavy SYNTHESIS fragment (3 blocks)', times: ['14:15-14:30', '15:00-16:00', '16:15-16:45'] },
    { label: 'FRAMING completely blocked', times: ['13:00-13:45', '14:00-14:50', '15:00-16:00'] },
    { label: 'Single EVALUATION impact', times: ['17:00-17:30'] },
  ],
  NOCTURNE: [
    { label: 'Block EXECUTION (before cognitive)', times: ['14:00-15:00'] },
    { label: 'Evening cognitive block (hits 3 modes)', times: ['19:00-20:00'] },
    { label: 'Late REFLECTION loss', times: ['22:00-23:00'] },
    { label: 'Heavy evening overlap', times: ['19:00-19:30', '20:00-20:30', '21:00-21:30'] },
    { label: 'Dinner time impact', times: ['18:30-19:30'] },
  ],
};

export function DevTools({
  currentProfile,
  currentConstraints,
  selectedDate,
  onProfileChange,
  onConstraintsChange,
}: DevToolsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const currentChronotype = currentProfile?.chronotype || 'TWILIGHT';

  // Handle chronotype change
  const handleChronotypeChange = (chronotype: Chronotype) => {
    const newProfile: ChronotypeProfile = {
      chronotype,
      confidence: 'HIGH',
      computedAt: new Date().toISOString(),
    };
    saveChronotypeProfile(newProfile);
    // Clear constraints when switching chronotypes for clean testing
    saveConstraints([]);
    onProfileChange();
    onConstraintsChange();
  };

  // Apply a test scenario (add unavailable times)
  const applyScenario = (times: string[]) => {
    const newConstraints: V1Constraint[] = times.map((time, idx) => {
      const [start, end] = time.split('-');
      return {
        id: `dev-test-${Date.now()}-${idx}`,
        kind: 'FIXED_BLOCK' as const,
        payload: {
          dateISO: selectedDate,
          startLocal: start,
          endLocal: end,
          allDay: false,
        },
        createdAtISO: new Date().toISOString(),
      };
    });

    // Replace existing dev constraints, keep user constraints
    const userConstraints = currentConstraints.filter(c => !c.id.startsWith('dev-test-'));
    saveConstraints([...userConstraints, ...newConstraints]);
    onConstraintsChange();
  };

  // Clear all test constraints
  const clearTestConstraints = () => {
    const userConstraints = currentConstraints.filter(c => !c.id.startsWith('dev-test-'));
    saveConstraints(userConstraints);
    onConstraintsChange();
  };

  // Clear ALL constraints
  const clearAllConstraints = () => {
    saveConstraints([]);
    onConstraintsChange();
  };

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        style={{
          position: 'fixed',
          bottom: spacing.lg,
          right: spacing.lg,
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          backgroundColor: '#111827',
          color: '#fbbf24',
          border: '2px solid #fbbf24',
          fontSize: '20px',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        title="Dev Tools (dev mode only)"
      >
        🛠️
      </button>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: spacing.lg,
        right: spacing.lg,
        backgroundColor: '#111827',
        color: 'white',
        padding: spacing.lg,
        borderRadius: radius.lg,
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        border: '2px solid #fbbf24',
        minWidth: '320px',
        maxWidth: '400px',
        maxHeight: '80vh',
        overflowY: 'auto',
        zIndex: 9999,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: spacing.lg,
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: '14px',
            fontWeight: 600,
            color: '#fbbf24',
          }}
        >
          🛠️ Dev Tools
        </h3>
        <button
          onClick={() => setIsExpanded(false)}
          style={{
            background: 'none',
            border: 'none',
            color: '#9ca3af',
            cursor: 'pointer',
            fontSize: '18px',
            padding: spacing.xs,
          }}
        >
          ✕
        </button>
      </div>

      {/* Chronotype Override */}
      <div style={{ marginBottom: spacing.lg }}>
        <label
          style={{
            display: 'block',
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: '#fbbf24',
            marginBottom: spacing.xs,
            fontWeight: 600,
          }}
        >
          Override Chronotype
        </label>
        <select
          value={currentChronotype}
          onChange={(e) => handleChronotypeChange(e.target.value as Chronotype)}
          style={{
            width: '100%',
            padding: spacing.sm,
            backgroundColor: '#1f2937',
            color: 'white',
            border: '1px solid #374151',
            borderRadius: radius.sm,
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          {Object.entries(CHRONOTYPE_INFO).map(([key, info]) => (
            <option key={key} value={key}>
              {info.label} - {info.startTime} start
            </option>
          ))}
        </select>
      </div>

      {/* Test Scenarios */}
      <div style={{ marginBottom: spacing.lg }}>
        <label
          style={{
            display: 'block',
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: '#fbbf24',
            marginBottom: spacing.xs,
            fontWeight: 600,
          }}
        >
          Test Scenarios for {currentChronotype}
        </label>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: spacing.xs,
          }}
        >
          {TEST_SCENARIOS[currentChronotype].map((scenario) => (
            <button
              key={scenario.label}
              onClick={() => applyScenario(scenario.times)}
              style={{
                padding: spacing.sm,
                fontSize: '11px',
                textAlign: 'left',
                backgroundColor: '#374151',
                color: 'white',
                border: 'none',
                borderRadius: radius.sm,
                cursor: 'pointer',
                lineHeight: 1.4,
                transition: `background ${transitions.fast}`,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#4b5563')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#374151')}
            >
              <div style={{ fontWeight: 500 }}>{scenario.label}</div>
              <div style={{ color: '#9ca3af', fontSize: '10px', marginTop: '2px' }}>
                {scenario.times.join(', ')}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ marginBottom: spacing.md }}>
        <label
          style={{
            display: 'block',
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: '#fbbf24',
            marginBottom: spacing.xs,
            fontWeight: 600,
          }}
        >
          Quick Actions
        </label>
        <div style={{ display: 'flex', gap: spacing.sm }}>
          <button
            onClick={clearTestConstraints}
            style={{
              flex: 1,
              padding: spacing.sm,
              fontSize: '12px',
              fontWeight: 600,
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: radius.sm,
              cursor: 'pointer',
            }}
          >
            Clear Test
          </button>
          <button
            onClick={clearAllConstraints}
            style={{
              flex: 1,
              padding: spacing.sm,
              fontSize: '12px',
              fontWeight: 600,
              backgroundColor: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: radius.sm,
              cursor: 'pointer',
            }}
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Current State */}
      <div
        style={{
          fontSize: '10px',
          color: '#6b7280',
          paddingTop: spacing.md,
          borderTop: '1px solid #374151',
        }}
      >
        <div style={{ marginBottom: spacing.xs }}>
          <strong>Current:</strong> {currentChronotype} ({CHRONOTYPE_INFO[currentChronotype].startTime} start)
        </div>
        <div style={{ marginBottom: spacing.xs }}>
          <strong>Date:</strong> {selectedDate}
        </div>
        <div style={{ marginBottom: spacing.xs }}>
          <strong>Constraints:</strong> {currentConstraints.length} total,{' '}
          {currentConstraints.filter((c) => c.id.startsWith('dev-test-')).length} test
        </div>
        <div style={{ fontStyle: 'italic', marginTop: spacing.sm }}>
          Dev mode only. Not visible in production builds.
        </div>
      </div>
    </div>
  );
}
