import { useState, useEffect } from 'react';
import type { QuizAnswers, ChronotypeProfile } from '../types.js';
import { QUIZ_QUESTIONS, scoreChronotype, isQuizComplete } from '../quiz/index.js';
import { loadChronotypeProfile, saveChronotypeProfile, clearChronotypeProfile } from '../storage/index.js';

export function Chronotype() {
  const [answers, setAnswers] = useState<QuizAnswers>({});
  const [profile, setProfile] = useState<ChronotypeProfile | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);

  useEffect(() => {
    const stored = loadChronotypeProfile();
    setProfile(stored);
  }, []);

  const handleAnswer = (questionId: string, value: number) => {
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
        <h1>Chronotype</h1>

        {!profile && !showQuiz ? (
          <div>
            <p>No chronotype profile found.</p>
            <button onClick={handleStartQuiz}>Take Quiz</button>
          </div>
        ) : (
          <>
            <p>Answer all questions to determine your chronotype.</p>

            {QUIZ_QUESTIONS.map((question, qIndex) => (
              <div key={question.id} style={{ marginBottom: '1.5rem' }}>
                <p style={{ fontWeight: 'bold' }}>
                  {qIndex + 1}. {question.text}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {question.options.map(option => (
                    <label key={option.value} style={{ cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name={question.id}
                        value={option.value}
                        checked={answers[question.id as keyof QuizAnswers] === option.value}
                        onChange={() => handleAnswer(question.id, option.value)}
                      />{' '}
                      {option.label}
                    </label>
                  ))}
                </div>
              </div>
            ))}

            <div style={{ marginTop: '1rem' }}>
              <button
                onClick={handleSubmit}
                disabled={!isQuizComplete(answers)}
              >
                Submit
              </button>
              {profile && (
                <button
                  onClick={() => setShowQuiz(false)}
                  style={{ marginLeft: '0.5rem' }}
                >
                  Cancel
                </button>
              )}
            </div>

            {!isQuizComplete(answers) && (
              <p style={{ color: '#666', marginTop: '0.5rem' }}>
                Answer all questions to submit.
              </p>
            )}
          </>
        )}
      </div>
    );
  }

  // At this point, profile is guaranteed to be non-null
  // because we return early if showQuiz || !profile
  const currentProfile = profile!;

  // Show result
  return (
    <div>
      <h1>Chronotype</h1>

      <div style={{ marginBottom: '1rem', padding: '1rem', border: '1px solid #ccc' }}>
        <p>
          <strong>Type:</strong> {currentProfile.chronotype}
        </p>
        <p>
          <strong>Confidence:</strong> {currentProfile.confidence}
        </p>
        <p style={{ color: '#666', fontSize: '0.875rem' }}>
          Computed: {new Date(currentProfile.computedAt).toLocaleString()}
        </p>
      </div>

      {currentProfile.confidence === 'LOW' && (
        <p style={{ color: '#666', marginBottom: '1rem' }}>
          Confidence insufficient. Baseline windows silenced.
        </p>
      )}

      <button onClick={handleRetake}>Retake Quiz</button>
    </div>
  );
}
