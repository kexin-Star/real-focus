// Real Focus Assistant - Popup Main Entry Point
// This file coordinates all modules and manages application state

// State variables
let timerInterval = null;
let countdownInterval = null;
let startTime = null;
let elapsedTime = 0;
let isPaused = false;
let pomodoroState = null; // Current pomodoro state

// Create a reference object for pomodoro state (for event handlers)
const pomodoroStateRef = { current: pomodoroState };

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
    // Note: updateTimerDisplay is not used as the element doesn't exist in HTML
    // But we keep the elapsedTime updated for statistics
    
    // Save elapsed time periodically
    chrome.storage.local.set({ elapsedTime: elapsedTime });
    
    // Update statistics periodically (every 10 seconds)
    if (Math.floor(elapsedTime / 1000) % 10 === 0) {
      updateStatistics();
    }
  }, 1000);
}

function clearIntervals() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
}

function resetTimerState() {
  elapsedTime = 0;
  startTime = null;
  isPaused = false;
}

function updateTimerDisplay(totalTime = null) {
  // This function is kept for compatibility but the display element doesn't exist
  // The timer display is handled by the countdown display instead
  const timeToDisplay = totalTime !== null ? totalTime : elapsedTime;
  // Format time but don't display (element doesn't exist)
  formatTime(timeToDisplay);
}

/**
 * Update statistics display (focus time and blocked count)
 */
async function updateStatistics() {
  try {
    const keywords = await getFocusKeywords();
    
    if (!keywords) {
      return;
    }
    
    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) {
      return;
    }
    
    // Send message to Service Worker to get current state
    chrome.runtime.sendMessage({
      action: 'getPopupState',
      tabId: tab.id,
      url: tab.url,
      keywords: keywords
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error getting statistics:', chrome.runtime.lastError);
        return;
      }
      
      if (response && response.success && response.data) {
        const data = response.data;
        updateStatisticsDisplay(data.todayFocusTime, data.blockedCount);
      }
    });
  } catch (error) {
    console.error('Error updating statistics:', error);
  }
}

// Check site relevance (with caching via Service Worker)
async function checkSiteRelevance() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const keywords = await getFocusKeywords();
    
    if (!tab || !tab.url || !keywords) {
      return;
    }
    
    // Send message to Service Worker to check relevance (with caching and content extraction)
    chrome.runtime.sendMessage({
      action: 'checkRelevance',
      keywords: keywords,
      title: tab.title || '',
      url: tab.url,
      tabId: tab.id
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
        
        // Update relevance score
        const score = data.relevance_score_percent || 0;
        updateRelevanceScore(score);
        
        // Update status
        const status = data.status || 'Stay';
        updateStatusDisplay(status);
      } else if (response && response.error) {
        console.error('Error from Service Worker:', response.error);
      }
    });
  } catch (error) {
    console.error('Error checking site relevance:', error);
  }
}

/**
 * Sync popup state from Service Worker
 * This function requests all current state data from Service Worker
 */
