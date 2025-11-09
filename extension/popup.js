// Real Focus Assistant - Popup Logic

// DOM Elements
const inputState = document.getElementById('input-state');
const focusedState = document.getElementById('focused-state');
const keywordsInput = document.getElementById('keywordsInput');
const startButton = document.getElementById('startButton');

// Timer elements
// ⚠️ 这些元素在 HTML 中不存在，已注释掉
// const focusedTimeDisplay = document.getElementById('focusedTimeDisplay');

// Display elements
const subjectDisplay = document.getElementById('subjectDisplay');
const currentSiteDisplay = document.getElementById('currentSiteDisplay');
const relevanceScoreDisplay = document.getElementById('relevanceScoreDisplay');
const statusDisplay = document.getElementById('statusDisplay');

// Loading indicators
const loadingIndicator = document.getElementById('loading-indicator');

// Pomodoro UI elements
const countdownDisplay = document.getElementById('countdownDisplay');
let countdownText = null;
let countdownProgressCircle = null;
const timerStatusTitle = document.getElementById('timerStatusTitle');
const focusActions = document.getElementById('focusActions');
const breakActions = document.getElementById('breakActions');
const pausedActions = document.getElementById('pausedActions');
const stoppedActions = document.getElementById('stoppedActions');

// Pomodoro cycle indicator elements
const pomodoroCycleIndicator = document.getElementById('pomodoroCycleIndicator');
const tomato0 = document.getElementById('tomato0');
const tomato1 = document.getElementById('tomato1');
const tomato2 = document.getElementById('tomato2');
const tomato3 = document.getElementById('tomato3');
const tomatoEmojis = [tomato0, tomato1, tomato2, tomato3];

// Action buttons
// const finishTaskButton = document.getElementById('finishTaskButton'); // 从 HTML 中移除，故删除引用
// const startBreakButton = document.getElementById('startBreakButton'); // 从 HTML 中移除，故删除引用
const doneBreakButton = document.getElementById('doneBreakButton');
// continueBreakButton 已移除
// 新增 Action buttons (对应新的 HTML ID)
const pauseFocusButton = document.getElementById('pauseFocusButton'); // 新的 Pause 按钮
const resumeFocusButton = document.getElementById('resumeFocusButton'); // 新的 Continue 按钮 (Resume)
const stopFocusButton = document.getElementById('stopFocusButton'); // 新的 Stop 按钮
const startToFocusButton = document.getElementById('startToFocusButton'); // Start to Focus 按钮

// Statistics elements
const todayFocusTime = document.getElementById('todayFocusTime');
const blockedCount = document.getElementById('blockedCount');

// State variables
let timerInterval = null;
let countdownInterval = null;
let startTime = null;
let elapsedTime = 0;
let isPaused = false;
let currentState = 'input'; // 'input', 'focused'
let pomodoroState = null; // Current pomodoro state

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  // Initialize countdown elements after DOM is loaded
  if (countdownDisplay) {
    countdownText = countdownDisplay.querySelector('.countdown-text');
    countdownProgressCircle = document.getElementById('countdownProgressCircle');
  }
  
  await loadSavedState();
  setupEventListeners();
  
  // If not in input state, sync state from Service Worker
  // This ensures data is fresh when popup reopens
  if (currentState !== 'input') {
    await syncPopupState();
  } else {
    // If in input state, just update current site
    await updateCurrentSite();
  }
});

