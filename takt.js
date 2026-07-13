// takt.js - Pure decimal time utilities for Taktwerk

const DECIMAL_MINUTE_SECONDS = 86.4; // 1 decimal minute = 86.4 standard seconds
const DECIMAL_SECOND_SECONDS = 0.864; // 1 decimal second = 0.864 standard seconds

/**
 * Convert standard seconds to decimal mm:ss string
 * @param {number} seconds - Duration in standard seconds
 * @returns {string} Formatted as "MM:SS" where SS is 00-99
 */
export function secondsToDecimalMMSS(seconds) {
  if (!isFinite(seconds) || seconds < 0) return "00:00";
  
  const totalDecimalSeconds = seconds / DECIMAL_SECOND_SECONDS;
  const mm = Math.floor(totalDecimalSeconds / 100);
  const ss = Math.floor(totalDecimalSeconds % 100);
  
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

/**
 * Parse decimal mm:ss string back to standard seconds
 * @param {string} str - Format "MM:SS"
 * @returns {number} Duration in standard seconds
 */
export function decimalMMSSToSeconds(str) {
  const match = str.match(/^(\d+):(\d{2})$/);
  if (!match) return 0;
  
  const mm = parseInt(match[1], 10);
  const ss = parseInt(match[2], 10);
  
  if (ss > 99) return 0; // Invalid decimal seconds
  
  return (mm * 100 + ss) * DECIMAL_SECOND_SECONDS;
}

