/**
 * Property-based tests for search result highlighting.
 *
 * Tests the SearchHighlightPipe that wraps matching text in <mark> elements
 * for display in search results. These properties validate universal
 * correctness across all possible inputs.
 *
 * Feature: search-campaigns
 * Testing framework: fast-check (property-based) + Jasmine
 *
 * **Validates: Requirements 2.5**
 */

import * as fc from 'fast-check';
import { SearchHighlightPipe } from './search-highlight.pipe';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Strips all HTML tags from a string, returning plain text. */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

/** Returns true if the string contains a <mark class="search-highlight"> tag. */
function containsHighlight(html: string): boolean {
  return html.includes('<mark class="search-highlight">');
}

/** Counts the number of <mark> tags in the HTML string. */
function countHighlights(html: string): number {
  return (html.match(/<mark class="search-highlight">/g) ?? []).length;
}

/**
 * Counts the number of non-overlapping case-insensitive occurrences
 * of `term` in `text`.
 */
function countOccurrences(text: string, term: string): number {
  if (!term) return 0;
  const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  return (text.match(regex) ?? []).length;
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Generates printable ASCII strings (no HTML special chars for simplicity). */
const plainTextArb = fc
  .string({ minLength: 1, maxLength: 200 })
  .filter((s) => !/[<>&"']/.test(s)); // exclude HTML special chars for clean testing

/** Generates non-empty search terms (printable ASCII, no HTML special chars). */
const searchTermArb = fc
  .string({ minLength: 1, maxLength: 30 })
  .filter((s) => s.trim().length > 0 && !/[<>&"']/.test(s));

// ---------------------------------------------------------------------------
// Property 6: Search Result Highlighting
// **Validates: Requirements 2.5**
// ---------------------------------------------------------------------------

describe('Property 6: Search Result Highlighting (Requirement 2.5)', () => {
  /**
   * Property 6: Search Result Highlighting
   * For any search term that produces matches, the matching text should be
   * highlighted in the search results display.
   *
   * Feature: search-campaigns, Property 6: Search Result Highlighting
   * **Validates: Requirements 2.5**
   */

  const pipe = new SearchHighlightPipe();

  // ── Sub-property 6.1: Matches are highlighted ──────────────────────────────

  it('should highlight matching text when the search term appears in the text', () => {
    /**
     * For any text that contains the search term (case-insensitive),
     * the output HTML must contain at least one <mark> element.
     */
    let passed = true;
    fc.assert(
      fc.property(
        plainTextArb,
        searchTermArb,
        (baseText, term) => {
          // Construct a text that definitely contains the term
          const text = baseText + term + baseText;
          const result = pipe.transform(text, term);

          const ok = containsHighlight(result);
          if (!ok) passed = false;
          return ok;
        },
      ),
      { numRuns: 100 },
    );
    expect(passed).toBeTrue();
  });

  // ── Sub-property 6.2: No highlights when search term is empty ─────────────

  it('should not add any highlight marks when the search term is empty', () => {
    /**
     * For any text and an empty/null search term, the output should
     * contain no <mark> elements.
     */
    let passed = true;
    fc.assert(
      fc.property(
        plainTextArb,
        fc.constantFrom('', '   ', null as unknown as string, undefined as unknown as string),
        (text, emptyTerm) => {
          const result = pipe.transform(text, emptyTerm);
          const ok = !containsHighlight(result);
          if (!ok) passed = false;
          return ok;
        },
      ),
      { numRuns: 100 },
    );
    expect(passed).toBeTrue();
  });

  // ── Sub-property 6.3: Plain text content is preserved ─────────────────────

  it('should preserve the original text content after stripping HTML tags', () => {
    /**
     * For any text and search term, stripping the HTML tags from the
     * highlighted output should yield the original text (modulo HTML escaping).
     * This ensures highlighting does not alter the visible text.
     */
    let passed = true;
    fc.assert(
      fc.property(
        plainTextArb,
        searchTermArb,
        (text, term) => {
          const result = pipe.transform(text, term);
          const stripped = stripHtml(result);

          // The stripped text should equal the original text
          // (HTML entities are decoded for comparison)
          const ok = stripped === text;
          if (!ok) passed = false;
          return ok;
        },
      ),
      { numRuns: 100 },
    );
    expect(passed).toBeTrue();
  });

  // ── Sub-property 6.4: Highlight count matches occurrence count ─────────────

  it('should create exactly one highlight mark per occurrence of the search term', () => {
    /**
     * For any text and search term, the number of <mark> elements in the
     * output should equal the number of case-insensitive occurrences of
     * the search term in the original text.
     */
    let passed = true;
    fc.assert(
      fc.property(
        plainTextArb,
        searchTermArb,
        (baseText, term) => {
          // Build a text with a known number of occurrences
          const text = baseText + term + baseText;
          const result = pipe.transform(text, term);

          const expectedCount = countOccurrences(text, term);
          const actualCount = countHighlights(result);

          const ok = actualCount === expectedCount;
          if (!ok) passed = false;
          return ok;
        },
      ),
      { numRuns: 100 },
    );
    expect(passed).toBeTrue();
  });

  // ── Sub-property 6.5: Case-insensitive matching ────────────────────────────

  it('should highlight matches regardless of case differences between text and search term', () => {
    /**
     * For any text and search term, the highlight result should be the same
     * whether the search term is in upper case, lower case, or mixed case.
     * This validates case-insensitive matching (Req 2.2).
     */
    let passed = true;
    fc.assert(
      fc.property(
        plainTextArb,
        searchTermArb,
        (baseText, term) => {
          const text = baseText + term + baseText;

          const resultLower = pipe.transform(text, term.toLowerCase());
          const resultUpper = pipe.transform(text, term.toUpperCase());

          // Both should produce the same number of highlights
          const countLower = countHighlights(resultLower);
          const countUpper = countHighlights(resultUpper);

          const ok = countLower === countUpper && countLower > 0;
          if (!ok) passed = false;
          return ok;
        },
      ),
      { numRuns: 100 },
    );
    expect(passed).toBeTrue();
  });

  // ── Sub-property 6.6: No highlights when term is not in text ──────────────

  it('should not add any highlights when the search term does not appear in the text', () => {
    /**
     * For any text and a search term that is guaranteed not to appear in
     * the text, the output should contain no <mark> elements.
     */
    let passed = true;
    fc.assert(
      fc.property(
        plainTextArb,
        (text) => {
          // Use a term that cannot appear in the text: a UUID-like string
          const uniqueTerm = 'ZZZNOMATCH_' + Math.random().toString(36).slice(2);
          // Ensure the term is not in the text
          if (text.toLowerCase().includes(uniqueTerm.toLowerCase())) return true;

          const result = pipe.transform(text, uniqueTerm);
          const ok = !containsHighlight(result);
          if (!ok) passed = false;
          return ok;
        },
      ),
      { numRuns: 100 },
    );
    expect(passed).toBeTrue();
  });

  // ── Sub-property 6.7: Empty text returns empty string ─────────────────────

  it('should return an empty string when the input text is empty', () => {
    let passed = true;
    fc.assert(
      fc.property(
        searchTermArb,
        (term) => {
          const result = pipe.transform('', term);
          const ok = result === '';
          if (!ok) passed = false;
          return ok;
        },
      ),
      { numRuns: 100 },
    );
    expect(passed).toBeTrue();
  });

  // ── Sub-property 6.8: Output is valid HTML (mark tags are properly closed) ─

  it('should produce balanced <mark> open and close tags in the output', () => {
    /**
     * For any text and search term, the number of opening <mark> tags
     * should equal the number of closing </mark> tags.
     */
    let passed = true;
    fc.assert(
      fc.property(
        plainTextArb,
        searchTermArb,
        (baseText, term) => {
          const text = baseText + term + baseText;
          const result = pipe.transform(text, term);

          const openTags = (result.match(/<mark[^>]*>/g) ?? []).length;
          const closeTags = (result.match(/<\/mark>/g) ?? []).length;

          const ok = openTags === closeTags;
          if (!ok) passed = false;
          return ok;
        },
      ),
      { numRuns: 100 },
    );
    expect(passed).toBeTrue();
  });
});