async function syncPopupState() {
  try {
    // Show loading indicator
    showLoadingIndicator();
    
    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) {
      hideLoadingIndicator();
      return;
    }
    
    // Get focus keywords from storage
    const keywords = await getFocusKeywords();
    
    if (!keywords) {
      hideLoadingIndicator();
      return;
    }
    
    // Send message to Service Worker to get current state
    chrome.runtime.sendMessage({
      action: 'getPopupState',
      tabId: tab.id,
      url: tab.url,
      keywords: keywords
    }, async (response) => {
      hideLoadingIndicator();
      
      if (chrome.runtime.lastError) {
        console.error('Error getting popup state:', chrome.runtime.lastError);
        return;
      }
      
      if (response && response.success && response.data) {
        const data = response.data;
        
        // Update current site
        try {
          const url = new URL(tab.url);
          const displayUrl = url.hostname + url.pathname;
          if (UIElements.currentSiteDisplay) UIElements.currentSiteDisplay.textContent = displayUrl;
        } catch (e) {
          if (UIElements.currentSiteDisplay) UIElements.currentSiteDisplay.textContent = tab.url;
        }
        
        // Update subject/keywords
        // Only update if user is not currently editing the subject
        // updateSubjectDisplay already has protection, but we add extra check here
        if (data.keywords) {
          // Check if subjectDisplay is currently focused (user is editing)
          const isEditing = UIElements.subjectDisplay && 
                           document.activeElement === UIElements.subjectDisplay;
          if (!isEditing) {
            updateSubjectDisplay(data.keywords);
          }
        }
        
        // Update relevance score
        const score = data.relevanceScore || 0;
        updateRelevanceScore(score);
        
        // Update status
        const status = data.status || 'Stay';
        updateStatusDisplay(status);
        
        // Update timer if provided
        if (data.focusedTime !== undefined) {
          elapsedTime = data.focusedTime;
          updateTimerDisplay(data.focusedTime);
        }
        
        // Update pomodoro state if provided
        if (data.pomodoroState) {
          // Update both global state and ref to ensure consistency
          pomodoroState = data.pomodoroState;
          pomodoroStateRef.current = data.pomodoroState;
          
          // Render state first to update UI (including countdown text and progress)
          renderPomodoroState(data.pomodoroState);
          
          // Only start countdown if not paused
          // In PAUSED state, we should not start the countdown interval
          if (data.pomodoroState.status !== 'PAUSED') {
            startCountdown(data.pomodoroState);
          } else {
            // If paused, just update the display once without starting interval
            // Use time_left_ms if available, otherwise calculate from target_end_time
            const remaining = data.pomodoroState.time_left_ms !== undefined 
              ? Math.max(0, data.pomodoroState.time_left_ms)
              : Math.max(0, data.pomodoroState.target_end_time - Date.now());
            const timeString = formatCountdownTime(remaining);
            updateCountdownText(timeString);
            const progress = calculateProgress(data.pomodoroState.start_time, data.pomodoroState.target_end_time, data.pomodoroState);
            updateProgressBar(progress, data.pomodoroState);
            // Ensure no interval is running
            if (countdownInterval) {
              clearInterval(countdownInterval);
              countdownInterval = null;
            }
          }
        }
        
        // Update statistics if provided
        if (data.todayFocusTime !== undefined || data.blockedCount !== undefined) {
          updateStatisticsDisplay(data.todayFocusTime, data.blockedCount);
        }
      } else if (response && response.error) {
        console.error('Error from Service Worker:', response.error);
      }
    });
  } catch (error) {
    console.error('Error syncing popup state:', error);
    hideLoadingIndicator();
  }
}

/**
 * Start countdown timer based on target_end_time
 * @param {Object} state - Pomodoro state object
 */
function startCountdown(state) {
  // Always use the latest state from the parameter or global variable
  const currentState = state || pomodoroState || pomodoroStateRef.current;
  
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
  
  if (!currentState || !currentState.target_end_time) {
    return;
  }
  
  // If paused, don't start the countdown interval at all
  // Just update the display once
  if (currentState.status === 'PAUSED') {
    // Use time_left_ms if available, otherwise calculate from target_end_time
    const remaining = currentState.time_left_ms !== undefined 
      ? Math.max(0, currentState.time_left_ms)
      : Math.max(0, currentState.target_end_time - Date.now());
    const timeString = formatCountdownTime(remaining);
    updateCountdownText(timeString);
    const progress = calculateProgress(currentState.start_time, currentState.target_end_time, currentState);
    updateProgressBar(progress, currentState);
    return; // Don't start interval when paused
  }
  
  const updateCountdown = () => {
    // Always get the latest state to ensure we're using current values
    const latestState = pomodoroState || pomodoroStateRef.current || currentState;
    
    // Check if pomodoro state exists
    if (!latestState) {
      if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
      }
      return;
    }
    
    // If paused, update progress and countdown text once and stop the interval
    if (latestState.status === 'PAUSED') {
      // Use time_left_ms if available, otherwise calculate from target_end_time
      const remaining = latestState.time_left_ms !== undefined 
        ? Math.max(0, latestState.time_left_ms)
        : Math.max(0, latestState.target_end_time - Date.now());
      const totalDuration = latestState.target_end_time - latestState.start_time;
      
      if (totalDuration > 0) {
        const progress = calculateProgress(latestState.start_time, latestState.target_end_time, latestState);
        updateProgressBar(progress, latestState);
        
        // Update countdown text even when paused
        const timeString = formatCountdownTime(remaining);
        updateCountdownText(timeString);
      }
      
      if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
      }
      return;
    }
    
    const now = Date.now();
    const remaining = getRemainingTime(latestState.target_end_time, latestState);
    
    if (remaining <= 0) {
      // Time's up - trigger automatic transition
      updateCountdownText('00:00');
      updateProgressBar(1.0, latestState);
      if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
      }
      
      // Trigger automatic transition based on session type
      if (latestState) {
        if (latestState.session_type === 'FOCUS' && latestState.status !== 'PAUSED') {
          chrome.runtime.sendMessage({ action: 'end_focus' }, (response) => {
            if (response && response.success) {
              console.log('✅ Focus session ended, transitioning to break');
              syncPopupState();
            }
          });
        } else if (latestState.session_type === 'BREAK') {
          chrome.runtime.sendMessage({ action: 'end_break' }, (response) => {
            if (response && response.success) {
              console.log('✅ Break session ended, transitioning to focus');
              syncPopupState();
            }
          });
        }
      }
      return;
    }
    
    // Calculate progress (0 to 1)
    const progress = calculateProgress(latestState.start_time, latestState.target_end_time, latestState);
    updateProgressBar(progress, latestState);
    
    // Update text
    const timeString = formatCountdownTime(remaining);
    updateCountdownText(timeString);
  };
  
  // Update immediately
  updateCountdown();
  
  // Update every 50ms for smooth animation
  countdownInterval = setInterval(updateCountdown, 50);
}

