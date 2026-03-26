import React from "react";
import {
  BrowserRouter,
  HashRouter,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Header from "./components/Header";
import SplashScreen from "./components/SplashScreen";

import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage"; 
import DashboardPage from "./pages/DashboardPage"; 
import AnalysisPage from "./pages/AnalysisPage";
import IncomePage from './pages/IncomePage';
import ExpensePage from './pages/ExpensePage';
import InvestmentPage from './pages/InvestmentPage';
import LimitsPage from './pages/LimitsPage';
import OnboardingPage from "./pages/Onboarding";
import AccountsPage from "./pages/AccountsPage";

// Inside <Routes>:



const AppRoutes = () => {
  const location = useLocation();
  const { themeMode, setThemeMode } = useTheme();
  const isAppShellRoute = [
    "/dashboard",
    "/analysis",
    "/income",
    "/expense",
    "/investment",
    "/limits",
    "/accounts",
    "/onboarding",
  ].some((path) => location.pathname.startsWith(path));

  return (
    <>
      {!isAppShellRoute && <Header themeMode={themeMode} setThemeMode={setThemeMode} />}
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
            path="/analysis"
            element={
              <ProtectedRoute>
                <AnalysisPage />
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
          <Route
            path="/accounts"
            element={
              <ProtectedRoute>
                <AccountsPage />
              </ProtectedRoute>
            }
          />
    
      </Routes>
    </>
  );
};

function App() {
  const Router = import.meta.env.PROD ? HashRouter : BrowserRouter;
  const [showSplash, setShowSplash] = React.useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return !window.sessionStorage.getItem("pp-splash-shown");
  });

  const handleSplashComplete = React.useCallback(() => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("pp-splash-shown", "1");
    }

    setShowSplash(false);
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <Router
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
          <AppRoutes />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
