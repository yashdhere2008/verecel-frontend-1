import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";

import StudentDashboard from "./pages/Dashboard/studentdashboard.jsx";
import LibrarianDashboard from "./pages/Dashboard/librarianDashboard.jsx";
import AdminDashboard from "./pages/Dashboard/admindashboard.jsx";
import LoginPage from "./pages/login/login.jsx";
import { getDashboardPath } from "./lib/roleRoutes";

function ProtectedRoute({ children, allowedRoles }) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/" replace />;
  const role = (user.role || "").toLowerCase();
  if (!allowedRoles.map((r) => r.toLowerCase()).includes(role)) return <Navigate to="/" replace />;

  return children;
}

function HomeOrRedirect() {
  const { user } = useAuth();
  if (user) {
    return <Navigate to={getDashboardPath(user.role)} replace />;
  }
  return <LoginPage />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomeOrRedirect />} />
          <Route path="/login" element={<HomeOrRedirect />} />

          <Route
            path="/student-dashboard"
            element={
              <ProtectedRoute allowedRoles={["student"]}>
                <StudentDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/librarian-dashboard"
            element={
              <ProtectedRoute allowedRoles={["librarian"]}>
                <LibrarianDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin-dashboard"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/librarian-dashboard"
            element={
              <ProtectedRoute allowedRoles={["librarian"]}>
                <LibrarianDashboard />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<HomeOrRedirect />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
