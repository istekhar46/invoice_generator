import type { DirectUpiDetails } from '../types/directUpi'

/** Application syntax limits only, not a bank/provider validation. */
export function validUpiDetails(details: DirectUpiDetails) {
  return (
    details.upiId.length <= 255 &&
    /^[A-Za-z0-9][A-Za-z0-9._-]*@[A-Za-z0-9][A-Za-z0-9.-]*$/.test(
      details.upiId
    ) &&
    details.payeeName.length > 0 &&
    details.payeeName.length <= 80 &&
    /^[^\p{C}]+$/u.test(details.payeeName) &&
    details.payeeName === details.payeeName.trim()
  )
}
