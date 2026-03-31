import { useState } from 'react';
import type { Opening, AppPage } from './types';
import { HomePage } from './pages/HomePage';
import { OpeningBrowserPage } from './pages/OpeningBrowserPage';
import { OpeningDetailPage } from './pages/OpeningDetailPage';
import { TrainingPage } from './pages/TrainingPage';

function App() {
  const [page, setPage] = useState<AppPage>('home');
  const [selectedColor, setSelectedColor] = useState<'white' | 'black'>('white');
  const [selectedOpening, setSelectedOpening] = useState<Opening | null>(null);

  const goHome = () => setPage('home');
  const goBrowser = (color: 'white' | 'black') => {
    setSelectedColor(color);
    setPage('browser');
  };
  const goDetail = (opening: Opening) => {
    setSelectedOpening(opening);
    setPage('detail');
  };
  const goTraining = (opening: Opening) => {
    setSelectedOpening(opening);
    setPage('training');
  };

  return (
    <div className="app">
      {/* ── Navigation ── */}
      <nav className="nav">
        <div className="nav-logo" onClick={goHome}>
          <span className="nav-logo-icon">♛</span>
          <span>ChessOpener</span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {page !== 'home' && (
            <button className="nav-btn" onClick={() => setPage('browser')}>
              📚 Browse
            </button>
          )}
          {page !== 'home' && (
            <button className="nav-btn" onClick={goHome}>
              ← Home
            </button>
          )}
        </div>
      </nav>

      {/* ── Pages ── */}
      <main className="page">
        {page === 'home' && (
          <HomePage onSelectColor={goBrowser} />
        )}
        {page === 'browser' && (
          <OpeningBrowserPage
            color={selectedColor}
            onStudy={goDetail}
            onTrain={goTraining}
          />
        )}
        {page === 'detail' && selectedOpening && (
          <OpeningDetailPage
            opening={selectedOpening}
            onTrain={() => goTraining(selectedOpening)}
            onBack={() => setPage('browser')}
          />
        )}
        {page === 'training' && selectedOpening && (
          <TrainingPage
            opening={selectedOpening}
            onBack={() => setPage('detail')}
          />
        )}
      </main>
    </div>
  );
}

export default App;
