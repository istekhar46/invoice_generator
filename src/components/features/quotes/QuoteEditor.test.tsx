import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import { QuoteEditor } from './QuoteEditor'
import { sampleQuote } from '../../../test/fixtures/quotes'
const save = vi.hoisted(() => vi.fn())
vi.mock('../../../hooks/useQuotes', () => ({
  useQuoteActions: () => ({ save: { mutateAsync: save, isPending: false } }),
}))
vi.mock('../invoices/LineItemsTable', () => ({
  LineItemsTable: () => <div>Items editor</div>,
}))
beforeEach(() => {
  vi.resetAllMocks()
  save.mockRejectedValue(new Error('Quotation changed. Reload it.'))
})
it('keeps edits after an error and uses the version matching the form snapshot after a background refresh', async () => {
  const onSaved = vi.fn(),
    onCancel = vi.fn()
  const quote = { ...sampleQuote, status: 'DRAFT' as const, version: 1 }
  const { rerender } = render(
    <MemoryRouter>
      <QuoteEditor quote={quote} onSaved={onSaved} onCancel={onCancel} />
    </MemoryRouter>
  )
  fireEvent.change(screen.getByLabelText('Notes'), {
    target: { value: 'Edited note' },
  })
  rerender(
    <MemoryRouter>
      <QuoteEditor
        quote={{ ...quote, version: 2 }}
        onSaved={onSaved}
        onCancel={onCancel}
      />
    </MemoryRouter>
  )
  await userEvent.click(
    screen.getByRole('button', { name: 'Save draft quotation' })
  )
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Quotation changed'
  )
  expect(save).toHaveBeenCalledWith(
    expect.objectContaining({
      version: 1,
      input: expect.objectContaining({ notes: 'Edited note' }),
    })
  )
  expect(screen.getByLabelText('Notes')).toHaveValue('Edited note')
  expect(onSaved).not.toHaveBeenCalled()
})
it('requires company setup before opening a new quotation form', () => {
  render(
    <MemoryRouter>
      <QuoteEditor onSaved={vi.fn()} onCancel={vi.fn()} />
    </MemoryRouter>
  )
  expect(
    screen.getByRole('link', { name: 'Set up company profile' })
  ).toHaveAttribute('href', '/company')
  expect(
    screen.queryByRole('button', { name: 'Save draft quotation' })
  ).not.toBeInTheDocument()
})