// Load saved state from storage
async function loadSavedStateFromStorage() {
  try {
    const savedState = await loadSavedState();
    
    if (savedState.focusKeywords) {
      if (UIElements.keywordsInput) UIElements.keywordsInput.value = savedState.focusKeywords;
      updateSubjectDisplay(savedState.focusKeywords);
      
      // Restore timer state
      if (savedState.timerState === 'running') {
        elapsedTime = savedState.elapsedTime || 0;
        showFocusedState();
        startTimer();
        // Load pomodoro state if exists
        chrome.runtime.sendMessage({
          action: 'getPopupState',
          tabId: null,
          url: '',
          keywords: savedState.focusKeywords
        }, (response) => {
          if (response && response.success && response.data && response.data.pomodoroState) {
            pomodoroState = response.data.pomodoroState;
            pomodoroStateRef.current = pomodoroState;
            renderPomodoroState(pomodoroState);
            // Only start countdown if not paused
            if (pomodoroState.status !== 'PAUSED') {
              startCountdown(pomodoroState);
            } else {
              // If paused, just update display once without starting interval
              // Use time_left_ms if available, otherwise calculate from target_end_time
              const remaining = pomodoroState.time_left_ms !== undefined 
                ? Math.max(0, pomodoroState.time_left_ms)
                : Math.max(0, pomodoroState.target_end_time - Date.now());
              const timeString = formatCountdownTime(remaining);
              updateCountdownText(timeString);
              const progress = calculateProgress(pomodoroState.start_time, pomodoroState.target_end_time, pomodoroState);
              updateProgressBar(progress, pomodoroState);
              // Ensure no interval is running
              if (countdownInterval) {
                clearInterval(countdownInterval);
                countdownInterval = null;
              }
            }
          }
        });
      } else if (savedState.timerState === 'paused') {
        elapsedTime = savedState.elapsedTime || 0;
        showFocusedState();
        showPausedUI();
        updateTimerDisplay();
        // Load pomodoro state if exists
        chrome.runtime.sendMessage({
          action: 'getPopupState',
          tabId: null,
          url: '',
          keywords: savedState.focusKeywords
        }, (response) => {
          if (response && response.success && response.data && response.data.pomodoroState) {
            pomodoroState = response.data.pomodoroState;
            pomodoroStateRef.current = pomodoroState;
            renderPomodoroState(pomodoroState);
            // If paused, don't start countdown - just update display once
            if (pomodoroState.status === 'PAUSED') {
              // Use time_left_ms if available, otherwise calculate from target_end_time
              const remaining = pomodoroState.time_left_ms !== undefined 
                ? Math.max(0, pomodoroState.time_left_ms)
                : Math.max(0, pomodoroState.target_end_time - Date.now());
              const timeString = formatCountdownTime(remaining);
              updateCountdownText(timeString);
              const progress = calculateProgress(pomodoroState.start_time, pomodoroState.target_end_time, pomodoroState);
              updateProgressBar(progress, pomodoroState);
              // Ensure no interval is running
              if (countdownInterval) {
                clearInterval(countdownInterval);
                countdownInterval = null;
              }
            } else {
              startCountdown(pomodoroState);
            }
          }
        });
      }
    }
  } catch (error) {
    console.error('Error loading saved state:', error);
  }
}

