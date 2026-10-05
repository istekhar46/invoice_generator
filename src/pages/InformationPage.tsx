import { Link } from 'react-router-dom'
import { ResponsiveContainer } from '../components/layout/ResponsiveLayout'

export function InformationPage({ page }: { page: 'about' | 'help' }) {
  return (
    <ResponsiveContainer maxWidth="lg" className="space-y-6">
      <div className="space-y-3">
        <p className="text-sm font-semibold text-primary-600">Invoiceo</p>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
          {page === 'about' ? 'Invoicing, made simpler.' : 'Help with your invoices'}
        </h1>
        <p className="text-gray-600 leading-relaxed">
          {page === 'about'
            ? 'Create PDF invoices, keep customer details together, and manage your billing from one place.'
            : 'Get started with the tools available in Invoiceo.'}
        </p>
      </div>
      <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-8 space-y-6 text-gray-600 leading-relaxed">
        {page === 'about' ? (
          <>
            <section className="space-y-2">
              <h2 className="text-xl font-semibold text-gray-900">For everyday business billing</h2>
              <p>Save your company profile and customer details, create invoices with line items and tax rates, and download a PDF to share with your customer. The dashboard helps you review your invoice activity.</p>
            </section>
            <section className="space-y-2">
              <h2 className="text-xl font-semibold text-gray-900">Choose how you work</h2>
              <p>Try the guest invoice creator from the homepage without signing up. With an account, you can manage saved invoices and customers, or use Quick Invoice without first saving company and customer details.</p>
            </section>
            <p>Check your business details, amounts, and applicable tax requirements before issuing an invoice.</p>
          </>
        ) : (
          <>
            <section className="space-y-2">
              <h2 className="text-xl font-semibold text-gray-900">Create an invoice without an account</h2>
              <p>Open the homepage and choose the guest invoice creator. Enter your business and customer details, add your line items, review the totals, and download your PDF.</p>
              <Link to="/" className="text-link inline-flex min-h-11 items-center">Go to the homepage</Link>
            </section>
            <section className="space-y-2">
              <h2 className="text-xl font-semibold text-gray-900">Set up your account</h2>
              <p>Sign up or log in, then complete your Company profile. Add a customer from Customers before creating an invoice from Invoices. Use Quick Invoice when you want to enter details directly without saving a company profile or customer first.</p>
            </section>
            <section className="space-y-2">
              <h2 className="text-xl font-semibold text-gray-900">Review and download</h2>
              <p>Check the customer, service date, due date, line items, and tax rate. Review the generated PDF before sending it. Downloading a PDF does not send it to your customer or collect payment.</p>
            </section>
            <section className="space-y-2">
              <h2 className="text-xl font-semibold text-gray-900">If something goes wrong</h2>
              <p>Check your internet connection and retry the failed action. If PDF generation fails, review any error message and verify that the required invoice fields are filled in. Keep your downloaded PDFs as copies of issued invoices.</p>
            </section>
          </>
        )}
      </div>
    </ResponsiveContainer>
  )
}
