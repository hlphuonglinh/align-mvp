import { useState, useEffect } from 'react';
import type { V1Constraint, FixedBlockPayload } from '../constraints/types.js';
import { isFixedBlockPayload } from '../constraints/types.js';
import { loadConstraints, saveConstraints } from '../storage/index.js';
import { generateConstraintId, validateConstraint } from '../constraints/index.js';

export function Constraints() {
  const [constraints, setConstraints] = useState<V1Constraint[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [blockDate, setBlockDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [blockStart, setBlockStart] = useState('08:00');
  const [blockEnd, setBlockEnd] = useState('09:00');
  const [isAllDay, setIsAllDay] = useState(false);

  useEffect(() => {
    setConstraints(loadConstraints());
  }, []);

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setError(null);
    setBlockDate(new Date().toISOString().split('T')[0]);
    setBlockStart('08:00');
    setBlockEnd('09:00');
    setIsAllDay(false);
  };

  const handleEdit = (constraint: V1Constraint) => {
    if (constraint.kind === 'FIXED_BLOCK' && isFixedBlockPayload(constraint.payload)) {
      setEditingId(constraint.id);
      setBlockDate(constraint.payload.dateISO);
      setBlockStart(constraint.payload.startLocal);
      setBlockEnd(constraint.payload.endLocal);
      setIsAllDay(constraint.payload.allDay ?? false);
      setShowForm(true);
      setError(null);
    }
  };

  const handleDelete = (id: string) => {
    const updated = constraints.filter(c => c.id !== id);
    setConstraints(updated);
    saveConstraints(updated);
    if (editingId === id) {
      resetForm();
    }
  };

  const handleSubmit = () => {
    setError(null);

    const payload: FixedBlockPayload = {
      dateISO: blockDate,
      startLocal: blockStart,
      endLocal: blockEnd,
      allDay: isAllDay || undefined,
    };

    const constraint: V1Constraint = {
      id: editingId ?? generateConstraintId(),
      kind: 'FIXED_BLOCK',
      payload,
      createdAtISO: new Date().toISOString(),
    };

    const validation = validateConstraint(constraint);
    if (!validation.ok) {
      setError(validation.error ?? 'Invalid unavailable time');
      return;
    }

    let updated: V1Constraint[];
    if (editingId) {
      updated = constraints.map(c => (c.id === editingId ? constraint : c));
    } else {
      updated = [...constraints, constraint];
    }

    setConstraints(updated);
    saveConstraints(updated);
    resetForm();
  };

  const inputStyle = {
    border: '1px solid rgba(0, 0, 0, 0.1)',
    borderRadius: '8px',
    padding: '0.5rem 0.75rem',
    fontSize: '0.875rem',
    background: 'rgba(255, 255, 255, 0.8)',
  };

  return (
    <div>
      <h1 style={{
        fontSize: '1.5rem',
        fontWeight: 600,
        marginBottom: '0.5rem',
        color: '#1a1a1a',
      }}>
        Unavailable times
      </h1>

      <p style={{ color: '#555', marginBottom: '0.5rem', fontSize: '0.9375rem', fontWeight: 500 }}>
        Non-negotiable times in your daily life.
      </p>

      <p style={{ color: '#666', marginBottom: '1.5rem', fontSize: '0.875rem', lineHeight: 1.5 }}>
        Family time, caregiving, gym, commutes, meetings, travel. You do not need to explain why.
      </p>

      {/* Add button */}
      {!showForm && (
        <div style={{ marginBottom: '1.5rem' }}>
          <button
            onClick={() => setShowForm(true)}
            style={{
              background: 'linear-gradient(135deg, #4a9eff 0%, #6366f1 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              padding: '0.75rem 1.5rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Add unavailable time
          </button>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div style={{
          marginBottom: '1.5rem',
          padding: '1.25rem',
          background: 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(12px)',
          borderRadius: '16px',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06)',
        }}>
          <h3 style={{
            fontSize: '1rem',
            fontWeight: 600,
            marginBottom: '1rem',
            color: '#1a1a1a',
          }}>
            {editingId ? 'Edit' : 'Add'} unavailable time
          </h3>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: '#666', fontSize: '0.875rem', minWidth: '3rem' }}>Date</span>
              <input
                type="date"
                value={blockDate}
                onChange={e => setBlockDate(e.target.value)}
                style={inputStyle}
              />
            </label>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: '#555',
              fontSize: '0.875rem',
            }}>
              <input
                type="checkbox"
                checked={isAllDay}
                onChange={e => setIsAllDay(e.target.checked)}
                style={{ accentColor: '#6366f1' }}
              />
              All day
            </label>
          </div>

          {!isAllDay && (
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: '#666', fontSize: '0.875rem' }}>Start</span>
                <input
                  type="time"
                  value={blockStart}
                  onChange={e => setBlockStart(e.target.value)}
                  style={inputStyle}
                />
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: '#666', fontSize: '0.875rem' }}>End</span>
                <input
                  type="time"
                  value={blockEnd}
                  onChange={e => setBlockEnd(e.target.value)}
                  style={inputStyle}
                />
              </label>
            </div>
          )}

          {error && (
            <div style={{
              color: '#dc2626',
              marginBottom: '1rem',
              fontSize: '0.875rem',
              padding: '0.5rem 0.75rem',
              background: 'rgba(220, 38, 38, 0.08)',
              borderRadius: '8px',
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={handleSubmit}
              style={{
                background: 'linear-gradient(135deg, #4a9eff 0%, #6366f1 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '0.5rem 1rem',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              {editingId ? 'Update' : 'Add'}
            </button>
            <button
              onClick={resetForm}
              style={{
                background: 'rgba(0, 0, 0, 0.05)',
                color: '#666',
                border: 'none',
                borderRadius: '8px',
                padding: '0.5rem 1rem',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}


      {/* List */}
      {constraints.length === 0 ? (
        <div style={{
          padding: '1.25rem',
          background: 'rgba(0, 0, 0, 0.02)',
          borderRadius: '12px',
        }}>
          <p style={{ margin: 0, color: '#888', fontSize: '0.875rem', lineHeight: 1.5 }}>
            You haven't added any unavailable times.<br />
            Align will assume you're available unless conditions say otherwise.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {constraints.map(constraint => (
            <UnavailableTimeItem
              key={constraint.id}
              constraint={constraint}
              onEdit={() => handleEdit(constraint)}
              onDelete={() => handleDelete(constraint.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function UnavailableTimeItem({
  constraint,
  onEdit,
  onDelete,
}: {
  constraint: V1Constraint;
  onEdit: () => void;
  onDelete: () => void;
}) {
  let description = '';

  if (constraint.kind === 'FIXED_BLOCK' && isFixedBlockPayload(constraint.payload)) {
    const date = constraint.payload.dateISO;
    if (constraint.payload.allDay) {
      description = `${date} (all day)`;
    } else {
      description = `${date} ${constraint.payload.startLocal} - ${constraint.payload.endLocal}`;
    }
  }

  return (
    <div
      style={{
        padding: '0.75rem 1rem',
        background: 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(8px)',
        borderRadius: '10px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
      }}
    >
      <span style={{ color: '#555', fontSize: '0.875rem' }}>{description}</span>
      <span style={{ display: 'flex', gap: '0.5rem' }}>
        <button
          onClick={onEdit}
          style={{
            background: 'none',
            border: 'none',
            color: '#6366f1',
            cursor: 'pointer',
            fontSize: '0.8125rem',
            padding: '0.25rem 0.5rem',
          }}
        >
          Edit
        </button>
        <button
          onClick={onDelete}
          style={{
            background: 'none',
            border: 'none',
            color: '#9ca3af',
            cursor: 'pointer',
            fontSize: '0.8125rem',
            padding: '0.25rem 0.5rem',
          }}
        >
          Delete
        </button>
      </span>
    </div>
  );
}
