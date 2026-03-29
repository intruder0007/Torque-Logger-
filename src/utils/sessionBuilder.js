// ─────────────────────────────────────────────────────────────────────────────
//  TORQUE™ — Session Builder v1
//  Modular utility for building time-tracking and activity session overviews.
// ─────────────────────────────────────────────────────────────────────────────

import { Emojis } from './constants.js';

export class SessionBuilder {
  constructor() {
    this.start    = null;
    this.end      = null;
    this.duration = null;
    this.activity = null;
    this.peak     = null; // For voice or activity intensity
  }

  setStart(ms) { this.start = ms; return this; }
  setEnd(ms)   { this.end = ms; return this; }
  setDuration(ms) { this.duration = ms; return this; }
  setActivity(text) { this.activity = text; return this; }
  setPeak(text) { this.peak = text; return this; }

  /**
   * Builds the session overview block.
   */
  build() {
    const lines = [];
    const tStart = this.start ? `<t:${Math.floor(this.start / 1000)}:R>` : '`Unknown`';
    const tEnd   = this.end   ? `<t:${Math.floor(this.end / 1000)}:R>`   : '`Active`';
    
    lines.push(`${Emojis.clock} **SESSION OVERVIEW**`);
    lines.push(`> **Started:** ${tStart}`);
    lines.push(`> **Ended:**   ${tEnd}`);
    
    if (this.duration) {
      lines.push(`> **Duration:** \`${this.formatDurationRaw(this.duration)}\``);
    }
    
    if (this.activity) {
      lines.push(`> **Primary Activity:** \`${this.activity}\``);
    }

    if (this.peak) {
      lines.push(`> **Peak Intensity:** \`${this.peak}\``);
    }

    return lines.join('\n');
  }

  /** Format ms → "Xh Xm Xs" */
  formatDurationRaw(ms) {
    if (!ms || ms < 0) return '< 1s';
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    const d = Math.floor(h / 24);
    if (d > 0) return `${d}d ${h % 24}h ${m % 60}m`;
    if (h > 0) return `${h}h ${m % 60}m ${s % 60}s`;
    if (m > 0) return `${m}m ${s % 60}s`;
    return `${s}s`;
  }
}
