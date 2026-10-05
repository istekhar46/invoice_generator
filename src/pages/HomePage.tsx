import React from 'react';
import { Link } from 'react-router-dom';
import { GuestInvoiceSection } from '../components/guest/GuestInvoiceSection';
import heroImage from '../assets/hero_image.png';
import { BsCloudDownload } from 'react-icons/bs';
import { FaMedapps } from "react-icons/fa6";
import { GoStopwatch } from "react-icons/go";


export const HomePage: React.FC = () => {

  const features = [
    {
      id: 'fast-creation',
      icon: GoStopwatch,
      title: 'Lightning Fast Creation',
      description: 'Reuse saved company and customer details when creating invoices with an account.'
    },
    {
      id: 'professional',
      icon: FaMedapps,
      title: 'Look Like a Pro',
      description: 'Impress clients with sleek, branded PDF invoices that look wonderful on any device.'
    },
    {
      id: 'instant-pdf',
      icon: BsCloudDownload,
      title: 'Instant PDF Downloads',
      description: 'Download your invoice as a PDF, ready to review, share, or print.'
    }
  ] as const;

  return (
    <div className="min-w-0">
      {/* Hero Section */}
      <section className="bg-gray-50 py-10 px-4 sm:py-16 sm:px-6 lg:py-20 lg:px-8 animate-fade-in">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-8 lg:gap-12 items-center ">
          {/* Left Column - Text Content */}
          <div className="space-y-6">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
              Create Professional PDF Invoices Online.
            </h1>
            <p className="text-base sm:text-xl text-gray-600 leading-relaxed">
              Invoiceo is an online invoice generator for creating PDF invoices. Use the guest creator without signing up, or create an account to manage saved invoices and customers.
            </p>
            
            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <Link
                to="/signup"
                className="inline-flex min-h-13 items-center justify-center rounded-xl bg-gradient-primary px-8 py-3.5 text-lg font-semibold text-white shadow-soft transition-colors hover:bg-primary-700 focus-ring"
              >
                Start Invoicing for Free
              </Link>
              <div className="flex items-center">
                <span className="text-gray-600 mr-2">Or</span>
                <Link
                  to="/login"
                  className="text-blue-600 hover:text-blue-700 font-semibold underline"
                >
                  Login here
                </Link>
              </div>
            </div>
          </div>

          {/* Right Column - Hero Image */}
          <div className="flex justify-center">
            <img
              src={heroImage}
              alt="Invoiceo PDF invoice preview"
              className="rounded-lg w-full aspect-video object-cover"
              onError={(e) => {
                e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="450"%3E%3Crect fill="%23e5e7eb" width="800" height="450"/%3E%3Ctext fill="%236b7280" font-family="sans-serif" font-size="24" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3EImage Unavailable%3C/text%3E%3C/svg%3E';
                e.currentTarget.alt = 'Image unavailable';
              }}
            />
          </div>
        </div>
      </section>

      {/* Guest Invoice Section */}
      <GuestInvoiceSection className="animate-fade-in" />

      {/* Features Section */}
      <section className="bg-white py-10 px-4 sm:py-16 sm:px-6 lg:py-20 lg:px-8 animate-fade-in">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-gray-900 mb-8 sm:mb-16">
            Everything You Need to Get Paid
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {features.map((feature) => {
              const IconComponent = feature.icon;
              return (
                <div key={feature.id} className="text-center space-y-4">
                  <div className="flex justify-center">
                    <IconComponent className="w-16 h-16 sm:w-24 sm:h-24 text-blue-600" />
                  </div>
                  <h3 className="text-2xl font-semibold text-gray-900">
                    {feature.title}
                  </h3>
                  <p className="text-lg text-gray-600 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-gray-50 px-4 py-10 sm:px-6 sm:py-16 lg:px-8" aria-labelledby="invoice-how-to">
        <div className="mx-auto max-w-4xl space-y-6">
          <h2 id="invoice-how-to" className="text-3xl font-bold text-gray-900">How do I create a PDF invoice?</h2>
          <ol className="list-decimal space-y-3 pl-5 text-gray-600 leading-relaxed">
            <li>Open the guest invoice creator and enter your business and customer details.</li>
            <li>Choose service and due dates, add line items with quantities and rates, and enter the applicable tax rate.</li>
            <li>Review the invoice details and calculated totals.</li>
            <li>Download the PDF, check the document, and share it with your customer.</li>
          </ol>
          <h2 className="text-3xl font-bold text-gray-900">Questions about Invoiceo</h2>
          <div className="divide-y divide-gray-200 rounded-2xl border border-gray-200 bg-white px-4 sm:px-6">
            {[
              ['Can I create an invoice without signing up?', 'Yes. The guest invoice creator on this page lets you enter invoice details and download a PDF without an account. Create an account when you want to manage saved invoices and customer details.'],
              ['Does downloading a PDF send it to my customer?', 'No. Downloading saves a PDF to your device. Review the document and send it to your customer yourself. Invoiceo does not collect payment through the PDF download.'],
              ['Where is my guest invoice draft saved?', 'The guest creator saves a draft in this browser’s local storage when storage is available. It is not a cross-device backup. Use Clear Draft in the creator to remove it, and download a PDF copy before clearing browser data.'],
              ['How are invoice totals calculated?', 'Each line item amount is its quantity multiplied by its rate. The subtotal adds the line item amounts; the tax rate you enter is applied to that subtotal. Review the calculated tax and total before issuing your invoice.'],
              ['Does Invoiceo decide which tax rate I should use?', 'No. You provide the tax rate. Check the requirements that apply to your business and customer before issuing an invoice. The invoice generator does not provide tax or legal advice.'],
            ].map(([question, answer]) => (
              <section key={question} className="py-5 space-y-2">
                <h3 className="text-lg font-semibold text-gray-900">{question}</h3>
                <p className="text-gray-600 leading-relaxed">{answer}</p>
              </section>
            ))}
          </div>
          <Link to="/help" className="text-link inline-flex min-h-11 items-center">Read the invoice help guide</Link>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-blue-600 py-10 px-4 sm:py-16 sm:px-6 lg:py-24 lg:px-8 animate-fade-in">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            Ready to streamline your billing?
          </h2>
          <p className="text-xl text-white">
            Create an invoice for your next project, or keep your billing organized with an account.
          </p>
          <p className="text-lg text-white">
            No credit card required.
          </p>
          <div className="pt-4">
            <Link
              to="/signup"
              className="inline-flex min-h-13 items-center justify-center rounded-xl bg-white px-6 py-3.5 text-lg font-semibold text-primary-600 shadow-soft transition-colors hover:bg-gray-100 focus-ring"
            >
              Create My First Invoice Now
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
