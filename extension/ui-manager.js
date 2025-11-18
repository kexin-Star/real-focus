// Real Focus Assistant - UI Manager

// DOM Elements - Exported for use in other modules
const UIElements = {
  // State containers
  inputState: document.getElementById('input-state'),
  focusedState: document.getElementById('focused-state'),
  
  // Input elements
  keywordsInput: document.getElementById('keywordsInput'),
  startButton: document.getElementById('startButton'),
  subjectDisplay: document.getElementById('subjectDisplay'),
  
  // Display elements
  currentSiteDisplay: document.getElementById('currentSiteDisplay'),
  relevanceScoreDisplay: document.getElementById('relevanceScoreDisplay'),
  statusDisplay: document.getElementById('statusDisplay'),
  
  // Loading indicators
  loadingIndicator: document.getElementById('loading-indicator'),
  
  // Pomodoro UI elements
  countdownDisplay: document.getElementById('countdownDisplay'),
  timerStatusTitle: document.getElementById('timerStatusTitle'),
  durationPickerContainer: document.getElementById('durationPickerContainer'),
  focusActions: document.getElementById('focusActions'),
  breakActions: document.getElementById('breakActions'),
  pausedActions: document.getElementById('pausedActions'),
  stoppedActions: document.getElementById('stoppedActions'),
  
  // Pomodoro cycle indicator elements
  pomodoroCycleIndicator: document.getElementById('pomodoroCycleIndicator'),
  tomato0: document.getElementById('tomato0'),
  tomato1: document.getElementById('tomato1'),
  tomato2: document.getElementById('tomato2'),
  tomato3: document.getElementById('tomato3'),
  
  // Action buttons
  doneBreakButton: document.getElementById('doneBreakButton'),
  pauseFocusButton: document.getElementById('pauseFocusButton'),
  resumeFocusButton: document.getElementById('resumeFocusButton'),
  stopFocusButton: document.getElementById('stopFocusButton'),
  startToFocusButton: document.getElementById('startToFocusButton'),
  editSubjectButton: document.getElementById('editSubjectButton'),
  
  // Duration picker elements
  durationPicker: document.getElementById('durationPicker'),
  
  // Statistics elements
  todayFocusTime: document.getElementById('todayFocusTime'),
  blockedCount: document.getElementById('blockedCount')
};

// Initialize countdown elements (called after DOM is loaded)
let countdownText = null;
let countdownProgressCircle = null;
let tomatoEmojis = null;

function initializeUIElements() {
  if (UIElements.countdownDisplay) {
    countdownText = document.getElementById('countdownText');
    countdownProgressCircle = document.getElementById('countdownProgressCircle');
  }
  
  if (UIElements.tomato0 && UIElements.tomato1 && UIElements.tomato2 && UIElements.tomato3) {
    tomatoEmojis = [UIElements.tomato0, UIElements.tomato1, UIElements.tomato2, UIElements.tomato3];
  }
}

// State management
let currentState = 'input'; // 'input', 'focused'

function getCurrentState() {
  return currentState;
}

// Show input state
function showInputState() {
  if (UIElements.inputState) UIElements.inputState.classList.remove('hidden');
  if (UIElements.focusedState) UIElements.focusedState.classList.add('hidden');
  currentState = 'input';
}

// Show focused state
function showFocusedState() {
  if (UIElements.inputState) UIElements.inputState.classList.add('hidden');
  if (UIElements.focusedState) UIElements.focusedState.classList.remove('hidden');
  currentState = 'focused';
}

// Show paused UI within focused state
function showPausedUI() {
  // Update status title to show "Paused"
  if (UIElements.timerStatusTitle) {
    UIElements.timerStatusTitle.textContent = 'Paused';
    UIElements.timerStatusTitle.style.display = 'block';
  }
  
  // Show paused actions, hide others
  if (UIElements.focusActions) UIElements.focusActions.classList.add('hidden');
  if (UIElements.breakActions) UIElements.breakActions.classList.add('hidden');
  if (UIElements.stoppedActions) UIElements.stoppedActions.classList.add('hidden');
  if (UIElements.pausedActions) UIElements.pausedActions.classList.remove('hidden');
}

