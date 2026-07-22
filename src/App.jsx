import { Navigate, Route, Routes } from 'react-router-dom'
import StyleGuide from '@/pages/StyleGuide'

// Phase 1 ships a single temporary route: the design-system style guide.
// The real route table (Section 4 of the spec) lands in Phase 4.
export default function App() {
  return (
    <Routes>
      <Route path="/styleguide" element={<StyleGuide />} />
      <Route path="*" element={<Navigate to="/styleguide" replace />} />
    </Routes>
  )
}