// Load saved state from storage
async function loadSavedState() {
  try {
    const result = await chrome.storage.local.get(['focusKeywords', 'timerState', 'elapsedTime']);
    
    if (result.focusKeywords) {
      keywordsInput.value = result.focusKeywords;
      if (subjectDisplay) subjectDisplay.value = result.focusKeywords;
      
      // Restore timer state
      if (result.timerState === 'running') {
        elapsedTime = result.elapsedTime || 0;
        showFocusedState();
        startTimer();
        // Load pomodoro state if exists
        chrome.runtime.sendMessage({
          action: 'getPopupState',
          tabId: null,
          url: '',
          keywords: result.focusKeywords
        }, (response) => {
          if (response && response.success && response.data && response.data.pomodoroState) {
            pomodoroState = response.data.pomodoroState;
            renderPomodoroState();
            startCountdown();
          }
        });
      } else if (result.timerState === 'paused') {
        elapsedTime = result.elapsedTime || 0;
        showFocusedState();
        showPausedUI(); // Show paused UI within focused state
        updateTimerDisplay();
        // Load pomodoro state if exists
        chrome.runtime.sendMessage({
          action: 'getPopupState',
          tabId: null,
          url: '',
          keywords: result.focusKeywords
        }, (response) => {
          if (response && response.success && response.data && response.data.pomodoroState) {
            pomodoroState = response.data.pomodoroState;
            renderPomodoroState();
            startCountdown();
          }
        });
      }
    }
  } catch (error) {
    console.error('Error loading saved state:', error);
  }
}

// No longer needed - we only have one state container now

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

  // Pause button (新逻辑)
  if (pauseFocusButton) {
    pauseFocusButton.addEventListener('click', handlePause);
  }

  // Resume button (新逻辑: Continue)
  if (resumeFocusButton) {
    resumeFocusButton.addEventListener('click', handleResume);
  }
  
  // Stop button (新逻辑)
  if (stopFocusButton) {
    stopFocusButton.addEventListener('click', handleStopFocus);
  }

  // Edit subject buttons - click to focus input
  document.getElementById('editSubjectButton')?.addEventListener('click', () => {
    if (subjectDisplay) {
      subjectDisplay.focus();
      subjectDisplay.select();
    }
  });


// Handle Enter key in subject input to save
// Track IME composition state to prevent Enter key from triggering save during Chinese input
let isComposing = false;

if (subjectDisplay) {
  // [关键] 检查元素是否已获取成功
  console.log('Attaching keydown listener to subjectDisplay:', subjectDisplay !== null);
  
  // Track IME composition state (fallback for older browsers)
  subjectDisplay.addEventListener('compositionstart', () => {
    isComposing = true;
    console.log('IME composition started');
  });
  
  subjectDisplay.addEventListener('compositionend', () => {
    isComposing = false;
    console.log('IME composition ended');
  });
  
  subjectDisplay.addEventListener('keydown', async (e) => {
    // [调试日志] 立即打印，确认事件已触发
    console.log('Subject Input Keydown Event Fired. Key:', e.key, 'isComposing:', isComposing, 'e.isComposing:', e.isComposing); 

    if (e.key === 'Enter') {
      // 如果正在使用输入法（中文输入法等），不要处理回车键
      // 使用 e.isComposing（现代浏览器）或 isComposing（兼容性）来检测
      const composing = e.isComposing !== undefined ? e.isComposing : isComposing;
      
      if (composing) {
        console.log('Enter key ignored during IME composition');
        return;
      }
      
      e.preventDefault(); 
      
      // [核心修正] 使用 .value 获取 input 元素的值
      const value = subjectDisplay.value.trim(); 
      
      try {
        await handleSubjectChange(value);
      } catch (error) {
        console.error('Error saving subject:', error); 
      } finally {
        // [核心目的] 确保移除焦点
        subjectDisplay.blur(); 
        console.log('Subject Display Blur Called.'); 
      }
    }
  });
  
  // 保持 blur 监听器不变...
  subjectDisplay.addEventListener('blur', () => {
    handleSubjectChange(subjectDisplay.value);
  });
}


  // Pomodoro action buttons
  // finishTaskButton 和 startBreakButton 已从 HTML 中移除，事件监听器已删除
  // continueBreakButton 已移除
  if (doneBreakButton) {
    doneBreakButton.addEventListener('click', handleDoneBreak);
  }
  if (startToFocusButton) {
    startToFocusButton.addEventListener('click', handleStartToFocus);
  }
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
    
    // Initialize pomodoro state in background.js
    chrome.runtime.sendMessage({ 
      action: 'init_focus',
      keywords: keywords 
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error initializing focus:', chrome.runtime.lastError);
      } else if (response && response.success) {
        console.log('✅ Pomodoro state initialized');
        // Update local pomodoro state
        if (response.pomodoroState) {
          pomodoroState = response.pomodoroState;
          renderPomodoroState();
          startCountdown(); // Start the countdown timer
          updateStatistics(); // Update statistics display
        }
      }
    });
    
    // Update displays (subjectDisplay 是 input 元素，使用 .value 而不是 .textContent)
    if (subjectDisplay) subjectDisplay.value = keywords;
    
    // Reset timer
    elapsedTime = 0;
    startTime = Date.now();
    
    // Show focused state
    showFocusedState();
    
    // Hide stopped actions and show title when starting focus
    if (stoppedActions) stoppedActions.classList.add('hidden');
    if (timerStatusTitle) {
      timerStatusTitle.style.display = 'block';
    }
    
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

