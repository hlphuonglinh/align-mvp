import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type {
  QuizAnswers,
  ExtendedChronotypeProfile,
  Chronotype as ChronotypeType,
  OuraChronotypeSelection,
} from '../types.js';
import {
  QUIZ_QUESTIONS,
  scoreQuizExtended,
  scoreOuraChronotype,
  formatMidSleep,
  ouraTypeNeedsDisambiguation,
  isQuizComplete,
} from '../quiz/index.js';
import {
  loadChronotypeProfile,
  saveChronotypeProfile,
  clearChronotypeProfile,
  isExtendedProfile,
} from '../storage/index.js';
import { CHRONOTYPE_COPY, type ChronotypeCopy } from '../canon/chronotype_copy.js';
import { colors, glass, radius, spacing, typography, transitions } from './tokens.js';

// ============================================================================
// TYPES
// ============================================================================

type WizardStep =
  | 'entry'              // Step 0: Wearable screener
  | 'oura-instructions'  // O1: How to find Oura chronotype
  | 'oura-select'        // O2: Select Oura type
  | 'oura-disambig'      // O3: Boundary disambiguation (conditional)
  | 'quiz-q1'            // Q1: Workday wake time
  | 'quiz-q2'            // Q2: Free day wake time
  | 'quiz-q3'            // Q3: Extra sleep
  | 'quiz-q4'            // Q4: Fatigue sensitivity
  | 'quiz-q5'            // Q5: Interruption sensitivity
  | 'oura-fragility-q4'  // O4: Fragility Q4
  | 'oura-fragility-q5'  // O5: Fragility Q5
  | 'result';            // Result screen

interface WizardState {
  step: WizardStep;
  flow: 'quiz' | 'oura' | null;
  ouraType?: OuraChronotypeSelection;
  answers: Partial<QuizAnswers>;
  profile?: ExtendedChronotypeProfile;
}

const OURA_TYPES: OuraChronotypeSelection[] = [
  'Early morning type',
  'Morning type',
  'Late morning type',
  'Early evening type',
  'Evening type',
  'Late evening type',
];

const ALL_CHRONOTYPES: ChronotypeType[] = ['AURORA', 'DAYBREAK', 'MERIDIAN', 'TWILIGHT', 'NOCTURNE'];

// ============================================================================
// MICRO-COPY
// ============================================================================

const QUESTION_MICROCOPY: Record<string, string> = {
  q1: 'This helps establish your workday rhythm.',
  q2: 'Free days reveal your natural wake time without external pressure.',
  q3: 'Sleep debt shows how much recovery your body needs.',
  q4: 'This measures how your focus stability changes under load.',
  q5: 'This measures how interruptions affect your deep work.',
};

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div style={{
      display: 'flex',
      gap: spacing.sm,
      justifyContent: 'center',
      marginBottom: spacing.xl,
    }}>
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: i < current
              ? colors.text.primary
              : i === current
                ? colors.accent.primary
                : colors.border.default,
            transition: `background ${transitions.normal}`,
          }}
        />
      ))}
    </div>
  );
}

function SelectableCard({
  selected,
  onClick,
  children,
  testId,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  testId?: string;
}) {
  return (
    <button
      onClick={onClick}
      data-testid={testId}
      style={{
        width: '100%',
        textAlign: 'left',
        padding: spacing.lg,
        borderRadius: radius.lg,
        border: `2px solid ${selected ? colors.accent.primary : colors.border.subtle}`,
        background: selected ? colors.bg.active : 'transparent',
        cursor: 'pointer',
        transition: `all ${transitions.normal}`,
        ...typography.bodySmall,
        color: colors.text.secondary,
      }}
    >
      {children}
    </button>
  );
}

function ContinueButton({
  disabled,
  onClick,
  children = 'Continue',
}: {
  disabled: boolean;
  onClick: () => void;
  children?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...typography.bodySmall,
        background: disabled ? colors.bg.hover : colors.text.primary,
        color: disabled ? colors.text.muted : colors.bg.page,
        border: 'none',
        borderRadius: radius.md,
        padding: `${spacing.md} ${spacing.xl}`,
        fontWeight: 500,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: `all ${transitions.normal}`,
      }}
    >
      {children}
    </button>
  );
}

