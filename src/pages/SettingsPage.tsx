import { useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { Icon } from '@/components/icons'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { TextField, NumberField, SelectField } from '@/components/ui/Field'
import { SettingsGroup, SettingRow } from '@/components/ui/SettingRow'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Badge } from '@/components/ui/Badge'
import { InfoNote } from '@/components/ui/InfoNote'
import { ComingSoon } from '@/components/ui/ComingSoon'
import { useGoals } from '@/hooks/useGoals'
import { useSettings } from '@/hooks/useSettings'
import { useInstallPrompt } from '@/hooks/useInstallPrompt'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import {
  ImportError,
  downloadExport,
  exportDatabase,
  importDatabase,
  resetDatabase,
} from '@/db'
import { DB_NAME, DB_VERSION, STORE_NAMES } from '@/db/schema'
import { APP_NAME, APP_SHORT_NAME } from '@/lib/constants'
import { todayISO } from '@/utils/date'

type Feedback = { tone: 'success' | 'error'; text: string } | null

/**
 * Settings phase 1.
 *
 * Functional already: name, journey length and every goal target persist to
 * IndexedDB (creating the goal on first save). Export/import/reset operate on
 * the real database.
 */
export default function SettingsPage() {
  const { settings, update, loading: settingsLoading } = useSettings()
  const { goal, save, loading: goalLoading } = useGoals()
  const { canInstall, isStandalone, install } = useInstallPrompt()
  const online = useOnlineStatus()

  const [feedback, setFeedback] = useState<Feedback>(null)
  const [goalBusy, setGoalBusy] = useState(false)
  const [goalDraft, setGoalDraft] = useState(() => ({
    name: '',
    weeks: '',
    startWeightKg: '',
    targetWeightKg: '',
    targetWaistCm: '',
    dailyCalories: '',
    dailyProteinG: '',
    weeklyWorkouts: '',
    weeklyCardioMinutes: '',
  }))
  const [draftHydrated, setDraftHydrated] = useState(false)

  const [confirmReset, setConfirmReset] = useState(false)
  const [resetBusy, setResetBusy] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Seed the form from persisted values the first time they arrive.
  if (!draftHydrated && !settingsLoading && !goalLoading) {
    setDraftHydrated(true)
    setGoalDraft({
      name: settings?.name ?? '',
      weeks: goal?.weeks != null ? String(goal.weeks) : '12',
      startWeightKg: goal?.startWeightKg != null ? String(goal.startWeightKg) : '',
      targetWeightKg: goal?.targetWeightKg != null ? String(goal.targetWeightKg) : '',
      targetWaistCm: goal?.targetWaistCm != null ? String(goal.targetWaistCm) : '',
      dailyCalories: goal?.dailyCalories != null ? String(goal.dailyCalories) : '',
      dailyProteinG: goal?.dailyProteinG != null ? String(goal.dailyProteinG) : '',
      weeklyWorkouts: goal?.weeklyWorkouts != null ? String(goal.weeklyWorkouts) : '',
      weeklyCardioMinutes: goal?.weeklyCardioMinutes != null ? String(goal.weeklyCardioMinutes) : '',
    })
  }

  const number = (value: string): number | null => {
    const trimmed = value.trim()
    if (trimmed === '') return null
    const parsed = Number(trimmed)
    return Number.isFinite(parsed) ? parsed : null
  }

  const handleSaveGoal = async () => {
    setGoalBusy(true)
    setFeedback(null)
    try {
      if (goalDraft.name.trim() !== (settings?.name ?? '')) {
        await update({ name: goalDraft.name.trim() })
      }
      const saved = await save({
        weeks: Math.max(1, Math.round(number(goalDraft.weeks) ?? 12)),
        startWeightKg: number(goalDraft.startWeightKg),
        targetWeightKg: number(goalDraft.targetWeightKg),
        targetWaistCm: number(goalDraft.targetWaistCm),
        dailyCalories: number(goalDraft.dailyCalories),
        dailyProteinG: number(goalDraft.dailyProteinG),
        weeklyWorkouts: number(goalDraft.weeklyWorkouts) != null ? Math.round(number(goalDraft.weeklyWorkouts) as number) : null,
        weeklyCardioMinutes:
          number(goalDraft.weeklyCardioMinutes) != null
            ? Math.round(number(goalDraft.weeklyCardioMinutes) as number)
            : null,
        startDate: goal?.startDate ?? todayISO(),
      })
      setFeedback({ tone: 'success', text: 'Goals saved. The dashboard now uses these targets.' })
      void saved
    } catch (error) {
      setFeedback({
        tone: 'error',
        text: error instanceof Error ? error.message : 'Could not save goals.',
      })
    } finally {
      setGoalBusy(false)
    }
  }

  const handleExport = async () => {
    setFeedback(null)
    try {
      const payload = await exportDatabase()
      downloadExport(payload)
      setFeedback({ tone: 'success', text: 'Backup downloaded.' })
    } catch (error) {
      setFeedback({
        tone: 'error',
        text: error instanceof Error ? error.message : 'Export failed.',
      })
    }
  }

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setFeedback(null)
    try {
      const text = await file.text()
      const result = await importDatabase(JSON.parse(text))
      setFeedback({
        tone: 'success',
        text: `Imported ${result.records} records. Reloading…`,
      })
      setTimeout(() => window.location.reload(), 600)
    } catch (error) {
      setFeedback({
        tone: 'error',
        text:
          error instanceof SyntaxError
            ? 'That file is not valid JSON.'
            : error instanceof ImportError
              ? error.message
              : 'Import failed.',
      })
    }
  }

  const handleReset = async () => {
    setResetBusy(true)
    try {
      await resetDatabase()
      setConfirmReset(false)
      window.location.reload()
    } catch (error) {
      setConfirmReset(false)
      setFeedback({
        tone: 'error',
        text: error instanceof Error ? error.message : 'Reset failed.',
      })
    } finally {
      setResetBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        subtitle="Profile, goals and your local data"
        action={<Badge tone="accent">v{__APP_VERSION__}</Badge>}
      />

      {feedback ? (
        <InfoNote
          tone={feedback.tone === 'success' ? 'accent' : 'warning'}
          icon={feedback.tone === 'success' ? 'check' : 'alert'}
          title={feedback.text}
        />
      ) : null}

      {/* Profile ------------------------------------------------------ */}
      <SettingsGroup title="Profile" description="How the app greets you.">
        <div className="p-4">
          <TextField
            label="Your name"
            placeholder="e.g. Ansh"
            value={goalDraft.name}
            onChange={(event) => setGoalDraft((draft) => ({ ...draft, name: event.target.value }))}
            autoComplete="given-name"
          />
        </div>
      </SettingsGroup>

      {/* Goals --------------------------------------------------------- */}          <SettingsGroup
        title="Goals"
        description={
          goal
            ? `Active journey started ${goal.startDate}. Leave a field blank to skip that target.`
            : 'Create your 12-week journey. Leave a field blank to skip that target.'
        }
      >
        <div className="space-y-4 p-4">
          <div className="grid grid-cols-2 gap-3">
            <NumberField
              label="Journey length"
              suffix="weeks"
              min={1}
              max={52}
              value={goalDraft.weeks}
              onChange={(ev) =>
                setGoalDraft((draft) => ({ ...draft, weeks: ev.target.value }))
              }
            />
            <SelectField
              label="Units"
              value={settings?.units ?? 'metric'}
              onChange={(ev) =>
                void update({ units: ev.target.value as 'metric' | 'imperial' })
              }
              hint="Body-weight units."
            >
              <option value="metric">Metric (kg, cm)</option>
              <option value="imperial">Imperial (lb, in)</option>
            </SelectField>
          </div>

          <div className="border-t border-line pt-4">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-3">
              Body targets
            </p>
            <div className="grid grid-cols-2 gap-3">
              <NumberField
                label="Starting weight"
                suffix="kg"
                step={0.1}
                min={0}
                placeholder="—"
                value={goalDraft.startWeightKg}
                onChange={(ev) =>
                  setGoalDraft((draft) => ({ ...draft, startWeightKg: ev.target.value }))
                }
              />
              <NumberField
                label="Target weight"
                suffix="kg"
                step={0.1}
                min={0}
                placeholder="—"
                value={goalDraft.targetWeightKg}
                onChange={(ev) =>
                  setGoalDraft((draft) => ({ ...draft, targetWeightKg: ev.target.value }))
                }
              />
              <NumberField
                label="Target waist"
                suffix="cm"
                step={0.5}
                min={0}
                placeholder="—"
                value={goalDraft.targetWaistCm}
                onChange={(ev) =>
                  setGoalDraft((draft) => ({ ...draft, targetWaistCm: ev.target.value }))
                }
              />
            </div>
          </div>

          <div className="border-t border-line pt-4">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-3">
              Daily nutrition targets
            </p>
            <div className="grid grid-cols-2 gap-3">
              <NumberField
                label="Calories"
                suffix="kcal"
                min={0}
                placeholder="—"
                value={goalDraft.dailyCalories}
                onChange={(ev) =>
                  setGoalDraft((draft) => ({ ...draft, dailyCalories: ev.target.value }))
                }
              />
              <NumberField
                label="Protein"
                suffix="g"
                min={0}
                placeholder="—"
                value={goalDraft.dailyProteinG}
                onChange={(ev) =>
                  setGoalDraft((draft) => ({ ...draft, dailyProteinG: ev.target.value }))
                }
              />
            </div>
          </div>

          <div className="border-t border-line pt-4">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-3">
              Weekly activity targets
            </p>
            <div className="grid grid-cols-2 gap-3">
              <NumberField
                label="Workouts"
                suffix="/wk"
                min={0}
                placeholder="—"
                value={goalDraft.weeklyWorkouts}
                onChange={(e) =>
                  setGoalDraft((draft) => ({ ...draft, weeklyWorkouts: e.target.value }))
                }
              />
              <NumberField
                label="Cardio"
                suffix="min/wk"
                min={0}
                placeholder="—"
                value={goalDraft.weeklyCardioMinutes}
                onChange={(e2) =>
                  setGoalDraft((draft) => ({ ...draft, weeklyCardioMinutes: e2.target.value }))
                }
              />
            </div>
          </div>

          <Button className="w-full" onClick={() => void handleSaveGoal()} disabled={goalBusy}>
            {goalBusy ? 'Saving…' : goal ? 'Update goals' : 'Create goals'}
          </Button>
          <p className="text-[12px] leading-snug text-ink-3">
            Targets are stored on this device only. The dashboard reads them automatically — no
            defaults are invented for you.
          </p>
        </div>
      </SettingsGroup>

      {/* Data ---------------------------------------------------------- */}
      <SettingsGroup
        title="Data"
        description="Everything lives in this browser's IndexedDB. Back it up before clearing browser data."
      >
        <SettingRow
          icon="download"
          title="Export data"
          description="Download a JSON backup of every store."
          action={
            <Button variant="secondary" size="sm" onClick={() => void handleExport()}>
              Export
            </Button>
          }
        />
        <SettingRow
          icon="upload"
          title="Import data"
          description="Restore a backup. Replaces everything currently stored."
          action={
            <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
              Choose file
            </Button>
          }
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(event) => void handleImportFile(event)}
        />
        <SettingRow
          icon="trash"
          tone="danger"
          title="Reset all data"
          description="Erase meals, workouts, measurements and settings on this device."
          action={
            <Button variant="danger" size="sm" onClick={() => setConfirmReset(true)}>
              Reset
            </Button>
          }
        />
      </SettingsGroup>

      {/* PWA ------------------------------------------------------------ */}
      <SettingsGroup
        title="App"
        description="Install Freebuff on your phone for the full offline experience."
      >
        <SettingRow
          icon="smartphone"
          title={isStandalone ? 'Installed' : 'Install app'}
          description={
            isStandalone
              ? 'You are running the installed app.'
              : canInstall
                ? 'Add to your home screen — works fully offline.'
                : 'On Android: open the ⋮ menu in Chrome and choose “Install app” / “Add to Home screen”.'
          }
          action={
            !isStandalone && canInstall ? (
              <Button size="sm" onClick={() => void install()}>
                Install
              </Button>
            ) : undefined
          }
        />
        <SettingRow
          icon="cloud-off"
          title="Offline"
          description="All features work without a network. Data sync is not part of this app."
          value={
            <span className={online ? 'text-ink-3' : 'text-warning'}>
              {online ? 'Online' : 'Offline'}
            </span>
          }
        />
        <SettingRow
          icon="database"
          title="Storage details"
          description={`${STORE_NAMES.length} local stores · database “${DB_NAME}” v${DB_VERSION}`}
          value={<span className="tabular-nums">{STORE_NAMES.length} stores</span>}
        />
        <SettingRow
          icon="shield"
          title="Privacy"
          description="No account, no analytics, no network calls. Your data never leaves this device unless you export it."
        />
      </SettingsGroup>

      {/* Roadmap -------------------------------------------------------- */}
      <SettingsGroup title="Coming in later phases">
        <div className="space-y-3 p-4">
          <ComingSoon
            icon="target"
            title="Journey timeline"
            description="Week-by-week view of the cutting phase with milestones and check-ins."
            phase="Later phase"
          />
          <ComingSoon
            icon="upload"
            title="Cloud sync (optional)"
            description="The database layer is built behind repositories, so a sync backend can be added without touching the UI."
            phase="Much later"
          />
        </div>
      </SettingsGroup>

      <Card className="flex items-center gap-3">
        <Icon name="info" size={16} className="shrink-0 text-ink-3" />
        <p className="text-[12px] leading-relaxed text-ink-3">
          {APP_NAME} ({APP_SHORT_NAME}) — a personal, offline-first tracker. Everything you log
          stays on this device; export a backup before clearing browser data.
        </p>
      </Card>

      <ConfirmDialog
        open={confirmReset}
        tone="danger"
        title="Reset all data?"
        description="Every store in this browser — meals, workouts, measurements, photos, goals and settings — will be erased. This cannot be undone."
        confirmLabel="Erase everything"
        cancelLabel="Keep my data"
        busy={resetBusy}
        onConfirm={() => void handleReset()}
        onCancel={() => setConfirmReset(false)}
      />
    </div>
  )
}
