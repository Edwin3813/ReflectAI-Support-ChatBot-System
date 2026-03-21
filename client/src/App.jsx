import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ChatPage from "./pages/ChatPage";
import AdminMetricsPage from "./pages/AdminMetricsPage";
import AdminFeedbackPage from "./pages/AdminFeedbackPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing page */}
        <Route path="/" element={<HomePage />} />

        {/* Auth */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Main App */}
        <Route path="/chat" element={<ChatPage />} />

        {/* Admin */}
        <Route path="/admin/metrics" element={<AdminMetricsPage />} />
        <Route path="/admin/feedback" element={<AdminFeedbackPage />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}