// Handle pause button click
function handlePause() {
  // 立即更新本地 pomodoro state 状态为 PAUSED（在清除 interval 之前）
  // 这样 updateCountdown 中的检查就能立即生效
  if (pomodoroState) {
    pomodoroState.status = 'PAUSED';
  }
  
  // Clear intervals (停止所有计时器)
  clearInterval(timerInterval);
  clearInterval(countdownInterval);
  timerInterval = null;
  countdownInterval = null;
  
  // Update UI (立即切换到暂停状态，避免延迟)
  showPausedState();
  updateTimerDisplay(); 

  // 向 Service Worker 发送暂停消息 (核心逻辑)
  chrome.runtime.sendMessage({ action: 'pause_focus' }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('Error pausing focus:', chrome.runtime.lastError);
    } else if (response && response.success) {
      console.log('✅ Focus paused');
      // 更新本地 pomodoro state 并更新 UI（使用服务器返回的完整状态）
      if (response.pomodoroState) {
        pomodoroState = response.pomodoroState;
        renderPomodoroState(); // 更新按钮显示
        updateStatistics(); // 更新统计数据（累加后的时间）
      }
      // 可以在此处同步状态，确保 UI 数据最新
      syncPopupState(); 
    }
  });
}

// Handle resume button click (对应 Continue 按钮)
function handleResume() {
  // 向 Service Worker 发送继续消息 (核心逻辑)
  chrome.runtime.sendMessage({ action: 'resume_focus' }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('Error resuming focus:', chrome.runtime.lastError);
    } else if (response && response.success) {
      console.log('✅ Focus resumed');
      
      // 更新本地 pomodoro state
      if (response.pomodoroState) {
        pomodoroState = response.pomodoroState;
        renderPomodoroState(); // 更新按钮显示
        startCountdown(); // 重新启动倒计时
        updateStatistics(); // 更新统计数据
      }
      
      // 切换 UI 状态并启动本地计时器
      showFocusedState();
      startTimer();
      
      // 恢复专注状态后，检查当前网站相关性
      checkSiteRelevance(); 
    }
  });
}

/**
 * Handle Stop button click (终止此次倒计时，重置倒计时，返回 Frame 1 等待重新开始)
 */
function handleStopFocus() {
  // 清除本地定时器
  if (timerInterval) clearInterval(timerInterval);
  if (countdownInterval) clearInterval(countdownInterval);
  timerInterval = null;
  countdownInterval = null;
  
  // 向 Service Worker 发送停止消息，清除所有持久化状态 (核心逻辑)
  chrome.runtime.sendMessage({ action: 'stop_focus' }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('Error stopping focus:', chrome.runtime.lastError);
    } else if (response && response.success) {
      console.log('✅ Focus session stopped and state cleared');
      
      // 重置本地变量
      pomodoroState = null;
      elapsedTime = 0;
      isPaused = false;
      updateTimerDisplay(); // 重置计时显示为 00:00:00
      updatePomodoroCycleIndicator(); // 重置番茄周期指示器
      
      // 保持在 Frame 2 (Focused State)，不返回 Frame 1
      // 确保 focused state 可见
      showFocusedState();
      
      // 显示 stopped state 的按钮，隐藏其他按钮和标题
      if (focusActions) focusActions.classList.add('hidden');
      if (breakActions) breakActions.classList.add('hidden');
      if (pausedActions) pausedActions.classList.add('hidden');
      if (stoppedActions) stoppedActions.classList.remove('hidden');
      
      // 隐藏状态标题
      if (timerStatusTitle) timerStatusTitle.style.display = 'none';
    }
  });
}

