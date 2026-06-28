import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { MainLayout }      from "./components/layout/MainLayout";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import { useAuth }         from "./context/AuthContext";

// Public Pages
import { LandingPage }  from "./pages/public/LandingPage";
import { Login }        from "./pages/auth/Login";
import { Register }     from "./pages/auth/Register";

// Dashboard Pages
import { Overview }        from "./pages/dashboard/Overview";
import { UploadMaterial }  from "./pages/dashboard/UploadMaterial";
import { AISummaries }     from "./pages/dashboard/AISummaries";
import { Flashcards }      from "./pages/dashboard/Flashcards";
import { Quizzes }         from "./pages/dashboard/Quizzes";
import { StudyPlanner }    from "./pages/dashboard/StudyPlanner";
import { Analytics }       from "./pages/dashboard/Analytics";
import { Profile }         from "./pages/dashboard/Profile";


// ── Loading spinner ───────────────────────────────────────────────────────────

function AuthLoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}


// ── ProtectedRoute ────────────────────────────────────────────────────────────
/**
 * Redirects unauthenticated users to /login.
 * Shows a spinner while the auth state is being hydrated.
 */
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading)          return <AuthLoadingSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return children;
}


// ── RoleRoute ─────────────────────────────────────────────────────────────────
/**
 * Extends ProtectedRoute to enforce RBAC.
 *
 * Usage:
 *   <RoleRoute allowedRoles={["admin"]}>
 *     <AdminDashboard />
 *   </RoleRoute>
 *
 * - Unauthenticated → /login
 * - Authenticated but wrong role → /dashboard (or custom `fallback` prop)
 */
function RoleRoute({ children, allowedRoles = [], fallback = "/dashboard" }) {
  const { isAuthenticated, loading, role } = useAuth();

  if (loading)          return <AuthLoadingSpinner />;
  if (!isAuthenticated) return <Navigate to="/login"  replace />;

  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    console.warn(
      `[RoleRoute] Access denied: user role "${role}" not in [${allowedRoles.join(", ")}]`
    );
    return <Navigate to={fallback} replace />;
  }

  return children;
}


// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ================= PUBLIC ROUTES ================= */}
        <Route element={<MainLayout />}>
          <Route path="/"         element={<LandingPage />} />
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>

        {/* ================= PROTECTED ROUTES ================= */}
        <Route
          path="/dashboard/*"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index           element={<Overview />} />
          <Route path="upload"   element={<UploadMaterial />} />
          <Route path="summaries" element={<AISummaries />} />
          <Route path="flashcards" element={<Flashcards />} />
          <Route path="quizzes"  element={<Quizzes />} />
          <Route path="planner"  element={<StudyPlanner />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="profile"  element={<Profile />} />
        </Route>

        {/*
          Example: Admin-only route (uncomment when you have an admin page)

          <Route
            path="/admin/*"
            element={
              <RoleRoute allowedRoles={["admin"]}>
                <AdminLayout />
              </RoleRoute>
            }
          />
        */}

      </Routes>
    </BrowserRouter>
  );
}

// Export guards for use in other files if needed
export { ProtectedRoute, RoleRoute };
