import { useState, useEffect } from 'react';
import type { QuizAnswers, ChronotypeProfile, Chronotype as ChronotypeType } from '../types.js';
import { QUIZ_QUESTIONS, scoreChronotype, isQuizComplete } from '../quiz/index.js';
import { loadChronotypeProfile, saveChronotypeProfile, clearChronotypeProfile } from '../storage/index.js';
import { CHRONOTYPE_COPY, type ChronotypeCopy } from '../canon/chronotype_copy.js';
import { colors, glass, radius, spacing, typography, transitions } from './tokens.js';

const ALL_CHRONOTYPES: ChronotypeType[] = ['AURORA', 'DAYBREAK', 'MERIDIAN', 'TWILIGHT', 'NOCTURNE'];

/**
 * Renders chronotype detail content (hook, paragraph, bullets, helps, prevalence).
 */
function ChronotypeDetails({ copy }: { copy: ChronotypeCopy }) {
  return (
    <>
      {/* Hook */}
      <p style={{
        ...typography.body,
        fontWeight: 500,
        color: colors.text.primary,
        marginBottom: spacing.md,
        lineHeight: 1.5,
      }}>
        {copy.hook}
      </p>

      {/* Paragraph */}
      <p style={{
        ...typography.bodySmall,
        color: colors.text.secondary,
        marginBottom: spacing.lg,
        lineHeight: 1.6,
      }}>
        {copy.paragraph}
      </p>

      {/* What you might recognize */}
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

      {/* How Align helps */}
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

      {/* Prevalence */}
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

/**
 * Expandable item for a single chronotype in the "Other chronotypes" section.
 */
function OtherChronotypeItem({ chronotype }: { chronotype: ChronotypeType }) {
  const [expanded, setExpanded] = useState(false);
  const copy = CHRONOTYPE_COPY[chronotype];

  return (
    <div style={{
      borderBottom: `1px solid ${colors.border.subtle}`,
    }}>
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
          style={{
            padding: `0 ${spacing.md} ${spacing.md} ${spacing.md}`,
          }}
        >
          <ChronotypeDetails copy={copy} />
        </div>
      )}
    </div>
  );
}

