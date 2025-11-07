// Real Focus Assistant - Popup Logic

// DOM Elements
const inputState = document.getElementById('input-state');
const focusedState = document.getElementById('focused-state');
const pausedState = document.getElementById('paused-state');
const keywordsInput = document.getElementById('keywordsInput');
const startButton = document.getElementById('startButton');
const pauseButton = document.getElementById('pauseButton');
const resumeButton = document.getElementById('resumeButton');

// Timer elements
const focusedTimeDisplay = document.getElementById('focusedTimeDisplay');
const focusedTimeDisplayPaused = document.getElementById('focusedTimeDisplayPaused');

// Display elements
const subjectDisplay = document.getElementById('subjectDisplay');
const subjectDisplayPaused = document.getElementById('subjectDisplayPaused');
const currentSiteDisplay = document.getElementById('currentSiteDisplay');
const currentSiteDisplayPaused = document.getElementById('currentSiteDisplayPaused');
const relevanceScoreDisplay = document.getElementById('relevanceScoreDisplay');
const relevanceScoreDisplayPaused = document.getElementById('relevanceScoreDisplayPaused');
const statusDisplay = document.getElementById('statusDisplay');
const statusDisplayPaused = document.getElementById('statusDisplayPaused');

// State variables
let timerInterval = null;
let startTime = null;
let elapsedTime = 0;
let isPaused = false;
let currentState = 'input'; // 'input', 'focused', 'paused'

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await loadSavedState();
  await updateCurrentSite();
  setupEventListeners();
  
  // If not in input state, check current site relevance
  // This ensures data is fresh when popup reopens
  if (currentState !== 'input') {
    await checkSiteRelevance();
  }
});

// Load saved state from storage
async function loadSavedState() {
  try {
    const result = await chrome.storage.local.get(['focusKeywords', 'timerState', 'elapsedTime']);
    
    if (result.focusKeywords) {
      keywordsInput.value = result.focusKeywords;
      subjectDisplay.textContent = result.focusKeywords;
      subjectDisplayPaused.textContent = result.focusKeywords;
      
      // Restore timer state
      if (result.timerState === 'running') {
        elapsedTime = result.elapsedTime || 0;
        showFocusedState();
        startTimer();
      } else if (result.timerState === 'paused') {
        elapsedTime = result.elapsedTime || 0;
        showPausedState();
        updateTimerDisplay();
      }
    }
  } catch (error) {
    console.error('Error loading saved state:', error);
  }
}

// Sync relevance data between focused and paused states
// This ensures both states always show the same data
function syncRelevanceData() {
  // Determine which state is currently visible and use it as source
  const isFocusedVisible = !focusedState.classList.contains('hidden');
  const isPausedVisible = !pausedState.classList.contains('hidden');
  
  if (isFocusedVisible) {
    // Copy from focused state to paused state
    const score = relevanceScoreDisplay.textContent;
    const status = statusDisplay.textContent;
    const site = currentSiteDisplay.textContent;
    
    if (score) relevanceScoreDisplayPaused.textContent = score;
    if (status) statusDisplayPaused.textContent = status;
    if (site) currentSiteDisplayPaused.textContent = site;
    
    relevanceScoreDisplayPaused.className = relevanceScoreDisplay.className;
    statusDisplayPaused.className = statusDisplay.className;
  } else if (isPausedVisible) {
    // Copy from paused state to focused state
    const score = relevanceScoreDisplayPaused.textContent;
    const status = statusDisplayPaused.textContent;
    const site = currentSiteDisplayPaused.textContent;
    
    if (score) relevanceScoreDisplay.textContent = score;
    if (status) statusDisplay.textContent = status;
    if (site) currentSiteDisplay.textContent = site;
    
    relevanceScoreDisplay.className = relevanceScoreDisplayPaused.className;
    statusDisplay.className = statusDisplayPaused.className;
  }
}

