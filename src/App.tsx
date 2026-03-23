import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Home } from './pages/Home';
import { FairyTalePage } from './pages/FairyTalePage';
import { CustomTextPage } from './pages/CustomTextPage';
import { EnglishStoryPage } from './pages/EnglishStoryPage';
import { ChineseClassicsPage } from './pages/ChineseClassicsPage';
import { BedtimeStoryPage } from './pages/BedtimeStoryPage';
import { InteractiveStoryPage } from './pages/InteractiveStoryPage';
import { AnimalRecognitionPage } from './pages/AnimalRecognitionPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/fairy-tale" element={<FairyTalePage />} />
        <Route path="/interactive-story" element={<InteractiveStoryPage />} />
        <Route path="/animal-recognition" element={<AnimalRecognitionPage />} />
        <Route path="/english-story" element={<EnglishStoryPage />} />
        <Route path="/chinese-classics" element={<ChineseClassicsPage />} />
        <Route path="/bedtime-story" element={<BedtimeStoryPage />} />
        <Route path="/custom-text" element={<CustomTextPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
