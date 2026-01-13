import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import heroImage from '../assets/hero_image.png';
import { BsCloudDownload } from 'react-icons/bs';
import { FaMedapps } from "react-icons/fa6";
import { GoStopwatch } from "react-icons/go";


export const HomePage: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    {
      id: 'fast-creation',
      icon: GoStopwatch,
      title: 'Lightning Fast Creation',
      description: 'Use pre-saved client details and templates to generate a new invoice in under 30 seconds.'
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
      description: 'Generate secure PDFs instantly with one click, ready to email or print immediately.'
    }
  ] as const;

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gray-50 py-20 px-6 animate-fade-in">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center ">
          {/* Left Column - Text Content */}
          <div className="space-y-6">
            <h1 className="text-6xl font-bold text-gray-900 leading-3x-large">
              Create Professional Invoices in Seconds, Not Hours.
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed">
              Stop struggling with spreadsheets. Generate beautiful, trackable PDF invoices and get paid faster.
            </p>
            
            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <Button
                variant="primary"
                size="lg"
                onClick={() => navigate('/signup')}
                className='hover:scale-105 cursor-pointer'
              >
                Start Invoicing for Free
              </Button>
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
              alt="Invoice Pro Dashboard Preview"
              className="rounded-lg w-full aspect-video object-cover"
              onError={(e) => {
                e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="450"%3E%3Crect fill="%23e5e7eb" width="800" height="450"/%3E%3Ctext fill="%236b7280" font-family="sans-serif" font-size="24" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3EImage Unavailable%3C/text%3E%3C/svg%3E';
                e.currentTarget.alt = 'Image unavailable';
              }}
            />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-white py-20 px-6 animate-fade-in">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-16">
            Everything You Need to Get Paid
          </h2>
          
          <div className="grid md:grid-cols-3 gap-12">
            {features.map((feature) => {
              const IconComponent = feature.icon;
              return (
                <div key={feature.id} className="text-center space-y-4">
                  <div className="flex justify-center">
                    <IconComponent className="w-24 h-24 text-blue-600" />
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

      {/* CTA Section */}
      <section className="bg-blue-600 py-24 px-6 animate-fade-in mt-4">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h2 className="text-4xl font-bold text-white">
            Ready to streamline your billing?
          </h2>
          <p className="text-xl text-white">
            Join thousands of freelancers getting paid faster today.
          </p>
          <p className="text-lg text-white">
            No credit card required.
          </p>
          <div className="pt-4">
            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate('/signup')}
              className="bg-white text-blue-600 hover:bg-gray-100 hover:scale-105 cursor-pointer"
            >
              Create My First Invoice Now
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};
