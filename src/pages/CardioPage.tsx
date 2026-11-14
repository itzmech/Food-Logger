import { CardioHistoryList } from '@/components/workout/CardioHistoryList'
import { CardioLogForm } from '@/components/workout/CardioLogForm'
import { PageHeader } from '@/components/ui/PageHeader'

export default function CardioPage() {
  return (
    <div className="space-y-5 pb-4" data-section="cardio">
      <PageHeader title="Cardio" subtitle="Log your runs and other cardio sessions." />
      <CardioLogForm />
      <CardioHistoryList />
    </div>
  )
}
