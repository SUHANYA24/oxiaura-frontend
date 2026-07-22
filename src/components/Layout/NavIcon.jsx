/**
 * The shell's icon set. Kept in one file so stroke weight and optical sizing
 * stay consistent — mismatched icon weights are the fastest way to make a
 * monochrome interface look assembled from parts.
 *
 * All 18x18 on a 1.4 stroke, inheriting currentColor.
 */
const PATHS = {
  dashboard: (
    <>
      <rect x="2.75" y="2.75" width="5.5" height="5.5" rx="1.5" />
      <rect x="9.75" y="2.75" width="5.5" height="5.5" rx="1.5" />
      <rect x="2.75" y="9.75" width="5.5" height="5.5" rx="1.5" />
      <rect x="9.75" y="9.75" width="5.5" height="5.5" rx="1.5" />
    </>
  ),
  customers: (
    <>
      <circle cx="9" cy="6" r="2.75" />
      <path d="M3.75 15.25c0-2.9 2.35-5.25 5.25-5.25s5.25 2.35 5.25 5.25" />
    </>
  ),
  upload: (
    <>
      <path d="M9 11V3.25M9 3.25 6.25 6M9 3.25 11.75 6" />
      <path d="M3.25 11v2.5a1.5 1.5 0 0 0 1.5 1.5h8.5a1.5 1.5 0 0 0 1.5-1.5V11" />
    </>
  ),
  agreements: (
    <>
      <path d="M4.5 2.75h5.75L14 6.5v8.75H4.5z" />
      <path d="M10 2.75V6.5h3.75" />
      <path d="M7 10h4M7 12.5h4" />
    </>
  ),
  proposals: (
    <>
      <path d="M7.5 5h7.25M7.5 9h7.25M7.5 13h7.25" />
      <path d="m2.75 5 .9.9 1.6-1.9M2.75 9l.9.9 1.6-1.9M2.75 13l.9.9 1.6-1.9" />
    </>
  ),
  employees: (
    <>
      <circle cx="7" cy="6.25" r="2.5" />
      <path d="M2.5 15.25c0-2.5 2-4.5 4.5-4.5s4.5 2 4.5 4.5" />
      <path d="M12.25 4.4a2.5 2.5 0 0 1 0 4.5M12.9 11.1c1.55.6 2.35 2.05 2.35 4.15" />
    </>
  ),
  reports: (
    <>
      <path d="M3.5 15.25V9.5M7.5 15.25V4.5M11.5 15.25v-4M15.25 15.25V7.25" />
    </>
  ),
  admin: (
    <>
      <path d="M9 2.75 3.75 4.9v3.85c0 3.1 2.2 5.7 5.25 6.5 3.05-.8 5.25-3.4 5.25-6.5V4.9z" />
    </>
  ),
  search: (
    <>
      <circle cx="8" cy="8" r="4.75" />
      <path d="m11.5 11.5 3.25 3.25" />
    </>
  ),
  bell: (
    <>
      <path d="M5.75 7.5a3.25 3.25 0 0 1 6.5 0c0 3.25 1.25 4.25 1.25 4.25h-9S5.75 10.75 5.75 7.5Z" />
      <path d="M7.5 14a1.6 1.6 0 0 0 3 0" />
    </>
  ),
  help: (
    <>
      <circle cx="9" cy="9" r="6.5" />
      <path d="M7.4 7.1a1.65 1.65 0 1 1 2.25 1.6c-.5.2-.65.6-.65 1.1v.2" />
      <circle cx="9" cy="12.35" r=".7" fill="currentColor" stroke="none" />
    </>
  ),
  chevronLeft: <path d="m10.75 5.25-3.5 3.75 3.5 3.75" />,
  signOut: (
    <>
      <path d="M7 15.25H4.25a1.5 1.5 0 0 1-1.5-1.5V4.25a1.5 1.5 0 0 1 1.5-1.5H7" />
      <path d="M11.5 12 15 9l-3.5-3M15 9H6.5" />
    </>
  ),
}

export default function NavIcon({ name, className }) {
  const paths = PATHS[name]
  if (!paths) return null

  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {paths}
    </svg>
  )
}
