/** Payment adapter. Built to plug into MOBIPOS. Not integrated yet. */
export interface PaymentResult { ok: boolean; reference: string }

export interface PaymentAdapter {
  charge(amountFils: number, orderRef: string): Promise<PaymentResult>;
}

export class MockPaymentProvider implements PaymentAdapter {
  async charge(_amountFils: number, orderRef: string): Promise<PaymentResult> {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return { ok: true, reference: `demo-${orderRef}` };
  }
}

/** Vendor stub. The MOBIPOS vendor supplies the API before launch. */
export class MobiposPaymentProvider implements PaymentAdapter {
  charge(): Promise<PaymentResult> {
    throw new Error('NotImplemented: MOBIPOS integration needs vendor API access');
  }
}

export const payments: PaymentAdapter = new MockPaymentProvider();
