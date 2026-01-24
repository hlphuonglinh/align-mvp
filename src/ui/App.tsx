import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { TimeStructure } from './TimeStructure.js';
import { DailyView } from './DailyView.js';
import { Chronotype } from './Chronotype.js';
import { Constraints } from './Constraints.js';
import { loadChronotypeProfile, loadConstraints, loadBusyBlocks, loadDailyLogs } from '../storage/index.js';
import { generateBaselineWindows } from '../baseline/index.js';
import { evaluateDay } from '../governor/index.js';
import { getBlocksForDate } from '../calendar/busyBlocks.js';
import { constraintsToBusyBlocks } from '../constraints/index.js';
import type { ChronotypeProfile } from '../types.js';
import type { V1Constraint } from '../constraints/types.js';

/**
 * Determines the appropriate route based on data state.
 * Onboarding flow:
 * 1. No chronotype => /chronotype
 * 2. Chronotype exists but no constraints => /constraints
 * 3. Otherwise => / (Day view)
 */
function getOnboardingRoute(
  profile: ChronotypeProfile | null,
  constraints: V1Constraint[]
): string | null {
  if (!profile) {
    return '/chronotype';
  }
  if (constraints.length === 0) {
    return '/constraints';
  }
  return null; // No redirect needed
}

function OnboardingRedirect() {
  const [profile, setProfile] = useState<ChronotypeProfile | null>(null);
  const [constraints, setConstraints] = useState<V1Constraint[]>([]);
  const [loaded, setLoaded] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setProfile(loadChronotypeProfile());
    setConstraints(loadConstraints());
    setLoaded(true);
  }, []);

  // Reload on focus to detect changes from other tabs
  useEffect(() => {
    const handleFocus = () => {
      setProfile(loadChronotypeProfile());
      setConstraints(loadConstraints());
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  if (!loaded) {
    return null;
  }

  const redirectTo = getOnboardingRoute(profile, constraints);

  // Only redirect from home page if onboarding needed
  if (location.pathname === '/' && redirectTo) {
    return <Navigate to={redirectTo} replace />;
  }

  return null;
}

function Navigation({ onExport }: { onExport: () => void }) {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Day' },
    { path: '/time-structure', label: 'Time Structure' },
    { path: '/chronotype', label: 'Chronotype' },
    { path: '/constraints', label: 'Constraints' },
  ];

  return (
    <nav style={{
      marginBottom: '1rem',
      paddingBottom: '0.5rem',
      borderBottom: '1px solid #ddd',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    }}>
      <div>
        {navItems.map((item, index) => (
          <Link
            key={item.path}
            to={item.path}
            style={{
              marginRight: index < navItems.length - 1 ? '1rem' : 0,
              fontWeight: location.pathname === item.path ? 'bold' : 'normal',
              textDecoration: location.pathname === item.path ? 'none' : 'underline',
            }}
          >
            {item.label}
          </Link>
        ))}
      </div>
      <button onClick={onExport} style={{ padding: '0.25rem 0.5rem' }}>
        Export
      </button>
    </nav>
  );
}

function AppContent() {
  const handleExport = () => {
    const profile = loadChronotypeProfile();
    const blocks = loadBusyBlocks();
    const constraints = loadConstraints();
    const dailyLogs = loadDailyLogs();

    const today = new Date();
    const baselineWindowsByDay: Record<string, unknown[]> = {};
    const governorDecisionsByDay: Record<string, unknown[]> = {};

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dayISO = date.toISOString().split('T')[0];

      const dayBaselineWindows = generateBaselineWindows(profile, dayISO);
      baselineWindowsByDay[dayISO] = dayBaselineWindows;

      const dayConstraintBlocks = constraintsToBusyBlocks(constraints, dayISO);
      const dayBusyBlocks = getBlocksForDate(blocks, date);
      const allDayBlocks = [...dayBusyBlocks, ...dayConstraintBlocks];

      const dayDecisions = evaluateDay({
        profile,
        busyBlocks: allDayBlocks,
        baselineWindows: dayBaselineWindows,
        dayISODate: dayISO,
      });
      governorDecisionsByDay[dayISO] = dayDecisions;
    }

    const exportData = {
      exportedAtISO: new Date().toISOString(),
      chronotypeProfile: profile,
      busyBlocks: blocks,
      constraints: constraints,
      baselineWindows: baselineWindowsByDay,
      governorDecisions: governorDecisionsByDay,
      dailyLogs: dailyLogs,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `align-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: '1rem', maxWidth: '800px' }}>
      <OnboardingRedirect />
      <Navigation onExport={handleExport} />
      <Routes>
        <Route path="/" element={<DailyView />} />
        <Route path="/time-structure" element={<TimeStructure />} />
        <Route path="/chronotype" element={<Chronotype />} />
        <Route path="/constraints" element={<Constraints />} />
      </Routes>
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
