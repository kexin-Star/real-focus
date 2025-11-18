// Real Focus Assistant - Event Handlers

// These functions will be called from popup.js and need access to:
// - UIElements from ui-manager.js
// - Storage functions from storage-utils.js
// - Timer functions from popup.js (via callbacks)
// - UI update functions from ui-manager.js (via callbacks)

// Event handlers will receive dependencies via parameters or closures
// This allows for better testability and separation of concerns

/**
 * Handle start focus button click
 * @param {Object} dependencies - Dependencies object containing:
 *   - getKeywordsInput: Function to get keywords input value
 *   - saveFocusKeywords: Function to save keywords
 *   - getSelectedFocusDuration: Function to get selected duration
 *   - saveTimerState: Function to save timer state
 *   - showFocusedState: Function to show focused state
 *   - updateSubjectDisplay: Function to update subject display
 *   - startTimer: Function to start timer
 *   - updateCurrentSite: Function to update current site
 *   - checkSiteRelevance: Function to check site relevance
 *   - renderPomodoroState: Function to render pomodoro state
 *   - startCountdown: Function to start countdown
 *   - updateStatistics: Function to update statistics
 *   - UIElements: UI elements object
 */
async function handleStartFocus(dependencies) {
  const {
    getKeywordsInput,
    getSubjectDisplay,
    saveFocusKeywords,
    getSelectedFocusDuration,
    saveTimerState,
    showFocusedState,
    updateSubjectDisplay,
    startTimer,
    updateCurrentSite,
    checkSiteRelevance,
    renderPomodoroState,
    startCountdown,
    updateStatistics,
    UIElements
  } = dependencies;
  
  // Priority: subjectDisplay (focused state) > keywordsInput (input state)
  // This ensures we get the latest subject if user edited it in focused state
  const subjectDisplay = getSubjectDisplay();
  const subjectValue = subjectDisplay?.value?.trim() || '';
  const keywordsInputValue = getKeywordsInput().trim();
  const keywords = subjectValue || keywordsInputValue;
  
  if (!keywords) {
    // Focus on the appropriate input based on current state
    if (subjectDisplay && subjectDisplay.offsetParent !== null) {
      // subjectDisplay is visible (focused state)
      subjectDisplay.focus();
    } else if (UIElements.keywordsInput) {
      // keywordsInput is visible (input state)
      UIElements.keywordsInput.focus();
    }
    return;
  }
  
  try {
    // Check if keywords have changed
    const previousKeywords = (await chrome.storage.local.get(['focusKeywords'])).focusKeywords;
    const keywordsChanged = previousKeywords && previousKeywords !== keywords;
    
    // Save keywords to storage
    await saveFocusKeywords(keywords);
    
    // If keywords changed, update pomodoro state and clear cache
    // This ensures that even if pomodoro state already exists, keywords are updated
    if (keywordsChanged) {
      console.log('Focus keywords changed, updating pomodoro state and clearing cache...');
      chrome.runtime.sendMessage({ 
        action: 'update_keywords',
        keywords: keywords
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Error updating keywords:', chrome.runtime.lastError);
        } else if (response && response.success) {
          console.log('✅ Keywords updated in pomodoro state and cache cleared');
        }
      });
    }
    
    await saveTimerState('running', 0);
    
    // Get selected focus duration
    const focusDuration = await getSelectedFocusDuration();
    
    // Initialize pomodoro state in background.js
    chrome.runtime.sendMessage({ 
      action: 'init_focus',
      keywords: keywords,
      focusDuration: focusDuration
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error initializing focus:', chrome.runtime.lastError);
      } else if (response && response.success) {
        console.log('✅ Pomodoro state initialized');
        if (response.pomodoroState) {
          renderPomodoroState(response.pomodoroState);
          startCountdown(response.pomodoroState);
          updateStatistics();
        }
      }
    });
    
    // Update displays
    updateSubjectDisplay(keywords);
    
    // Show focused state
    showFocusedState();
    
    // Hide stopped actions and show title when starting focus
    if (UIElements.stoppedActions) UIElements.stoppedActions.classList.add('hidden');
    if (UIElements.timerStatusTitle) {
      UIElements.timerStatusTitle.style.display = 'block';
    }
    
    // Start timer
    startTimer();
    
    // Update current site
    await updateCurrentSite();
    
    // Check site relevance
    await checkSiteRelevance();
    
  } catch (error) {
    console.error('Error starting focus:', error);
  }
}

