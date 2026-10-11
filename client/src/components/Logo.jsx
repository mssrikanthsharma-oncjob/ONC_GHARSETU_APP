export default function Logo({ variant = 'navbar' }) {
  if (variant === 'icon') {
    return (
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="ONC Gharsetu Icon">
        {/* House roof */}
        <polygon points="20,4 36,20 4,20" fill="#f0a500" />
        {/* House body */}
        <rect x="8" y="20" width="24" height="16" fill="#f0a500" />
        {/* Door */}
        <rect x="16" y="28" width="8" height="8" fill="#1e3a5f" />
      </svg>
    )
  }

  if (variant === 'login') {
    return (
      <svg width="120" height="100" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="ONC Gharsetu Logo">
        {/* House roof */}
        <polygon points="60,8 96,38 24,38" fill="#1e3a5f" />
        {/* Roof highlight */}
        <polygon points="60,8 96,38 24,38" fill="#1e3a5f" />
        {/* House body */}
        <rect x="28" y="38" width="64" height="38" fill="#1e3a5f" />
        {/* Door */}
        <rect x="48" y="55" width="24" height="21" rx="2" fill="white" />
        {/* Window left */}
        <rect x="32" y="46" width="12" height="10" rx="1" fill="#f0a500" fillOpacity="0.7" />
        {/* Window right */}
        <rect x="76" y="46" width="12" height="10" rx="1" fill="#f0a500" fillOpacity="0.7" />
        {/* Text ONC */}
        <text x="60" y="90" textAnchor="middle" fontFamily="system-ui, sans-serif" fontWeight="700" fontSize="14" fill="#1e3a5f" letterSpacing="2">ONC</text>
        {/* Text GHARSETU */}
        <text x="60" y="103" textAnchor="middle" fontFamily="system-ui, sans-serif" fontWeight="400" fontSize="9" fill="#1e3a5f" letterSpacing="1">GHARSETU</text>
      </svg>
    )
  }

  // navbar variant — 140x40
  return (
    <svg width="140" height="40" viewBox="0 0 140 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="ONC Gharsetu">
      {/* House roof */}
      <polygon points="18,3 32,16 4,16" fill="#f0a500" />
      {/* House body */}
      <rect x="6" y="16" width="24" height="16" fill="#f0a500" />
      {/* Door */}
      <rect x="13" y="23" width="10" height="9" rx="1" fill="#1e3a5f" />
      {/* Text ONC */}
      <text x="42" y="18" fontFamily="system-ui, sans-serif" fontWeight="700" fontSize="14" fill="white" letterSpacing="1">ONC</text>
      {/* Text GHARSETU */}
      <text x="42" y="32" fontFamily="system-ui, sans-serif" fontWeight="400" fontSize="10" fill="#f0a500" letterSpacing="0.5">GHARSETU</text>
    </svg>
  )
}
