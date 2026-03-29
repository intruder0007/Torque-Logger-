// ─────────────────────────────────────────────────────────────────────────────
//  TORQUE™ — Section Builder v1
//  Modular utility for building visually consistent log 'sections'.
// ─────────────────────────────────────────────────────────────────────────────

import { Brand } from './constants.js';

export class SectionBuilder {
  constructor() {
    this.lines = [];
    this.divider = Brand.DIVIDER;
  }

  /**
   * Adds a branded title block to the section.
   * @param {string} emoji 
   * @param {string} title 
   */
  addTitle(emoji, title) {
    if (this.lines.length > 0) this.lines.push(''); // Gap between sections
    this.lines.push(`${emoji} **${title.toUpperCase()}**`);
    this.lines.push(this.divider);
    return this;
  }

  /**
   * Adds a key-value field with premium formatting.
   * @param {string} label 
   * @param {string} value 
   * @param {boolean} code - Wrap value in code block
   */
  addField(label, value, code = false) {
    const displayValue = code ? `\`${value}\`` : value;
    this.lines.push(`> **${label}:** ${displayValue}`);
    return this;
  }

  /**
   * Adds a meta-info line (smaller, subtle).
   * @param {string} text 
   */
  addMeta(text) {
    this.lines.push(`*${text}*`);
    return this;
  }

  /**
   * Adds a raw line of text.
   * @param {string} text 
   */
  addRaw(text) {
    this.lines.push(text);
    return this;
  }

  /**
   * Compiles the section into a string.
   */
  build() {
    return this.lines.join('\n');
  }
}
