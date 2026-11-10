import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import { createHmac } from 'crypto';
import { Webhooks } from '../modules/webhooks';

describe('Webhooks', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('verifies canonical contract webhook envelopes', () => {
    const timestamp = '2026-04-03T10:00:00.000Z';
    vi.setSystemTime(new Date(timestamp));

    const rawBody = JSON.stringify({
      id: '2bcb5d52-7d64-43c6-b715-0a72f20d9c2f',
      type: 'contract.created',
      createdAt: timestamp,
      data: {
        contractId: '7c2807a3-3ad4-4423-9ebc-0281bff2660b',
        status: 'draft',
      },
    });

    const secret = 'webhook-secret';
    const signature = `v1=${createHmac('sha256', secret)
      .update(`${timestamp}.${rawBody}`)
      .digest('hex')}`;

    const result = Webhooks.verify(rawBody, signature, timestamp, secret);

    expect(result.valid).toBe(true);
    expect(result.envelope?.type).toBe('contract.created');
    expect(result.envelope?.data).toEqual({
      contractId: '7c2807a3-3ad4-4423-9ebc-0281bff2660b',
      status: 'draft',
    });
  });

  it('rejects stale webhook deliveries', () => {
    vi.setSystemTime(new Date('2026-04-03T10:10:01.000Z'));

    const timestamp = '2026-04-03T10:00:00.000Z';
    const rawBody = JSON.stringify({
      id: '2bcb5d52-7d64-43c6-b715-0a72f20d9c2f',
      type: 'document.created',
      createdAt: timestamp,
      data: {
        documentId: '7c2807a3-3ad4-4423-9ebc-0281bff2660b',
      },
    });
    const secret = 'webhook-secret';
    const signature = `v1=${createHmac('sha256', secret)
      .update(`${timestamp}.${rawBody}`)
      .digest('hex')}`;

    const result = Webhooks.verify(rawBody, signature, timestamp, secret);

    expect(result.valid).toBe(false);
  });
});

describe('Webhooks: conversion events', () => {
  it('verifies document.conversion.completed and refuses a tampered body', () => {
    vi.useFakeTimers();
    const timestamp = '2026-11-10T10:00:00.000Z';
    vi.setSystemTime(new Date(timestamp));
    const rawBody = JSON.stringify({
      id: 'evt-1',
      type: 'document.conversion.completed',
      createdAt: timestamp,
      data: { conversionId: 'c1', documentId: 'd1', versionId: 'v1', kind: 'new', review: 'ready_for_review', workspace: { uuid: 'w1' } },
    });
    const secret = 'whsec-test';
    const signature = `v1=${createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex')}`;

    const ok = Webhooks.verify(rawBody, signature, timestamp, secret);
    expect(ok.valid).toBe(true);
    expect(ok.envelope?.type).toBe('document.conversion.completed');

    const tampered = Webhooks.verify(rawBody.replace('"v1"', '"v2"'), signature, timestamp, secret);
    expect(tampered.valid).toBe(false);
    expect(Webhooks.verify(rawBody, signature, timestamp, 'other-secret').valid).toBe(false);
    vi.useRealTimers();
  });
});
