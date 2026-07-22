import { useParams } from 'react-router-dom'
import PagePlaceholder from '@/components/PagePlaceholder'

/** Serves both /customers/new and the edit action — one component, two modes. */
export default function CustomerForm() {
  const { id } = useParams()

  return (
    <PagePlaceholder
      title={id ? 'Edit customer' : 'New customer'}
      phase="7"
      description="Create and edit in one component: inline NIC, phone, and email validation, an unsaved-changes guard, and a success toast on save."
    />
  )
}
