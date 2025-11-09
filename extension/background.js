// Background Service Worker for Real Focus Assistant

// ============================================
// API Mocking Switch (for UI testing)
// ============================================
// ⚠️ Set to true for UI testing (zero API cost)
// ⚠️ Set to false for production (use real API)
const IS_MOCKING_ENABLED = true; // Change to true to enable mocking

const CACHE_KEY = 'aiCache';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const MAX_CACHE_SIZE = 4 * 1024 * 1024; // 4MB (leave 1MB buffer from 5MB limit)

// ============================================
// Pomodoro Timer Constants
// ============================================
// Test durations (for testing purposes)
const POMODORO_FOCUS_DURATION = 10 * 1000; // 10 seconds in milliseconds (was 25 minutes)
const POMODORO_SHORT_BREAK = 5 * 1000; // 5 seconds in milliseconds (was 5 minutes)
const POMODORO_LONG_BREAK = 10 * 1000; // 10 seconds in milliseconds (was 15 minutes)
const POMODORO_STATE_KEY = 'pomodoroState'; // Chrome Storage key for pomodoro state
const STATISTICS_KEY = 'focusStatistics'; // Chrome Storage key for statistics (separate from pomodoro state)

// Store active time control timers by tabId
let globalTimeControlTimers = new Map();

chrome.runtime.onInstalled.addListener(() => {
  console.log('Real Focus Assistant installed');
  // Initialize cache if it doesn't exist
  chrome.storage.local.get([CACHE_KEY], (result) => {
    if (!result[CACHE_KEY]) {
      chrome.storage.local.set({ [CACHE_KEY]: {} });
    }
  });
});

// Listen for pomodoro timer alarm
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'pomodoro_timer') {
    console.log('Pomodoro timer alarm triggered');
    (async () => {
      try {
        const state = await getPomodoroState();
        if (!state) {
          console.log('No pomodoro state found, ignoring alarm');
          return;
        }
        
        // Check which session type ended
        if (state.session_type === 'FOCUS' && state.status !== 'PAUSED') {
          await handleEndFocus();
        } else if (state.session_type === 'BREAK') {
          await handleEndBreak();
        }
      } catch (error) {
        console.error('Error handling pomodoro alarm:', error);
      }
    })();
  }
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
    // Wait a bit for content script to be ready (especially for dynamically loaded pages)
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Try to send message to content script
    let response;
    try {
      response = await chrome.tabs.sendMessage(tabId, { action: 'extractContent' });
    } catch (error) {
      // Content script might not be loaded, try to inject it
      console.log('Content script not found, attempting to inject...');
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ['content.js']
        });
        // Wait for content script to initialize
        await new Promise(resolve => setTimeout(resolve, 300));
        // Retry sending message
        response = await chrome.tabs.sendMessage(tabId, { action: 'extractContent' });
      } catch (injectError) {
        console.warn('Could not inject content script:', injectError.message);
        return null;
      }
    }
    
    if (response && response.success) {
      return response.content;
    } else {
      console.warn('Content extraction failed:', response?.error || 'Unknown error');
    }
  } catch (error) {
    console.warn('Could not extract content from tab:', error.message);
  }
  return null;
}

/**
 * Mock API response for UI testing (zero API cost)
 * @param {string} url - Page URL
 * @returns {Object} - Mock AI result
 */