// Show input state
function showInputState() {
  inputState.classList.remove('hidden');
  focusedState.classList.add('hidden');
  currentState = 'input';
}

// Show focused state
function showFocusedState() {
  inputState.classList.add('hidden');
  focusedState.classList.remove('hidden');
  currentState = 'focused';
  
  // Update button visibility based on pomodoro state
  if (pomodoroState) {
    renderPomodoroState();
  }
}

// Show paused UI within focused state (no container switch)
function showPausedUI() {
  // Update status title to show "Paused"
  if (timerStatusTitle) {
    timerStatusTitle.textContent = 'Paused';
    timerStatusTitle.style.display = 'block';
  }
  
  // Show paused actions, hide others
  if (focusActions) focusActions.classList.add('hidden');
  if (breakActions) breakActions.classList.add('hidden');
  if (stoppedActions) stoppedActions.classList.add('hidden');
  if (pausedActions) pausedActions.classList.remove('hidden');
}

// Show paused state (now just updates UI within focused state)
function showPausedState() {
  // Ensure focused state is visible
  showFocusedState();
  // Show paused UI
  showPausedUI();
}

/**
 * Show loading indicator
 */
function showLoadingIndicator() {
  if (loadingIndicator) loadingIndicator.classList.remove('hidden');
}

/**
 * Hide loading indicator
 */
function hideLoadingIndicator() {
  if (loadingIndicator) loadingIndicator.classList.add('hidden');
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
    const storageResult = await chrome.storage.local.get(['focusKeywords', 'timerState', 'elapsedTime']);
    const keywords = storageResult.focusKeywords;
    
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
          if (currentSiteDisplay) currentSiteDisplay.textContent = displayUrl;
        } catch (e) {
          if (currentSiteDisplay) currentSiteDisplay.textContent = tab.url;
        }
        
        // Update subject/keywords
        // Only update if the input is not currently being edited (not focused)
        // This prevents overwriting user input when timer completes
        if (data.keywords) {
          if (subjectDisplay && document.activeElement !== subjectDisplay) {
            subjectDisplay.value = data.keywords;
          }
        }
        
        // Update relevance score
        const score = data.relevanceScore || 0;
        if (relevanceScoreDisplay) relevanceScoreDisplay.textContent = `${score}%`;
        updateScoreColor(score);
        
        // Update status
        const status = data.status || 'Stay';
        if (statusDisplay) statusDisplay.textContent = status;
        if (status === 'Stay') {
          if (statusDisplay) statusDisplay.className = 'status-display status-stay';
        } else {
          if (statusDisplay) statusDisplay.className = 'status-display status-block';
        }
        
        // Update timer if provided
        if (data.focusedTime !== undefined) {
          elapsedTime = data.focusedTime;
          updateTimerDisplay(data.focusedTime);
        }
        
        // Update pomodoro state if provided
        if (data.pomodoroState) {
          pomodoroState = data.pomodoroState;
          renderPomodoroState();
          startCountdown();
        }
        
        // Update statistics if provided
        if (data.todayFocusTime !== undefined) {
          const minutes = Math.floor(data.todayFocusTime / 60000);
          const timeText = minutes > 0 ? `${minutes}m` : '<1m';
          if (todayFocusTime) todayFocusTime.textContent = timeText;
        }
        if (data.blockedCount !== undefined) {
          const countText = `${data.blockedCount} times`;
          if (blockedCount) blockedCount.textContent = countText;
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
    
    // Update statistics periodically (every 10 seconds)
    if (Math.floor(elapsedTime / 1000) % 10 === 0) {
      updateStatistics();
    }
  }, 1000);
  
  updateTimerDisplay();
}

