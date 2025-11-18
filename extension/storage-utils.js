// Real Focus Assistant - Storage Utilities

/**
 * Get focus keywords from storage
 * @returns {Promise<string>} Focus keywords
 */
async function getFocusKeywords() {
  const result = await chrome.storage.local.get(['focusKeywords']);
  return result.focusKeywords || '';
}

/**
 * Save focus keywords to storage
 * @param {string} keywords - Focus keywords to save
 */
async function saveFocusKeywords(keywords) {
  await chrome.storage.local.set({ focusKeywords: keywords });
}

/**
 * Get timer state from storage
 * @returns {Promise<{timerState: string, elapsedTime: number}>} Timer state
 */
async function getTimerState() {
  const result = await chrome.storage.local.get(['timerState', 'elapsedTime']);
  return {
    timerState: result.timerState || 'stopped',
    elapsedTime: result.elapsedTime || 0
  };
}

/**
 * Save timer state to storage
 * @param {string} timerState - Timer state ('running', 'paused', 'stopped')
 * @param {number} elapsedTime - Elapsed time in milliseconds
 */
async function saveTimerState(timerState, elapsedTime) {
  await chrome.storage.local.set({
    timerState: timerState,
    elapsedTime: elapsedTime
  });
}

/**
 * Get focus duration from storage
 * @returns {Promise<number>} Focus duration in minutes
 */
async function getFocusDuration() {
  const result = await chrome.storage.local.get(['focusDuration']);
  return result.focusDuration || 25;
}

/**
 * Save focus duration to storage
 * @param {number} minutes - Focus duration in minutes
 */
async function saveFocusDuration(minutes) {
  await chrome.storage.local.set({ focusDuration: minutes });
}

/**
 * Get selected focus duration in milliseconds
 * @returns {Promise<number>} Focus duration in milliseconds
 */
async function getSelectedFocusDuration() {
  const minutes = await getFocusDuration();
  return minutes * 60 * 1000; // Convert to milliseconds
}

/**
 * Load saved state from storage
 * @returns {Promise<{focusKeywords: string, timerState: string, elapsedTime: number}>} Saved state
 */
async function loadSavedState() {
  try {
    const result = await chrome.storage.local.get(['focusKeywords', 'timerState', 'elapsedTime']);
    return {
      focusKeywords: result.focusKeywords || '',
      timerState: result.timerState || 'stopped',
      elapsedTime: result.elapsedTime || 0
    };
  } catch (error) {
    console.error('Error loading saved state:', error);
    return {
      focusKeywords: '',
      timerState: 'stopped',
      elapsedTime: 0
    };
  }
}




