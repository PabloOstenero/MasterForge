/**
 * SearchHighlightPipe — highlights matching text in search results.
 *
 * Wraps all occurrences of the search term in a <mark> element so they
 * can be styled distinctly in the UI. The match is case-insensitive.
 *
 * Usage in templates:
 *   <span [innerHTML]="campaign.name | searchHighlight:searchText"></span>
 *
 * Validates: Requirement 2.5
 */

import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'searchHighlight',
  standalone: true,
  pure: true,
})
export class SearchHighlightPipe implements PipeTransform {
  /**
   * Highlights all occurrences of `searchTerm` within `text`.
   *
   * - Returns the HTML-escaped text unchanged when searchTerm is empty/null.
   * - Escapes special regex characters in the search term to prevent errors.
   * - Wraps each match in <mark class="search-highlight">...</mark>.
   * - The match is case-insensitive.
   *
   * @param text       The full text to search within.
   * @param searchTerm The term to highlight.
   * @returns          HTML string with matches wrapped in <mark> tags.
   */
  transform(text: string, searchTerm: string | null | undefined): string {
    if (!text) return '';

    const trimmedTerm = searchTerm ? searchTerm.trim() : '';
    if (!trimmedTerm) {
      return this.escapeHtml(text);
    }

    // Build a non-global regex for matching (we iterate manually)
    const escapedTerm = this.escapeRegex(trimmedTerm);
    const regex = new RegExp(escapedTerm, 'gi');

    let result = '';
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    // Use exec() loop to find all matches and build the output
    while ((match = regex.exec(text)) !== null) {
      // Append the non-matching text before this match (HTML-escaped)
      result += this.escapeHtml(text.slice(lastIndex, match.index));
      // Append the matching text wrapped in a <mark> tag (HTML-escaped)
      result += '<mark class="search-highlight">' + this.escapeHtml(match[0]) + '</mark>';
      lastIndex = match.index + match[0].length;

      // Prevent infinite loop on zero-length matches
      if (match[0].length === 0) {
        regex.lastIndex++;
      }
    }

    // Append any remaining text after the last match
    result += this.escapeHtml(text.slice(lastIndex));

    return result;
  }

  /**
   * Escapes special HTML characters to prevent XSS when using innerHTML.
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Escapes special regex metacharacters in the search term.
   */
  private escapeRegex(term: string): string {
    return term.replace(/[$()*+.?[\\\]^{|}]/g, '\\$&');
  }
}
