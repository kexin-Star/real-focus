// Content Script for Real Focus Assistant
// Enhanced content extraction and preprocessing

const MAX_SNIPPET_LENGTH = 500;

/**
 * Extract key content from the page
 * @returns {Object} Extracted content with title, h1, description, and snippet
 */
function extractPageContent() {
  const content = {
    title: '',
    h1: '',
    description: '',
    content_snippet: ''
  };

  // Extract <title>
  const titleElement = document.querySelector('title');
  if (titleElement) {
    content.title = titleElement.textContent.trim();
  }

  // Extract <h1>
  const h1Element = document.querySelector('h1');
  if (h1Element) {
    content.h1 = h1Element.textContent.trim();
  }

  // Extract <meta name="description">
  const metaDescription = document.querySelector('meta[name="description"]');
  if (metaDescription) {
    content.description = metaDescription.getAttribute('content') || '';
  }

  // Extract and preprocess content snippet
  content.content_snippet = extractContentSnippet();

  return content;
}

/**
 * Extract and preprocess content snippet (max 500 characters)
 * Priority: description > h1 > first paragraph > title
 * @returns {string} Preprocessed content snippet
 */
function extractContentSnippet() {
  let snippet = '';

  // Priority 1: Meta description
  const metaDescription = document.querySelector('meta[name="description"]');
  if (metaDescription) {
    snippet = metaDescription.getAttribute('content') || '';
    if (snippet.length <= MAX_SNIPPET_LENGTH) {
      return preprocessText(snippet);
    }
  }

  // Priority 2: H1 heading
  const h1Element = document.querySelector('h1');
  if (h1Element) {
    snippet = h1Element.textContent.trim();
    if (snippet.length <= MAX_SNIPPET_LENGTH) {
      return preprocessText(snippet);
    }
  }

  // Priority 3: First meaningful paragraph
  const paragraphs = document.querySelectorAll('p');
  for (const p of paragraphs) {
    const text = p.textContent.trim();
    if (text.length > 20) { // Skip very short paragraphs
      snippet = text;
      if (snippet.length <= MAX_SNIPPET_LENGTH) {
        return preprocessText(snippet);
      }
      break;
    }
  }

  // Priority 4: Title
  const titleElement = document.querySelector('title');
  if (titleElement) {
    snippet = titleElement.textContent.trim();
  }

  // If snippet is still empty, try to get any visible text
  if (!snippet || snippet.length === 0) {
    const bodyText = document.body.innerText || document.body.textContent || '';
    snippet = bodyText.trim();
  }

  // Preprocess and truncate to 500 characters
  return preprocessText(snippet);
}

/**
 * Preprocess text: clean, normalize, and truncate
 * @param {string} text - Raw text
 * @returns {string} Preprocessed text (max 500 characters)
 */
function preprocessText(text) {
  if (!text) return '';

  // Remove extra whitespace and newlines
  let processed = text.replace(/\s+/g, ' ').trim();

  // Remove special characters that don't add meaning
  processed = processed.replace(/[^\w\s\u4e00-\u9fa5.,!?;:()\-]/g, ' ');

  // Normalize spaces
  processed = processed.replace(/\s+/g, ' ').trim();

  // Truncate to max length (preserve word boundaries if possible)
  if (processed.length > MAX_SNIPPET_LENGTH) {
    processed = processed.substring(0, MAX_SNIPPET_LENGTH);
    // Try to cut at word boundary
    const lastSpace = processed.lastIndexOf(' ');
    if (lastSpace > MAX_SNIPPET_LENGTH * 0.8) {
      processed = processed.substring(0, lastSpace);
    }
    processed += '...';
  }

  return processed;
}

/**
 * Get all extracted content in a structured format
 * @returns {Object} Complete page content information
 */
function getPageContent() {
  const content = extractPageContent();
  
  // Build a comprehensive content string for API
  const contentParts = [];
  
  if (content.title) {
    contentParts.push(`Title: ${content.title}`);
  }
  
  if (content.h1 && content.h1 !== content.title) {
    contentParts.push(`Heading: ${content.h1}`);
  }
  
  if (content.description) {
    contentParts.push(`Description: ${content.description}`);
  }
  
  if (content.content_snippet) {
    contentParts.push(`Content: ${content.content_snippet}`);
  }

  return {
    title: content.title,
    h1: content.h1,
    description: content.description,
    content_snippet: content.content_snippet,
    combined_content: contentParts.join(' | ')
  };
}

// Listen for messages from background script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractContent') {
    try {
      const content = getPageContent();
      sendResponse({ success: true, content });
    } catch (error) {
      console.error('Error extracting content:', error);
      sendResponse({ success: false, error: error.message });
    }
    return true; // Keep message channel open for async response
  }

  return false;
});

// Log when content script is loaded
console.log('Real Focus Assistant content script loaded');

