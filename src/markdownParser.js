/**
 * Simple Markdown Parser for Worktimer
 * Converts basic markdown to HTML without external dependencies
 */

'use strict';

window.markdownParser = {
  /**
   * Parse markdown text to HTML
   * @param {string} markdown - The markdown text to parse
   * @returns {string} HTML string
   */
  parse: function(markdown) {
    if (!markdown || typeof markdown !== 'string') return '';
    
    try {
      let html = markdown;
      
      // We'll process line by line to handle block elements
      const lines = html.split('\n');
      const processedLines = [];
      let inList = false;
      let inOrderedList = false;
    
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      
      // Headers
      if (line.match(/^#{1,6}\s/)) {
        const level = line.match(/^#+/)[0].length;
        const text = line.replace(/^#+\s/, '').trim();
        line = `<h${level}>${this.parseInline(text)}</h${level}>`;
      }
      // Unordered list items
      else if (line.match(/^\s*[-*]\s/)) {
        const text = line.replace(/^\s*[-*]\s/, '');
        if (!inList) {
          processedLines.push('<ul>');
          inList = true;
        }
        line = `<li>${this.parseInline(text)}</li>`;
      }
      // Ordered list items
      else if (line.match(/^\s*\d+\.\s/)) {
        const text = line.replace(/^\s*\d+\.\s/, '');
        if (!inOrderedList) {
          processedLines.push('<ol>');
          inOrderedList = true;
        }
        line = `<li>${this.parseInline(text)}</li>`;
      }
      // End of list
      else if (line.trim() === '') {
        if (inList) {
          processedLines.push('</ul>');
          inList = false;
        }
        if (inOrderedList) {
          processedLines.push('</ol>');
          inOrderedList = false;
        }
        line = '<br>';
      }
      // Regular paragraph
      else if (line.trim() !== '') {
        if (inList) {
          processedLines.push('</ul>');
          inList = false;
        }
        if (inOrderedList) {
          processedLines.push('</ol>');
          inOrderedList = false;
        }
        line = `<p>${this.parseInline(line)}</p>`;
      }
      
      processedLines.push(line);
    }
    
    // Close any open lists
    if (inList) {
      processedLines.push('</ul>');
    }
    if (inOrderedList) {
      processedLines.push('</ol>');
    }
    
    return processedLines.join('\n');
    } catch (error) {
      console.error('Failed to parse markdown:', error);
      return '<p>Failed to parse content</p>';
    }
  },
  
  /**
   * Parse inline markdown elements
   * @param {string} text - The text to parse
   * @returns {string} HTML string
   */
  parseInline: function(text) {
    if (!text || typeof text !== 'string') return '';
    
    try {
      // Bold **text** or __text__
      text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      text = text.replace(/__(.+?)__/g, '<strong>$1</strong>');
      
      // Italic *text* or _text_
      text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
      text = text.replace(/_(.+?)_/g, '<em>$1</em>');
      
      // Code `text`
      text = text.replace(/`(.+?)`/g, '<code>$1</code>');
      
      // Links [text](url)
      text = text.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
      
      return text;
    } catch (error) {
      console.error('Failed to parse inline markdown:', error);
      return text;
    }
  }
};
