'use strict'
/**
* For building a log message with formatting (colors).
* @property {String} messageWithFormatting - The message with color codes and other formatting.
* @property {String} messageWithoutFormatting - The message without formatting.
*/
class LogMessageBuilder {
  constructor() {
    this.messageWithFormatting = '';
    this.messageWithoutFormatting = '';
  }

  /**
  * Set the color that subsequently appended text should display in.
  * @param {String} color - The ANSI color code. See core/util/ansi_color_codes.js
  * @see core/util/ansi_color_codes.js
  */
  setColor(color) {
    this.messageWithFormatting += color;
  }

  /**
  * Append text (with the current color setting).
  * @param {String} text - The text to append.
  */
  append(text) {
    this.messageWithFormatting += text;
    this.messageWithoutFormatting += text;
  }
}

module.exports = LogMessageBuilder;