/**
 * Update statistics display (focus time and blocked count)
 */
async function updateStatistics() {
  try {
    const storageResult = await chrome.storage.local.get(['focusKeywords']);
    const keywords = storageResult.focusKeywords;
    
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
        
        // Update focus time
        if (data.todayFocusTime !== undefined) {
          const minutes = Math.floor(data.todayFocusTime / 60000);
          const timeText = minutes > 0 ? `${minutes}m` : '<1m';
          if (todayFocusTime) todayFocusTime.textContent = timeText;
        }
        
        // Update blocked count
        if (data.blockedCount !== undefined) {
          const countText = `${data.blockedCount} times`;
          if (blockedCount) blockedCount.textContent = countText;
        }
      }
    });
  } catch (error) {
    console.error('Error updating statistics:', error);
  }
}

/**
 * Update timer display with elapsed time
 * @param {number} totalTime - Total focused time in milliseconds (optional, uses elapsedTime if not provided)
 */
function updateTimerDisplay(totalTime = null) {
  const timeToDisplay = totalTime !== null ? totalTime : elapsedTime;
  const hours = Math.floor(timeToDisplay / 3600000);
  const minutes = Math.floor((timeToDisplay % 3600000) / 60000);
  const seconds = Math.floor((timeToDisplay % 60000) / 1000);
  
  const timeString = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  
  // ⚠️ 这些元素在 HTML 中不存在，已注释掉
  // if (focusedTimeDisplay) focusedTimeDisplay.textContent = timeString;
  // if (focusedTimeDisplayPaused) focusedTimeDisplayPaused.textContent = timeString;
}

// Update current site
async function updateCurrentSite() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url) {
      try {
        const url = new URL(tab.url);
        const displayUrl = url.hostname + url.pathname;
        if (currentSiteDisplay) currentSiteDisplay.textContent = displayUrl;
      } catch (e) {
        if (currentSiteDisplay) currentSiteDisplay.textContent = tab.url;
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
        
        // Update relevance score
        const score = data.relevance_score_percent || 0;
        if (relevanceScoreDisplay) relevanceScoreDisplay.textContent = `${score}%`;
        
        // Update score color based on value
        updateScoreColor(score);
        
        // Update status
        const status = data.status || 'Stay';
        if (statusDisplay) statusDisplay.textContent = status;
        
        // Update status color
        if (status === 'Stay') {
          if (statusDisplay) statusDisplay.className = 'status-display status-stay';
        } else {
          if (statusDisplay) statusDisplay.className = 'status-display status-block';
        }
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
  
  if (relevanceScoreDisplay) relevanceScoreDisplay.className = `score-display ${scoreClass}`;
}

// Edit subject - now handled by inline editing
function editSubject() {
  // This function is kept for compatibility but now subject can be edited inline
  if (subjectDisplay) {
    subjectDisplay.focus();
    subjectDisplay.select();
  }
}

// Handle subject change
async function handleSubjectChange(newKeywords) {
  const keywords = newKeywords.trim();
  if (!keywords) {
    return;
  }
  
  // Save to storage
  await chrome.storage.local.set({ focusKeywords: keywords });
  
  // Update display
  if (subjectDisplay) subjectDisplay.value = keywords;
  
  // Clear cache when keywords change
  chrome.runtime.sendMessage({ action: 'clearCache' }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('Error clearing cache:', chrome.runtime.lastError);
    } else {
      console.log('✅ Cache cleared after subject change');
    }
  });
  
  // Re-check current site relevance
  await checkSiteRelevance();
}

/**
 * Update pomodoro cycle indicator (tomato emojis)
 * Shows which focus sessions are completed, active, or pending
 */