function mockAPIResponse(url) {
  console.log('🔧 [MOCK] Using mock API response for:', url);
  
  // Test Time Control UI (30-second countdown banner)
  if (url.includes('google.com/search') || url.includes('xiaohongshu.com')) {
    return {
      relevance_score_percent: 50,
      status: 'Stay',
      reason: '搜索页面或干扰平台，允许30秒搜索',
      requires_time_control: true
    };
  }
  
  // Test Block UI (full-screen red blocking interface)
  if (url.includes('weibo.com') || url.includes('bilibili.com') || url.includes('douyin.com')) {
    return {
      relevance_score_percent: 15,
      status: 'Block',
      reason: '网页内容与当前任务不相关，建议拦截',
      requires_time_control: false
    };
  }
  
  // Test Fast Pass / Stay UI (normal pass)
  if (url.includes('vercel.com/docs') || url.includes('github.com') || url.includes('gemini.google.com')) {
    return {
      relevance_score_percent: 85,
      status: 'Stay',
      reason: '核心工具链文档，允许访问',
      requires_time_control: false
    };
  }
  
  // Default: Stay with medium relevance
  return {
    relevance_score_percent: 60,
    status: 'Stay',
    reason: '内容与任务相关，允许访问',
    requires_time_control: false
  };
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
  // Check if mocking is enabled
  if (IS_MOCKING_ENABLED) {
    console.log('🔧 [MOCK] Mocking enabled, returning mock response');
    // Return mock response immediately (synchronous, no API call)
    return mockAPIResponse(url);
  }
  
  // Use the latest deployed API URL
  const apiUrl = 'https://real-focus-32cpqcsg8-kexins-projects-f8f51bd8.vercel.app/api/focus-assistant';
  
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
            const snippet = extractedContent.content_snippet || '';
            console.log('Content extracted:', {
              title: extractedContent.title,
              snippet_length: snippet.length,
              snippetPreview: snippet.substring(0, 200) + (snippet.length > 200 ? '...' : '')
            });
          }
        }
        
        // Prepare content for API call
        let contentTitle = title;
        let contentSnippet = '';
        
        if (extractedContent) {
          contentTitle = extractedContent.title || extractedContent.h1 || title;
          contentSnippet = extractedContent.content_snippet || '';
        }
        
        // Call API with extracted content
        console.log('Calling API with:', {
          keywords,
          title: contentTitle,
          url,
          hasContentSnippet: !!contentSnippet,
          contentSnippetLength: contentSnippet?.length || 0,
          contentSnippetPreview: contentSnippet ? (contentSnippet.substring(0, 200) + (contentSnippet.length > 200 ? '...' : '')) : 'N/A'
        });
        
        const aiResult = await callAIAPI(keywords, contentTitle, url, extractedContent);
        
        console.log('API Response:', {
          relevance_score_percent: aiResult.relevance_score_percent,
          status: aiResult.status,
          reason: aiResult.reason,
          requires_time_control: aiResult.requires_time_control,
          contentSnippetUsed: contentSnippet ? (contentSnippet.substring(0, 200) + (contentSnippet.length > 200 ? '...' : '')) : 'N/A'
        });
        
        // Handle API response (trigger UI actions)
        await handleAPIResponse(tabId, url, aiResult);
        
        // Store in cache (but don't cache time control flag)
        const cacheResult = { ...aiResult };
        delete cacheResult.requires_time_control; // Don't cache this flag
        await setCache(url, cacheResult);
        
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
      console.log('Cache cleared, removing UI from all tabs');
      
      // Clear all UI elements from all tabs
      clearAllTabUIs();
      
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
  
  if (request.action === 'getPopupState') {
    // Get current popup state (keywords, current URL, relevance score, status, focused time)
    (async () => {
      try {
        const { tabId, url, keywords } = request;
        
        if (!tabId || !url || !keywords) {
          sendResponse({ success: false, error: 'Missing required parameters' });
          return;
        }
        
        // Get timer state from storage
        const storageResult = await chrome.storage.local.get(['timerState', 'elapsedTime']);
        const timerState = storageResult.timerState || 'stopped';
        const elapsedTime = storageResult.elapsedTime || 0;
        
        // Get tab info
        const tab = await chrome.tabs.get(tabId);
        if (!tab) {
          sendResponse({ success: false, error: 'Tab not found' });
          return;
        }
        
        // Check cache first
        const cachedResult = await getCache(url);
        let relevanceData = null;
        
        if (cachedResult) {
          // Use cached result
          relevanceData = cachedResult;
          console.log('Using cached result for popup state:', url);
        } else {
          // Extract content and call API (or mock)
          const extractedContent = await extractContentFromTab(tabId);
          let contentTitle = tab.title || '';
          let contentSnippet = '';
          
          if (extractedContent) {
            contentTitle = extractedContent.title || extractedContent.h1 || tab.title || '';
            contentSnippet = extractedContent.content_snippet || '';
          }
          
          // Call API (or mock)
          relevanceData = await callAIAPI(keywords, contentTitle, url, extractedContent);
          
          // Cache the result (but don't cache time control flag)
          const cacheResult = { ...relevanceData };
          delete cacheResult.requires_time_control;
          await setCache(url, cacheResult);
          
          // Handle API response (trigger UI actions in content script)
          await handleAPIResponse(tabId, url, relevanceData);
        }
        
        // Get pomodoro state
        const pomodoroState = await getPomodoroState();
        
        // Get statistics from separate storage
        const stats = await getStatistics();
        const todayFocusTime = stats.total_focused_time || 0;
        const blockedCount = stats.blocked_count || 0;
        
        // Return popup state data
        sendResponse({
          success: true,
          data: {
            keywords: keywords,
            currentUrl: url,
            relevanceScore: relevanceData.relevance_score_percent || 0,
            status: relevanceData.status || 'Stay',
            reason: relevanceData.reason || '',
            focusedTime: elapsedTime,
            timerState: timerState,
            pomodoroState: pomodoroState, // Include pomodoro state
            todayFocusTime: todayFocusTime, // Today's total focus time
            blockedCount: blockedCount // Number of blocked distractions
          }
        });
      } catch (error) {
        console.error('Error getting popup state:', error);
        sendResponse({ success: false, error: error.message || 'Unknown error' });
      }
    })();
    
    return true; // Keep message channel open for async response
  }
  
  // Pomodoro control messages
  if (request.action === 'mark_task_complete') {
    (async () => {
      try {
        const state = await getPomodoroState();
        if (state) {
          state.is_task_completed = true;
          await setPomodoroState(state);
          // If next is 'break', automatically start break
          if (request.next === 'break') {
            // Will be handled by the break action, just return success
            sendResponse({ success: true, next: 'break' });
          } else {
            sendResponse({ success: true });
          }
        } else {
          sendResponse({ success: false, error: 'No pomodoro state found' });
        }
      } catch (error) {
        console.error('Error marking task complete:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }
  
  // Handle focus session end (automatic transition to break)
  if (request.action === 'end_focus') {
    (async () => {
      try {
        await handleEndFocus();
        sendResponse({ success: true });
      } catch (error) {
        console.error('Error ending focus:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }
  
  // Handle break session end (automatic transition to focus)
  if (request.action === 'end_break') {
    (async () => {
      try {
        await handleEndBreak();
        sendResponse({ success: true });
      } catch (error) {
        console.error('Error ending break:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }
  
  if (request.action === 'start_break') {
    (async () => {
      try {
        const state = await getPomodoroState();
        if (state && state.session_type === 'FOCUS') {
          const now = Date.now();
          
          // Accumulate focused time to statistics
          const sessionDuration = now - state.start_time;
          const stats = await getStatistics();
          await updateStatistics({
            total_focused_time: stats.total_focused_time + sessionDuration
          });
          
          // Determine break type and update current_cycle
          let breakDuration;
          let nextCycle;
          
          if (state.current_cycle < 4) {
            // Short break after focus sessions 0-3
            breakDuration = POMODORO_SHORT_BREAK;
            nextCycle = state.current_cycle + 1; // Increment cycle
          } else {
            // Long break after 4 focus sessions (current_cycle == 4)
            breakDuration = POMODORO_LONG_BREAK;
            nextCycle = 0; // Reset cycle for next group
          }
          
          state.status = 'BREAK';
          state.session_type = 'BREAK';
          state.current_cycle = nextCycle;
          state.start_time = now;
          state.target_end_time = now + breakDuration;
          await setPomodoroState(state);
          
          // Set up alarm for break end
          setupPomodoroAlarm(state.target_end_time);
          
          sendResponse({ success: true, pomodoroState: state });
        } else {
          sendResponse({ success: false, error: 'Not in focus session' });
        }
      } catch (error) {
        console.error('Error starting break:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }
  
  if (request.action === 'skip_break') {
    (async () => {
      try {
        const state = await getPomodoroState();
        if (state && state.session_type === 'BREAK') {
          const now = Date.now();
          state.status = 'FOCUS';
          state.session_type = 'FOCUS';
          state.cycle_count += 1;
          // Update current_cycle: if it was 4 (long break), reset to 0; otherwise increment
          if (state.current_cycle === 4) {
            state.current_cycle = 0; // Reset after long break
          } else {
            state.current_cycle += 1; // Increment for next focus session
          }
          state.start_time = now;
          state.target_end_time = now + POMODORO_FOCUS_DURATION;
          await setPomodoroState(state);
          
          // Set up alarm for focus end
          setupPomodoroAlarm(state.target_end_time);
          
          sendResponse({ success: true, pomodoroState: state });
        } else {
          sendResponse({ success: false, error: 'Not in break session' });
        }
      } catch (error) {
        console.error('Error skipping break:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }
  
  // Initialize new focus session (from input state)
  if (request.action === 'init_focus') {
    (async () => {
      try {
        const { keywords } = request;
        if (!keywords) {
          sendResponse({ success: false, error: 'Keywords required' });
          return;
        }
        
        // Initialize new pomodoro state
        const initialState = await initializePomodoroState(keywords);
        sendResponse({ success: true, pomodoroState: initialState });
      } catch (error) {
        console.error('Error initializing focus:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }
  
  if (request.action === 'start_focus') {
    (async () => {
      try {
        const state = await getPomodoroState();
        if (state && state.session_type === 'BREAK') {
          const now = Date.now();
          state.status = 'FOCUS';
          state.session_type = 'FOCUS';
          state.cycle_count += 1;
          // Update current_cycle: if it was 4 (long break), reset to 0; otherwise increment
          if (state.current_cycle === 4) {
            state.current_cycle = 0; // Reset after long break
          } else {
            state.current_cycle += 1; // Increment for next focus session
          }
          state.start_time = now;
          state.target_end_time = now + POMODORO_FOCUS_DURATION;
          await setPomodoroState(state);
          
          // Set up alarm for focus end
          setupPomodoroAlarm(state.target_end_time);
          
          sendResponse({ success: true, pomodoroState: state });
        } else {
          sendResponse({ success: false, error: 'Not in break session' });
        }
      } catch (error) {
        console.error('Error starting focus:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }
  
  // ============================================
  // 新增: Pause Focus (2.1 -> 2.2)
  // ============================================
  if (request.action === 'pause_focus') {
    (async () => {
      try {
        const state = await getPomodoroState();
        if (state && state.session_type === 'FOCUS' && state.status !== 'PAUSED') {
          const now = Date.now();
          
          // 累加本次专注时间到单独存储的统计数据
          const sessionDuration = now - state.start_time;
          const stats = await getStatistics();
          await updateStatistics({
            total_focused_time: stats.total_focused_time + sessionDuration
          });
          
          state.status = 'PAUSED';
          // 记录剩余时间
          state.time_left_ms = state.target_end_time - now;
          
          // Clear alarm when paused
          clearPomodoroAlarm();
          
          await setPomodoroState(state);
          // 通知 popup.js 状态已暂停
          await chrome.storage.local.set({ timerState: 'paused' });
          sendResponse({ success: true, pomodoroState: state });
        } else {
          sendResponse({ success: false, error: 'Not in a running focus session' });
        }
      } catch (error) {
        console.error('Error pausing focus:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true; 
  }
  
  // ============================================
  // 新增: Resume Focus (Continue) (2.2 -> 2.1)
  // ============================================
  if (request.action === 'resume_focus') {
    (async () => {
      try {
        const state = await getPomodoroState();
        if (state && state.session_type === 'FOCUS' && state.status === 'PAUSED') {
          const now = Date.now();
          
          state.status = 'FOCUS';
          // 根据剩余时间重新计算目标结束时间
          state.start_time = now; 
          state.target_end_time = now + state.time_left_ms;
          delete state.time_left_ms; // 清除剩余时间变量
          
          // Set up alarm for resumed session
          setupPomodoroAlarm(state.target_end_time);
          
          await setPomodoroState(state);
          // 通知 popup.js 状态已运行
          await chrome.storage.local.set({ timerState: 'running' });
          sendResponse({ success: true, pomodoroState: state });
        } else {
          sendResponse({ success: false, error: 'Not in a paused focus session' });
        }
      } catch (error) {
        console.error('Error resuming focus:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true; 
  }
  
  // ============================================
  // 新增: Stop Focus (2.2 -> 1)
  // ============================================
  if (request.action === 'stop_focus') {
    (async () => {
      try {
        // 在清除状态前，累加本次专注时间到单独存储的统计数据（如果正在运行）
        const state = await getPomodoroState();
        if (state && state.session_type === 'FOCUS' && state.status !== 'PAUSED') {
          const now = Date.now();
          const sessionDuration = now - state.start_time;
          const stats = await getStatistics();
          await updateStatistics({
            total_focused_time: stats.total_focused_time + sessionDuration
          });
        }
        // Clear alarm when stopping
        clearPomodoroAlarm();
        
        await clearPomodoroState(); // 只清除会话状态，统计数据已单独保存
        sendResponse({ success: true });
      } catch (error) {
        console.error('Error stopping focus:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true; 
  }
  
  return false;
});

// ============================================
// Pomodoro State Management Functions
// ============================================

/**
 * Pomodoro State Structure:
 * {
 *   keywords: string,                    // Current focus topic
 *   status: 'FOCUS' | 'BREAK' | 'PAUSED' | 'IDLE', // Current session status
 *   session_type: 'FOCUS' | 'BREAK',     // Current session intended type
 *   cycle_count: number,                  // Number of completed focus cycles (0, 1, 2, ...)
 *   current_cycle: number,                // Current cycle in the pomodoro sequence (0-4)
 *   start_time: number,                   // Timestamp when current session started
 *   target_end_time: number,              // Timestamp when current session should end
 *   is_task_completed: boolean            // Whether the task is marked as completed
 * }
 * 
 * Note: Statistics (total_focused_time and blocked_count) are stored separately
 * in 'focusStatistics' key to preserve them when stopping a session.
 * 
 * Cycle Logic:
 * - current_cycle: 0, 1, 2, 3 (focus sessions) -> 4 (long break)
 * - After 4 focus sessions (current_cycle 0-3), take a long break and reset to 0
 */

/**
 * Get pomodoro state from Chrome Storage
 * @returns {Promise<Object|null>} - Pomodoro state object or null if not found
 */
async function getPomodoroState() {
  try {
    const result = await chrome.storage.local.get([POMODORO_STATE_KEY]);
    const state = result[POMODORO_STATE_KEY];
    
    if (!state) {
      return null;
    }
    
    return state;
  } catch (error) {
    console.error('Error getting pomodoro state:', error);
    return null;
  }
}

/**
 * Set pomodoro state to Chrome Storage
 * @param {Object} newState - New pomodoro state object
 * @returns {Promise<boolean>} - Success status
 */
async function setPomodoroState(newState) {
  try {
    await chrome.storage.local.set({ [POMODORO_STATE_KEY]: newState });
    console.log('Pomodoro state updated:', newState);
    return true;
  } catch (error) {
    console.error('Error setting pomodoro state:', error);
    return false;
  }
}

/**
 * Get statistics from Chrome Storage
 * @returns {Promise<Object>} - Statistics object with total_focused_time and blocked_count
 */
async function getStatistics() {
  try {
    const result = await chrome.storage.local.get([STATISTICS_KEY]);
    const stats = result[STATISTICS_KEY] || {
      total_focused_time: 0,
      blocked_count: 0
    };
    return stats;
  } catch (error) {
    console.error('Error getting statistics:', error);
    return { total_focused_time: 0, blocked_count: 0 };
  }
}

/**
 * Update statistics in Chrome Storage
 * @param {Object} stats - Statistics object with total_focused_time and/or blocked_count
 * @returns {Promise<boolean>} - Success status
 */
async function updateStatistics(stats) {
  try {
    const currentStats = await getStatistics();
    const updatedStats = {
      total_focused_time: stats.total_focused_time !== undefined ? stats.total_focused_time : currentStats.total_focused_time,
      blocked_count: stats.blocked_count !== undefined ? stats.blocked_count : currentStats.blocked_count
    };
    await chrome.storage.local.set({ [STATISTICS_KEY]: updatedStats });
    console.log('Statistics updated:', updatedStats);
    return true;
  } catch (error) {
    console.error('Error updating statistics:', error);
    return false;
  }
}

/**
 * Clear pomodoro state from Chrome Storage (Stop Focus)
 * Only clears session state, preserves statistics
 */
async function clearPomodoroState() {
  try {
    // 只清除会话状态，保留统计数据
    await chrome.storage.local.remove([POMODORO_STATE_KEY, 'timerState', 'elapsedTime']);
    console.log('Pomodoro state cleared (Focus session stopped, statistics preserved)');
    return true;
  } catch (error) {
    console.error('Error clearing pomodoro state:', error);
    return false;
  }
}

/**
 * Initialize pomodoro state for a new focus session
 * @param {string} keywords - Focus topic/keywords
 * @returns {Promise<Object>} - Initialized pomodoro state
 */
async function initializePomodoroState(keywords) {
  const now = Date.now();
  const initialState = {
    keywords: keywords,
    status: 'FOCUS', // Starting with a focus session
    session_type: 'FOCUS', // First session is always a focus session
    cycle_count: 0, // Number of completed focus cycles
    current_cycle: 0, // Current cycle in sequence (0-4)
    start_time: now,
    target_end_time: now + POMODORO_FOCUS_DURATION, // 25 minutes from now
    is_task_completed: false // Task not completed yet
  };
  
  await setPomodoroState(initialState);
  console.log('Pomodoro state initialized:', initialState);
  
  // Set up alarm for automatic transition when focus session ends
  setupPomodoroAlarm(initialState.target_end_time);
  
  return initialState;
}

/**
 * Handle focus session end - automatically transition to break
 */
async function handleEndFocus() {
  try {
    const state = await getPomodoroState();
    if (!state || state.session_type !== 'FOCUS' || state.status === 'PAUSED') {
      console.log('Cannot end focus: not in active focus session');
      return;
    }
    
    const now = Date.now();
    
    // Accumulate focused time to statistics
    const sessionDuration = now - state.start_time;
    const stats = await getStatistics();
    await updateStatistics({
      total_focused_time: stats.total_focused_time + sessionDuration
    });
    
    // Determine break type based on current_cycle
    let breakDuration;
    let nextCycle;
    
    if (state.current_cycle < 4) {
      // Short break after focus sessions 0-3
      breakDuration = POMODORO_SHORT_BREAK;
      nextCycle = state.current_cycle + 1; // Increment cycle
    } else {
      // Long break after 4 focus sessions (current_cycle == 4)
      breakDuration = POMODORO_LONG_BREAK;
      nextCycle = 0; // Reset cycle for next group
    }
    
    // Update state to break
    state.status = 'BREAK';
    state.session_type = 'BREAK';
    state.current_cycle = nextCycle;
    state.start_time = now;
    state.target_end_time = now + breakDuration;
    
    await setPomodoroState(state);
    
    // Set up alarm for break end
    setupPomodoroAlarm(state.target_end_time);
    
    console.log(`✅ Focus session ended. Starting ${nextCycle === 0 ? 'long' : 'short'} break. Current cycle: ${nextCycle}`);
    
    // Notify all tabs about the state change (optional - for UI updates)
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, {
            action: 'pomodoro_state_changed',
            state: state
          }).catch(() => {
            // Tab might not have content script, ignore
          });
        }
      });
    });
  } catch (error) {
    console.error('Error handling focus end:', error);
    throw error;
  }
}

/**
 * Handle break session end - automatically transition to focus
 */
async function handleEndBreak() {
  try {
    const state = await getPomodoroState();
    if (!state || state.session_type !== 'BREAK') {
      console.log('Cannot end break: not in break session');
      return;
    }
    
    const now = Date.now();
    
    // Update state to focus
    state.status = 'FOCUS';
    state.session_type = 'FOCUS';
    state.cycle_count += 1;
    
    // Update current_cycle: if it was 4 (long break), reset to 0; otherwise keep it
    // Note: current_cycle was already set to the next focus session when entering break,
    // so we don't need to increment it again here
    if (state.current_cycle === 4) {
      state.current_cycle = 0; // Reset after long break
    }
    // Otherwise, current_cycle already points to the next focus session, keep it as is
    
    state.start_time = now;
    state.target_end_time = now + POMODORO_FOCUS_DURATION;
    
    await setPomodoroState(state);
    
    // Set up alarm for focus end
    setupPomodoroAlarm(state.target_end_time);
    
    console.log(`✅ Break ended. Starting focus session. Current cycle: ${state.current_cycle}`);
    
    // Notify all tabs about the state change (optional - for UI updates)
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, {
            action: 'pomodoro_state_changed',
            state: state
          }).catch(() => {
            // Tab might not have content script, ignore
          });
        }
      });
    });
  } catch (error) {
    console.error('Error handling break end:', error);
    throw error;
  }
}

/**
 * Set up Chrome alarm for pomodoro timer
 * @param {number} targetEndTime - Timestamp when session should end
 */
function setupPomodoroAlarm(targetEndTime) {
  const now = Date.now();
  const delayInMinutes = Math.max(0, (targetEndTime - now) / (1000 * 60));
  
  // Clear existing alarm if any
  chrome.alarms.clear('pomodoro_timer', () => {
    // Set new alarm
    if (delayInMinutes > 0) {
      chrome.alarms.create('pomodoro_timer', {
        when: targetEndTime
      });
      console.log(`Pomodoro alarm set for ${delayInMinutes.toFixed(1)} minutes`);
    }
  });
}

/**
 * Clear pomodoro alarm
 */
function clearPomodoroAlarm() {
  chrome.alarms.clear('pomodoro_timer', () => {
    console.log('Pomodoro alarm cleared');
  });
}

/**
 * Clear all time control timers
 */
function clearAllTimers() {
  console.log('Clearing all time control timers');
  globalTimeControlTimers.forEach((timerId, tabId) => {
    clearTimeout(timerId);
    console.log('Cleared timer for tab:', tabId);
  });
  globalTimeControlTimers.clear();
}

/**
 * Clear all UI elements from all tabs
 * This function sends remove_ui message to all active tabs
 */
function clearAllTabUIs() {
  console.log('Clearing UI from all tabs');
  
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      if (tab.id) {
        // Send remove_ui message to each tab's content script
        chrome.tabs.sendMessage(tab.id, { 
          action: 'remove_ui' 
        }).catch(err => {
          // Tab might be closed or content script not loaded, which is fine
          console.log('Could not send remove_ui to tab', tab.id, ':', err.message);
        });
      }
    });
    console.log(`Sent remove_ui message to ${tabs.length} tabs`);
  });
  
  // Also clear all timers
  clearAllTimers();
}

// Periodic cleanup of expired cache entries (every hour)
setInterval(() => {
  clearOldCache();
}, 60 * 60 * 1000);

/**
 * Start time control timer for a tab
 * @param {number} tabId - Tab ID
 * @param {string} url - Current URL
 * @param {Object} aiResult - AI API result
 */
function startTimeControl(tabId, url, aiResult) {
  // Clear existing timer if any
  if (globalTimeControlTimers.has(tabId)) {
    const existingTimer = globalTimeControlTimers.get(tabId);
    clearTimeout(existingTimer);
  }
  
  console.log('Starting time control timer for tab:', tabId, 'URL:', url);
  
  // Start 30-second grace period
  const gracePeriodMs = 30 * 1000; // 30 seconds
  const timerId = setTimeout(async () => {
    // Timer expired - check if user is still on the same page
    try {
      const currentTab = await chrome.tabs.get(tabId);
      if (currentTab && currentTab.url === url) {
        // User is still on the same page, force block
        console.log('Grace period expired, forcing block for:', url);
        
        // Increment blocked count in separate statistics storage
        const stats = await getStatistics();
        await updateStatistics({
          blocked_count: stats.blocked_count + 1
        });
        
        chrome.tabs.sendMessage(tabId, {
          action: 'block_page',
          reason: aiResult.reason || '30秒宽限期已结束，已强制拦截该页面',
          score: aiResult.relevance_score_percent || 15
        }).catch(err => {
          console.warn('Could not send block_page message:', err);
        });
      }
    } catch (error) {
      console.warn('Could not check current tab:', error);
    }
    
    // Remove timer from map
    globalTimeControlTimers.delete(tabId);
  }, gracePeriodMs);
  
  // Notify content script to show countdown
  chrome.tabs.sendMessage(tabId, {
    action: 'timer_start',
    duration: 30, // seconds
    message: '当前正在干扰平台进行搜索，你有 30 秒时间查看，之后将强制拦截'
  }).catch(err => {
    console.warn('Could not send timer_start message:', err);
  });
  
  // Store timer ID for this tab
  globalTimeControlTimers.set(tabId, timerId);
}

/**
 * Handle API response and trigger appropriate UI actions
 * @param {number} tabId - Tab ID
 * @param {string} url - Current URL
 * @param {Object} aiResult - AI API result
 */
async function handleAPIResponse(tabId, url, aiResult) {
  // Check if time control is required
  if (aiResult.requires_time_control === true) {
    console.log('Time control required for:', url);
    startTimeControl(tabId, url, aiResult);
    return;
  }
  
  // Handle Block status (immediate block)
  if (aiResult.status === 'Block' && aiResult.requires_time_control !== true) {
    console.log('Blocking page immediately:', url);
    // Increment blocked count in separate statistics storage
    const stats = await getStatistics();
    await updateStatistics({
      blocked_count: stats.blocked_count + 1
    });
    
    chrome.tabs.sendMessage(tabId, {
      action: 'show_block_ui',
      score: aiResult.relevance_score_percent || 15,
      reason: aiResult.reason || '页面与专注主题不相关'
    }).catch(err => {
      console.warn('Could not send show_block_ui message:', err);
    });
    return;
  }
  
  // Handle Stay status (remove any existing UI)
  if (aiResult.status === 'Stay' && aiResult.requires_time_control !== true) {
    console.log('Page is relevant, removing any existing UI:', url);
    chrome.tabs.sendMessage(tabId, {
      action: 'remove_ui'
    }).catch(err => {
      // Content script might not be loaded, which is fine
      console.log('Could not send remove_ui message (content script may not be loaded):', err.message);
    });
    return;
  }
}

/**
 * Core function to check current tab relevance
 * This function handles content extraction, caching, and API calls
 * @param {number} tabId - Tab ID
 * @param {string} url - Tab URL
 * @returns {Promise<Object|null>} - AI result or null if no focus keywords
 */
async function checkCurrentTabRelevance(tabId, url) {
  try {
    // Get focus keywords from storage
    const result = await chrome.storage.local.get(['focusKeywords']);
    const keywords = result.focusKeywords;
    
    if (!keywords) {
      // No focus keywords set, skip check
      return null;
    }
    
    // Get tab info
    const tab = await chrome.tabs.get(tabId);
    if (!tab || !tab.url) {
      return null;
    }
    
    // Skip chrome:// and extension:// URLs
    if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || 
        tab.url.startsWith('edge://') || tab.url.startsWith('moz-extension://')) {
      return null;
    }
    
    console.log('Checking relevance for tab:', tabId, 'URL:', url);
    
    // First, check cache
    const cachedResult = await getCache(url);
    if (cachedResult) {
      console.log('Cache hit for:', url);
      // Handle cached result (but don't trigger UI for cached results)
      // UI will be triggered on fresh API calls only
      return cachedResult;
    }
    
    // Cache miss, extract content and call API
    console.log('Cache miss, extracting content and calling API for:', url);
    
    // Extract content from the tab
    let extractedContent = null;
    extractedContent = await extractContentFromTab(tabId);
    if (extractedContent) {
      const snippet = extractedContent.content_snippet || '';
      console.log('Content extracted:', {
        title: extractedContent.title,
        snippet_length: snippet.length,
        snippetPreview: snippet.substring(0, 200) + (snippet.length > 200 ? '...' : '')
      });
    }
    
    // Prepare content for API call
    let contentTitle = tab.title || '';
    let contentSnippet = '';
    
    if (extractedContent) {
      contentTitle = extractedContent.title || extractedContent.h1 || tab.title || '';
      contentSnippet = extractedContent.content_snippet || '';
    }
    
    // Call API with extracted content
    console.log('Calling API with:', {
      keywords,
      title: contentTitle,
      url,
      hasContentSnippet: !!contentSnippet,
      contentSnippetLength: contentSnippet?.length || 0,
      contentSnippetPreview: contentSnippet ? (contentSnippet.substring(0, 200) + (contentSnippet.length > 200 ? '...' : '')) : 'N/A'
    });
    
    const aiResult = await callAIAPI(keywords, contentTitle, url, extractedContent);
    
    console.log('API Response:', {
      relevance_score_percent: aiResult.relevance_score_percent,
      status: aiResult.status,
      reason: aiResult.reason,
      requires_time_control: aiResult.requires_time_control
    });
    
    // Handle API response (trigger UI actions)
    await handleAPIResponse(tabId, url, aiResult);
    
    // Store in cache (but don't cache time control flag)
    const cacheResult = { ...aiResult };
    delete cacheResult.requires_time_control; // Don't cache this flag
    await setCache(url, cacheResult);
    
    return aiResult;
  } catch (error) {
    console.error('Error checking tab relevance:', error);
    return null;
  }
}

// Listen for tab activation (when user switches tabs)
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab && tab.url) {
      console.log('Tab activated:', tab.url);
      // Check relevance for the newly activated tab
      await checkCurrentTabRelevance(activeInfo.tabId, tab.url);
    }
  } catch (error) {
    // Tab might not be accessible
    console.log('Could not access tab:', error.message);
  }
});

// Listen for tab updates (when URL changes or page loads)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Only trigger on completed navigation
  if (changeInfo.status === 'complete' && tab.url) {
    console.log('Tab updated:', tab.url);
    
    // Clear time control timer if user navigated away
    if (globalTimeControlTimers.has(tabId)) {
      const timerId = globalTimeControlTimers.get(tabId);
      clearTimeout(timerId);
      globalTimeControlTimers.delete(tabId);
      console.log('Cleared time control timer for tab:', tabId);
      
      // Also remove any existing UI
      chrome.tabs.sendMessage(tabId, {
        action: 'remove_ui'
      }).catch(err => {
        // Content script might not be loaded, which is fine
        console.log('Could not send remove_ui message:', err.message);
      });
    }
    
    // Check relevance for the updated tab
    await checkCurrentTabRelevance(tabId, tab.url);
  }
});

// Clean up timers when tabs are closed
chrome.tabs.onRemoved.addListener((tabId) => {
  if (globalTimeControlTimers.has(tabId)) {
    const timerId = globalTimeControlTimers.get(tabId);
    clearTimeout(timerId);
    globalTimeControlTimers.delete(tabId);
    console.log('Cleared time control timer for closed tab:', tabId);
  }
});

