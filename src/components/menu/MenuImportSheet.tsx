import { useState } from 'react'
import { Icon } from '@/components/icons'

export function MenuImportSheet({
  onClose,
}: {
  onClose: () => void
}) {
  const [file, setFile] = useState<File | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] ?? null)
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-1rem)] p-4 md:p-6 space-y-4 bg-surface-1">
      <h2 className="text-xl font-semibold text-ink">Import Monthly Menu</h2>

      <p className="text-ink-3">
        Choose your menu file. Supported formats will expand later.
      </p>

      <div>
        <input
          type="file"
          accept=".txt,.csv,.json"
          onChange={handleFileChange}
          className="w-full rounded px-4 py-2 text-sm font-medium text-accent-strong bg-surface-2 hover:bg-surface-3 transition-colors"
        />
        {file ? <p className="mt-2 text-[13px] text-ink-3">Selected: {file.name}</p> : null}
      </div>

      <button onClick={onClose} className="flex items-center gap-2 rounded-sm px-4 py-2 text-sm font-medium text-surface bg-surface-2 hover:bg-surface-3 transition-colors">
        <Icon name="close" size={16} />
        Cancel
      </button>
    </div>
  )
}