function updatePomodoroCycleIndicator() {
  if (!pomodoroState || !tomatoEmojis || tomatoEmojis.length !== 4) {
    // Reset all to 50% opacity if no state
    tomatoEmojis.forEach(tomato => {
      if (tomato) {
        tomato.classList.remove('completed', 'active');
        tomato.style.opacity = '0.5';
      }
    });
    return;
  }
  
  const { session_type, current_cycle, status } = pomodoroState;
  
  // Reset all tomatoes first
  tomatoEmojis.forEach(tomato => {
    if (tomato) {
      tomato.classList.remove('completed', 'active');
      tomato.style.opacity = '0.5';
    }
  });
  
  // If paused, keep completed state but remove active (blinking) animation
  if (status === 'PAUSED') {
    // Show completed sessions up to current_cycle (if in focus) or current_cycle (if in break)
    if (session_type === 'FOCUS') {
      // Completed sessions (0 to current_cycle - 1)
      for (let i = 0; i < current_cycle; i++) {
        if (tomatoEmojis[i]) {
          tomatoEmojis[i].classList.add('completed');
          tomatoEmojis[i].style.opacity = '1';
        }
      }
      // Current session (current_cycle) - completed but not blinking
      if (tomatoEmojis[current_cycle] && current_cycle < 4) {
        tomatoEmojis[current_cycle].classList.remove('active');
        tomatoEmojis[current_cycle].classList.add('completed');
        tomatoEmojis[current_cycle].style.opacity = '1';
      }
    } else if (session_type === 'BREAK' && current_cycle < 4) {
      // Short break: show only completed sessions (not the next one)
      for (let i = 0; i < current_cycle; i++) {
        if (tomatoEmojis[i]) {
          tomatoEmojis[i].classList.add('completed');
          tomatoEmojis[i].style.opacity = '1';
        }
      }
    }
    return;
  }
  
  // Long break: all 4 tomatoes are completed (100% opacity)
  if (session_type === 'BREAK' && current_cycle === 4) {
    tomatoEmojis.forEach(tomato => {
      if (tomato) {
        tomato.classList.add('completed');
        tomato.style.opacity = '1';
      }
    });
    return;
  }
  
  // Focus session: show active tomato for current cycle
  if (session_type === 'FOCUS') {
    // Completed sessions (0 to current_cycle - 1)
    for (let i = 0; i < current_cycle; i++) {
      if (tomatoEmojis[i]) {
        tomatoEmojis[i].classList.add('completed');
        tomatoEmojis[i].style.opacity = '1';
      }
    }
    
    // Active session (current_cycle) - blinking
    if (tomatoEmojis[current_cycle] && current_cycle < 4) {
      tomatoEmojis[current_cycle].classList.add('active');
      tomatoEmojis[current_cycle].style.opacity = '1';
    }
    
    // Pending sessions (current_cycle + 1 to 3) remain at 50%
    // Already set above
  }
  
  // Short break: show only completed sessions (not the next one)
  if (session_type === 'BREAK' && current_cycle < 4) {
    // Completed sessions (0 to current_cycle - 1)
    // Note: current_cycle has already been incremented when entering break,
    // so we only show sessions 0 to current_cycle - 1 as completed
    for (let i = 0; i < current_cycle; i++) {
      if (tomatoEmojis[i]) {
        tomatoEmojis[i].classList.add('completed');
        tomatoEmojis[i].style.opacity = '1';
      }
    }
    // Pending sessions (current_cycle to 3) remain at 50%
  }
}

/**
 * Render pomodoro state in UI
 * This function updates the UI based on the current pomodoro session type
 * Implements M3-style status chip and button layout
 */
