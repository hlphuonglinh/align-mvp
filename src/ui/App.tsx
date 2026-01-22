import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { TimeStructure } from './TimeStructure.js';
import { DailyView } from './DailyView.js';

export function App() {
  return (
    <BrowserRouter>
      <div style={{ fontFamily: 'system-ui, sans-serif', padding: '1rem' }}>
        <nav style={{ marginBottom: '1rem' }}>
          <Link to="/" style={{ marginRight: '1rem' }}>Daily View</Link>
          <Link to="/time-structure">Time Structure</Link>
        </nav>
        <Routes>
          <Route path="/" element={<DailyView />} />
          <Route path="/time-structure" element={<TimeStructure />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
