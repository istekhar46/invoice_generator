import type { Customer } from '../../../types/entities'
import { Modal } from '../../ui/Modal'
import { CustomerForm } from './CustomerForm'

interface CustomerFormModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  customer?: Customer | null
}

export const CustomerFormModal: React.FC<CustomerFormModalProps> = ({
  open,
  onClose,
  onSuccess,
  customer,
}) => (
  <Modal
    open={open}
    onClose={onClose}
    title={customer ? 'Edit Customer' : 'Add New Customer'}
    size="large"
  >
    <CustomerForm
      customer={customer}
      onSuccess={onSuccess}
      onCancel={onClose}
    />
  </Modal>
)