function renderPomodoroState() {
  if (!pomodoroState) {
    // Reset cycle indicator when no state
    updatePomodoroCycleIndicator();
    return;
  }
  
  const { session_type, status } = pomodoroState;
  
  // Update pomodoro cycle indicator
  updatePomodoroCycleIndicator();
  
  // Update status title based on session type and status
  if (status === 'PAUSED') {
    // Paused state
    if (timerStatusTitle) {
      timerStatusTitle.textContent = 'Paused';
      timerStatusTitle.style.display = 'block';
    }
  } else if (session_type === 'FOCUS') {
    // Focus session
    if (timerStatusTitle) {
      timerStatusTitle.textContent = 'Focusing';
      timerStatusTitle.style.display = 'block'; // Show title
    }
  } else if (session_type === 'BREAK') {
    // Break session
    if (timerStatusTitle) {
      timerStatusTitle.textContent = 'Break';
      timerStatusTitle.style.display = 'block'; // Show title
    }
  }
  
  // Show/hide action buttons based on session type and status
  if (status === 'PAUSED') {
    // Paused state: show resume and stop buttons
    if (focusActions) focusActions.classList.add('hidden');
    if (breakActions) breakActions.classList.add('hidden');
    if (stoppedActions) stoppedActions.classList.add('hidden');
    if (pausedActions) pausedActions.classList.remove('hidden');
  } else if (session_type === 'FOCUS') {
    // Focus session: show pause button
    if (breakActions) breakActions.classList.add('hidden');
    if (pausedActions) pausedActions.classList.add('hidden');
    if (stoppedActions) stoppedActions.classList.add('hidden');
    if (focusActions) focusActions.classList.remove('hidden');
  } else if (session_type === 'BREAK') {
    // Break session: show break action buttons
    if (focusActions) focusActions.classList.add('hidden');
    if (pausedActions) pausedActions.classList.add('hidden');
    if (stoppedActions) stoppedActions.classList.add('hidden');
    if (breakActions) breakActions.classList.remove('hidden');
  }
  
  // Update progress bar color when state changes
  // Calculate current progress to update color immediately
  if (pomodoroState.target_end_time && pomodoroState.start_time) {
    const now = Date.now();
    const remaining = pomodoroState.target_end_time - now;
    const totalDuration = pomodoroState.target_end_time - pomodoroState.start_time;
    if (totalDuration > 0) {
      const progress = Math.max(0, Math.min(1, (totalDuration - remaining) / totalDuration));
      updateProgressBar(progress);
    }
  }
}

/**
 * Start countdown timer based on target_end_time
 */
function startCountdown() {
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }
  
  if (!pomodoroState || !pomodoroState.target_end_time) {
    return;
  }
  
  const updateCountdown = () => {
    // Check if pomodoro state exists
    if (!pomodoroState) {
      if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
      }
      return;
    }
    
    // If paused, update progress once and stop the interval
    if (pomodoroState.status === 'PAUSED') {
      const now = Date.now();
      const remaining = pomodoroState.target_end_time - now;
      const totalDuration = pomodoroState.target_end_time - pomodoroState.start_time;
      
      if (totalDuration > 0) {
        const progress = Math.max(0, Math.min(1, (totalDuration - remaining) / totalDuration));
        updateProgressBar(progress);
      }
      
      if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
      }
      return;
    }
    
    const now = Date.now();
    const remaining = pomodoroState.target_end_time - now;
    const totalDuration = pomodoroState.target_end_time - pomodoroState.start_time;
    
    if (remaining <= 0) {
      // Time's up - trigger automatic transition
      if (countdownText) countdownText.textContent = '00:00';
      // Update progress to 100% to ensure circle is fully drawn
      updateProgressBar(1.0);
      if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
      }
      
      // Trigger automatic transition based on session type
      if (pomodoroState) {
        if (pomodoroState.session_type === 'FOCUS' && pomodoroState.status !== 'PAUSED') {
          // Focus session ended - automatically transition to break
          chrome.runtime.sendMessage({ action: 'end_focus' }, (response) => {
            if (response && response.success) {
              console.log('✅ Focus session ended, transitioning to break');
              // Sync state to update UI
              syncPopupState();
            }
          });
        } else if (pomodoroState.session_type === 'BREAK') {
          // Break session ended - automatically transition to focus
          chrome.runtime.sendMessage({ action: 'end_break' }, (response) => {
            if (response && response.success) {
              console.log('✅ Break session ended, transitioning to focus');
              // Sync state to update UI
              syncPopupState();
            }
          });
        }
      }
      return;
    }
    
    // Calculate progress (0 to 1) - update frequently for smooth animation
    const progress = Math.max(0, Math.min(1, (totalDuration - remaining) / totalDuration));
    updateProgressBar(progress);
    
    // Update text only when seconds change (to avoid unnecessary DOM updates)
    const currentSeconds = Math.floor(remaining / 1000);
    const minutes = Math.floor(currentSeconds / 60);
    const seconds = currentSeconds % 60;
    const timeString = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    
    // Only update text if it changed (avoid flickering)
    if (countdownText && countdownText.textContent !== timeString) {
      countdownText.textContent = timeString;
    }
  };
  
  // Update immediately
  updateCountdown();
  
  // Update every 50ms for smooth animation (20fps)
  // This ensures the progress bar animates smoothly, especially in the last second
  countdownInterval = setInterval(updateCountdown, 50);
}

