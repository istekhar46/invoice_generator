/**
 * Step Indicator Component
 * Visual progress indicator for the guest invoice wizard
 */

import React from 'react'
import { Check, Building2, Users, Calendar, Package, CheckCircle } from 'lucide-react'
import { cn } from '../../utils/classNames'
import type { WizardStep } from '../../utils/guestInvoiceValidation'

interface StepIndicatorProps {
  currentStep: WizardStep
  completedSteps: WizardStep[]
  className?: string
}

const steps = [
  { id: 'company' as WizardStep, title: 'Company', icon: Building2, description: 'Optional' },
  { id: 'customer' as WizardStep, title: 'Customer', icon: Users, description: 'Required' },
  { id: 'details' as WizardStep, title: 'Details', icon: Calendar, description: 'Required' },
  { id: 'items' as WizardStep, title: 'Items', icon: Package, description: 'Required' },
  { id: 'review' as WizardStep, title: 'Review', icon: CheckCircle, description: 'Final' },
]

export const StepIndicator: React.FC<StepIndicatorProps> = ({
  currentStep,
  completedSteps,
  className,
}) => {
  const currentIndex = steps.findIndex(s => s.id === currentStep)

  const getStepStatus = (stepId: WizardStep, index: number) => {
    if (completedSteps.includes(stepId)) return 'completed'
    if (stepId === currentStep) return 'current'
    if (index < currentIndex) return 'completed'
    return 'upcoming'
  }

  return (
    <div className={cn('w-full', className)}>
      {/* Desktop View */}
      <div className="hidden md:block">
        <nav aria-label="Progress">
          <ol className="flex items-center justify-between">
            {steps.map((step, index) => {
              const status = getStepStatus(step.id, index)
              const Icon = step.icon

              return (
                <li key={step.id} className="relative flex-1">
                  {/* Connector Line */}
                  {index !== steps.length - 1 && (
                    <div
                      className={cn(
                        'absolute top-5 left-1/2 w-full h-0.5 -z-10',
                        status === 'completed' ? 'bg-blue-600' : 'bg-gray-200'
                      )}
                      aria-hidden="true"
                    />
                  )}

                  {/* Step */}
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        'flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-200',
                        status === 'completed' && 'bg-blue-600 border-blue-600',
                        status === 'current' && 'bg-white border-blue-600 ring-4 ring-blue-100',
                        status === 'upcoming' && 'bg-white border-gray-300'
                      )}
                    >
                      {status === 'completed' ? (
                        <Check className="w-5 h-5 text-white" />
                      ) : (
                        <Icon
                          className={cn(
                            'w-5 h-5',
                            status === 'current' && 'text-blue-600',
                            status === 'upcoming' && 'text-gray-400'
                          )}
                        />
                      )}
                    </div>
                    <div className="mt-2 text-center">
                      <p
                        className={cn(
                          'text-sm font-medium',
                          status === 'current' && 'text-blue-600',
                          status === 'completed' && 'text-gray-900',
                          status === 'upcoming' && 'text-gray-500'
                        )}
                      >
                        {step.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{step.description}</p>
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>
        </nav>
      </div>

      {/* Mobile View */}
      <div className="md:hidden">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium text-gray-900">
            Step {currentIndex + 1} of {steps.length}
          </p>
          <p className="text-sm text-gray-500">
            {steps[currentIndex].title}
          </p>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  )
}
