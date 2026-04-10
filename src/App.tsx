import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { StudentStudyPlanPage } from "./pages/StudentStudyPlanPage";
import { StudyPlanHistoryPage } from "./pages/StudyPlanHistoryPage";

export default function App() {
  return (
    <BrowserRouter>
      <nav className="border-b border-gray-200 bg-white px-4 py-3 text-sm">
        <div className="mx-auto max-w-6xl flex items-center gap-6">
          <span className="font-bold text-blue-700">MentAI</span>
          <Link to="/" className="text-gray-600 hover:text-blue-600">
            Study Plan
          </Link>
          <Link to="/history" className="text-gray-600 hover:text-blue-600">
            History
          </Link>
        </div>
      </nav>
      <Routes>
        <Route path="/" element={<StudentStudyPlanPage />} />
        <Route path="/history" element={<StudyPlanHistoryPage />} />
      </Routes>
    </BrowserRouter>
  );
}
