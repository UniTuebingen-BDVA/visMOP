import Sigma from 'sigma';
import overviewGraph from './overviewNetwork';

/**
 * Pans and zooms to the specified Node
 * @param {Sigma} renderer
 * @param {string} nodeKey
 */
function panZoomToTarget(
  renderer: Sigma,
  target: { x: number; y: number; ratio: number }
) {
  console.log('pantest', target);
  renderer.getCamera().animate(target, {
    easing: 'linear',
    duration: 1000,
  });
}

/**
 * Pans to the specified Node
 * @param {Sigma} renderer
 * @param {string} nodeKey
 */
function panToNode(renderer: Sigma, nodeKey: string): void {
  console.log('pantestNode', {
    ...(renderer.getNodeDisplayData(nodeKey) as { x: number; y: number }),
    ratio: 0.3,
  });
  panZoomToTarget(renderer, {
    ...(renderer.getNodeDisplayData(nodeKey) as { x: number; y: number }),
    ratio: 0.3,
  });
}

/**
 * Resets camera zoom and position
 */
export function resetZoom(this: overviewGraph) {
  this.camera.animatedReset({ duration: 1000 });
}
