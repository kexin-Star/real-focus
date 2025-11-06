// Background Service Worker for Real Focus Assistant

const CACHE_KEY = 'aiCache';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const MAX_CACHE_SIZE = 4 * 1024 * 1024; // 4MB (leave 1MB buffer from 5MB limit)

chrome.runtime.onInstalled.addListener(() => {
  console.log('Real Focus Assistant installed');
  // Initialize cache if it doesn't exist
  chrome.storage.local.get([CACHE_KEY], (result) => {
    if (!result[CACHE_KEY]) {
      chrome.storage.local.set({ [CACHE_KEY]: {} });
    }
  });
});

/**
 * Get cached AI result for a URL
 * @param {string} url - The page URL
 * @returns {Promise<Object|null>} - Cached result or null if not found/expired
 */
async function getCache(url) {
  try {
    const result = await chrome.storage.local.get([CACHE_KEY]);
    const cache = result[CACHE_KEY] || {};
    const cachedData = cache[url];
    
    if (!cachedData) {
      return null;
    }
    
    // Check if cache is still valid (within 24 hours)
    const now = Date.now();
    const age = now - cachedData.timestamp;
    
    if (age > CACHE_TTL) {
      // Cache expired, remove it
      delete cache[url];
      await chrome.storage.local.set({ [CACHE_KEY]: cache });
      return null;
    }
    
    return {
      relevance_score_percent: cachedData.score,
      status: cachedData.status,
      reason: cachedData.reason || '',
      fromCache: true
    };
  } catch (error) {
    console.error('Error getting cache:', error);
    return null;
  }
}

/**
 * Set cache for a URL
 * @param {string} url - The page URL
 * @param {Object} result - AI result object
 */
async function setCache(url, result) {
  try {
    const result_data = await chrome.storage.local.get([CACHE_KEY]);
    let cache = result_data[CACHE_KEY] || {};
    
    // Prepare new cache entry
    const cacheEntry = {
      score: result.relevance_score_percent,
      status: result.status,
      reason: result.reason || '',
      timestamp: Date.now()
    };
    
    // Check storage size before adding
    await ensureCacheCapacity(cache, cacheEntry);
    
    // Add new entry
    cache[url] = cacheEntry;
    
    await chrome.storage.local.set({ [CACHE_KEY]: cache });
    console.log('Cache updated for:', url);
  } catch (error) {
    console.error('Error setting cache:', error);
    // If storage is full, try to clean up and retry
    if (error.message && error.message.includes('QUOTA_BYTES')) {
      await clearOldCache();
      try {
        const result_data = await chrome.storage.local.get([CACHE_KEY]);
        let cache = result_data[CACHE_KEY] || {};
        cache[url] = {
          score: result.relevance_score_percent,
          status: result.status,
          reason: result.reason || '',
          timestamp: Date.now()
        };
        await chrome.storage.local.set({ [CACHE_KEY]: cache });
      } catch (retryError) {
        console.error('Failed to set cache after cleanup:', retryError);
      }
    }
  }
}

/**
 * Ensure cache has capacity by removing old entries (LIFO - remove oldest)
 * @param {Object} cache - Current cache object
 * @param {Object} newEntry - New entry to add
 */
async function ensureCacheCapacity(cache, newEntry) {
  try {
    // Estimate size of new entry
    const newEntrySize = JSON.stringify(newEntry).length;
    
    // Get current storage usage
    const usage = await chrome.storage.local.getBytesInUse([CACHE_KEY]);
    const estimatedNewSize = usage + newEntrySize;
    
    // If adding this entry would exceed limit, remove oldest entries
    if (estimatedNewSize > MAX_CACHE_SIZE) {
      // Convert cache to array of [url, data] pairs
      const entries = Object.entries(cache);
      
      // Sort by timestamp (oldest first)
      entries.sort((a, b) => (a[1].timestamp || 0) - (b[1].timestamp || 0));
      
      // Remove oldest entries until we have enough space
      let removedCount = 0;
      while (entries.length > 0 && estimatedNewSize - removedCount * 100 > MAX_CACHE_SIZE * 0.8) {
        const [url] = entries.shift();
        delete cache[url];
        removedCount++;
      }
      
      console.log(`Removed ${removedCount} old cache entries to free space`);
    }
  } catch (error) {
    console.error('Error ensuring cache capacity:', error);
  }
}

/**
 * Clear old cache entries (older than TTL)
 */