/**
 * Update progress bar SVG based on progress (0 to 1)
 * @param {number} progress - Progress value from 0 to 1
 */
function updateProgressBar(progress) {
  if (!countdownProgressCircle || !countdownDisplay) {
    return;
  }
  
  // Circle circumference: 2 * π * radius (48 for outer circle)
  const circumference = 2 * Math.PI * 48; // 301.593
  
  // Calculate stroke-dashoffset
  // When progress is 0, offset should be full circumference (hidden)
  // When progress is 1, offset should be 0 (fully visible)
  const offset = circumference * (1 - progress);
  
  // Update stroke-dashoffset
  countdownProgressCircle.style.strokeDashoffset = offset;
  
  // Update opacity based on progress
  // Start at 20% opacity when progress is 0, increase to 100% when progress is 1
  const opacity = 0.2 + (progress * 0.8); // Range: 0.2 to 1.0
  countdownDisplay.style.setProperty('--progress-opacity', opacity);
  
  // Update color based on session type and status
  if (pomodoroState) {
    const { session_type, status } = pomodoroState;
    
    if (session_type === 'BREAK') {
      // Break state: use #95D22B
      countdownDisplay.style.setProperty('--progress-color', '#95D22B');
    } else if (session_type === 'FOCUS' || status === 'PAUSED') {
      // Focus or Paused state: use #FE8277
      countdownDisplay.style.setProperty('--progress-color', '#FE8277');
    } else {
      // Default: use #FE8277
      countdownDisplay.style.setProperty('--progress-color', '#FE8277');
    }
  } else {
    // Default color when no state
    countdownDisplay.style.setProperty('--progress-color', '#FE8277');
  }
}

/**
 * Handle finish task button click
 */
function handleFinishTask() {
  chrome.runtime.sendMessage({
    action: 'mark_task_complete',
    next: 'break' // Automatically start break after marking complete
  }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('Error marking task complete:', chrome.runtime.lastError);
    } else if (response && response.success) {
      console.log('✅ Task marked as complete');
      // If next is 'break', start break automatically
      if (response.next === 'break') {
        handleStartBreak();
      } else {
        // Refresh state
        syncPopupState();
      }
    }
  });
}

/**
 * Handle start break button click
 */
function handleStartBreak() {
  chrome.runtime.sendMessage({
    action: 'start_break'
  }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('Error starting break:', chrome.runtime.lastError);
    } else if (response && response.success) {
      console.log('✅ Break started');
      // Refresh state
      syncPopupState();
    }
  });
}

/**
 * Handle done break button click (end break and start next focus session)
 */
function handleDoneBreak() {
  chrome.runtime.sendMessage({
    action: 'end_break'
  }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('Error ending break:', chrome.runtime.lastError);
    } else if (response && response.success) {
      console.log('✅ Break ended, starting next focus session');
      // Refresh state to update UI
      syncPopupState();
    }
  });
}

/**
 * Handle Start to Focus button click (from stopped state)
 */
function handleStartToFocus() {
  // Get keywords from subject display or storage
  const keywords = subjectDisplay?.value?.trim() || keywordsInput?.value?.trim();
  
  if (!keywords) {
    // If no keywords, focus on subject input
    if (subjectDisplay) {
      subjectDisplay.focus();
    }
    return;
  }
  
  // Use the same logic as handleStartFocus to start a new focus session
  handleStartFocus();
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

