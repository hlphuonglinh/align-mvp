import type { PlanInputs, PlanOutputs, ReliabilityWindow, GovernanceDecision } from './types.js';

/**
 * Main computation pipeline.
 * Takes inputs (chronotype, constraints, busyBlocks) and produces
 * reliability windows and governance decisions.
 *
 * Stubbed implementation for MVP architecture.
 */
export function computePlan(inputs: PlanInputs): PlanOutputs {
  const reliabilityWindows: ReliabilityWindow[] = [];
  const decisions: GovernanceDecision[] = [];

  // If no chronotype provided, return empty but valid output
  if (!inputs.chronotype) {
    return { reliabilityWindows, decisions };
  }

  // Stub: Generate reliability windows from chronotype peak windows
  if (inputs.chronotype.peakWindows) {
    for (const window of inputs.chronotype.peakWindows.focus) {
      reliabilityWindows.push({
        window,
        mode: 'focus',
        reliability: 'high',
      });
    }
    for (const window of inputs.chronotype.peakWindows.creative) {
      reliabilityWindows.push({
        window,
        mode: 'creative',
        reliability: 'high',
      });
    }
    for (const window of inputs.chronotype.peakWindows.administrative) {
      reliabilityWindows.push({
        window,
        mode: 'administrative',
        reliability: 'medium',
      });
    }
  }

  // Stub: Generate governance decisions
  // PERMIT for peak windows, WARN for medium energy, SILENCE for low energy
  for (const rw of reliabilityWindows) {
    decisions.push({
      verdict: rw.reliability === 'high' ? 'PERMIT' : 'WARN',
      reason: `${rw.mode} mode ${rw.reliability} reliability`,
      window: rw.window,
    });
  }

  // If there are constraints marked as 'block', add SILENCE decisions
  if (inputs.constraints) {
    for (const constraint of inputs.constraints) {
      if (constraint.type === 'block') {
        decisions.push({
          verdict: 'SILENCE',
          reason: `Blocked by constraint: ${constraint.label}`,
          window: constraint.window,
        });
      }
    }
  }

  return { reliabilityWindows, decisions };
}