// Show paused state (now just updates UI within focused state)
function showPausedState() {
  // Ensure focused state is visible
  showFocusedState();
  // Show paused UI
  showPausedUI();
}

// Loading indicator
function showLoadingIndicator() {
  if (UIElements.loadingIndicator) UIElements.loadingIndicator.classList.remove('hidden');
}

function hideLoadingIndicator() {
  if (UIElements.loadingIndicator) UIElements.loadingIndicator.classList.add('hidden');
}

// Update current site display
async function updateCurrentSite() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url) {
      try {
        const url = new URL(tab.url);
        const displayUrl = url.hostname + url.pathname;
        if (UIElements.currentSiteDisplay) UIElements.currentSiteDisplay.textContent = displayUrl;
      } catch (e) {
        if (UIElements.currentSiteDisplay) UIElements.currentSiteDisplay.textContent = tab.url;
      }
    }
  } catch (error) {
    console.error('Error updating current site:', error);
  }
}

// Update relevance score
function updateRelevanceScore(score) {
  if (UIElements.relevanceScoreDisplay) {
    UIElements.relevanceScoreDisplay.textContent = `${score}%`;
    updateScoreColor(score);
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
  
  if (UIElements.relevanceScoreDisplay) {
    UIElements.relevanceScoreDisplay.className = `score-display ${scoreClass}`;
  }
}

// Update status display
function updateStatusDisplay(status) {
  if (UIElements.statusDisplay) {
    UIElements.statusDisplay.textContent = status;
    if (status === 'Stay') {
      UIElements.statusDisplay.className = 'status-display status-stay';
    } else {
      UIElements.statusDisplay.className = 'status-display status-block';
    }
  }
}

// Update subject display
// Also sync keywordsInput (frame1) to keep both inputs in sync
function updateSubjectDisplay(keywords) {
  // Update subjectDisplay (frame2) if not being edited
  if (UIElements.subjectDisplay && document.activeElement !== UIElements.subjectDisplay) {
    UIElements.subjectDisplay.value = keywords;
  }
  
  // Also update keywordsInput (frame1) to keep both inputs in sync
  if (UIElements.keywordsInput && document.activeElement !== UIElements.keywordsInput) {
    UIElements.keywordsInput.value = keywords;
  }
}

// Update statistics
function updateStatisticsDisplay(todayFocusTime, blockedCount) {
  if (todayFocusTime !== undefined) {
    const minutes = Math.floor(todayFocusTime / 60000);
    const timeText = minutes > 0 ? `${minutes}m` : '<1m';
    if (UIElements.todayFocusTime) UIElements.todayFocusTime.textContent = timeText;
  }
  
  if (blockedCount !== undefined) {
    const countText = `${blockedCount} times`;
    if (UIElements.blockedCount) UIElements.blockedCount.textContent = countText;
  }
}

// Duration Picker Functions
/**
 * Get currently selected duration from scroll position
 * @param {HTMLElement} pickerEl - Duration picker element
 * @param {NodeList} optionsEl - Duration option elements
 */
function getSelectedDuration(pickerEl, optionsEl) {
  if (!pickerEl || !optionsEl) return null;
  
  const wrapperEl = pickerEl.parentElement;
  if (!wrapperEl) return null;
  
  const wrapperRect = wrapperEl.getBoundingClientRect();
  const wrapperCenterY = wrapperRect.top + wrapperRect.height / 2;
  
  let closestOption = null;
  let minDistance = Infinity;
  
  optionsEl.forEach((option) => {
    const optionRect = option.getBoundingClientRect();
    const optionCenterY = optionRect.top + optionRect.height / 2;
    const distance = Math.abs(optionCenterY - wrapperCenterY);
    
    if (distance < minDistance) {
      minDistance = distance;
      closestOption = option;
    }
  });
  
  if (closestOption) {
    return parseInt(closestOption.dataset.minutes);
  }
  return null;
}

/**
 * Update option colors based on distance from center focus zone
 * @param {HTMLElement} pickerEl - Duration picker element
 * @param {NodeList} optionsEl - Duration option elements
 */
function updateOptionColors(pickerEl, optionsEl) {
  if (!pickerEl || !optionsEl) return;
  
  const wrapperEl = pickerEl.parentElement;
  if (!wrapperEl) return;
  
  const wrapperRect = wrapperEl.getBoundingClientRect();
  const wrapperCenterY = wrapperRect.top + wrapperRect.height / 2;
  
  const mainColor = { r: 26, g: 26, b: 26 }; // #1a1a1a
  const secondaryColor = { r: 166, g: 166, b: 166 }; // #A6A6A6
  const focusZoneSize = 40 * 0.6; // 24px
  
  optionsEl.forEach((option) => {
    const optionRect = option.getBoundingClientRect();
    const optionCenterY = optionRect.top + optionRect.height / 2;
    const distanceFromCenter = Math.abs(optionCenterY - wrapperCenterY);
    
    let intensity = Math.min(distanceFromCenter / focusZoneSize, 1);
    intensity = intensity * intensity; // Quadratic easing
    
    const r = Math.round(mainColor.r + (secondaryColor.r - mainColor.r) * intensity);
    const g = Math.round(mainColor.g + (secondaryColor.g - mainColor.g) * intensity);
    const b = Math.round(mainColor.b + (secondaryColor.b - mainColor.b) * intensity);
    
    option.style.color = `rgb(${r}, ${g}, ${b})`;
  });
}

/**
 * Scroll to specific duration
 * @param {number} minutes - Duration in minutes
 * @param {HTMLElement} pickerEl - Duration picker element
 * @param {NodeList} optionsEl - Duration option elements
 */
function scrollToDuration(minutes, pickerEl, optionsEl) {
  if (!pickerEl || !optionsEl) return;
  
  const option = Array.from(optionsEl).find(
    opt => parseInt(opt.dataset.minutes) === minutes
  );
  
  if (option) {
    option.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'nearest'
    });
    
    setTimeout(() => {
      updateOptionColors(pickerEl, optionsEl);
    }, 100);
  }
}

