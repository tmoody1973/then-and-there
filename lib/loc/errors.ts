// Library of Congress client errors. Each one tells the worker what to do next.

export class LocRateLimitError extends Error {
  constructor(url: string) {
    super(`Library rate limit hit repeatedly (429) for ${url}`);
    this.name = "LocRateLimitError";
  }
}

export class LocBlockedError extends Error {
  constructor(url: string) {
    super(`Library returned an HTML page instead of data (likely a block or CAPTCHA) for ${url}`);
    this.name = "LocBlockedError";
  }
}

export class LocBadResponseError extends Error {
  constructor(url: string, detail: string) {
    super(`Library returned an unusable response for ${url}: ${detail}`);
    this.name = "LocBadResponseError";
  }
}

export class LocNotFoundError extends Error {
  constructor(url: string) {
    super(`Library returned 404 for ${url}`);
    this.name = "LocNotFoundError";
  }
}
