import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { TimeStructure } from './TimeStructure.js';
import { DailyView } from './DailyView.js';
import { Chronotype } from './Chronotype.js';
import { Constraints } from './Constraints.js';

export function App() {
  return (
    <BrowserRouter>
      <div style={{ fontFamily: 'system-ui, sans-serif', padding: '1rem' }}>
        <nav style={{ marginBottom: '1rem' }}>
          <Link to="/" style={{ marginRight: '1rem' }}>Daily View</Link>
          <Link to="/time-structure" style={{ marginRight: '1rem' }}>Time Structure</Link>
          <Link to="/chronotype" style={{ marginRight: '1rem' }}>Chronotype</Link>
          <Link to="/constraints">Constraints</Link>
        </nav>
        <Routes>
          <Route path="/" element={<DailyView />} />
          <Route path="/time-structure" element={<TimeStructure />} />
          <Route path="/chronotype" element={<Chronotype />} />
          <Route path="/constraints" element={<Constraints />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