function BackLink({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'none',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        ...typography.bodySmall,
        color: colors.text.muted,
        textDecoration: 'underline',
      }}
    >
      Back
    </button>
  );
}

function ChronotypeDetails({ copy }: { copy: ChronotypeCopy }) {
  return (
    <>
      <p style={{
        ...typography.body,
        fontWeight: 500,
        color: colors.text.primary,
        marginBottom: spacing.md,
        lineHeight: 1.5,
      }}>
        {copy.hook}
      </p>
      <p style={{
        ...typography.bodySmall,
        color: colors.text.secondary,
        marginBottom: spacing.lg,
        lineHeight: 1.6,
      }}>
        {copy.paragraph}
      </p>
      <p style={{
        ...typography.label,
        color: colors.text.muted,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        marginBottom: spacing.sm,
      }}>
        What you might recognize
      </p>
      <ul style={{
        margin: `0 0 ${spacing.lg} 0`,
        paddingLeft: spacing.lg,
        ...typography.bodySmall,
        color: colors.text.secondary,
        lineHeight: 1.7,
      }}>
        {copy.bullets.map((bullet, i) => (
          <li key={i} style={{ marginBottom: spacing.xs }}>{bullet}</li>
        ))}
      </ul>
      <p style={{
        ...typography.label,
        color: colors.text.muted,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        marginBottom: spacing.sm,
      }}>
        How Align helps
      </p>
      <p style={{
        ...typography.bodySmall,
        color: colors.text.secondary,
        marginBottom: spacing.lg,
        lineHeight: 1.6,
      }}>
        {copy.alignHelps}
      </p>
      <p style={{
        ...typography.caption,
        color: colors.text.muted,
        fontStyle: 'italic',
      }}>
        {copy.prevalence}
      </p>
    </>
  );
}

