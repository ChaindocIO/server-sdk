import { afterEach, describe, expect, it, vi } from 'vitest';
import { Chaindoc } from '../chaindoc';
import { ChaindocPaymentError } from '../errors';
import { Contragents } from '../modules/contragents';
import { Contracts } from '../modules/contracts';
import { Invoices } from '../modules/invoices';
import { PaymentInstructions } from '../modules/payment-instructions';
import { TaxTreatments } from '../modules/tax-treatments';
import { fakeClient } from './helpers';

describe('contragents', () => {
  it('create normalizes the e-mail; get and update address the id', async () => {
    const f = fakeClient({});
    const contragents = new Contragents(f.client);
    await contragents.create({ email: ' Client@Example.com ', name: 'Client', vatNumber: 'DE1' });
    await contragents.get('cg-1');
    await contragents.update('cg-1', { paymentInstructionId: null });
    await contragents.list();
    expect(f.post).toHaveBeenCalledWith('/api/v1/contragents', { email: 'client@example.com', name: 'Client', vatNumber: 'DE1' });
    expect(f.get).toHaveBeenNthCalledWith(1, '/api/v1/contragents/cg-1');
    expect(f.patch).toHaveBeenCalledWith('/api/v1/contragents/cg-1', { paymentInstructionId: null });
    expect(f.get).toHaveBeenNthCalledWith(2, '/api/v1/contragents');
  });
});

describe('payment instructions (money line)', () => {
  it('creates a crypto instruction without automatic retry, and lists / assigns', async () => {
    const f = fakeClient({});
    const pi = new PaymentInstructions(f.client);
    await pi.create({ type: 'crypto', network: 'TRC20', asset: 'USDT', address: 'T-example-address', label: 'Wallet' });
    await pi.create({ type: 'bank', currencyCode: 'EUR', iban: 'DE00', qr: true, localCode: '12-34' });
    await pi.assignToContragent({ contragentEmail: 'Client@Example.com', paymentInstructionId: 'pi-1' });
    await pi.assignToContragent({ contragentEmail: 'client@example.com', paymentInstructionId: null });
    await pi.list();
    expect(f.post.mock.calls[0]).toEqual(['/api/v1/payment-instructions', expect.objectContaining({ network: 'TRC20' }), { noRetry: true }]);
    expect(f.post.mock.calls[1]?.[1]).toMatchObject({ currencyCode: 'EUR', qr: true, localCode: '12-34' });
    expect(f.put.mock.calls[0]).toEqual([
      '/api/v1/payment-instructions/contragent-assignment',
      { contragentEmail: 'client@example.com', paymentInstructionId: 'pi-1' },
      { noRetry: true },
    ]);
    expect(f.put.mock.calls[1]?.[1]).toMatchObject({ paymentInstructionId: null });
  });

  it('refuses a malformed counterparty e-mail before assigning anything', async () => {
    const f = fakeClient();
    await expect(
      new PaymentInstructions(f.client).assignToContragent({ contragentEmail: 'nope', paymentInstructionId: 'pi-1' }),
    ).rejects.toThrow('contragentEmail');
    expect(f.put).not.toHaveBeenCalled();
  });

  it('a bad crypto address is a typed refusal with the field and key kept', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ message: 'bad address', field: 'address', errorKey: 'PAYMENT_INSTRUCTION_CRYPTO_ADDRESS_INVALID' }),
          { status: 400, headers: { 'content-type': 'application/json' } },
        ),
      ),
    );
    const chaindoc = new Chaindoc({ secretKey: 'sk_test', retry: { maxRetries: 0 } });
    const error = await chaindoc.paymentInstructions.create({ type: 'crypto', network: 'TRC20', asset: 'USDT', address: 'x' }).catch((e: unknown) => e);
    expect(error).toMatchObject({ statusCode: 400, errorKey: 'PAYMENT_INSTRUCTION_CRYPTO_ADDRESS_INVALID', response: { field: 'address' } });
    vi.unstubAllGlobals();
  });
});

