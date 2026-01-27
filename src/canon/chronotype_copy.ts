import type { Chronotype } from '../types.js';

/**
 * Canonical chronotype copy.
 * VERBATIM from UX spec. Do not paraphrase.
 */
export interface ChronotypeCopy {
  hook: string;
  paragraph: string;
  bullets: string[];
  alignHelps: string;
  prevalence: string;
}

export const CHRONOTYPE_COPY: Record<Chronotype, ChronotypeCopy> = {
  AURORA: {
    hook: 'You are sharp in the morning, and decisions feel heavier as the day goes on.',
    paragraph: 'People with an Aurora chronotype tend to feel most capable of deciding and thinking things through early in the day. As time passes, the same decisions often feel more tiring, slower, or easier to postpone.',
    bullets: [
      'In the morning, you decide faster and second-guess less.',
      'You prefer to tackle important questions early.',
      'Later in the day, small decisions feel more annoying than they should.',
      'By evening, thinking things through can feel like effort rather than flow.',
    ],
    alignHelps: 'Align uses this as a baseline for when decision making is usually reliable, then checks whether your day supports or blocks it. It does not tell you what to do. It only tells you when the conditions are there.',
    prevalence: 'About 10 to 15 percent of people show strongly early circadian patterns.',
  },
  DAYBREAK: {
    hook: 'You often start deciding before your thinking is fully there.',
    paragraph: 'With a Daybreak chronotype, mornings are functional, but they cost more than they should. Decisions take extra effort early, then become easier and more stable later, often without a clear signal that the shift has happened.',
    bullets: [
      'You can work in the morning, but it feels heavier than it should.',
      'Early decisions take more concentration.',
      'Late mornings feel like a release.',
      'Once things settle, thinking stays steady for hours.',
    ],
    alignHelps: 'Align shows when effort drops and reliability rises, so you stop spending judgment too early.',
    prevalence: 'About 20 to 25 percent of people fall into slightly early circadian patterns.',
  },
  MERIDIAN: {
    hook: 'You don\'t feel when conditions are wrong, even though they still affect your decisions.',
    paragraph: 'With a Meridian chronotype, thinking feels available most of the day. Because there is no clear sense of too early or too late, it is easy to trust judgment even when context quietly undermines it.',
    bullets: [
      'You can decide at almost any hour.',
      'Nothing clearly tells you to pause.',
      'Meetings and interruptions feel manageable in the moment.',
      'When decisions fail, the cause is hard to pinpoint.',
    ],
    alignHelps: 'Align surfaces when context supports reliable judgment, and when it does not, even if everything feels fine.',
    prevalence: 'About 30 to 40 percent of people fall near the middle of the circadian distribution.',
  },
  TWILIGHT: {
    hook: 'You don\'t feel when speed replaces depth early in the day.',
    paragraph: 'With a Twilight chronotype, mornings are productive and fast. Decisions get made quickly. As the day goes on, it becomes easier to slow down, revisit options, and stay with decisions long enough to think them through fully.',
    bullets: [
      'You move quickly early in the day.',
      'Routine decisions feel easy in the morning.',
      'Bigger decisions feel easier to sit with later.',
      'Follow-through and nuance improve as the day goes on.',
    ],
    alignHelps: 'Align distinguishes between moments that favor speed and moments that support deeper decision making.',
    prevalence: 'About 15 to 20 percent of people show moderately late circadian patterns.',
  },
  NOCTURNE: {
    hook: 'You don\'t feel how much early decisions work against you.',
    paragraph: 'With a Nocturne chronotype, early hours feel effortful even if you push through them. Thinking becomes easier and more stable as external pressure drops.',
    bullets: [
      'Mornings feel draining or resistant.',
      'Early decisions require more effort.',
      'Patience and clarity improve in the evening.',
      'Quiet hours feel easier for thinking.',
    ],
    alignHelps: 'Align avoids early windows and highlights later periods where judgment is more reliable.',
    prevalence: 'About 5 to 10 percent of people show strongly late circadian patterns.',
  },
};