/**
 * Toggle duration picker visibility
 * @param {boolean} show - Whether to show the picker
 * @param {HTMLElement} pickerEl - Duration picker element (optional)
 * @param {NodeList} optionsEl - Duration option elements (optional)
 */
function toggleDurationPicker(show, pickerEl = null, optionsEl = null) {
  if (!countdownText || !UIElements.durationPickerContainer) return;
  
  if (show) {
    // 显示滚轮：隐藏时间文本
    if (countdownText) {
      countdownText.style.display = 'none';
    }
    if (UIElements.durationPickerContainer) {
      UIElements.durationPickerContainer.classList.remove('hidden');
    }
    
    // 如果提供了 pickerEl 和 optionsEl，滚动到当前保存的时长位置
    if (pickerEl && optionsEl) {
      chrome.storage.local.get(['focusDuration'], (result) => {
        const savedDuration = result.focusDuration || 25;
        scrollToDuration(savedDuration, pickerEl, optionsEl);
        setTimeout(() => {
          updateOptionColors(pickerEl, optionsEl);
        }, 200);
      });
    }
  } else {
    // 隐藏滚轮：显示时间文本
    if (countdownText) {
      countdownText.style.display = 'flex';
    }
    if (UIElements.durationPickerContainer) {
      UIElements.durationPickerContainer.classList.add('hidden');
    }
  }
}

/**
 * Update countdown display based on selected duration (when stopped)
 */