describe('tax treatments, credit notes, contract payment setup', () => {
  it('lists tax treatments', async () => {
    const f = fakeClient({});
    await new TaxTreatments(f.client).list();
    expect(f.get).toHaveBeenCalledWith('/api/v1/tax-treatments');
  });

  it('invoice create carries the new fields', async () => {
    const f = fakeClient({});
    await new Invoices(f.client).create('c-1', {
      title: 'T', amount: '100.00', dueDate: '2026-12-01', taxTreatmentId: 'tt-1', paymentInstructionId: 'pi-1',
      discount: { type: 'percent', value: '10' }, showUnpaid: false, takePaidAhead: false, stripePaymentAllowed: false,
    });
    expect(f.post.mock.calls[0]?.[1]).toMatchObject({ taxTreatmentId: 'tt-1', paymentInstructionId: 'pi-1', discount: { type: 'percent', value: '10' }, showUnpaid: false });
  });

  it('credit notes: list and create (no automatic retry)', async () => {
    const f = fakeClient([]);
    const invoices = new Invoices(f.client);
    await invoices.listCreditNotes('c-1', 'inv-1');
    await invoices.createCreditNote('c-1', 'inv-1', { reason: 'return', lines: [{ description: 'Item', quantity: 1, unitPrice: '50.00', sourceLineIndex: 0 }] });
    expect(f.get).toHaveBeenCalledWith('/api/v1/contracts/c-1/invoices/inv-1/credit-notes');
    expect(f.post.mock.calls[0]).toEqual([
      '/api/v1/contracts/c-1/invoices/inv-1/credit-notes',
      { reason: 'return', lines: [{ description: 'Item', quantity: 1, unitPrice: '50.00', sourceLineIndex: 0 }] },
      { noRetry: true },
    ]);
  });

  it('contract payment instruction and stripe setting', async () => {
    const f = fakeClient({});
    const contracts = new Contracts(f.client);
    await contracts.setPaymentInstruction('c-1', 'pi-1');
    await contracts.setPaymentInstruction('c-1', null);
    await contracts.setStripePayment('c-1', { stripePaymentAllowed: false });
    expect(f.patch.mock.calls[0]).toEqual(['/api/v1/contracts/c-1/payment-instruction', { paymentInstructionId: 'pi-1' }, { noRetry: true }]);
    expect(f.patch.mock.calls[1]?.[1]).toEqual({ paymentInstructionId: null });
    expect(f.patch.mock.calls[2]).toEqual(['/api/v1/contracts/c-1/stripe-payment', { stripePaymentAllowed: false }, { noRetry: true }]);
  });
});

describe('money refusals over the wire', () => {
  afterEach(() => vi.unstubAllGlobals());
  const answer = (status: number, body: unknown) =>
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })));

  it('a charge refused by the Stripe cascade is a ChaindocPaymentError and is not retried', async () => {
    answer(403, { statusCode: 403, error: 'Forbidden', message: 'manual by design', code: 'STRIPE_MANUAL_BY_DESIGN' });
    const chaindoc = new Chaindoc({ secretKey: 'sk_test' });
    const error = await chaindoc.invoices.charge('c-1', 'inv-1').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ChaindocPaymentError);
    expect(error).toMatchObject({ errorKey: 'STRIPE_MANUAL_BY_DESIGN', statusCode: 403 });
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
  });

  it('cancelling an invoice money reached is INVOICE_MONEY_OR_CREDIT_NOTE', async () => {
    answer(400, { message: 'credit it instead', code: 'INVOICE_MONEY_OR_CREDIT_NOTE' });
    const chaindoc = new Chaindoc({ secretKey: 'sk_test', retry: { maxRetries: 0 } });
    const error = await chaindoc.invoices.cancel('c-1', 'inv-1').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ChaindocPaymentError);
    expect((error as ChaindocPaymentError).errorKey).toBe('INVOICE_MONEY_OR_CREDIT_NOTE');
  });

  it('a 5xx on mark-paid is not retried (no double record of a payment)', async () => {
    answer(500, { message: 'boom' });
    const chaindoc = new Chaindoc({ secretKey: 'sk_test', retry: { maxRetries: 3, baseDelayMs: 1 } });
    await expect(chaindoc.invoices.markPaid('c-1', 'inv-1', { method: 'bank-transfer' })).rejects.toBeDefined();
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
  });
});
