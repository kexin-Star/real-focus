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
  // This will use enhanced logic to exclude sidebar, footer, and other noise
  content.content_snippet = extractContentSnippet();

  return content;
}

/**
 * Extract and preprocess content snippet (max 500 characters)
 * Priority: description > h1 > core content area > first paragraph > title
 * Enhanced with exclusion logic for sidebar, footer, and other noise
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

  // Priority 2: H1 heading (but exclude if it's in excluded containers)
  const h1Element = document.querySelector('h1');
  if (h1Element) {
    // Check if h1 is in an excluded container
    const isInExcluded = isElementInExcludedContainer(h1Element);
    if (!isInExcluded) {
      snippet = h1Element.textContent.trim();
      if (snippet.length <= MAX_SNIPPET_LENGTH) {
        return preprocessText(snippet);
      }
    }
  }

  // Priority 3: Core content areas (e.g., search results, main feeds)
  // First, try to find core content containers
  const coreContentSelectors = [
    '.main-content',
    '.feeds-page',
    '#note-content',
    '.search-result',
    '.search-results',
    '.result-list',
    '.feed-list',
    '.content-list',
    '[class*="feed"]',
    '[class*="result"]',
    '[class*="search"]',
    'main',
    'article',
    '[role="main"]'
  ];

  for (const selector of coreContentSelectors) {
    const coreElement = document.querySelector(selector);
    if (coreElement) {
      // Clone the element to avoid modifying the original DOM
      const clonedElement = coreElement.cloneNode(true);
      
      // Remove excluded elements from the clone
      removeExcludedElements(clonedElement);
      
      // Try to find meaningful paragraphs in the core area
      const paragraphs = clonedElement.querySelectorAll('p');
      for (const p of paragraphs) {
        const text = p.textContent.trim();
        if (text.length > 20) {
          snippet = text;
          if (snippet.length <= MAX_SNIPPET_LENGTH) {
            return preprocessText(snippet);
          }
          return preprocessText(snippet);
        }
      }
      
      // If no paragraphs, try to get text from the core element itself
      const coreText = clonedElement.innerText || clonedElement.textContent || '';
      if (coreText.trim().length > 20) {
        snippet = coreText.trim();
        return preprocessText(snippet);
      }
    }
  }

  // Priority 4: First meaningful paragraph (from entire page, but exclude noise)
  const allParagraphs = document.querySelectorAll('p');
  for (const p of allParagraphs) {
    // Skip if paragraph is in excluded container
    if (isElementInExcludedContainer(p)) {
      continue;
    }
    
    const text = p.textContent.trim();
    if (text.length > 20) {
      snippet = text;
      if (snippet.length <= MAX_SNIPPET_LENGTH) {
        return preprocessText(snippet);
      }
      return preprocessText(snippet);
    }
  }

  // Priority 5: Title
  const titleElement = document.querySelector('title');
  if (titleElement) {
    snippet = titleElement.textContent.trim();
  }

  // Priority 6: Fallback - get text from body but exclude noise
  if (!snippet || snippet.length === 0) {
    // Clone body to avoid modifying original DOM
    const bodyClone = document.body.cloneNode(true);
    removeExcludedElements(bodyClone);
    const bodyText = bodyClone.innerText || bodyClone.textContent || '';
    snippet = bodyText.trim();
  }

  // Preprocess and truncate to 500 characters
  return preprocessText(snippet);
}

/**
 * Check if an element is inside an excluded container
 * @param {HTMLElement} element - Element to check
 * @returns {boolean} - True if element is in excluded container
 */
function isElementInExcludedContainer(element) {
  const excludedSelectors = [
    '#side-bar',
    '.side-bar',
    '.sidebar',
    '.footer-container',
    'footer',
    '.app-info',
    '.corp-info',
    '.copyright',
    '[class*="footer"]',
    '[class*="sidebar"]',
    '[class*="side-bar"]',
    '[id*="footer"]',
    '[id*="sidebar"]',
    '[id*="side-bar"]',
    '.icp',
    '.beian',
    '.备案'
  ];
  
  let current = element;
  while (current && current !== document.body) {
    for (const selector of excludedSelectors) {
      if (current.matches && current.matches(selector)) {
        return true;
      }
      // Check if current element is a child of excluded container
      const excludedParent = current.closest(selector);
      if (excludedParent) {
        return true;
      }
    }
    current = current.parentElement;
  }
  return false;
}

/**
 * Remove excluded elements from a cloned DOM element
 * @param {HTMLElement} element - Cloned element to clean
 */