export function Chronotype() {
  const [answers, setAnswers] = useState<QuizAnswers>({});
  const [profile, setProfile] = useState<ChronotypeProfile | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [otherChronotypesExpanded, setOtherChronotypesExpanded] = useState(false);

  useEffect(() => {
    const stored = loadChronotypeProfile();
    setProfile(stored);
  }, []);

  const handleAnswer = (questionId: string, value: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleSubmit = () => {
    const result = scoreChronotype(answers);
    saveChronotypeProfile(result);
    setProfile(result);
    setShowQuiz(false);
  };

  const handleRetake = () => {
    clearChronotypeProfile();
    setProfile(null);
    setAnswers({});
    setShowQuiz(true);
  };

  const handleStartQuiz = () => {
    setAnswers({});
    setShowQuiz(true);
  };

  // Show quiz
  if (showQuiz || (!profile && !showQuiz)) {
    return (
      <div>
        <h1 style={{
          ...typography.h1,
          marginBottom: spacing.lg,
        }}>
          Chronotype
        </h1>

        {!profile && !showQuiz ? (
          <div style={{
            ...glass.card,
            borderRadius: radius.xl,
            padding: spacing.xl,
          }}>
            <p style={{
              ...typography.bodySmall,
              color: colors.text.secondary,
              marginBottom: spacing.lg,
            }}>
              No chronotype profile found.
            </p>
            <button
              onClick={handleStartQuiz}
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
              Take Quiz
            </button>
          </div>
        ) : (
          <div style={{
            ...glass.card,
            borderRadius: radius.xl,
            padding: spacing.xl,
          }}>
            <p style={{
              ...typography.bodySmall,
              color: colors.text.secondary,
              marginBottom: spacing.xl,
            }}>
              Answer all questions to determine your chronotype.
            </p>

            {QUIZ_QUESTIONS.map((question, qIndex) => (
              <div key={question.id} style={{ marginBottom: spacing.xl }}>
                <p style={{
                  ...typography.body,
                  fontWeight: 500,
                  color: colors.text.primary,
                  marginBottom: spacing.md,
                }}>
                  {qIndex + 1}. {question.text}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
                  {question.options.map(option => (
                    <label
                      key={option.key}
                      style={{
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: spacing.sm,
                        padding: `${spacing.sm} ${spacing.md}`,
                        borderRadius: radius.sm,
                        background: answers[question.id as keyof QuizAnswers] === option.key
                          ? colors.bg.active
                          : 'transparent',
                        transition: `background ${transitions.normal}`,
                      }}
                    >
                      <input
                        type="radio"
                        name={question.id}
                        value={option.key}
                        checked={answers[question.id as keyof QuizAnswers] === option.key}
                        onChange={() => handleAnswer(question.id, option.key)}
                        style={{ accentColor: colors.accent.primary }}
                      />{' '}
                      <span style={{
                        ...typography.bodySmall,
                        color: colors.text.secondary,
                      }}>
                        {option.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}

            <div style={{ marginTop: spacing.xl, display: 'flex', gap: spacing.md }}>
              <button
                onClick={handleSubmit}
                disabled={!isQuizComplete(answers)}
                style={{
                  ...typography.bodySmall,
                  background: isQuizComplete(answers)
                    ? colors.text.primary
                    : colors.bg.hover,
                  color: isQuizComplete(answers) ? colors.bg.page : colors.text.muted,
                  border: 'none',
                  borderRadius: radius.md,
                  padding: `${spacing.md} ${spacing.xl}`,
                  fontWeight: 500,
                  cursor: isQuizComplete(answers) ? 'pointer' : 'not-allowed',
                }}
              >
                Submit
              </button>
              {profile && (
                <button
                  onClick={() => setShowQuiz(false)}
                  style={{
                    ...typography.bodySmall,
                    background: colors.bg.hover,
                    color: colors.text.secondary,
                    border: 'none',
                    borderRadius: radius.md,
                    padding: `${spacing.md} ${spacing.xl}`,
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              )}
            </div>

            {!isQuizComplete(answers) && (
              <p style={{
                ...typography.caption,
                color: colors.text.muted,
                marginTop: spacing.md,
              }}>
                Answer all questions to submit.
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  // At this point, profile is guaranteed to be non-null
  const currentProfile = profile!;
  const copy = CHRONOTYPE_COPY[currentProfile.chronotype];
  const otherChronotypes = ALL_CHRONOTYPES.filter(c => c !== currentProfile.chronotype);

  // Show result with always-visible details
  return (
    <div>
      <h1 style={{
        ...typography.h1,
        marginBottom: spacing.lg,
      }}>
        Chronotype
      </h1>

      {/* Profile summary card */}
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
            fontSize: '1.25rem',
            fontWeight: 600,
            color: colors.text.primary,
          }}>
            {currentProfile.chronotype}
          </span>
          <span style={{
            ...typography.label,
            color: currentProfile.confidence === 'HIGH' ? colors.status.permit.dot
              : currentProfile.confidence === 'MED' ? colors.status.fragmented.dot
              : colors.text.muted,
          }}>
            {currentProfile.confidence} confidence
          </span>
        </div>
        <p style={{
          ...typography.caption,
          color: colors.text.muted,
        }}>
          Computed {new Date(currentProfile.computedAt).toLocaleDateString()}
        </p>
      </div>

      {currentProfile.confidence === 'LOW' && (
        <div style={{
          padding: spacing.lg,
          marginBottom: spacing.lg,
          background: colors.bg.subtle,
          border: `1px solid ${colors.border.subtle}`,
          borderRadius: radius.lg,
          ...typography.bodySmall,
          color: colors.text.secondary,
        }}>
          Confidence insufficient. Baseline windows silenced.
        </div>
      )}

      {/* User's chronotype details - always visible */}
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

      {/* Other chronotypes - collapsible */}
      <div style={{
        background: colors.bg.subtle,
        border: `1px solid ${colors.border.subtle}`,
        borderRadius: radius.lg,
        marginBottom: spacing.xl,
        overflow: 'hidden',
      }}>
        <button
          onClick={() => setOtherChronotypesExpanded(!otherChronotypesExpanded)}
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
            transform: otherChronotypesExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: `transform ${transitions.normal}`,
            fontSize: '0.625rem',
            color: colors.text.muted,
          }}>
            ▼
          </span>
        </button>

        {otherChronotypesExpanded && (
          <div data-testid="other-chronotypes-content">
            {otherChronotypes.map((chronotype) => (
              <OtherChronotypeItem key={chronotype} chronotype={chronotype} />
            ))}
          </div>
        )}
      </div>

      <button
        onClick={handleRetake}
        style={{
          ...typography.bodySmall,
          background: colors.bg.hover,
          color: colors.text.secondary,
          border: 'none',
          borderRadius: radius.md,
          padding: `${spacing.md} ${spacing.xl}`,
          fontWeight: 500,
          cursor: 'pointer',
        }}
      >
        Retake Quiz
      </button>
    </div>
  );
}