function OtherChronotypeItem({ chronotype }: { chronotype: ChronotypeType }) {
  const [expanded, setExpanded] = useState(false);
  const copy = CHRONOTYPE_COPY[chronotype];

  return (
    <div style={{ borderBottom: `1px solid ${colors.border.subtle}` }}>
      <button
        onClick={() => setExpanded(!expanded)}
        data-testid={`other-chronotype-${chronotype.toLowerCase()}`}
        style={{
          width: '100%',
          background: 'none',
          border: 'none',
          padding: spacing.md,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          ...typography.bodySmall,
          color: colors.text.secondary,
          fontWeight: 500,
        }}
      >
        <span>{chronotype}</span>
        <span style={{
          display: 'inline-block',
          transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: `transform ${transitions.normal}`,
          fontSize: '0.625rem',
          color: colors.text.muted,
        }}>
          ▼
        </span>
      </button>
      {expanded && (
        <div
          data-testid={`other-chronotype-content-${chronotype.toLowerCase()}`}
          style={{ padding: `0 ${spacing.md} ${spacing.md} ${spacing.md}` }}
        >
          <ChronotypeDetails copy={copy} />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// WIZARD SCREENS
// ============================================================================

function EntryScreen({
  onSelectOura,
  onSelectManual,
}: {
  onSelectOura: () => void;
  onSelectManual: () => void;
}) {
  return (
    <div style={{
      ...glass.card,
      borderRadius: radius.xl,
      padding: spacing.xl,
    }}>
      <h2 style={{
        ...typography.h2,
        marginBottom: spacing.md,
      }}>
        How would you like to determine your chronotype?
      </h2>
      <p style={{
        ...typography.bodySmall,
        color: colors.text.secondary,
        marginBottom: spacing.xl,
      }}>
        Choose the method that works best for you.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
        <SelectableCard selected={false} onClick={onSelectOura} testId="entry-oura">
          <div style={{ fontWeight: 500, color: colors.text.primary, marginBottom: spacing.xs }}>
            I have an Oura Ring
          </div>
          <div style={{ ...typography.caption, color: colors.text.muted }}>
            Fast-track using your existing chronotype data
          </div>
        </SelectableCard>

        <SelectableCard selected={false} onClick={onSelectManual} testId="entry-manual">
          <div style={{ fontWeight: 500, color: colors.text.primary, marginBottom: spacing.xs }}>
            Assess manually
          </div>
          <div style={{ ...typography.caption, color: colors.text.muted }}>
            Answer 5 questions about your sleep patterns
          </div>
        </SelectableCard>
      </div>

      <p style={{
        ...typography.caption,
        color: colors.text.muted,
        marginTop: spacing.xl,
        fontStyle: 'italic',
      }}>
        Other wearables (Whoop, Apple Watch, etc.) don't currently export chronotype data.
        Use the manual assessment for now.
      </p>
    </div>
  );
}

function OuraInstructionsScreen({ onContinue, onBack }: { onContinue: () => void; onBack: () => void }) {
  return (
    <div style={{
      ...glass.card,
      borderRadius: radius.xl,
      padding: spacing.xl,
    }}>
      <h2 style={{
        ...typography.h2,
        marginBottom: spacing.lg,
      }}>
        Find your Oura chronotype
      </h2>

      <ol style={{
        margin: `0 0 ${spacing.xl} 0`,
        paddingLeft: spacing.xl,
        ...typography.bodySmall,
        color: colors.text.secondary,
        lineHeight: 1.8,
      }}>
        <li style={{ marginBottom: spacing.md }}>
          Open the <strong>Oura app</strong> on your phone
        </li>
        <li style={{ marginBottom: spacing.md }}>
          Tap <strong>Sleep</strong> (bottom navigation)
        </li>
        <li style={{ marginBottom: spacing.md }}>
          Scroll down to the <strong>Body Clock</strong> section
        </li>
        <li style={{ marginBottom: spacing.md }}>
          Tap the <strong>chronotype card</strong> at the bottom of the Body Clock screen
        </li>
        <li>
          Note your chronotype (e.g., "Morning type")
        </li>
      </ol>

      <div style={{ display: 'flex', gap: spacing.md, alignItems: 'center' }}>
        <ContinueButton disabled={false} onClick={onContinue}>
          I found it
        </ContinueButton>
        <BackLink onClick={onBack} />
      </div>
    </div>
  );
}

function OuraSelectScreen({
  selectedType,
  onSelect,
  onContinue,
  onBack,
}: {
  selectedType?: OuraChronotypeSelection;
  onSelect: (type: OuraChronotypeSelection) => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  return (
    <div style={{
      ...glass.card,
      borderRadius: radius.xl,
      padding: spacing.xl,
    }}>
      <h2 style={{
        ...typography.h2,
        marginBottom: spacing.md,
      }}>
        What's your Oura chronotype?
      </h2>
      <p style={{
        ...typography.bodySmall,
        color: colors.text.secondary,
        marginBottom: spacing.xl,
      }}>
        Select the type shown in your Oura app.
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: spacing.md,
        marginBottom: spacing.xl,
      }}>
        {OURA_TYPES.map((type) => (
          <SelectableCard
            key={type}
            selected={selectedType === type}
            onClick={() => onSelect(type)}
            testId={`oura-type-${type.toLowerCase().replace(/\s+/g, '-')}`}
          >
            {type}
          </SelectableCard>
        ))}
      </div>

      <div style={{ display: 'flex', gap: spacing.md, alignItems: 'center' }}>
        <ContinueButton disabled={!selectedType} onClick={onContinue} />
        <BackLink onClick={onBack} />
      </div>
    </div>
  );
}

function OuraDisambigScreen({
  selectedAnswer,
  onSelect,
  onContinue,
  onBack,
}: {
  selectedAnswer?: string;
  onSelect: (answer: string) => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  // Use Q2 options for disambiguation
  const question = QUIZ_QUESTIONS[1]; // Q2

  return (
    <div style={{
      ...glass.card,
      borderRadius: radius.xl,
      padding: spacing.xl,
    }}>
      <p style={{
        ...typography.caption,
        color: colors.text.muted,
        marginBottom: spacing.sm,
      }}>
        One more question to refine your result
      </p>
      <h2 style={{
        ...typography.h2,
        marginBottom: spacing.md,
      }}>
        {question.text}
      </h2>
      <p style={{
        ...typography.bodySmall,
        color: colors.text.muted,
        marginBottom: spacing.xl,
      }}>
        {QUESTION_MICROCOPY.q2}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm, marginBottom: spacing.xl }}>
        {question.options.map((option) => (
          <SelectableCard
            key={option.key}
            selected={selectedAnswer === option.key}
            onClick={() => onSelect(option.key)}
            testId={`disambig-${option.key}`}
          >
            {option.label}
          </SelectableCard>
        ))}
      </div>

      <div style={{ display: 'flex', gap: spacing.md, alignItems: 'center' }}>
        <ContinueButton disabled={!selectedAnswer} onClick={onContinue} />
        <BackLink onClick={onBack} />
      </div>
    </div>
  );
}

function QuizQuestionScreen({
  questionIndex,
  question,
  selectedAnswer,
  totalQuestions,
  onSelect,
  onContinue,
  onBack,
  showBack,
}: {
  questionIndex: number;
  question: { id: string; text: string; options: { key: string; label: string }[] };
  selectedAnswer?: string;
  totalQuestions: number;
  onSelect: (answer: string) => void;
  onContinue: () => void;
  onBack: () => void;
  showBack: boolean;
}) {
  const microCopy = QUESTION_MICROCOPY[question.id];

  return (
    <div style={{
      ...glass.card,
      borderRadius: radius.xl,
      padding: spacing.xl,
    }}>
      <ProgressDots current={questionIndex} total={totalQuestions} />

      <h2 style={{
        ...typography.h2,
        marginBottom: spacing.md,
        fontSize: '1.125rem',
      }}>
        {question.text}
      </h2>
      {microCopy && (
        <p style={{
          ...typography.bodySmall,
          color: colors.text.muted,
          marginBottom: spacing.xl,
        }}>
          {microCopy}
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm, marginBottom: spacing.xl }}>
        {question.options.map((option) => (
          <SelectableCard
            key={option.key}
            selected={selectedAnswer === option.key}
            onClick={() => onSelect(option.key)}
            testId={`quiz-${question.id}-${option.key}`}
          >
            {option.label}
          </SelectableCard>
        ))}
      </div>

      <div style={{ display: 'flex', gap: spacing.md, alignItems: 'center' }}>
        <ContinueButton disabled={!selectedAnswer} onClick={onContinue} />
        {showBack && <BackLink onClick={onBack} />}
      </div>
    </div>
  );
}

function FragilityQuestionScreen({
  questionIndex,
  question,
  selectedAnswer,
  totalQuestions,
  onSelect,
  onContinue,
  onBack,
}: {
  questionIndex: number;
  question: { id: string; text: string; options: { key: string; label: string }[] };
  selectedAnswer?: string;
  totalQuestions: number;
  onSelect: (answer: string) => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  const microCopy = QUESTION_MICROCOPY[question.id];

  return (
    <div style={{
      ...glass.card,
      borderRadius: radius.xl,
      padding: spacing.xl,
    }}>
      <p style={{
        ...typography.caption,
        color: colors.text.muted,
        textAlign: 'center',
        marginBottom: spacing.md,
      }}>
        Focus fragility ({questionIndex + 1} of {totalQuestions})
      </p>

      <h2 style={{
        ...typography.h2,
        marginBottom: spacing.md,
        fontSize: '1.125rem',
      }}>
        {question.text}
      </h2>
      {microCopy && (
        <p style={{
          ...typography.bodySmall,
          color: colors.text.muted,
          marginBottom: spacing.xl,
        }}>
          {microCopy}
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm, marginBottom: spacing.xl }}>
        {question.options.map((option) => (
          <SelectableCard
            key={option.key}
            selected={selectedAnswer === option.key}
            onClick={() => onSelect(option.key)}
            testId={`fragility-${question.id}-${option.key}`}
          >
            {option.label}
          </SelectableCard>
        ))}
      </div>

      <div style={{ display: 'flex', gap: spacing.md, alignItems: 'center' }}>
        <ContinueButton disabled={!selectedAnswer} onClick={onContinue} />
        <BackLink onClick={onBack} />
      </div>
    </div>
  );
}

function ResultScreen({
  profile,
  onViewWindows,
  onRetake,
}: {
  profile: ExtendedChronotypeProfile;
  onViewWindows: () => void;
  onRetake: () => void;
}) {
  const copy = CHRONOTYPE_COPY[profile.chronotype];
  const otherChronotypes = ALL_CHRONOTYPES.filter((c) => c !== profile.chronotype);
  const [otherExpanded, setOtherExpanded] = useState(false);

  const midSleepFormatted = formatMidSleep(profile.msfsc);
  const sourceBadge = profile.source === 'oura' ? 'Wearable-informed' : 'Self-assessed';

  // Fragility color mapping
  const fragilityColor = profile.fragility === 'Low'
    ? colors.status.permit.text
    : profile.fragility === 'High'
      ? colors.status.caution.text
      : colors.text.secondary;

  return (
    <div>
      <h1 style={{ ...typography.h1, marginBottom: spacing.lg }}>
        Chronotype
      </h1>

      {/* Profile summary */}
      <div style={{
        marginBottom: spacing.lg,
        padding: spacing.xl,
        ...glass.card,
        borderRadius: radius.xl,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: spacing.md,
          marginBottom: spacing.sm,
        }}>
          <span style={{
            fontSize: '1.5rem',
            fontWeight: 600,
            color: colors.text.primary,
          }}>
            {profile.chronotype}
          </span>
          <span style={{
            ...typography.caption,
            padding: `${spacing.xs} ${spacing.sm}`,
            background: profile.source === 'oura' ? colors.status.permit.pill : colors.bg.subtle,
            borderRadius: radius.sm,
            color: profile.source === 'oura' ? colors.status.permit.text : colors.text.secondary,
          }}>
            {sourceBadge}
          </span>
        </div>

        {/* Phase anchor */}
        <p style={{
          ...typography.body,
          color: colors.text.secondary,
          marginBottom: spacing.md,
        }}>
          Baseline mid-sleep around <strong>{midSleepFormatted}</strong>
        </p>

        {/* Social jetlag (quiz only) */}
        {profile.sjl_hours !== null && (
          <p style={{
            ...typography.bodySmall,
            color: profile.sjl_hours > 1 ? colors.status.caution.text : colors.text.secondary,
            marginBottom: spacing.md,
          }}>
            Social jetlag: {profile.sjl_hours.toFixed(1)} hours
            {profile.sjl_hours > 1 && ' (elevated)'}
          </p>
        )}

        {/* Fragility */}
        <p style={{
          ...typography.bodySmall,
          color: fragilityColor,
          marginBottom: spacing.md,
        }}>
          Focus fragility: {profile.fragility}
        </p>

        {/* Low confidence warning */}
        {profile.confidence === 'LOW' && (
          <div style={{
            padding: spacing.md,
            background: colors.status.caution.bg,
            border: `1px solid ${colors.status.caution.border}`,
            borderRadius: radius.md,
            marginTop: spacing.md,
          }}>
            <p style={{
              ...typography.bodySmall,
              color: colors.status.caution.text,
              margin: 0,
            }}>
              Lower confidence: You indicated using an alarm on free days, which may mask your natural wake time.
            </p>
          </div>
        )}
      </div>

      {/* Chronotype details */}
      <div
        data-testid="chronotype-details"
        style={{
          ...glass.card,
          borderRadius: radius.lg,
          padding: spacing.xl,
          marginBottom: spacing.lg,
        }}
      >
        <ChronotypeDetails copy={copy} />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: spacing.md, marginBottom: spacing.xl }}>
        <button
          onClick={onViewWindows}
          style={{
            ...typography.bodySmall,
            background: colors.text.primary,
            color: colors.bg.page,
            border: 'none',
            borderRadius: radius.md,
            padding: `${spacing.md} ${spacing.xl}`,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          View my reliability windows
        </button>
      </div>

      {/* Other chronotypes */}
      <div style={{
        background: colors.bg.subtle,
        border: `1px solid ${colors.border.subtle}`,
        borderRadius: radius.lg,
        marginBottom: spacing.xl,
        overflow: 'hidden',
      }}>
        <button
          onClick={() => setOtherExpanded(!otherExpanded)}
          data-testid="other-chronotypes-toggle"
          style={{
            width: '100%',
            background: 'none',
            border: 'none',
            padding: spacing.lg,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            ...typography.bodySmall,
            color: colors.text.secondary,
            fontWeight: 500,
          }}
        >
          <span>Other chronotypes</span>
          <span style={{
            display: 'inline-block',
            transform: otherExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: `transform ${transitions.normal}`,
            fontSize: '0.625rem',
            color: colors.text.muted,
          }}>
            ▼
          </span>
        </button>
        {otherExpanded && (
          <div data-testid="other-chronotypes-content">
            {otherChronotypes.map((chronotype) => (
              <OtherChronotypeItem key={chronotype} chronotype={chronotype} />
            ))}
          </div>
        )}
      </div>

      {/* Retake link */}
      <button
        onClick={onRetake}
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          ...typography.bodySmall,
          color: colors.text.muted,
          textDecoration: 'underline',
        }}
      >
        Retake assessment
      </button>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function Chronotype() {
  const navigate = useNavigate();
  const [state, setState] = useState<WizardState>({
    step: 'entry',
    flow: null,
    answers: {},
  });

  // Load existing profile on mount
  useEffect(() => {
    const stored = loadChronotypeProfile();
    if (stored) {
      // Convert to extended profile if needed
      if (isExtendedProfile(stored)) {
        setState({
          step: 'result',
          flow: stored.source === 'oura' ? 'oura' : 'quiz',
          profile: stored,
          answers: {},
        });
      } else {
        // Legacy profile - show result with defaults
        setState({
          step: 'result',
          flow: 'quiz',
          profile: {
            ...stored,
            msfsc: 4.0, // Default to MERIDIAN midpoint
            sjl_hours: null,
            fragility: 'Medium',
            fragility_score: 0,
            source: 'quiz',
          },
          answers: {},
        });
      }
    }
  }, []);

  // Navigation helpers
  const goToStep = useCallback((step: WizardStep) => {
    setState((prev) => ({ ...prev, step }));
  }, []);

  const setAnswer = useCallback((questionId: string, value: string) => {
    setState((prev) => ({
      ...prev,
      answers: { ...prev.answers, [questionId]: value },
    }));
  }, []);

  const handleRetake = useCallback(() => {
    clearChronotypeProfile();
    setState({
      step: 'entry',
      flow: null,
      answers: {},
    });
  }, []);

  // Entry screen handlers
  const handleSelectOura = useCallback(() => {
    setState((prev) => ({ ...prev, step: 'oura-instructions', flow: 'oura' }));
  }, []);

  const handleSelectManual = useCallback(() => {
    setState((prev) => ({ ...prev, step: 'quiz-q1', flow: 'quiz' }));
  }, []);

  // Oura flow handlers
  const handleOuraTypeSelect = useCallback((type: OuraChronotypeSelection) => {
    setState((prev) => ({ ...prev, ouraType: type }));
  }, []);

  const handleOuraSelectContinue = useCallback(() => {
    const { ouraType } = state;
    if (!ouraType) return;

    if (ouraTypeNeedsDisambiguation(ouraType)) {
      goToStep('oura-disambig');
    } else {
      goToStep('oura-fragility-q4');
    }
  }, [state, goToStep]);

  const handleDisambigContinue = useCallback(() => {
    goToStep('oura-fragility-q4');
  }, [goToStep]);

  const handleOuraComplete = useCallback(() => {
    const { ouraType, answers } = state;
    if (!ouraType || !answers.q4 || !answers.q5) return;

    const profile = scoreOuraChronotype(
      ouraType,
      answers.q2, // disambiguation answer
      answers.q4,
      answers.q5
    );

    saveChronotypeProfile(profile);
    setState((prev) => ({ ...prev, step: 'result', profile }));
  }, [state]);

  // Quiz flow handlers
  const handleQuizComplete = useCallback(() => {
    const { answers } = state;
    if (!isQuizComplete(answers)) return;

    const profile = scoreQuizExtended(answers);
    saveChronotypeProfile(profile);
    setState((prev) => ({ ...prev, step: 'result', profile }));
  }, [state]);

  // View windows handler - navigate to Day tab
  const handleViewWindows = useCallback(() => {
    navigate('/');
  }, [navigate]);

  // Quiz step navigation
  const quizSteps: WizardStep[] = ['quiz-q1', 'quiz-q2', 'quiz-q3', 'quiz-q4', 'quiz-q5'];
  const currentQuizIndex = quizSteps.indexOf(state.step);

  const getQuizQuestion = (step: WizardStep) => {
    const index = quizSteps.indexOf(step);
    return index >= 0 ? QUIZ_QUESTIONS[index] : null;
  };

  const goToNextQuizStep = useCallback(() => {
    if (currentQuizIndex < quizSteps.length - 1) {
      goToStep(quizSteps[currentQuizIndex + 1]);
    } else {
      handleQuizComplete();
    }
  }, [currentQuizIndex, quizSteps, goToStep, handleQuizComplete]);

  const goToPrevQuizStep = useCallback(() => {
    if (currentQuizIndex > 0) {
      goToStep(quizSteps[currentQuizIndex - 1]);
    } else {
      goToStep('entry');
    }
  }, [currentQuizIndex, quizSteps, goToStep]);

  // Render based on current step
  const renderStep = () => {
    switch (state.step) {
      case 'entry':
        return (
          <EntryScreen
            onSelectOura={handleSelectOura}
            onSelectManual={handleSelectManual}
          />
        );

      case 'oura-instructions':
        return (
          <OuraInstructionsScreen
            onContinue={() => goToStep('oura-select')}
            onBack={() => goToStep('entry')}
          />
        );

      case 'oura-select':
        return (
          <OuraSelectScreen
            selectedType={state.ouraType}
            onSelect={handleOuraTypeSelect}
            onContinue={handleOuraSelectContinue}
            onBack={() => goToStep('oura-instructions')}
          />
        );

      case 'oura-disambig':
        return (
          <OuraDisambigScreen
            selectedAnswer={state.answers.q2}
            onSelect={(answer) => setAnswer('q2', answer)}
            onContinue={handleDisambigContinue}
            onBack={() => goToStep('oura-select')}
          />
        );

      case 'oura-fragility-q4':
        return (
          <FragilityQuestionScreen
            questionIndex={0}
            question={QUIZ_QUESTIONS[3]} // Q4
            selectedAnswer={state.answers.q4}
            totalQuestions={2}
            onSelect={(answer) => setAnswer('q4', answer)}
            onContinue={() => goToStep('oura-fragility-q5')}
            onBack={() =>
              state.ouraType && ouraTypeNeedsDisambiguation(state.ouraType)
                ? goToStep('oura-disambig')
                : goToStep('oura-select')
            }
          />
        );

      case 'oura-fragility-q5':
        return (
          <FragilityQuestionScreen
            questionIndex={1}
            question={QUIZ_QUESTIONS[4]} // Q5
            selectedAnswer={state.answers.q5}
            totalQuestions={2}
            onSelect={(answer) => setAnswer('q5', answer)}
            onContinue={handleOuraComplete}
            onBack={() => goToStep('oura-fragility-q4')}
          />
        );

      case 'quiz-q1':
      case 'quiz-q2':
      case 'quiz-q3':
      case 'quiz-q4':
      case 'quiz-q5': {
        const question = getQuizQuestion(state.step);
        if (!question) return null;

        return (
          <QuizQuestionScreen
            questionIndex={currentQuizIndex}
            question={question}
            selectedAnswer={state.answers[question.id as keyof QuizAnswers]}
            totalQuestions={5}
            onSelect={(answer) => setAnswer(question.id, answer)}
            onContinue={goToNextQuizStep}
            onBack={goToPrevQuizStep}
            showBack={currentQuizIndex > 0}
          />
        );
      }

      case 'result':
        if (!state.profile) return null;
        return (
          <ResultScreen
            profile={state.profile}
            onViewWindows={handleViewWindows}
            onRetake={handleRetake}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div>
      {state.step !== 'result' && (
        <h1 style={{ ...typography.h1, marginBottom: spacing.lg }}>
          Chronotype
        </h1>
      )}
      {renderStep()}
    </div>
  );
}
