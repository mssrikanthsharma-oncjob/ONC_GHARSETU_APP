import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ToastProvider } from './components/Toast'
import Navbar from './components/Navbar'
import Customers from './pages/Customers'
import Properties from './pages/Properties'
import Matchmaking from './pages/Matchmaking'
import Deals from './pages/Deals'
import Settings from './pages/Settings'

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <main className="p-6">
            <Routes>
              <Route path="/" element={<Customers />} />
              <Route path="/properties" element={<Properties />} />
              <Route path="/matchmaking" element={<Matchmaking />} />
              <Route path="/deals" element={<Deals />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </ToastProvider>
  )
}
