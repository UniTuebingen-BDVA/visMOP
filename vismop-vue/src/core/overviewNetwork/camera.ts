import Sigma from 'sigma';
import { PlainObject } from 'sigma/types';
import { animateNodes } from 'sigma/utils/animate';
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
 *  Defines behaviour for node animations triggered by the zoom level
 */
export function zoomLod(this: overviewGraph): void {
  //console.log( 'zoomBehaivour Last/Now: ',this.prevFrameZoom, this.camera.ratio);
  if (this.prevFrameZoom > this.lodRatio && this.camera.ratio < this.lodRatio) {
    if (this.cancelCurrentAnimation) this.cancelCurrentAnimation();
    const tarPositions: PlainObject<PlainObject<number>> = {};
    this.graph.forEachNode((node, attributes) => {
      tarPositions[node] = {
        x: attributes.layoutX,
        y: attributes.layoutY,
        size: attributes.isRoot
          ? overviewGraph.ROOT_DEFAULT_SIZE
          : overviewGraph.DEFAULT_SIZE,
        nonHoverSize: attributes.isRoot
          ? overviewGraph.ROOT_DEFAULT_SIZE
          : overviewGraph.DEFAULT_SIZE,
      };
    });
    this.cancelCurrentAnimation = animateNodes(this.graph, tarPositions, {
      duration: 2000,
      //easing: 'quadraticOut',
    });
    this.graph.forEachNode((node, attributes) => {
      attributes.hidden = false;
    });
  }
  if (this.prevFrameZoom < this.lodRatio && this.camera.ratio > this.lodRatio) {
    if (this.cancelCurrentAnimation) this.cancelCurrentAnimation();
    const tarPositions: PlainObject<PlainObject<number>> = {};
    this.graph.forEachNode((node, attributes) => {
      tarPositions[node] = {
        x: this.graph.getNodeAttribute(attributes.rootId, 'layoutX'),
        y: this.graph.getNodeAttribute(attributes.rootId, 'layoutY'),
        size: attributes.isRoot ? 30 : 0,
        nonHoverSize: attributes.isRoot ? 30 : 0,
      };
    });
    this.cancelCurrentAnimation = animateNodes(
      this.graph,
      tarPositions,
      {
        duration: 2000,
        easing: 'quadraticOut',
      },
      () => {
        this.graph.forEachNode((node, attributes) => {
          if (!attributes.isRoot) attributes.hidden = true;
        });
      }
    );
  }
  this.prevFrameZoom = this.camera.ratio;
}

/**
 * Resets camera zoom and position
 */
export function resetZoom(this: overviewGraph) {
  this.camera.animatedReset({ duration: 1000 });
}