// Setup event listeners
function setupEventListeners() {
  // Start button
  startButton.addEventListener('click', handleStartFocus);
  
  // Enter key in input field
  keywordsInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleStartFocus();
    }
  });
  
  // Pause button
  pauseButton.addEventListener('click', handlePause);
  
  // Resume button
  resumeButton.addEventListener('click', handleResume);
  
  // Edit subject buttons
  document.getElementById('editSubjectButton')?.addEventListener('click', () => {
    editSubject();
  });
  
  document.getElementById('editSubjectButtonPaused')?.addEventListener('click', () => {
    editSubject();
  });
}

// Handle start focus
async function handleStartFocus() {
  const keywords = keywordsInput.value.trim();
  
  if (!keywords) {
    keywordsInput.focus();
    return;
  }
  
  try {
    // Check if keywords have changed
    const previousKeywords = (await chrome.storage.local.get(['focusKeywords'])).focusKeywords;
    const keywordsChanged = previousKeywords && previousKeywords !== keywords;
    
    // If keywords changed, clear the cache
    if (keywordsChanged) {
      console.log('Focus keywords changed, clearing cache...');
      // Send message to background script to clear cache
      chrome.runtime.sendMessage({
        action: 'clearCache'
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Error clearing cache:', chrome.runtime.lastError);
        } else if (response && response.success) {
          console.log('✅ Cache cleared successfully');
        }
      });
    }
    
    // Save keywords to storage
    await chrome.storage.local.set({
      focusKeywords: keywords,
      timerState: 'running',
      elapsedTime: 0
    });
    
    // Update displays
    subjectDisplay.textContent = keywords;
    subjectDisplayPaused.textContent = keywords;
    
    // Reset timer
    elapsedTime = 0;
    startTime = Date.now();
    
    // Show focused state
    showFocusedState();
    
    // Start timer
    startTimer();
    
    // Update current site
    updateCurrentSite();
    
    // Check site relevance
    await checkSiteRelevance();
    
  } catch (error) {
    console.error('Error starting focus:', error);
  }
}

// Handle pause
async function handlePause() {
  isPaused = true;
  clearInterval(timerInterval);
  
  await chrome.storage.local.set({
    timerState: 'paused',
    elapsedTime: elapsedTime
  });
  
  showPausedState();
  // IMPORTANT: Do NOT call checkSiteRelevance() here
  // Pausing the timer should NOT trigger a new relevance check
  // The relevance analysis should only update when:
  // 1. Starting a new focus session (handleStartFocus)
  // 2. Switching to a different tab (chrome.tabs.onActivated)
  // 3. Page navigation (chrome.tabs.onUpdated)
  // 4. Popup reopens (DOMContentLoaded - only if state is not 'input')
  // 
  // Calling checkSiteRelevance() here causes:
  // - Unnecessary API calls
  // - Inconsistent results due to GPT temperature randomness
  // - Confusing user experience (values change when they shouldn't)
}

// Handle resume
async function handleResume() {
  isPaused = false;
  startTime = Date.now() - elapsedTime;
  
  await chrome.storage.local.set({
    timerState: 'running',
    elapsedTime: elapsedTime
  });
  
  showFocusedState();
  startTimer();
  // IMPORTANT: Do NOT call checkSiteRelevance() here
  // Resuming the timer should NOT trigger a new relevance check
  // Same reasons as handlePause() above
}

// Show input state
function showInputState() {
  inputState.classList.remove('hidden');
  focusedState.classList.add('hidden');
  pausedState.classList.add('hidden');
  currentState = 'input';
}

// Show focused state
function showFocusedState() {
  inputState.classList.add('hidden');
  focusedState.classList.remove('hidden');
  pausedState.classList.add('hidden');
  currentState = 'focused';
  
  // Sync data from paused state to focused state if paused state has newer data
  // This ensures data consistency when switching states
  syncRelevanceData();
}

// Show paused state
function showPausedState() {
  inputState.classList.add('hidden');
  focusedState.classList.add('hidden');
  pausedState.classList.remove('hidden');
  currentState = 'paused';
  
  // Sync data from focused state to paused state
  // This ensures data consistency when switching states
  syncRelevanceData();
}