function removeExcludedElements(element) {
  const excludedSelectors = [
    '#side-bar',
    '.side-bar',
    '.sidebar',
    '.footer-container',
    'footer',
    '.app-info',
    '.corp-info',
    '.copyright',
    '[class*="footer"]',
    '[class*="sidebar"]',
    '[class*="side-bar"]',
    '[id*="footer"]',
    '[id*="sidebar"]',
    '[id*="side-bar"]',
    '.icp',
    '.beian',
    '.备案',
    'nav',
    'header',
    '[role="navigation"]',
    '[role="banner"]',
    '[role="complementary"]'
  ];
  
  excludedSelectors.forEach(selector => {
    try {
      const excludedElements = element.querySelectorAll(selector);
      excludedElements.forEach(el => {
        if (el.parentNode) {
          el.parentNode.removeChild(el);
        }
      });
    } catch (e) {
      // Ignore selector errors
    }
  });
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

/**
 * Create and show M3-style time control countdown banner
 * Material Design 3 style notification bar
 * @param {number} duration - Countdown duration in seconds
 * @param {string} message - Message to display
 */
function showTimeControlBanner(duration, message) {
  // Remove existing banner if any
  const existingBanner = document.getElementById('real-focus-time-control-banner');
  if (existingBanner) {
    existingBanner.remove();
  }

  // Add M3 styles
  if (!document.getElementById('real-focus-m3-styles')) {
    const m3Styles = document.createElement('style');
    m3Styles.id = 'real-focus-m3-styles';
    m3Styles.textContent = `
      @keyframes slideDown {
        from {
          transform: translateY(-100%);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
      @keyframes pulse {
        0%, 100% {
          opacity: 1;
        }
        50% {
          opacity: 0.7;
        }
      }
      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
      @keyframes scaleIn {
        from {
          transform: scale(0.9);
          opacity: 0;
        }
        to {
          transform: scale(1);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(m3Styles);
  }

  // Create M3-style banner element
  const banner = document.createElement('div');
  banner.id = 'real-focus-time-control-banner';
  banner.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: #1C1B1F; /* M3 Surface Container Highest */
    color: #E6E1E5; /* M3 On Surface */
    padding: 16px 24px;
    z-index: 999999;
    font-family: 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 14px;
    line-height: 20px;
    box-shadow: 0px 1px 3px 0px rgba(0, 0, 0, 0.3), 
                0px 4px 8px 3px rgba(0, 0, 0, 0.15);
    display: flex;
    align-items: center;
    justify-content: space-between;
    animation: slideDown 0.3s cubic-bezier(0.2, 0, 0, 1);
    border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  `;

  // Create message container with M3 layout
  const messageContainer = document.createElement('div');
  messageContainer.style.cssText = `
    display: flex;
    align-items: center;
    gap: 16px;
    flex: 1;
  `;

  // Create M3-style icon (warning icon)
  const iconContainer = document.createElement('div');
  iconContainer.innerHTML = '⚠️';
  iconContainer.style.cssText = `
    font-size: 20px;
    line-height: 1;
    flex-shrink: 0;
  `;

  // Create message text container
  const messageTextContainer = document.createElement('div');
  messageTextContainer.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
  `;

  // Create message text
  const messageText = document.createElement('span');
  messageText.textContent = message || '当前正在干扰平台进行搜索，你有 30 秒时间查看，之后将强制拦截';
  messageText.style.cssText = `
    font-size: 14px;
    line-height: 20px;
    font-weight: 400;
    color: #E6E1E5;
  `;

  // Create countdown display (M3 chip style)
  const countdownDisplay = document.createElement('span');
  countdownDisplay.id = 'real-focus-countdown';
  countdownDisplay.style.cssText = `
    font-weight: 500;
    font-size: 14px;
    min-width: 48px;
    text-align: center;
    background: #6750A4; /* M3 Primary Container */
    color: #FFFFFF; /* M3 On Primary Container */
    padding: 6px 12px;
    border-radius: 16px; /* M3 chip radius */
    animation: pulse 1.5s ease-in-out infinite;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.1px;
  `;

  messageTextContainer.appendChild(messageText);
  messageContainer.appendChild(iconContainer);
  messageContainer.appendChild(messageTextContainer);
  messageContainer.appendChild(countdownDisplay);

  banner.appendChild(messageContainer);
  document.body.appendChild(banner);

  // Start countdown
  let remaining = duration || 30;
  countdownDisplay.textContent = `${remaining}秒`;

  const countdownInterval = setInterval(() => {
    remaining--;
    if (remaining <= 0) {
      clearInterval(countdownInterval);
      countdownDisplay.textContent = '0秒';
      // Change banner style when time is up (M3 error color)
      banner.style.background = '#1C1B1F';
      countdownDisplay.style.background = '#BA1A1A'; /* M3 Error Container */
      countdownDisplay.style.animation = 'none';
    } else {
      countdownDisplay.textContent = `${remaining}秒`;
      // Change color as time runs out (last 5 seconds)
      if (remaining <= 5) {
        countdownDisplay.style.background = '#BA1A1A'; /* M3 Error */
      }
    }
  }, 1000);

  // Store interval ID for cleanup
  banner.dataset.intervalId = countdownInterval;
}

/**
 * Remove time control banner
 */
function removeTimeControlBanner() {
  const banner = document.getElementById('real-focus-time-control-banner');
  if (banner) {
    const intervalId = banner.dataset.intervalId;
    if (intervalId) {
      clearInterval(parseInt(intervalId));
    }
    banner.remove();
  }
}

/**
 * Force block the page with M3-style red blocking interface
 * @param {string} reason - AI's blocking reason
 * @param {number} score - Relevance score (default 15)
 */
function forceBlockPage(reason, score = 15) {
  // Remove countdown banner
  removeTimeControlBanner();

  // Create M3-style blocking overlay
  const overlay = document.createElement('div');
  overlay.id = 'real-focus-block-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: #1C1B1F; /* M3 Surface */
    z-index: 9999999;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    color: #E6E1E5; /* M3 On Surface */
    animation: fadeIn 0.3s cubic-bezier(0.2, 0, 0, 1);
    padding: 24px;
  `;

  // Create M3-style card container
  const card = document.createElement('div');
  card.style.cssText = `
    background: #211F26; /* M3 Surface Container High */
    border-radius: 28px; /* M3 large shape */
    padding: 48px;
    max-width: 560px;
    width: 100%;
    box-shadow: 0px 1px 3px 0px rgba(0, 0, 0, 0.3),
                0px 4px 8px 3px rgba(0, 0, 0, 0.15);
    animation: scaleIn 0.3s cubic-bezier(0.2, 0, 0, 1);
    text-align: center;
  `;

  // Create error icon container (M3 style)
  const iconContainer = document.createElement('div');
  iconContainer.style.cssText = `
    width: 80px;
    height: 80px;
    border-radius: 40px;
    background: #F9DEDC; /* M3 Error Container */
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 24px;
  `;
  const errorIcon = document.createElement('div');
  errorIcon.textContent = '🚫';
  errorIcon.style.cssText = `
    font-size: 48px;
    line-height: 1;
  `;
  iconContainer.appendChild(errorIcon);

  // Create title
  const blockTitle = document.createElement('h1');
  blockTitle.textContent = '页面已被拦截';
  blockTitle.style.cssText = `
    font-size: 28px;
    line-height: 36px;
    font-weight: 400;
    margin: 0 0 16px 0;
    color: #E6E1E5; /* M3 On Surface */
    letter-spacing: 0;
  `;

  // Create score display (M3 chip style)
  const scoreContainer = document.createElement('div');
  scoreContainer.style.cssText = `
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: #BA1A1A; /* M3 Error */
    color: #FFFFFF; /* M3 On Error */
    padding: 8px 16px;
    border-radius: 16px;
    margin-bottom: 24px;
    font-size: 14px;
    font-weight: 500;
    letter-spacing: 0.1px;
  `;
  const scoreLabel = document.createElement('span');
  scoreLabel.textContent = '相关性得分:';
  const scoreValue = document.createElement('span');
  scoreValue.textContent = `${score}%`;
  scoreValue.style.cssText = `
    font-weight: 600;
  `;
  scoreContainer.appendChild(scoreLabel);
  scoreContainer.appendChild(scoreValue);

  // Create reason text
  const blockReason = document.createElement('p');
  blockReason.textContent = reason || '30秒宽限期已结束，已强制拦截该页面';
  blockReason.style.cssText = `
    font-size: 16px;
    line-height: 24px;
    margin: 0 0 32px 0;
    color: #CAC4D0; /* M3 On Surface Variant */
    letter-spacing: 0.5px;
  `;

  // Create M3-style button container
  const buttonContainer = document.createElement('div');
  buttonContainer.style.cssText = `
    display: flex;
    gap: 16px;
    justify-content: center;
  `;

  // Create "返回上一页" button (M3 Filled Button)
  const backButton = document.createElement('button');
  backButton.textContent = '返回上一页';
  backButton.style.cssText = `
    background: #6750A4; /* M3 Primary */
    color: #FFFFFF; /* M3 On Primary */
    border: none;
    padding: 10px 24px;
    font-size: 14px;
    font-weight: 500;
    border-radius: 20px; /* M3 button radius */
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
    letter-spacing: 0.1px;
    box-shadow: 0px 1px 3px 0px rgba(0, 0, 0, 0.3),
                0px 4px 8px 3px rgba(0, 0, 0, 0.15);
  `;
  backButton.onmouseover = () => {
    backButton.style.background = '#7C67C4'; /* M3 Primary Hover */
    backButton.style.boxShadow = '0px 1px 2px 0px rgba(0, 0, 0, 0.3), 0px 2px 6px 2px rgba(0, 0, 0, 0.15)';
  };
  backButton.onmouseout = () => {
    backButton.style.background = '#6750A4';
    backButton.style.boxShadow = '0px 1px 3px 0px rgba(0, 0, 0, 0.3), 0px 4px 8px 3px rgba(0, 0, 0, 0.15)';
  };
  backButton.onclick = () => {
    window.history.back();
  };

  buttonContainer.appendChild(backButton);
  card.appendChild(iconContainer);
  card.appendChild(blockTitle);
  card.appendChild(scoreContainer);
  card.appendChild(blockReason);
  card.appendChild(buttonContainer);
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  // Prevent any interaction with the page
  document.body.style.overflow = 'hidden';
}

// Listen for messages from background script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractContent') {
    // Use async function to handle potential delays
    (async () => {
      try {
        // Wait a bit for page to be fully loaded (especially for dynamic content)
        // This helps with pages that load content dynamically
        if (document.readyState !== 'complete') {
          await new Promise(resolve => {
            if (document.readyState === 'complete') {
              resolve();
            } else {
              window.addEventListener('load', resolve, { once: true });
              // Timeout after 500ms to avoid waiting too long
              setTimeout(resolve, 500);
            }
          });
        }
        
        // Small delay to ensure dynamic content is rendered
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const content = getPageContent();
        console.log('Content extracted:', {
          title: content.title,
          hasSnippet: !!content.content_snippet,
          snippetLength: content.content_snippet?.length || 0,
          snippetPreview: content.content_snippet?.substring(0, 100) || 'N/A'
        });
        sendResponse({ success: true, content });
      } catch (error) {
        console.error('Error extracting content:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true; // Keep message channel open for async response
  }

  // Handle timer_start message (new message name)
  if (request.action === 'timer_start') {
    try {
      const duration = request.duration || 30;
      const message = request.message || '当前正在干扰平台进行搜索，你有 30 秒时间查看，之后将强制拦截';
      showTimeControlBanner(duration, message);
      sendResponse({ success: true });
    } catch (error) {
      console.error('Error showing time control banner:', error);
      sendResponse({ success: false, error: error.message });
    }
    return true;
  }

  // Handle block_page message (new message name)
  if (request.action === 'block_page') {
    try {
      const reason = request.reason || '30秒宽限期已结束，已强制拦截该页面';
      const score = request.score || 15; // Default 15% relevance score
      forceBlockPage(reason, score);
      sendResponse({ success: true });
    } catch (error) {
      console.error('Error forcing block:', error);
      sendResponse({ success: false, error: error.message });
    }
    return true;
  }

  // Legacy support for old message names
  if (request.action === 'showTimeControl') {
    try {
      showTimeControlBanner(request.duration || 30, request.message || '当前正在干扰平台进行搜索，你有 30 秒时间查看，之后将强制拦截');
      sendResponse({ success: true });
    } catch (error) {
      console.error('Error showing time control banner:', error);
      sendResponse({ success: false, error: error.message });
    }
    return true;
  }

  if (request.action === 'forceBlock') {
    try {
      forceBlockPage(request.reason, request.score || 15);
      sendResponse({ success: true });
    } catch (error) {
      console.error('Error forcing block:', error);
      sendResponse({ success: false, error: error.message });
    }
    return true;
  }

  if (request.action === 'removeTimeControl') {
    try {
      removeTimeControlBanner();
      sendResponse({ success: true });
    } catch (error) {
      console.error('Error removing time control banner:', error);
      sendResponse({ success: false, error: error.message });
    }
    return true;
  }

  return false;
});

// Log when content script is loaded
console.log('Real Focus Assistant content script loaded');

