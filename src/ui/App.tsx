import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { DailyView } from './DailyView.js';
import { Chronotype } from './Chronotype.js';
import { Constraints } from './Constraints.js';
import { loadChronotypeProfile, loadConstraints, loadDailyLogs } from '../storage/index.js';
import { generateBaselineWindows } from '../baseline/index.js';
import { evaluateDay } from '../governor/index.js';
import { constraintsToBusyBlocks } from '../constraints/index.js';
import { exportDayToICS } from '../export/index.js';
import type { ChronotypeProfile } from '../types.js';
import { colors, glass, radius, spacing, transitions } from './tokens.js';

/**
 * Determines the appropriate route based on data state.
 * Onboarding flow:
 * 1. No chronotype => /chronotype (first-time setup)
 * 2. Otherwise => null (no redirect - Day always renders)
 *
 * IMPORTANT: Day view must NEVER redirect to constraints/unavailable times.
 * Silence is a valid state.
 */
function getOnboardingRoute(profile: ChronotypeProfile | null): string | null {
  if (!profile) {
    return '/chronotype';
  }
  return null; // No redirect needed - Day can always render
}

function OnboardingRedirect() {
  const [profile, setProfile] = useState<ChronotypeProfile | null>(null);
  const [loaded, setLoaded] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setProfile(loadChronotypeProfile());
    setLoaded(true);
  }, []);

  // Reload on focus to detect changes from other tabs
  useEffect(() => {
    const handleFocus = () => {
      setProfile(loadChronotypeProfile());
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  if (!loaded) {
    return null;
  }

  const redirectTo = getOnboardingRoute(profile);

  // Only redirect from home page if onboarding needed
  if (location.pathname === '/' && redirectTo) {
    return <Navigate to={redirectTo} replace />;
  }

  return null;
}

function Navigation({ onExportICS, onExportJSON }: { onExportICS: () => void; onExportJSON: () => void }) {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Day' },
    { path: '/chronotype', label: 'Chronotype' },
    { path: '/constraints', label: 'Unavailable times' },
  ];

  return (
    <nav style={{
      marginBottom: spacing.xl,
      padding: `${spacing.md} ${spacing.lg}`,
      ...glass.surface,
      borderRadius: radius.lg,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    }}>
      <div style={{ display: 'flex', gap: spacing.xs }}>
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            style={{
              padding: `${spacing.sm} ${spacing.md}`,
              borderRadius: radius.sm,
              background: location.pathname === item.path
                ? colors.bg.hover
                : 'transparent',
              color: location.pathname === item.path
                ? colors.text.primary
                : colors.text.secondary,
              fontWeight: location.pathname === item.path ? 600 : 400,
              textDecoration: 'none',
              fontSize: '0.875rem',
              transition: `background ${transitions.normal}`,
            }}
          >
            {item.label}
          </Link>
        ))}
      </div>
      <div style={{ display: 'flex', gap: spacing.sm, alignItems: 'center' }}>
        <button
          onClick={onExportICS}
          style={{
            padding: `${spacing.sm} ${spacing.lg}`,
            background: colors.text.primary,
            color: colors.bg.page,
            border: 'none',
            borderRadius: radius.sm,
            fontSize: '0.8125rem',
            fontWeight: 500,
            cursor: 'pointer',
            transition: `opacity ${transitions.normal}`,
          }}
        >
          Export calendar
        </button>
        <button
          onClick={onExportJSON}
          style={{
            padding: `${spacing.sm} ${spacing.md}`,
            background: 'none',
            border: 'none',
            color: colors.text.muted,
            cursor: 'pointer',
            fontSize: '0.75rem',
          }}
        >
          Raw data
        </button>
      </div>
    </nav>
  );
}

function AppContent() {
  /**
   * Export today's mode windows as ICS calendar file.
   * Primary export action.
   */
  const handleExportICS = () => {
    const profile = loadChronotypeProfile();
    const constraints = loadConstraints();

    const today = new Date();
    const dayISO = today.toISOString().split('T')[0];

    const dayBaselineWindows = generateBaselineWindows(profile, dayISO);
    const unavailableBlocks = constraintsToBusyBlocks(constraints, dayISO);

    const dayDecisions = evaluateDay({
      profile,
      busyBlocks: unavailableBlocks,
      baselineWindows: dayBaselineWindows,
      dayISODate: dayISO,
    });

    exportDayToICS(dayDecisions, dayISO);
  };

  /**
   * Export raw data as JSON file.
   * Secondary export action.
   */
  const handleExportJSON = () => {
    const profile = loadChronotypeProfile();
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

      const unavailableBlocks = constraintsToBusyBlocks(constraints, dayISO);

      const dayDecisions = evaluateDay({
        profile,
        busyBlocks: unavailableBlocks,
        baselineWindows: dayBaselineWindows,
        dayISODate: dayISO,
      });
      governorDecisionsByDay[dayISO] = dayDecisions;
    }

    const exportData = {
      exportedAtISO: new Date().toISOString(),
      chronotypeProfile: profile,
      unavailableTimes: constraints,
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
    <div style={{
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      padding: spacing.xl,
      maxWidth: '800px',
      margin: '0 auto',
      minHeight: '100vh',
      background: `linear-gradient(180deg, ${colors.bg.page} 0%, ${colors.bg.elevated} 100%)`,
      color: colors.text.primary,
    }}>
      <OnboardingRedirect />
      <Navigation onExportICS={handleExportICS} onExportJSON={handleExportJSON} />
      <Routes>
        <Route path="/" element={<DailyView />} />
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
