import { BottomSheet } from '@/components/ui/BottomSheet'

export type MenuImportSheetProps = { open: boolean; onClose: () => void }

export function MenuImportSheet({ open, onClose }: MenuImportSheetProps) {
  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="text-lg font-semibold text-ink">Import monthly mess menu</h2>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-12 text-center">
          <p className="max-w-sm text-sm text-ink-3">Import monthly menu support is under rebuild.</p>
        </div>
      </div>
    </BottomSheet>
  )
}
