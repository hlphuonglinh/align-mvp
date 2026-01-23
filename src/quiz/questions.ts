/**
 * Quiz questions for chronotype determination.
 * Neutral tone, no motivational language.
 */

export interface QuizQuestion {
  id: string;
  text: string;
  options: QuizOption[];
}

export interface QuizOption {
  value: number;
  label: string;
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'q1',
    text: 'When do you naturally wake without an alarm?',
    options: [
      { value: 1, label: 'Before 6:00' },
      { value: 2, label: '6:00–7:30' },
      { value: 3, label: '7:30–9:00' },
      { value: 4, label: '9:00–10:30' },
      { value: 5, label: 'After 10:30' },
    ],
  },
  {
    id: 'q2',
    text: 'When do you feel most alert for demanding tasks?',
    options: [
      { value: 1, label: 'Early morning (5:00–8:00)' },
      { value: 2, label: 'Mid-morning (8:00–11:00)' },
      { value: 3, label: 'Midday (11:00–14:00)' },
      { value: 4, label: 'Afternoon (14:00–17:00)' },
      { value: 5, label: 'Evening (17:00+)' },
    ],
  },
  {
    id: 'q3',
    text: 'If you had no obligations, when would you go to sleep?',
    options: [
      { value: 1, label: 'Before 21:00' },
      { value: 2, label: '21:00–22:30' },
      { value: 3, label: '22:30–00:00' },
      { value: 4, label: '00:00–01:30' },
      { value: 5, label: 'After 01:30' },
    ],
  },
  {
    id: 'q4',
    text: 'How do you feel 30 minutes after waking?',
    options: [
      { value: 1, label: 'Fully alert' },
      { value: 2, label: 'Mostly alert' },
      { value: 3, label: 'Somewhat alert' },
      { value: 4, label: 'Somewhat groggy' },
      { value: 5, label: 'Very groggy' },
    ],
  },
  {
    id: 'q5',
    text: 'When does your energy typically decline?',
    options: [
      { value: 1, label: 'Early afternoon (13:00–15:00)' },
      { value: 2, label: 'Late afternoon (15:00–17:00)' },
      { value: 3, label: 'Early evening (17:00–19:00)' },
      { value: 4, label: 'Late evening (19:00–21:00)' },
      { value: 5, label: 'Night (21:00+)' },
    ],
  },
];
