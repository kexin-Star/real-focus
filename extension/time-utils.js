// Real Focus Assistant - Time Utilities

/**
 * Format time in milliseconds to HH:MM:SS string
 * @param {number} timeInMs - Time in milliseconds
 * @returns {string} Formatted time string (HH:MM:SS)
 */
function formatTime(timeInMs) {
  const hours = Math.floor(timeInMs / 3600000);
  const minutes = Math.floor((timeInMs % 3600000) / 60000);
  const seconds = Math.floor((timeInMs % 60000) / 1000);
  
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Format time in milliseconds to MM:SS string (for countdown)
 * @param {number} timeInMs - Time in milliseconds
 * @returns {string} Formatted time string (MM:SS)
 */
function formatCountdownTime(timeInMs) {
  const totalSeconds = Math.floor(timeInMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Calculate remaining time from target end time
 * @param {number} targetEndTime - Target end time timestamp
 * @param {Object} pomodoroState - Optional pomodoro state object (to check for PAUSED status)
 * @returns {number} Remaining time in milliseconds
 */
function getRemainingTime(targetEndTime, pomodoroState = null) {
  // If paused, use time_left_ms instead of calculating from target_end_time
  if (pomodoroState && pomodoroState.status === 'PAUSED' && pomodoroState.time_left_ms !== undefined) {
    return Math.max(0, pomodoroState.time_left_ms);
  }
  
  const now = Date.now();
  return Math.max(0, targetEndTime - now);
}

/**
 * Calculate progress (0 to 1) from start and end times
 * @param {number} startTime - Start time timestamp
 * @param {number} endTime - Target end time timestamp
 * @param {Object} pomodoroState - Optional pomodoro state object (to check for PAUSED status and original_duration)
 * @returns {number} Progress value from 0 to 1
 */
function calculateProgress(startTime, endTime, pomodoroState = null) {
  // If we have original_duration (from pause/resume), use it for accurate progress calculation
  // This ensures progress continues from where it was paused, not from 0
  let totalDuration;
  if (pomodoroState && pomodoroState.original_duration) {
    totalDuration = pomodoroState.original_duration;
  } else {
    totalDuration = endTime - startTime;
  }
  
  if (totalDuration <= 0) return 0;
  
  // If paused, use time_left_ms to calculate remaining time
  let remaining;
  if (pomodoroState && pomodoroState.status === 'PAUSED' && pomodoroState.time_left_ms !== undefined) {
    remaining = pomodoroState.time_left_ms;
  } else {
    const now = Date.now();
    remaining = endTime - now;
  }
  
  const elapsed = totalDuration - remaining;
  
  return Math.max(0, Math.min(1, elapsed / totalDuration));
}

