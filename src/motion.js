export function canAutoRotate({ blocked, target }) {
  return !blocked && !target;
}
