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
import type { V1Constraint } from '../constraints/types.js';
import { isFixedBlockPayload } from '../constraints/types.js';
import { colors, glass, radius, spacing, typography, transitions } from './tokens.js';

interface UnavailableTimeModalProps {
  constraint: V1Constraint | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (constraintId: string, startLocal: string, endLocal: string) => void;
  onDelete: (constraintId: string) => void;
}

export function UnavailableTimeModal({
  constraint,
  isOpen,
  onClose,
  onSave,
  onDelete,
}: UnavailableTimeModalProps) {
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');

  // Update form when constraint changes
  useEffect(() => {
    if (constraint && isFixedBlockPayload(constraint.payload)) {
      const payload = constraint.payload;
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
    onSave(constraint.id, startTime, endTime);
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