/**
 * Handle pause button click
 * @param {Object} dependencies - Dependencies object
 */
function handlePause(dependencies) {
  const {
    pomodoroStateRef,
    clearIntervals,
    showPausedState,
    updateTimerDisplay,
    renderPomodoroState,
    updateStatistics,
    syncPopupState
  } = dependencies;
  
  // Update local pomodoro state status to PAUSED
  if (pomodoroStateRef.current) {
    pomodoroStateRef.current.status = 'PAUSED';
  }
  
  // Clear intervals
  clearIntervals();
  
  // Update UI
  showPausedState();
  updateTimerDisplay();
  
  // Send pause message to Service Worker
  chrome.runtime.sendMessage({ action: 'pause_focus' }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('Error pausing focus:', chrome.runtime.lastError);
    } else if (response && response.success) {
      console.log('✅ Focus paused');
      if (response.pomodoroState) {
        pomodoroStateRef.current = response.pomodoroState;
        renderPomodoroState(response.pomodoroState);
        updateStatistics();
      }
      syncPopupState();
    }
  });
}

/**
 * Handle resume button click
 * @param {Object} dependencies - Dependencies object
 */
function handleResume(dependencies) {
  const {
    pomodoroStateRef,
    renderPomodoroState,
    startCountdown,
    updateStatistics,
    showFocusedState,
    startTimer,
    checkSiteRelevance
  } = dependencies;
  
  chrome.runtime.sendMessage({ action: 'resume_focus' }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('Error resuming focus:', chrome.runtime.lastError);
    } else if (response && response.success) {
      console.log('✅ Focus resumed');
      
      if (response.pomodoroState) {
        // Update both global state and ref to ensure consistency
        const { updatePomodoroState } = dependencies;
        if (updatePomodoroState) {
          updatePomodoroState(response.pomodoroState);
        } else {
          pomodoroStateRef.current = response.pomodoroState;
        }
        
        // Render state first to update UI
        renderPomodoroState(response.pomodoroState);
        
        // Then start countdown with the updated state
        // Use the latest state from the ref to ensure we have the most current values
        const latestState = pomodoroStateRef.current || response.pomodoroState;
        startCountdown(latestState);
        
        updateStatistics();
      }
      
      showFocusedState();
      startTimer();
      checkSiteRelevance();
    }
  });
}

/**
 * Handle stop button click
 * @param {Object} dependencies - Dependencies object
 */
function handleStopFocus(dependencies) {
  const {
    clearIntervals,
    pomodoroStateRef,
    resetTimerState,
    updateTimerDisplay,
    updatePomodoroCycleIndicator,
    updateCountdownDisplayFromDuration,
    updateProgressBar,
    showFocusedState,
    renderPomodoroState,
    updatePomodoroState,
    UIElements
  } = dependencies;
  
  // Clear local timers
  clearIntervals();
  
  // Send stop message to Service Worker
  chrome.runtime.sendMessage({ action: 'stop_focus' }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('Error stopping focus:', chrome.runtime.lastError);
    } else if (response && response.success) {
      console.log('✅ Focus session stopped and state cleared');
      
      // Reset local variables
      updatePomodoroState(null);
      resetTimerState();
      
      updateTimerDisplay();
      updatePomodoroCycleIndicator(null);
      updateCountdownDisplayFromDuration();
      updateProgressBar(0, null);
      
      // Keep focused state visible
      showFocusedState();
      
      // Show stopped state buttons
      if (UIElements.focusActions) UIElements.focusActions.classList.add('hidden');
      if (UIElements.breakActions) UIElements.breakActions.classList.add('hidden');
      if (UIElements.pausedActions) UIElements.pausedActions.classList.add('hidden');
      if (UIElements.stoppedActions) UIElements.stoppedActions.classList.remove('hidden');
      
      // Hide status title
      if (UIElements.timerStatusTitle) UIElements.timerStatusTitle.style.display = 'none';
      
      // Update UI state
      renderPomodoroState(null);
    }
  });
}

