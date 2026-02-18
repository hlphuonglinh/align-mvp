/**
 * Quick edit modal for unavailable times.
 *
 * Opens when clicking:
 * - Red dashed overlay on the ring
 * - "Edit" button in conflict row
 *
 * Simple UI: time inputs + Save/Delete buttons.
 */

import { useState, useEffect } from 'react';
import type { V1Constraint, BreakType } from '../constraints/types.js';
import { isFixedBlockPayload } from '../constraints/types.js';
import { colors, glass, radius, spacing, typography, transitions } from './tokens.js';

interface UnavailableTimeModalProps {
  constraint: V1Constraint | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (constraintId: string, startLocal: string, endLocal: string, label?: string, breakType?: BreakType) => void;
  onDelete: (constraintId: string) => void;
}

export function UnavailableTimeModal({
  constraint,
  isOpen,
  onClose,
  onSave,
  onDelete,
}: UnavailableTimeModalProps) {
  const [label, setLabel] = useState('');
  const [breakType, setBreakType] = useState<BreakType>('unclassified');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');

  // Update form when constraint changes
  useEffect(() => {
    if (constraint && isFixedBlockPayload(constraint.payload)) {
      const payload = constraint.payload;
      setLabel(payload.label || '');
      setBreakType(payload.breakType || 'unclassified');
      if (!payload.allDay) {
        setStartTime(payload.startLocal);
        setEndTime(payload.endLocal);
      } else {
        setStartTime('00:00');
        setEndTime('23:59');
      }
    }
  }, [constraint]);

  if (!isOpen || !constraint) return null;

  const handleSave = () => {
    onSave(constraint.id, startTime, endTime, label.trim() || undefined, breakType);
    onClose();
  };

  const handleDelete = () => {
    onDelete(constraint.id);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(4px)',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          ...glass.elevated,
          borderRadius: radius.lg,
          padding: spacing.xl,
          minWidth: '320px',
          maxWidth: '400px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{
          ...typography.h2,
          marginBottom: spacing.lg,
        }}>
          Edit Unavailable Time
        </h3>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: spacing.md,
          marginBottom: spacing.xl,
        }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
            <span style={{ ...typography.bodySmall, color: colors.text.secondary, minWidth: '60px' }}>
              Label
            </span>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g., Standup, Gym"
              maxLength={40}
              style={{
                flex: 1,
                border: `1px solid ${colors.border.light}`,
                borderRadius: radius.sm,
                padding: `${spacing.sm} ${spacing.md}`,
                ...typography.bodySmall,
                background: colors.bg.elevated,
                color: colors.text.primary,
              }}
            />
          </label>

          {/* Break type selector */}
          <div>
            <span style={{ ...typography.bodySmall, color: colors.text.secondary, display: 'block', marginBottom: spacing.xs }}>
              Type
            </span>
            <div style={{ display: 'flex', gap: spacing.xs }}>
              <button
                type="button"
                onClick={() => setBreakType('commitment')}
                style={{
                  flex: 1,
                  padding: spacing.sm,
                  borderRadius: radius.sm,
                  border: breakType === 'commitment'
                    ? '2px solid #6366f1'
                    : `1px solid ${colors.border.light}`,
                  background: breakType === 'commitment'
                    ? 'rgba(99, 102, 241, 0.08)'
                    : colors.bg.elevated,
                  cursor: 'pointer',
                  ...typography.bodySmall,
                  color: colors.text.primary,
                  fontWeight: breakType === 'commitment' ? 600 : 400,
                }}
              >
                🧠 Commitment
              </button>
              <button
                type="button"
                onClick={() => setBreakType('rest')}
                style={{
                  flex: 1,
                  padding: spacing.sm,
                  borderRadius: radius.sm,
                  border: breakType === 'rest'
                    ? '2px solid #10b981'
                    : `1px solid ${colors.border.light}`,
                  background: breakType === 'rest'
                    ? 'rgba(16, 185, 129, 0.08)'
                    : colors.bg.elevated,
                  cursor: 'pointer',
                  ...typography.bodySmall,
                  color: colors.text.primary,
                  fontWeight: breakType === 'rest' ? 600 : 400,
                }}
              >
                🚶 Rest
              </button>
              <button
                type="button"
                onClick={() => setBreakType('unclassified')}
                style={{
                  flex: 1,
                  padding: spacing.sm,
                  borderRadius: radius.sm,
                  border: breakType === 'unclassified'
                    ? `2px solid ${colors.text.muted}`
                    : `1px solid ${colors.border.light}`,
                  background: breakType === 'unclassified'
                    ? colors.bg.hover
                    : colors.bg.elevated,
                  cursor: 'pointer',
                  ...typography.bodySmall,
                  color: colors.text.secondary,
                  fontWeight: breakType === 'unclassified' ? 600 : 400,
                }}
              >
                Auto
              </button>
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
            <span style={{ ...typography.bodySmall, color: colors.text.secondary, minWidth: '60px' }}>
              Start
            </span>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              style={{
                flex: 1,
                border: `1px solid ${colors.border.light}`,
                borderRadius: radius.sm,
                padding: `${spacing.sm} ${spacing.md}`,
                ...typography.bodySmall,
                background: colors.bg.elevated,
                color: colors.text.primary,
              }}
            />
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
            <span style={{ ...typography.bodySmall, color: colors.text.secondary, minWidth: '60px' }}>
              End
            </span>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              style={{
                flex: 1,
                border: `1px solid ${colors.border.light}`,
                borderRadius: radius.sm,
                padding: `${spacing.sm} ${spacing.md}`,
                ...typography.bodySmall,
                background: colors.bg.elevated,
                color: colors.text.primary,
              }}
            />
          </label>
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <button
            onClick={handleDelete}
            style={{
              ...typography.bodySmall,
              background: 'transparent',
              color: '#ef4444',
              border: `1px solid #ef4444`,
              borderRadius: radius.sm,
              padding: `${spacing.sm} ${spacing.md}`,
              fontWeight: 500,
              cursor: 'pointer',
              transition: `background ${transitions.normal}`,
            }}
          >
            Delete
          </button>

          <div style={{ display: 'flex', gap: spacing.sm }}>
            <button
              onClick={onClose}
              style={{
                ...typography.bodySmall,
                background: colors.bg.hover,
                color: colors.text.secondary,
                border: 'none',
                borderRadius: radius.sm,
                padding: `${spacing.sm} ${spacing.lg}`,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>

            <button
              onClick={handleSave}
              style={{
                ...typography.bodySmall,
                background: colors.text.primary,
                color: colors.bg.page,
                border: 'none',
                borderRadius: radius.sm,
                padding: `${spacing.sm} ${spacing.lg}`,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
