export function invoiceUpiDetails(invoice: {
  directUpiId?: string | null;
  directUpiPayeeName?: string | null;
  directUpiReference?: string | null;
}) {
  return invoice.directUpiId && invoice.directUpiPayeeName && invoice.directUpiReference
    ? {
        upiId: invoice.directUpiId,
        payeeName: invoice.directUpiPayeeName,
        reference: invoice.directUpiReference,
      }
    : null;
}