function updateCountdownDisplayFromDuration() {
  chrome.storage.local.get(['focusDuration'], (result) => {
    const minutes = result.focusDuration || 25;
    if (countdownText) {
      countdownText.textContent = `${String(minutes).padStart(2, '0')}:00`;
    }
  });
}

/**
 * Initialize duration picker
 * @param {HTMLElement} pickerEl - Duration picker element
 * @param {NodeList} optionsEl - Duration option elements
 * @param {Function} onDurationChange - Callback when duration changes
 */
function initializeDurationPicker(pickerEl, optionsEl, onDurationChange) {
  if (!pickerEl || !optionsEl || optionsEl.length === 0) {
    return;
  }
  
  chrome.storage.local.get(['focusDuration'], (result) => {
    const savedDuration = result.focusDuration || 25;
    scrollToDuration(savedDuration, pickerEl, optionsEl);
    setTimeout(() => {
      updateOptionColors(pickerEl, optionsEl);
    }, 200);
    updateCountdownDisplayFromDuration();
  });
  
  let scrollTimeout;
  let animationFrameId = null;
  let lastScrollTime = 0;
  
  pickerEl.addEventListener('scroll', () => {
    const now = Date.now();
    lastScrollTime = now;
    
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
    
    animationFrameId = requestAnimationFrame(() => {
      updateOptionColors(pickerEl, optionsEl);
    });
    
    // 清除之前的超时
    clearTimeout(scrollTimeout);
    
    // 设置新的超时：500ms内无滚动操作则自动选择当前停留位置的时间
    scrollTimeout = setTimeout(() => {
      // 检查是否在超时期间有新的滚动（用户可能继续滚动）
      const timeSinceLastScroll = Date.now() - lastScrollTime;
      // 如果距离最后一次滚动已经超过500ms，则自动选择
      if (timeSinceLastScroll >= 500) {
        const selected = getSelectedDuration(pickerEl, optionsEl);
        if (selected) {
          updateOptionColors(pickerEl, optionsEl);
          chrome.storage.local.set({ focusDuration: selected });
          if (countdownText) {
            countdownText.textContent = `${String(selected).padStart(2, '0')}:00`;
          }
          // 滚动选择后，隐藏滚轮，显示时间文本
          toggleDurationPicker(false);
          if (onDurationChange) {
            onDurationChange(selected);
          }
        }
      }
    }, 500); // 500ms超时
  });
  
  optionsEl.forEach(option => {
    option.addEventListener('click', () => {
      // 清除滚动超时，避免与点击选择冲突
      clearTimeout(scrollTimeout);
      
      const minutes = parseInt(option.dataset.minutes);
      scrollToDuration(minutes, pickerEl, optionsEl);
      chrome.storage.local.set({ focusDuration: minutes });
      if (countdownText) {
        countdownText.textContent = `${String(minutes).padStart(2, '0')}:00`;
      }
      setTimeout(() => {
        updateOptionColors(pickerEl, optionsEl);
      }, 100);
      toggleDurationPicker(false);
      if (onDurationChange) {
        onDurationChange(minutes);
      }
    });
  });
}

// Pomodoro UI Updates
/**
 * Update pomodoro cycle indicator (tomato emojis)
 */
