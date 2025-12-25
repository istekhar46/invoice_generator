/**
 * UI Components Index
 * Exports all base reusable UI components
 */

export { Button } from './Button'
export type { ButtonProps } from './Button'

export { Input } from './Input'
export type { InputProps } from './Input'

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from './Card'
export type {
  CardProps,
  CardHeaderProps,
  CardTitleProps,
  CardDescriptionProps,
  CardContentProps,
  CardFooterProps,
} from './Card'

export { Modal, ModalHeader, ModalBody, ModalFooter } from './Modal'
export type {
  ModalProps,
  ModalHeaderProps,
  ModalBodyProps,
  ModalFooterProps,
} from './Modal'

export { ErrorAlert } from './ErrorAlert'
export type { ErrorAlertProps } from './ErrorAlert'

export { FormField, FormSection, FormGrid, FormActions } from './FormField'
export type { FormFieldProps, FormSectionProps, FormGridProps, FormActionsProps } from './FormField'

export { LoadingSpinner, LoadingOverlay } from './LoadingSpinner'
export type { LoadingSpinnerProps, LoadingOverlayProps } from './LoadingSpinner'

export { 
  Typography,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  Heading6,
  BodyText,
  BodyLarge,
  BodySmall,
  Caption,
  Link,
  DisplayXL,
  DisplayLarge
} from './Typography'
export type { TypographyProps } from './Typography'

export { StatusBadge } from './StatusBadge'
export type { StatusBadgeProps } from './StatusBadge'

export { 
  Shimmer,
  ShimmerCard,
  ShimmerTable,
  ShimmerStats,
  ShimmerList,
  ShimmerForm,
  ShimmerPageHeader,
  ShimmerInvoicePreview
} from './ShimmerLoading'
export type {
  ShimmerProps,
  ShimmerCardProps,
  ShimmerTableProps,
  ShimmerStatsProps,
  ShimmerListProps,
  ShimmerFormProps,
  ShimmerPageHeaderProps
} from './ShimmerLoading'

export { 
  ToastComponent, 
  ToastContainer,
  type Toast,
  type ToastType,
  type ToastProps,
  type ToastContainerProps
} from './Toast'

export { Pagination, SimplePagination } from './Pagination'
export type { PaginationProps, SimplePaginationProps } from './Pagination'

export { 
  Skeleton,
  CustomerCardSkeleton,
  InvoiceCardSkeleton,
  PaginationSkeleton,
  ListHeaderSkeleton,
  FilterControlsSkeleton,
  SkeletonGrid,
  CustomerListSkeleton,
  InvoiceListSkeleton,
  InlineLoadingSkeleton
} from './SkeletonLoading'
export type { SkeletonProps, SkeletonGridProps } from './SkeletonLoading'
