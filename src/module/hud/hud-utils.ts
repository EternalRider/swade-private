/**
 * Debounce function to limit the rate of function execution.
 * @param {Function} func - The function to debounce.
 * @param {number} wait - The wait time in milliseconds.
 * @returns {Function} Debounced function.
 */
export function debounce(func: (...args: unknown[]) => unknown, wait: number) {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: any[]) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Check if an element is visible in the viewport.
 * @param {HTMLElement} element - The element to check.
 * @returns {boolean} True if the element is visible, false otherwise.
 */
export function isElementVisible(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <=
      (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

/**
 * Get the center position of an element.
 * @param {HTMLElement} element - The element to get the center of.
 * @returns {{x: number, y: number}} The center coordinates.
 */
export function getElementCenter(element: HTMLElement): {
  x: number;
  y: number;
} {
  const rect = element.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

/**
 * Calculate distance between two points.
 * @param {number} x1 - X coordinate of the first point.
 * @param {number} y1 - Y coordinate of the first point.
 * @param {number} x2 - X coordinate of the second point.
 * @param {number} y2 - Y coordinate of the second point.
 * @returns {number} The distance between the two points.
 */
export function getDistance(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

/**
 * Debounced render function to prevent excessive re-renders
 * @param {any} hudInstance - The HUD instance to render
 * @param {number} delay - Delay in milliseconds (default: 50)
 */
export function debounceRender(hudInstance: any, delay = 20): void {
  if (hudInstance._renderDebounced) {
    hudInstance._renderDebounced();
  } else if (hudInstance.render) {
    setTimeout(() => {
      if (hudInstance.rendered) {
        hudInstance.render();
      }
    }, delay);
  }
}