function updatePomodoroCycleIndicator(pomodoroState) {
  if (!pomodoroState || !tomatoEmojis || tomatoEmojis.length !== 4) {
    tomatoEmojis?.forEach(tomato => {
      if (tomato) {
        tomato.classList.remove('completed', 'active');
        tomato.style.opacity = '0.5';
      }
    });
    return;
  }
  
  const { session_type, current_cycle, status } = pomodoroState;
  
  tomatoEmojis.forEach(tomato => {
    if (tomato) {
      tomato.classList.remove('completed', 'active');
      tomato.style.opacity = '0.5';
    }
  });
  
  if (status === 'PAUSED') {
    if (session_type === 'FOCUS') {
      for (let i = 0; i < current_cycle; i++) {
        if (tomatoEmojis[i]) {
          tomatoEmojis[i].classList.add('completed');
          tomatoEmojis[i].style.opacity = '1';
        }
      }
      if (tomatoEmojis[current_cycle] && current_cycle < 4) {
        tomatoEmojis[current_cycle].classList.remove('active');
        tomatoEmojis[current_cycle].classList.add('completed');
        tomatoEmojis[current_cycle].style.opacity = '1';
      }
    } else if (session_type === 'BREAK' && current_cycle < 4) {
      for (let i = 0; i < current_cycle; i++) {
        if (tomatoEmojis[i]) {
          tomatoEmojis[i].classList.add('completed');
          tomatoEmojis[i].style.opacity = '1';
        }
      }
    }
    return;
  }
  
  if (session_type === 'BREAK' && current_cycle === 4) {
    tomatoEmojis.forEach(tomato => {
      if (tomato) {
        tomato.classList.add('completed');
        tomato.style.opacity = '1';
      }
    });
    return;
  }
  
  if (session_type === 'FOCUS') {
    for (let i = 0; i < current_cycle; i++) {
      if (tomatoEmojis[i]) {
        tomatoEmojis[i].classList.add('completed');
        tomatoEmojis[i].style.opacity = '1';
      }
    }
    
    if (tomatoEmojis[current_cycle] && current_cycle < 4) {
      tomatoEmojis[current_cycle].classList.add('active');
      tomatoEmojis[current_cycle].style.opacity = '1';
    }
  }
  
  if (session_type === 'BREAK' && current_cycle < 4) {
    for (let i = 0; i < current_cycle; i++) {
      if (tomatoEmojis[i]) {
        tomatoEmojis[i].classList.add('completed');
        tomatoEmojis[i].style.opacity = '1';
      }
    }
  }
}

/**
 * Update progress bar SVG based on progress (0 to 1)
 * @param {number} progress - Progress value from 0 to 1
 * @param {Object} pomodoroState - Current pomodoro state
 */
function updateProgressBar(progress, pomodoroState) {
  if (!countdownProgressCircle || !UIElements.countdownDisplay) {
    return;
  }
  
  const circumference = 2 * Math.PI * 48; // 301.593
  const offset = circumference * (1 - progress);
  
  countdownProgressCircle.style.strokeDashoffset = offset;
  
  const opacity = 0.2 + (progress * 0.8);
  UIElements.countdownDisplay.style.setProperty('--progress-opacity', opacity);
  
  if (pomodoroState) {
    const { session_type, status } = pomodoroState;
    
    if (session_type === 'BREAK') {
      UIElements.countdownDisplay.style.setProperty('--progress-color', '#95D22B');
    } else if (session_type === 'FOCUS' || status === 'PAUSED') {
      UIElements.countdownDisplay.style.setProperty('--progress-color', '#FE8277');
    } else {
      UIElements.countdownDisplay.style.setProperty('--progress-color', '#FE8277');
    }
  } else {
    UIElements.countdownDisplay.style.setProperty('--progress-color', '#FE8277');
  }
}

/**
 * Update countdown text
 * @param {string} timeString - Time string in MM:SS format
 */
function updateCountdownText(timeString) {
  if (countdownText && countdownText.textContent !== timeString) {
    countdownText.textContent = timeString;
  }
}

/**
 * Render pomodoro state in UI
 * @param {Object} pomodoroState - Current pomodoro state
 */
