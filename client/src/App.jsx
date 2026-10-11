import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { ToastProvider } from './components/Toast'
import Navbar from './components/Navbar'
import Dashboard from './pages/Dashboard'
import Customers from './pages/Customers'
import Properties from './pages/Properties'
import Matchmaking from './pages/Matchmaking'
import Deals from './pages/Deals'
import Settings from './pages/Settings'
import Login from './pages/Login'

function ProtectedRoute({ children }) {
  const isAuthenticated = localStorage.getItem('gharsetu_auth') === 'true'
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  return children
}

function AppLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="p-6">
        {children}
      </main>
    </div>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout><Dashboard /></AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/customers"
            element={
              <ProtectedRoute>
                <AppLayout><Customers /></AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/properties"
            element={
              <ProtectedRoute>
                <AppLayout><Properties /></AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/matchmaking"
            element={
              <ProtectedRoute>
                <AppLayout><Matchmaking /></AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/deals"
            element={
              <ProtectedRoute>
                <AppLayout><Deals /></AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <AppLayout><Settings /></AppLayout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  )
}
