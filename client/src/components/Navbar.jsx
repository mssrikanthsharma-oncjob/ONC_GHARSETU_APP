import { NavLink } from 'react-router-dom'

const links = [
  { to: '/', label: 'Customers' },
  { to: '/properties', label: 'Properties' },
  { to: '/matchmaking', label: 'Matchmaking' },
  { to: '/deals', label: 'Deals' },
  { to: '/settings', label: 'Settings' }
]

export default function Navbar() {
  return (
    <nav className="bg-[#1e3a5f] px-6 py-3 flex items-center justify-between shadow-md">
      <span className="text-[#f0a500] font-bold text-xl tracking-wide">ONC GHARSETU</span>
      <div className="flex gap-6">
        {links.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              isActive
                ? 'text-white font-semibold border-b-2 border-[#f0a500] pb-0.5'
                : 'text-blue-200 hover:text-white transition-colors'
            }
          >
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
