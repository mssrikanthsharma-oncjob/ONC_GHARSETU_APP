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

  function handleLogout() {
    localStorage.removeItem('gharsetu_auth')
    navigate('/login')
  }

  return (
    <nav className="bg-[#1e3a5f] h-16 flex items-center justify-between shadow-md pl-6 pr-6">
      <Logo variant="navbar" />
      <div className="flex items-center gap-1">
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
          className="ml-4 flex items-center gap-1.5 text-blue-200 hover:text-white transition-colors px-3 py-2 rounded-md hover:bg-white/10"
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
    </nav>
  )
}