// Setup event listeners
function setupEventListeners() {
  // Create dependencies object for event handlers
  const dependencies = {
    // Getters
    getKeywordsInput: () => UIElements.keywordsInput?.value || '',
    getSubjectDisplay: () => UIElements.subjectDisplay,
    getKeywordsInputElement: () => UIElements.keywordsInput,
    
    // Storage functions
    saveFocusKeywords,
    getSelectedFocusDuration,
    saveTimerState,
    
    // UI functions
    showFocusedState,
    updateSubjectDisplay,
    updateCurrentSite,
    checkSiteRelevance,
    renderPomodoroState,
    startCountdown: (state) => startCountdown(state),
    updateStatistics,
    showPausedState,
    updateTimerDisplay,
    updatePomodoroCycleIndicator,
    updateCountdownDisplayFromDuration,
    updateProgressBar,
    syncPopupState,
    getCurrentState,
    
    // Timer functions
    startTimer,
    
    // Event handlers
    handleStartFocus,
    handleSubjectChange,
    
    // State references
    pomodoroStateRef,
    clearIntervals,
    resetTimerState,
    
    // State update functions
    updatePomodoroState: (state) => {
      pomodoroState = state;
      pomodoroStateRef.current = state;
    },
    
    // UI Elements
    UIElements
  };
  
  // Start button
  if (UIElements.startButton) {
    UIElements.startButton.addEventListener('click', () => {
      handleStartFocus(dependencies);
    });
  }
  
  // Enter key in input field (frame1)
  // If already in focused state, just update subject without starting timer
  // If in input state, start focus session
  if (UIElements.keywordsInput) {
    let isComposing = false;
    
    UIElements.keywordsInput.addEventListener('compositionstart', () => {
      isComposing = true;
    });
    
    UIElements.keywordsInput.addEventListener('compositionend', () => {
      isComposing = false;
    });
    
    UIElements.keywordsInput.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        const composing = e.isComposing !== undefined ? e.isComposing : isComposing;
        
        if (composing) {
          return;
        }
        
        e.preventDefault();
        const value = UIElements.keywordsInput.value.trim();
        
        if (!value) {
          return;
        }
        
        // Check current state
        const currentState = getCurrentState();
        
        if (currentState === 'focused') {
          // Already in focused state: just update subject without starting timer
          try {
            await handleSubjectChange(dependencies, value);
            // Also update keywordsInput value to keep it in sync
            if (UIElements.keywordsInput) {
              UIElements.keywordsInput.value = value;
            }
          } catch (error) {
            console.error('Error updating subject from frame1:', error);
          }
        } else {
          // In input state: start focus session
          handleStartFocus(dependencies);
        }
      }
    });
  }
  
  // Pause button
  if (UIElements.pauseFocusButton) {
    UIElements.pauseFocusButton.addEventListener('click', () => {
      handlePause(dependencies);
    });
  }
  
  // Resume button
  if (UIElements.resumeFocusButton) {
    UIElements.resumeFocusButton.addEventListener('click', () => {
      handleResume(dependencies);
    });
  }
  
  // Stop button
  if (UIElements.stopFocusButton) {
    UIElements.stopFocusButton.addEventListener('click', () => {
      handleStopFocus(dependencies);
    });
  }
  
  // Edit subject button
  if (UIElements.editSubjectButton) {
    UIElements.editSubjectButton.addEventListener('click', () => {
      if (UIElements.subjectDisplay) {
        UIElements.subjectDisplay.focus();
        UIElements.subjectDisplay.select();
      }
    });
  }
  
  // Handle Enter key in subject input to save
  if (UIElements.subjectDisplay) {
    let isComposing = false;
    
    UIElements.subjectDisplay.addEventListener('compositionstart', () => {
      isComposing = true;
    });
    
    UIElements.subjectDisplay.addEventListener('compositionend', () => {
      isComposing = false;
    });
    
    UIElements.subjectDisplay.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        const composing = e.isComposing !== undefined ? e.isComposing : isComposing;
        
        if (composing) {
          return;
        }
        
        e.preventDefault();
        const value = UIElements.subjectDisplay.value.trim();
        
        try {
          await handleSubjectChange(dependencies, value);
        } catch (error) {
          console.error('Error saving subject:', error);
        } finally {
          UIElements.subjectDisplay.blur();
        }
      }
    });
    
    UIElements.subjectDisplay.addEventListener('blur', () => {
      handleSubjectChange(dependencies, UIElements.subjectDisplay.value);
    });
  }
  
  // Pomodoro action buttons
  if (UIElements.doneBreakButton) {
    UIElements.doneBreakButton.addEventListener('click', () => {
      handleDoneBreak(dependencies);
    });
  }
  
  if (UIElements.startToFocusButton) {
    UIElements.startToFocusButton.addEventListener('click', () => {
      handleStartToFocus(dependencies);
    });
  }
  
  // Setup countdown display click handler for duration picker
  // 在停止状态下（倒计时终止后的等候状态），点击时间文本可以切换滚轮显示/隐藏
  if (UIElements.countdownDisplay) {
    UIElements.countdownDisplay.addEventListener('click', (e) => {
      // 如果点击的是滚轮区域，不处理（让滚轮自己处理点击）
      if (UIElements.durationPickerContainer && UIElements.durationPickerContainer.contains(e.target)) {
        return;
      }
      
      // 只在真正的停止状态下允许切换滚轮
      // 首先检查是否在运行中（Focusing/Break）或暂停中，如果是则直接返回，不允许触发
      if (pomodoroState && (pomodoroState.status === 'FOCUS' || pomodoroState.status === 'BREAK' || pomodoroState.status === 'PAUSED')) {
        // 在运行中或暂停中：不允许触发时长选择器，仅显示倒计时文本
        return;
      }
      
      // 停止状态的条件（满足任一即可）：
      // 1. pomodoroState === null 或 pomodoroStateRef.current === null (从未开始或已停止)
      // 2. stoppedActions 显示（UI 状态显示为停止）
      // 3. status === 'IDLE' (明确标记为停止)
      // 4. 倒计时已过期 (target_end_time < now) 且不在运行中或暂停中
      //    status 可能值: 'FOCUS' | 'BREAK' | 'PAUSED' | 'IDLE'
      const now = Date.now();
      const isStoppedActionsVisible = UIElements.stoppedActions && 
                                      !UIElements.stoppedActions.classList.contains('hidden');
      const isStopped = pomodoroState === null || 
                       pomodoroStateRef.current === null ||
                       isStoppedActionsVisible ||
                       (pomodoroState && (
                         pomodoroState.status === 'IDLE' ||
                         (pomodoroState.target_end_time && 
                          pomodoroState.target_end_time < now &&
                          pomodoroState.status !== 'FOCUS' &&
                          pomodoroState.status !== 'BREAK' &&
                          pomodoroState.status !== 'PAUSED')
                       ));
      
      if (isStopped) {
        const isPickerVisible = UIElements.durationPickerContainer && 
                                !UIElements.durationPickerContainer.classList.contains('hidden');
        // 切换滚轮显示/隐藏
        // 获取 duration picker 元素，以便在显示时滚动到当前保存的时长位置
        const durationPickerEl = UIElements.durationPicker;
        const durationOptionsEl = durationPickerEl?.querySelectorAll('.duration-option');
        toggleDurationPicker(!isPickerVisible, durationPickerEl, durationOptionsEl);
      }
    });
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  // Initialize UI elements
  initializeUIElements();
  
  await loadSavedStateFromStorage();
  setupEventListeners();
  
  // Initialize duration picker after DOM is ready
  const durationPickerEl = UIElements.durationPicker;
  const durationOptionsEl = durationPickerEl?.querySelectorAll('.duration-option');
  
  if (durationPickerEl && durationOptionsEl) {
    initializeDurationPicker(durationPickerEl, durationOptionsEl, (minutes) => {
      // Callback when duration changes
      console.log('Duration changed to:', minutes);
    });
  }
  
  // If not in input state, sync state from Service Worker
  if (getCurrentState() !== 'input') {
    await syncPopupState();
  } else {
    // If in input state, just update current site
    await updateCurrentSite();
  }
});

// Listen for tab changes to update current site
chrome.tabs.onActivated.addListener(async () => {
  await updateCurrentSite();
  if (getCurrentState() !== 'input') {
    await checkSiteRelevance();
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
  if (changeInfo.status === 'complete') {
    await updateCurrentSite();
    if (getCurrentState() !== 'input') {
      await checkSiteRelevance();
    }
  }
});

// Clean up intervals when popup is about to close
// This ensures that no countdown continues in the background when popup is closed
window.addEventListener('beforeunload', () => {
  clearIntervals();
});

// Also handle visibility change (when popup loses focus or is hidden)
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    // When popup is hidden, check if we should stop countdown
    const currentState = pomodoroState || pomodoroStateRef.current;
    if (currentState && currentState.status === 'PAUSED') {
      // If paused, ensure countdown is stopped
      if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
      }
    }
  }
});
