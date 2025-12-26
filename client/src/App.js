import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Header from "./components/Header";

import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage"; 
import DashboardPage from "./pages/DashboardPage"; 
import IncomePage from './pages/IncomePage';
import ExpensePage from './pages/ExpensePage';
import InvestmentPage from './pages/InvestmentPage';
import LimitsPage from './pages/LimitsPage';
import OnboardingPage from "./pages/Onboarding";

// Inside <Routes>:



function App() {
  return (
    <AuthProvider>
      <Router>
        <Header />
        <Routes>
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/income"
            element={
              <ProtectedRoute>
                <IncomePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/expense"
            element={
              <ProtectedRoute>
                <ExpensePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/investment"
            element={
              <ProtectedRoute>
                <InvestmentPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/limits"
            element={
              <ProtectedRoute>
                <LimitsPage />
              </ProtectedRoute>
            }
          />
    
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