/**
 * Handle subject change
 * @param {Object} dependencies - Dependencies object
 * @param {string} newKeywords - New keywords
 */
async function handleSubjectChange(dependencies, newKeywords) {
  const {
    saveFocusKeywords,
    updateSubjectDisplay,
    checkSiteRelevance
  } = dependencies;
  
  const keywords = newKeywords.trim();
  if (!keywords) {
    return;
  }
  
  // Save to storage
  await saveFocusKeywords(keywords);
  
  // Update display
  updateSubjectDisplay(keywords);
  
  // Update pomodoro state keywords if pomodoro state exists
  // This ensures AI uses the new subject immediately, even if timer is running or paused
  // update_keywords action will also clear the cache to ensure relevance checks use updated keywords
  chrome.runtime.sendMessage({ 
    action: 'update_keywords',
    keywords: keywords
  }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('Error updating keywords in pomodoro state:', chrome.runtime.lastError.message || chrome.runtime.lastError);
      return;
    }
    if (response && response.success) {
      console.log('✅ Keywords updated in pomodoro state and cache cleared');
    } else if (response && !response.success) {
      console.error('Failed to update keywords:', response.error || 'Unknown error');
    }
  });
  
  // Re-check current site relevance
  await checkSiteRelevance();
}

/**
 * Handle done break button click
 * @param {Object} dependencies - Dependencies object
 */
function handleDoneBreak(dependencies) {
  const { syncPopupState } = dependencies;
  
  chrome.runtime.sendMessage({
    action: 'end_break'
  }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('Error ending break:', chrome.runtime.lastError);
    } else if (response && response.success) {
      console.log('✅ Break ended, starting next focus session');
      syncPopupState();
    }
  });
}

/**
 * Handle start to focus button click (from stopped state)
 * @param {Object} dependencies - Dependencies object
 */
function handleStartToFocus(dependencies) {
  const {
    getSubjectDisplay,
    getKeywordsInput,
    handleStartFocus
  } = dependencies;
  
  // Get keywords from subject display or input
  // getSubjectDisplay() returns DOM element, so we need to get .value first
  const subjectDisplay = getSubjectDisplay();
  const subjectValue = subjectDisplay?.value?.trim() || '';
  const keywordsInputValue = getKeywordsInput()?.trim() || '';
  const keywords = subjectValue || keywordsInputValue;
  
  if (!keywords) {
    // If no keywords, focus on subject input
    if (subjectDisplay) {
      subjectDisplay.focus();
    }
    return;
  }
  
  // Use the same logic as handleStartFocus
  handleStartFocus(dependencies);
}

/**
 * Handle finish task button click (if needed)
 * @param {Object} dependencies - Dependencies object
 */
function handleFinishTask(dependencies) {
  chrome.runtime.sendMessage({
    action: 'mark_task_complete',
    next: 'break'
  }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('Error marking task complete:', chrome.runtime.lastError);
    } else if (response && response.success) {
      console.log('✅ Task marked as complete');
      if (response.next === 'break') {
        handleStartBreak(dependencies);
      } else {
        dependencies.syncPopupState();
      }
    }
  });
}

/**
 * Handle start break button click (if needed)
 * @param {Object} dependencies - Dependencies object
 */
function handleStartBreak(dependencies) {
  chrome.runtime.sendMessage({
    action: 'start_break'
  }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('Error starting break:', chrome.runtime.lastError);
    } else if (response && response.success) {
      console.log('✅ Break started');
      dependencies.syncPopupState();
    }
  });
}

