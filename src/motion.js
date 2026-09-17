export const IDLE_DELAY = 3000;

export function canAutoRotate({ paused, dragging, blocked, target, resumeAt }, now) {
  return !paused && !dragging && !blocked && !target && now >= resumeAt;
}
