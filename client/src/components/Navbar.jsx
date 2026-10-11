import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import Logo from './Logo'

const links = [
  { to: '/', label: 'Dashboard' },
  { to: '/customers', label: 'Customers' },
  { to: '/properties', label: 'Properties' },
  { to: '/matchmaking', label: 'Matchmaking' },
  { to: '/deals', label: 'Deals' },
  { to: '/settings', label: 'Settings' }
]

export default function Navbar() {
  const navigate = useNavigate()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  function handleLogout() {
    localStorage.removeItem('gharsetu_auth')
    navigate('/login')
  }

  return (
    <nav className="bg-[#1e3a5f] shadow-md">
      {/* Top bar */}
      <div className="h-16 flex items-center justify-between pl-6 pr-6">
        <Logo variant="navbar" />

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-1">
          {links.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                isActive
                  ? 'text-white font-semibold px-3 py-2 rounded-md bg-white/10 transition-all duration-200'
                  : 'text-blue-200 hover:text-white px-3 py-2 rounded-md transition-all duration-200 hover:bg-white/10'
              }
            >
              {label}
            </NavLink>
          ))}
          <button
            onClick={handleLogout}
            className="ml-4 flex items-center gap-1.5 text-blue-200 hover:text-white transition-colors px-3 py-2 rounded-md hover:bg-white/10 min-h-[44px]"
            aria-label="Logout"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span className="text-sm">Logout</span>
          </button>
        </div>

        {/* Mobile hamburger button */}
        <button
          onClick={() => setIsMenuOpen(v => !v)}
          className="md:hidden flex items-center justify-center w-11 h-11 text-white rounded-md hover:bg-white/10 transition-colors"
          aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isMenuOpen}
        >
          {isMenuOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile dropdown menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-[#1e3a5f] border-t border-[#16305a]">
          {links.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => setIsMenuOpen(false)}
              className={({ isActive }) =>
                `block py-3 px-6 border-b border-[#16305a] transition-colors ${
                  isActive
                    ? 'text-white font-semibold bg-white/10'
                    : 'text-blue-200 hover:text-white hover:bg-white/10'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
          <button
            onClick={() => { setIsMenuOpen(false); handleLogout() }}
            className="w-full flex items-center gap-2 py-3 px-6 text-blue-200 hover:text-white hover:bg-white/10 transition-colors min-h-[44px]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span className="text-sm">Logout</span>
          </button>
        </div>
      )}
    </nav>
  )
}
