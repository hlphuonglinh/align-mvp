import { useState, useEffect } from 'react';
import type { V1Constraint, FixedHoursPayload, FixedBlockPayload } from '../constraints/types.js';
import { isFixedHoursPayload, isFixedBlockPayload } from '../constraints/types.js';
import { loadConstraints, saveConstraints } from '../storage/index.js';
import { generateConstraintId, validateConstraint } from '../constraints/index.js';

type ConstraintForm = 'FIXED_HOURS' | 'FIXED_BLOCK' | null;

export function Constraints() {
  const [constraints, setConstraints] = useState<V1Constraint[]>([]);
  const [activeForm, setActiveForm] = useState<ConstraintForm>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // FIXED_HOURS form state
  const [hoursStart, setHoursStart] = useState('09:00');
  const [hoursEnd, setHoursEnd] = useState('17:00');
  const [hoursDays, setHoursDays] = useState<number[]>([1, 2, 3, 4, 5]);

  // FIXED_BLOCK form state
  const [blockDate, setBlockDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [blockStart, setBlockStart] = useState('08:00');
  const [blockEnd, setBlockEnd] = useState('09:00');

  useEffect(() => {
    setConstraints(loadConstraints());
  }, []);

  const resetForms = () => {
    setActiveForm(null);
    setEditingId(null);
    setError(null);
    setHoursStart('09:00');
    setHoursEnd('17:00');
    setHoursDays([1, 2, 3, 4, 5]);
    setBlockDate(new Date().toISOString().split('T')[0]);
    setBlockStart('08:00');
    setBlockEnd('09:00');
  };

  const handleEditConstraint = (constraint: V1Constraint) => {
    setEditingId(constraint.id);
    setActiveForm(constraint.kind);
    setError(null);

    if (constraint.kind === 'FIXED_HOURS' && isFixedHoursPayload(constraint.payload)) {
      setHoursStart(constraint.payload.startLocal);
      setHoursEnd(constraint.payload.endLocal);
      setHoursDays([...constraint.payload.daysOfWeek]);
    } else if (constraint.kind === 'FIXED_BLOCK' && isFixedBlockPayload(constraint.payload)) {
      setBlockDate(constraint.payload.dateISO);
      setBlockStart(constraint.payload.startLocal);
      setBlockEnd(constraint.payload.endLocal);
    }
  };

  const handleDeleteConstraint = (id: string) => {
    const updated = constraints.filter(c => c.id !== id);
    setConstraints(updated);
    saveConstraints(updated);
    if (editingId === id) {
      resetForms();
    }
  };

  const toggleDay = (day: number) => {
    setHoursDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    );
  };

  const handleSubmitFixedHours = () => {
    setError(null);

    const payload: FixedHoursPayload = {
      daysOfWeek: hoursDays,
      startLocal: hoursStart,
      endLocal: hoursEnd,
    };

    const constraint: V1Constraint = {
      id: editingId ?? generateConstraintId(),
      kind: 'FIXED_HOURS',
      payload,
      createdAtISO: new Date().toISOString(),
    };

    const validation = validateConstraint(constraint);
    if (!validation.ok) {
      setError(validation.error ?? 'Invalid constraint');
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
    resetForms();
  };

  const handleSubmitFixedBlock = () => {
    setError(null);

    const payload: FixedBlockPayload = {
      dateISO: blockDate,
      startLocal: blockStart,
      endLocal: blockEnd,
    };

    const constraint: V1Constraint = {
      id: editingId ?? generateConstraintId(),
      kind: 'FIXED_BLOCK',
      payload,
      createdAtISO: new Date().toISOString(),
    };

    const validation = validateConstraint(constraint);
    if (!validation.ok) {
      setError(validation.error ?? 'Invalid constraint');
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
    resetForms();
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div>
      <h1>Constraints</h1>

      {/* Add buttons */}
      {!activeForm && (
        <div style={{ marginBottom: '1rem' }}>
          <button onClick={() => setActiveForm('FIXED_HOURS')} style={{ marginRight: '0.5rem' }}>
            Add Fixed Hours
          </button>
          <button onClick={() => setActiveForm('FIXED_BLOCK')}>
            Add Fixed Block
          </button>
        </div>
      )}

      {/* FIXED_HOURS Form */}
      {activeForm === 'FIXED_HOURS' && (
        <div style={{ marginBottom: '1.5rem', padding: '1rem', border: '1px solid #ccc' }}>
          <h3>{editingId ? 'Edit' : 'Add'} Fixed Hours</h3>

          <div style={{ marginBottom: '0.5rem' }}>
            <label>Days:</label>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
              {dayNames.map((name, idx) => (
                <label key={idx} style={{ cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={hoursDays.includes(idx)}
                    onChange={() => toggleDay(idx)}
                  />{' '}
                  {name}
                </label>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '0.5rem' }}>
            <label>
              Start:{' '}
              <input type="time" value={hoursStart} onChange={e => setHoursStart(e.target.value)} />
            </label>
          </div>

          <div style={{ marginBottom: '0.5rem' }}>
            <label>
              End:{' '}
              <input type="time" value={hoursEnd} onChange={e => setHoursEnd(e.target.value)} />
            </label>
          </div>

          {error && <div style={{ color: 'red', marginBottom: '0.5rem' }}>{error}</div>}

          <div>
            <button onClick={handleSubmitFixedHours}>{editingId ? 'Update' : 'Add'}</button>
            <button onClick={resetForms} style={{ marginLeft: '0.5rem' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* FIXED_BLOCK Form */}
      {activeForm === 'FIXED_BLOCK' && (
        <div style={{ marginBottom: '1.5rem', padding: '1rem', border: '1px solid #ccc' }}>
          <h3>{editingId ? 'Edit' : 'Add'} Fixed Block</h3>

          <div style={{ marginBottom: '0.5rem' }}>
            <label>
              Date:{' '}
              <input type="date" value={blockDate} onChange={e => setBlockDate(e.target.value)} />
            </label>
          </div>

          <div style={{ marginBottom: '0.5rem' }}>
            <label>
              Start:{' '}
              <input type="time" value={blockStart} onChange={e => setBlockStart(e.target.value)} />
            </label>
          </div>

          <div style={{ marginBottom: '0.5rem' }}>
            <label>
              End:{' '}
              <input type="time" value={blockEnd} onChange={e => setBlockEnd(e.target.value)} />
            </label>
          </div>

          {error && <div style={{ color: 'red', marginBottom: '0.5rem' }}>{error}</div>}

          <div>
            <button onClick={handleSubmitFixedBlock}>{editingId ? 'Update' : 'Add'}</button>
            <button onClick={resetForms} style={{ marginLeft: '0.5rem' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Constraints List */}
      <h2>All Constraints</h2>
      {constraints.length === 0 ? (
        <p>No constraints defined.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {constraints.map(constraint => (
            <ConstraintItem
              key={constraint.id}
              constraint={constraint}
              onEdit={() => handleEditConstraint(constraint)}
              onDelete={() => handleDeleteConstraint(constraint.id)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function ConstraintItem({
  constraint,
  onEdit,
  onDelete,
}: {
  constraint: V1Constraint;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  let description = '';
  if (constraint.kind === 'FIXED_HOURS' && isFixedHoursPayload(constraint.payload)) {
    const days = constraint.payload.daysOfWeek.map(d => dayNames[d]).join(', ');
    description = `Fixed Hours: ${days} ${constraint.payload.startLocal}-${constraint.payload.endLocal}`;
  } else if (constraint.kind === 'FIXED_BLOCK' && isFixedBlockPayload(constraint.payload)) {
    description = `Fixed Block: ${constraint.payload.dateISO} ${constraint.payload.startLocal}-${constraint.payload.endLocal}`;
  }

  return (
    <li
      style={{
        padding: '0.5rem',
        marginBottom: '0.5rem',
        border: '1px solid #ccc',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <span>{description}</span>
      <span>
        <button onClick={onEdit}>Edit</button>
        <button onClick={onDelete} style={{ marginLeft: '0.5rem' }}>Delete</button>
      </span>
    </li>
  );
}