// Timer functions
function startTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
  }
  
  if (!startTime) {
    startTime = Date.now() - elapsedTime;
  }
  
  timerInterval = setInterval(() => {
    elapsedTime = Date.now() - startTime;
    updateTimerDisplay();
    
    // Save elapsed time periodically
    chrome.storage.local.set({ elapsedTime: elapsedTime });
  }, 1000);
  
  updateTimerDisplay();
}

function updateTimerDisplay() {
  const hours = Math.floor(elapsedTime / 3600000);
  const minutes = Math.floor((elapsedTime % 3600000) / 60000);
  const seconds = Math.floor((elapsedTime % 60000) / 1000);
  
  const timeString = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  
  focusedTimeDisplay.textContent = timeString;
  focusedTimeDisplayPaused.textContent = timeString;
}

// Update current site
async function updateCurrentSite() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url) {
      try {
        const url = new URL(tab.url);
        const displayUrl = url.hostname + url.pathname;
        currentSiteDisplay.textContent = displayUrl;
        currentSiteDisplayPaused.textContent = displayUrl;
      } catch (e) {
        currentSiteDisplay.textContent = tab.url;
        currentSiteDisplayPaused.textContent = tab.url;
      }
    }
  } catch (error) {
    console.error('Error updating current site:', error);
  }
}

// Check site relevance (with caching via Service Worker)
async function checkSiteRelevance() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const result = await chrome.storage.local.get(['focusKeywords']);
    
    if (!tab || !tab.url || !result.focusKeywords) {
      return;
    }
    
    // Send message to Service Worker to check relevance (with caching and content extraction)
    chrome.runtime.sendMessage({
      action: 'checkRelevance',
      keywords: result.focusKeywords,
      title: tab.title || '',
      url: tab.url,
      tabId: tab.id // Pass tab ID for content extraction
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error sending message:', chrome.runtime.lastError);
        return;
      }
      
      if (response && response.success && response.data) {
        const data = response.data;
        
        // Log cache status
        if (data.fromCache) {
          console.log('Using cached result for:', tab.url);
        } else {
          console.log('Fresh API result for:', tab.url);
        }
        
        // Update relevance score (update both states to keep them in sync)
        const score = data.relevance_score_percent || 0;
        relevanceScoreDisplay.textContent = `${score}%`;
        relevanceScoreDisplayPaused.textContent = `${score}%`;
        
        // Update score color based on value
        updateScoreColor(score);
        
        // Update status (update both states to keep them in sync)
        const status = data.status || 'Stay';
        statusDisplay.textContent = status;
        statusDisplayPaused.textContent = status;
        
        // Update status color
        if (status === 'Stay') {
          statusDisplay.className = 'status-display status-stay';
          statusDisplayPaused.className = 'status-display status-stay';
        } else {
          statusDisplay.className = 'status-display status-block';
          statusDisplayPaused.className = 'status-display status-block';
        }
        
        // Ensure both states are in sync
        syncRelevanceData();
      } else if (response && response.error) {
        console.error('Error from Service Worker:', response.error);
      }
    });
  } catch (error) {
    console.error('Error checking site relevance:', error);
  }
}

// Update score color
function updateScoreColor(score) {
  let scoreClass = 'score-low';
  if (score >= 70) {
    scoreClass = 'score-high';
  } else if (score >= 40) {
    scoreClass = 'score-medium';
  }
  
  relevanceScoreDisplay.className = `score-display ${scoreClass}`;
  relevanceScoreDisplayPaused.className = `score-display ${scoreClass}`;
}

// Edit subject
function editSubject() {
  showInputState();
  keywordsInput.focus();
  keywordsInput.select();
}

// Listen for tab changes to update current site
// Note: These listeners only work when popup is open
// When popup reopens, DOMContentLoaded will check current site
chrome.tabs.onActivated.addListener(async () => {
  await updateCurrentSite();
  if (currentState !== 'input') {
    await checkSiteRelevance();
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
  // Only trigger on completed navigation
  if (changeInfo.status === 'complete') {
    await updateCurrentSite();
    if (currentState !== 'input') {
      await checkSiteRelevance();
    }
  }
});

