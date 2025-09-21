/**
 * Utility function to generate URL-friendly slugs from text
 */

export function generateSlug(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return text
    .toLowerCase() // Convert to lowercase
    .trim() // Remove leading/trailing spaces
    .replace(/[\s\W-]+/g, '-') // Replace spaces and non-word characters with hyphens
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .substring(0, 100); // Limit length to 100 characters
}

/**
 * Generate a unique slug by checking against existing slugs
 * @param baseSlug - The base slug to make unique
 * @param existingSlugChecker - Function that returns true if slug exists
 * @returns Promise<string> - A unique slug
 */
export async function generateUniqueSlug(
  baseSlug: string,
  existingSlugChecker: (slug: string) => Promise<boolean>,
): Promise<string> {
  let slug = baseSlug;
  let counter = 1;

  // Keep checking and incrementing until we find a unique slug
  while (await existingSlugChecker(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
}

/**
 * Validate slug format
 * @param slug - The slug to validate
 * @returns boolean - True if valid slug format
 */
export function isValidSlug(slug: string): boolean {
  if (!slug || typeof slug !== 'string') {
    return false;
  }

  // Slug should only contain lowercase letters, numbers, and hyphens
  // Should not start or end with hyphen
  const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  return slugPattern.test(slug) && slug.length <= 100;
}

/**
 * Clean and validate slug input
 * @param input - Raw slug input
 * @returns string - Cleaned slug or empty string if invalid
 */
export function cleanSlugInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  const cleaned = input
    .toLowerCase()
    .trim()
    .replace(/[\s\W-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100);

  return isValidSlug(cleaned) ? cleaned : '';
}

/**
 * Extract potential slug from various text formats
 * @param text - Text to extract slug from (title, heading, etc.)
 * @returns string - Generated slug
 */
export function extractSlugFromText(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  // Remove HTML tags if present
  const cleanText = text.replace(/<[^>]*>/g, '');

  // Generate slug from clean text
  return generateSlug(cleanText);
}

/**
 * Create slug suggestions based on text
 * @param text - Source text
 * @param count - Number of suggestions to generate (default: 3)
 * @returns string[] - Array of slug suggestions
 */
export function generateSlugSuggestions(
  text: string,
  count: number = 3,
): string[] {
  const baseSlug = generateSlug(text);
  if (!baseSlug) {
    return [];
  }

  const suggestions = [baseSlug];

  // Generate variations
  if (count > 1) {
    const words = baseSlug.split('-');

    // Try shorter version with first few words
    if (words.length > 2) {
      suggestions.push(words.slice(0, Math.ceil(words.length / 2)).join('-'));
    }

    // Try with current timestamp
    if (count > 2) {
      suggestions.push(`${baseSlug}-${Date.now().toString().slice(-6)}`);
    }

    // Add more creative variations if needed
    for (let i = suggestions.length; i < count && i < 5; i++) {
      suggestions.push(`${baseSlug}-${i}`);
    }
  }

  return suggestions.slice(0, count);
}
