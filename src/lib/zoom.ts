/** Camera distance to aim for after a zoom request, kept inside the controls' limits. */
export function zoomGoal(current: number, factor: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, current * factor));
}

/** One frame of easing from the current distance toward the goal; snaps once within half a metre. */
export function easeDistance(distance: number, goal: number, deltaSeconds: number): number {
  const next = distance + (goal - distance) * Math.min(1, deltaSeconds * 12);
  return Math.abs(goal - next) < 0.5 ? goal : next;
}

/**
 * Whether a wheel event should zoom the 3D view. Plain scrolling scrolls the
 * page; Ctrl or ⌘ + scroll zooms. Trackpad pinches arrive as Ctrl + wheel, so
 * they zoom too.
 */
export const wheelZooms = (e: { ctrlKey: boolean; metaKey: boolean }) => e.ctrlKey || e.metaKey;

/** The modifier key to name in hints: ⌘ on Apple devices, Ctrl elsewhere. */
export function zoomModifier(userAgent: string): string {
  return /Mac|iPhone|iPad|iPod/.test(userAgent) ? '⌘' : 'Ctrl';
}
