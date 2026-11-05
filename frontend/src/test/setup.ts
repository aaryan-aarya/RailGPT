import '@testing-library/jest-dom/vitest';

// jsdom lacks scrollIntoView, which the assistant chat uses.
if (typeof window !== 'undefined' && !window.HTMLElement.prototype.scrollIntoView) {
  window.HTMLElement.prototype.scrollIntoView = () => {};
}
