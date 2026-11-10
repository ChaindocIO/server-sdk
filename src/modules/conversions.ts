/**
 * Conversions Module
 *
 * A file becomes a text document by conversion. Every file entrance answers 202 with a conversion;
 * this module reads it and waits for its end.
 */

import { seg } from '../utils/path';
import type { HttpClient } from '../client';
import { ChaindocConversionFailedError, ChaindocConversionTimeoutError } from '../errors';
import type {
  DocumentConversion,
  DocumentConversionResponse,
  ReadyDocumentConversion,
  WaitForConversionOptions,
} from '../types';

const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;
const DEFAULT_INTERVAL_MS = 1000;
const DEFAULT_MAX_INTERVAL_MS = 10_000;
const DEFAULT_BACKOFF_FACTOR = 1.5;

export class Conversions {
  constructor(private client: HttpClient) {}

  /** Where a conversion stands: `converting`, `ready` (with `documentId` and `versionId`) or `failed` (with `failure.code`). */
  async get(conversionId: string): Promise<DocumentConversionResponse> {
    return this.client.get<DocumentConversionResponse>(
      `/api/v1/documents/conversions/${seg(conversionId)}`,
    );
  }

  /**
   * Poll (with backoff) until the conversion is `ready` and return it. A `failed` conversion throws
   * `ChaindocConversionFailedError` carrying the failure code; running past `timeoutMs` throws
   * `ChaindocConversionTimeoutError` (the conversion may still finish: poll again with the id). A webhook
   * (`document.conversion.completed` / `.failed`) is the alternative to polling.
   */
  async wait(
    conversionId: string,
    options: WaitForConversionOptions = {},
  ): Promise<ReadyDocumentConversion> {
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const maxInterval = options.maxIntervalMs ?? DEFAULT_MAX_INTERVAL_MS;
    const factor = options.backoffFactor ?? DEFAULT_BACKOFF_FACTOR;
    let interval = options.intervalMs ?? DEFAULT_INTERVAL_MS;
    const startedAt = Date.now();

    for (;;) {
      const { conversion } = await this.get(conversionId);
      options.onPoll?.(conversion);

      if (conversion.status === 'ready') return assertReady(conversion);
      if (conversion.status === 'failed') {
        const code = conversion.failure?.code ?? null;
        throw new ChaindocConversionFailedError(
          `Conversion ${conversionId} failed${code ? `: ${code}` : ''}`,
          conversionId,
          code,
        );
      }

      if (Date.now() - startedAt + interval > timeoutMs) {
        throw new ChaindocConversionTimeoutError(
          `Conversion ${conversionId} was still converting after ${timeoutMs} ms`,
          conversionId,
        );
      }
      await new Promise<void>((resolve) => setTimeout(resolve, interval));
      interval = Math.min(Math.round(interval * factor), maxInterval);
    }
  }
}

function assertReady(conversion: DocumentConversion): ReadyDocumentConversion {
  if (conversion.documentId === null || conversion.versionId === null) {
    // A ready conversion always names what it made; anything else is a contract break, not a state to guess at.
    throw new ChaindocConversionFailedError(
      `Conversion ${conversion.id} is ready but names no document or version`,
      conversion.id,
      null,
    );
  }
  return { ...conversion, status: 'ready', documentId: conversion.documentId, versionId: conversion.versionId };
}
