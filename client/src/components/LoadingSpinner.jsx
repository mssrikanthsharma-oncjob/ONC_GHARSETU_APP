export default function LoadingSpinner({ size = 'md', fullPage = false }) {
  const sizeMap = { sm: 24, md: 40, lg: 64 }
  const px = sizeMap[size] || sizeMap.md

  const spinner = (
    <svg
      className="animate-spin"
      width={px}
      height={px}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Loading"
    >
      <circle
        className="opacity-25"
        cx="12" cy="12" r="10"
        stroke="#1e3a5f"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="#1e3a5f"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  )

  if (fullPage) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white/70 z-40">
        {spinner}
      </div>
    )
  }
  return spinner
}
