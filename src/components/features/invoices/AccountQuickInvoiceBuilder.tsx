import {
  QuickInvoiceBuilder,
  type QuickInvoiceBuilderProps,
} from './QuickInvoiceBuilder'
import { InvoiceDefaultsGate } from './InvoiceDefaultsGate'
import { useSaveInvoiceDefaults } from '../../../hooks/useInvoiceDefaults'
import { useState } from 'react'

export function AccountQuickInvoiceBuilder(
  props: Omit<
    QuickInvoiceBuilderProps,
    'mode' | 'initialDefaults' | 'onSaveDefaults' | 'onStartNew'
  >
) {
  const save = useSaveInvoiceDefaults()
  const [sequence, setSequence] = useState(0)
  const current = sequence
    ? {
        ...props,
        invoice: undefined,
        initialGuestData: undefined,
        autoSaveImportedDraft: false,
      }
    : props
  return (
    <InvoiceDefaultsGate
      key={sequence}
      enabled={!current.invoice && !current.initialGuestData}
      includeLogo
    >
      {defaults => (
        <QuickInvoiceBuilder
          {...current}
          initialDefaults={defaults}
          onSaveDefaults={settings => save.mutateAsync(settings)}
          onStartNew={() => setSequence(value => value + 1)}
        />
      )}
    </InvoiceDefaultsGate>
  )
}
