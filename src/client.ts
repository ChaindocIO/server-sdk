/**
 * HTTP Client for Chaindoc API
 * Uses native fetch (Node 18+)
 */

import type { ChaindocConfig, RetryConfig } from "./types";

export class ChaindocError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: unknown,
    public isRetryable: boolean = false
  ) {
    super(message);
    this.name = "ChaindocError";
  }
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  timeout?: number;
  /** Disable retry for this specific request */
  noRetry?: boolean;
}

const DEFAULT_BASE_URL = "https://api.chaindoc.io";
const DEFAULT_TIMEOUT = 30000;
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_DELAY_MS = 1000;
const DEFAULT_MAX_DELAY_MS = 10000;

export class HttpClient {
  private baseUrl: string;
  private secretKey: string;
  private timeout: number;
  private defaultHeaders: Record<string, string>;
  private retryConfig: Required<RetryConfig>;

  constructor(config: ChaindocConfig) {
    if (!config.secretKey) {
      throw new ChaindocError("secretKey is required");
    }

    if (!config.secretKey.startsWith("sk_")) {
      throw new ChaindocError('secretKey must start with "sk_"');
    }

    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
    this.secretKey = config.secretKey;
    this.timeout = config.timeout ?? DEFAULT_TIMEOUT;
    this.defaultHeaders = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.secretKey}`,
      ...config.headers,
    };
    this.retryConfig = {
      maxRetries: config.retry?.maxRetries ?? DEFAULT_MAX_RETRIES,
      baseDelayMs: config.retry?.baseDelayMs ?? DEFAULT_BASE_DELAY_MS,
      maxDelayMs: config.retry?.maxDelayMs ?? DEFAULT_MAX_DELAY_MS,
    };
  }

  /**
   * Calculate delay with exponential backoff and jitter
   */
  private getRetryDelay(attempt: number): number {
    const exponentialDelay =
      this.retryConfig.baseDelayMs * Math.pow(2, attempt);
    const cappedDelay = Math.min(exponentialDelay, this.retryConfig.maxDelayMs);
    // Add jitter (±25%)
    const jitter = cappedDelay * 0.25 * (Math.random() * 2 - 1);
    return Math.round(cappedDelay + jitter);
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: unknown, statusCode?: number): boolean {
    // Retry on 5xx server errors
    if (statusCode && statusCode >= 500) {
      return true;
    }
    // Retry on 429 Too Many Requests
    if (statusCode === 429) {
      return true;
    }
    // Retry on network errors
    if (error instanceof Error) {
      const networkErrors = [
        "ECONNRESET",
        "ECONNREFUSED",
        "ETIMEDOUT",
        "ENOTFOUND",
        "EAI_AGAIN",
      ];
      return (
        networkErrors.some((e) => error.message.includes(e)) ||
        error.name === "AbortError"
      );
    }
    return false;
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const maxAttempts = options.noRetry ? 1 : this.retryConfig.maxRetries + 1;
    let lastError: ChaindocError | undefined;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        options.timeout ?? this.timeout
      );

      try {
        const response = await fetch(url, {
          method: options.method ?? "GET",
          headers: {
            ...this.defaultHeaders,
            ...options.headers,
          },
          body: options.body ? JSON.stringify(options.body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Handle empty responses (204 No Content, empty body)
        if (
          response.status === 204 ||
          response.headers.get("content-length") === "0"
        ) {
          return undefined as T;
        }

        // Only parse JSON if content-type indicates JSON
        const contentType = response.headers.get("content-type");
        const data: unknown = contentType?.includes("application/json")
          ? await response.json().catch(() => undefined)
          : undefined;

        if (!response.ok) {
          const errorMessage =
            data &&
            typeof data === "object" &&
            "message" in data &&
            typeof data.message === "string"
              ? data.message
              : `Request failed with status ${response.status}`;
          const isRetryable = this.isRetryableError(null, response.status);
          lastError = new ChaindocError(
            errorMessage,
            response.status,
            data,
            isRetryable
          );

          if (isRetryable && attempt < maxAttempts - 1) {
            await this.sleep(this.getRetryDelay(attempt));
            continue;
          }

          throw lastError;
        }

        return data as T;
      } catch (error) {
        clearTimeout(timeoutId);

        if (error instanceof ChaindocError) {
          if (!error.isRetryable || attempt >= maxAttempts - 1) {
            throw error;
          }
          lastError = error;
          await this.sleep(this.getRetryDelay(attempt));
          continue;
        }

        const isRetryable = this.isRetryableError(error);
        if (error instanceof Error) {
          const message =
            error.name === "AbortError" ? "Request timeout" : error.message;
          lastError = new ChaindocError(
            message,
            undefined,
            undefined,
            isRetryable
          );

          if (isRetryable && attempt < maxAttempts - 1) {
            await this.sleep(this.getRetryDelay(attempt));
            continue;
          }

          throw lastError;
        }

        throw new ChaindocError("Unknown error occurred");
      }
    }

    throw lastError ?? new ChaindocError("Request failed after retries");
  }

  async get<T>(
    endpoint: string,
    options?: Omit<RequestOptions, "method" | "body">
  ): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "GET" });
  }

  async post<T>(
    endpoint: string,
    body?: unknown,
    options?: Omit<RequestOptions, "method" | "body">
  ): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "POST", body });
  }

  async put<T>(
    endpoint: string,
    body?: unknown,
    options?: Omit<RequestOptions, "method" | "body">
  ): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "PUT", body });
  }

  async delete<T>(
    endpoint: string,
    options?: Omit<RequestOptions, "method" | "body">
  ): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "DELETE" });
  }

  /**
   * Upload files using multipart/form-data
   *
   * @remarks Requires Node.js >= 18 (uses native File, Blob, FormData APIs)
   */
  async uploadFiles<T>(
    endpoint: string,
    files: File[] | Blob[],
    fieldName = "media"
  ): Promise<T> {
    const maxAttempts = this.retryConfig.maxRetries + 1;
    let lastError: ChaindocError | undefined;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append(fieldName, file);
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout * 2);

      try {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
          },
          body: formData,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (
          response.status === 204 ||
          response.headers.get("content-length") === "0"
        ) {
          return undefined as T;
        }

        const contentType = response.headers.get("content-type");
        const data: unknown = contentType?.includes("application/json")
          ? await response.json().catch(() => undefined)
          : undefined;

        if (!response.ok) {
          const errorMessage =
            data &&
            typeof data === "object" &&
            "message" in data &&
            typeof data.message === "string"
              ? data.message
              : `Upload failed with status ${response.status}`;
          const isRetryable = this.isRetryableError(null, response.status);
          lastError = new ChaindocError(
            errorMessage,
            response.status,
            data,
            isRetryable
          );

          if (isRetryable && attempt < maxAttempts - 1) {
            await this.sleep(this.getRetryDelay(attempt));
            continue;
          }

          throw lastError;
        }

        return data as T;
      } catch (error) {
        clearTimeout(timeoutId);

        if (error instanceof ChaindocError) {
          if (!error.isRetryable || attempt >= maxAttempts - 1) {
            throw error;
          }
          lastError = error;
          await this.sleep(this.getRetryDelay(attempt));
          continue;
        }

        const isRetryable = this.isRetryableError(error);
        if (error instanceof Error) {
          const message =
            error.name === "AbortError" ? "Upload timeout" : error.message;
          lastError = new ChaindocError(
            message,
            undefined,
            undefined,
            isRetryable
          );

          if (isRetryable && attempt < maxAttempts - 1) {
            await this.sleep(this.getRetryDelay(attempt));
            continue;
          }

          throw lastError;
        }

        throw new ChaindocError("Unknown error occurred");
      }
    }

    throw lastError ?? new ChaindocError("Upload failed after retries");
  }
}
