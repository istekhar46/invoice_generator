/** Owner-provided receiving details; syntax checked, never bank verified. */
export interface DirectUpiDetails {
  upiId: string
  payeeName: string
}

export interface DirectUpiSnapshot extends DirectUpiDetails {
  /** Random public payment reference, never an internal invoice/account ID. */
  reference: string
}