async function clearOldCache() {
  try {
    const result = await chrome.storage.local.get([CACHE_KEY]);
    const cache = result[CACHE_KEY] || {};
    const now = Date.now();
    let removedCount = 0;
    
    for (const [url, data] of Object.entries(cache)) {
      if (now - data.timestamp > CACHE_TTL) {
        delete cache[url];
        removedCount++;
      }
    }
    
    if (removedCount > 0) {
      await chrome.storage.local.set({ [CACHE_KEY]: cache });
      console.log(`Cleared ${removedCount} expired cache entries`);
    }
  } catch (error) {
    console.error('Error clearing old cache:', error);
  }
}

/**
 * Extract content from the current tab using content script
 * @param {number} tabId - Tab ID
 * @returns {Promise<Object>} - Extracted content
 */
async function extractContentFromTab(tabId) {
  try {
    const response = await chrome.tabs.sendMessage(tabId, { action: 'extractContent' });
    if (response && response.success) {
      return response.content;
    }
  } catch (error) {
    console.warn('Could not extract content from tab (may not have content script):', error);
  }
  return null;
}

/**
 * Call AI API to check site relevance
 * @param {string} keywords - User's focus keywords
 * @param {string} title - Page title (fallback)
 * @param {string} url - Page URL
 * @param {Object} extractedContent - Extracted content from content script (optional)
 * @returns {Promise<Object>} - AI result
 */
async function callAIAPI(keywords, title, url, extractedContent = null) {
  const apiUrl = 'https://real-focus-a79c571mm-kexins-projects-f8f51bd8.vercel.app/api/focus-assistant';
  
  // Use extracted content if available, otherwise fallback to title
  let contentTitle = title;
  let contentSnippet = '';
  
  if (extractedContent) {
    // Prefer extracted title, h1, or description
    contentTitle = extractedContent.title || extractedContent.h1 || title;
    // Use content_snippet (already preprocessed to 500 chars)
    contentSnippet = extractedContent.content_snippet || '';
  }
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      keywords,
      title: contentTitle, // Use original title (API will handle content_snippet separately)
      url,
      content_snippet: contentSnippet // Pass content_snippet separately for V5.0 prompt
    })
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  
  return await response.json();
}

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'checkRelevance') {
    // Handle relevance check with caching and content extraction
    (async () => {
      try {
        const { keywords, title, url, tabId } = request;
        
        if (!keywords || !url) {
          sendResponse({ error: 'Missing required parameters' });
          return;
        }
        
        // First, check cache
        const cachedResult = await getCache(url);
        if (cachedResult) {
          console.log('Cache hit for:', url);
          sendResponse({ success: true, data: cachedResult });
          return;
        }
        
        // Cache miss, extract content and call API
        console.log('Cache miss, extracting content and calling API for:', url);
        
        // Try to extract content from the tab if tabId is provided
        let extractedContent = null;
        if (tabId) {
          extractedContent = await extractContentFromTab(tabId);
          if (extractedContent) {
            console.log('Content extracted:', {
              title: extractedContent.title,
              snippet_length: extractedContent.content_snippet?.length || 0
            });
          }
        }
        
        // Call API with extracted content
        const aiResult = await callAIAPI(keywords, title, url, extractedContent);
        
        // Store in cache
        await setCache(url, aiResult);
        
        // Return result
        sendResponse({ 
          success: true, 
          data: {
            ...aiResult,
            fromCache: false
          }
        });
      } catch (error) {
        console.error('Error checking relevance:', error);
        sendResponse({ 
          success: false, 
          error: error.message || 'Unknown error' 
        });
      }
    })();
    
    return true; // Keep message channel open for async response
  }
  
  if (request.action === 'clearCache') {
    // Clear all cache
    chrome.storage.local.set({ [CACHE_KEY]: {} }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
  
  if (request.action === 'getCacheStats') {
    // Get cache statistics
    chrome.storage.local.get([CACHE_KEY], (result) => {
      const cache = result[CACHE_KEY] || {};
      const entries = Object.entries(cache);
      const now = Date.now();
      const validEntries = entries.filter(([_, data]) => 
        now - data.timestamp <= CACHE_TTL
      );
      
      sendResponse({
        success: true,
        stats: {
          totalEntries: entries.length,
          validEntries: validEntries.length,
          expiredEntries: entries.length - validEntries.length
        }
      });
    });
    return true;
  }
  
  return false;
});

// Periodic cleanup of expired cache entries (every hour)
setInterval(() => {
  clearOldCache();
}, 60 * 60 * 1000);

// Listen for tab changes to notify popup (if open)
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  // Notify popup if it's open (optional - popup will check on open anyway)
  // This is mainly for logging/debugging
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    console.log('Tab activated:', tab.url);
  } catch (error) {
    // Tab might not be accessible
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Only trigger on completed navigation
  if (changeInfo.status === 'complete' && tab.url) {
    console.log('Tab updated:', tab.url);
  }
});