function renderPomodoroState(pomodoroState) {
  if (!pomodoroState) {
    updatePomodoroCycleIndicator(null);
    // 停止状态：默认只显示时间文本，不显示滚轮
    toggleDurationPicker(false);
    updateCountdownDisplayFromDuration();
    // 确保时间文本可点击
    if (countdownText) {
      countdownText.classList.add('clickable');
    }
    return;
  }
  
  const { session_type, status } = pomodoroState;
  
  updatePomodoroCycleIndicator(pomodoroState);
  
  // 判断是否为停止状态（倒计时终止后的等候状态）
  // 停止状态的条件：
  // 1. pomodoroState === null (从未开始或已停止)
  // 2. status === 'IDLE' (明确标记为停止)
  // 3. 倒计时已过期且不在运行中或暂停中
  //    status 可能值: 'FOCUS' | 'BREAK' | 'PAUSED' | 'IDLE'
  const now = Date.now();
  const isStopped = !pomodoroState || 
                    status === 'IDLE' || 
                    (pomodoroState.target_end_time && 
                     pomodoroState.target_end_time < now &&
                     status !== 'FOCUS' &&
                     status !== 'BREAK' &&
                     status !== 'PAUSED');
  
  if (isStopped) {
    // 停止状态：默认只显示时间文本，不显示滚轮
    toggleDurationPicker(false);
    updateCountdownDisplayFromDuration();
    // 确保时间文本可点击
    if (countdownText) {
      countdownText.classList.add('clickable');
    }
  } else {
    // 运行中或暂停中：隐藏滚轮，时间文本不可点击
    toggleDurationPicker(false);
    if (countdownText) {
      countdownText.classList.remove('clickable');
    }
  }
  
  if (status === 'PAUSED') {
    if (UIElements.timerStatusTitle) {
      UIElements.timerStatusTitle.textContent = 'Paused';
      UIElements.timerStatusTitle.style.display = 'block';
    }
  } else if (session_type === 'FOCUS') {
    if (UIElements.timerStatusTitle) {
      UIElements.timerStatusTitle.textContent = 'Focusing';
      UIElements.timerStatusTitle.style.display = 'block';
    }
  } else if (session_type === 'BREAK') {
    if (UIElements.timerStatusTitle) {
      UIElements.timerStatusTitle.textContent = 'Break';
      UIElements.timerStatusTitle.style.display = 'block';
    }
  }
  
  if (status === 'PAUSED') {
    if (UIElements.focusActions) UIElements.focusActions.classList.add('hidden');
    if (UIElements.breakActions) UIElements.breakActions.classList.add('hidden');
    if (UIElements.stoppedActions) UIElements.stoppedActions.classList.add('hidden');
    if (UIElements.pausedActions) UIElements.pausedActions.classList.remove('hidden');
  } else if (session_type === 'FOCUS') {
    if (UIElements.breakActions) UIElements.breakActions.classList.add('hidden');
    if (UIElements.pausedActions) UIElements.pausedActions.classList.add('hidden');
    if (UIElements.stoppedActions) UIElements.stoppedActions.classList.add('hidden');
    if (UIElements.focusActions) UIElements.focusActions.classList.remove('hidden');
  } else if (session_type === 'BREAK') {
    if (UIElements.focusActions) UIElements.focusActions.classList.add('hidden');
    if (UIElements.pausedActions) UIElements.pausedActions.classList.add('hidden');
    if (UIElements.stoppedActions) UIElements.stoppedActions.classList.add('hidden');
    if (UIElements.breakActions) UIElements.breakActions.classList.remove('hidden');
  }
  
  // Update countdown text and progress bar based on current state
  if (pomodoroState.target_end_time && pomodoroState.start_time) {
    // If paused, use time_left_ms if available, otherwise calculate from target_end_time
    const remaining = (pomodoroState.status === 'PAUSED' && pomodoroState.time_left_ms !== undefined)
      ? Math.max(0, pomodoroState.time_left_ms)
      : Math.max(0, pomodoroState.target_end_time - Date.now());
    const totalDuration = pomodoroState.target_end_time - pomodoroState.start_time;
    
    if (totalDuration > 0) {
      // Calculate progress using the utility function
      const progress = calculateProgress(pomodoroState.start_time, pomodoroState.target_end_time, pomodoroState);
      updateProgressBar(progress, pomodoroState);
      
      // Update countdown text for both active and paused states
      const timeString = formatCountdownTime(remaining);
      updateCountdownText(timeString);
    }
  }
}

