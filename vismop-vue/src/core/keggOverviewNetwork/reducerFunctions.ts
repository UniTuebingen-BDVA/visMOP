import overviewGraph from './overviewNetwork';
import { Attributes } from 'graphology-types';

/**
 * node reducer function applying reduction function for specific scenarios
 *
 * @param node Node name
 * @param data Node Attributes
 * @returns reduced Attributes
 */
export function nodeReducer(
  this: overviewGraph,
  node: string,
  data: Attributes
): Attributes {
  if (this.renderer) {
    // handle lod detail

    const hidden = data.hidden;
    let lodCondition = false;
    let xDisplay: number | undefined = -100;
    let yDisplay: number | undefined = -100;

    const currentView = this.renderer.viewRectangle();
    xDisplay = this.renderer.getNodeDisplayData(node)?.x;
    yDisplay = this.renderer.getNodeDisplayData(node)?.y;

    if (!xDisplay) {
      xDisplay = -100;
    }
    if (!yDisplay) {
      yDisplay = -100;
    }
    lodCondition =
      this.renderer.getCamera().ratio < 0.4 &&
      xDisplay >= currentView.x1 &&
      xDisplay <= currentView.x2 &&
      yDisplay >= currentView.y1 - currentView.height &&
      yDisplay <= currentView.y2;

    const lodImage = lodCondition ? data.imageHighRes : data.imageLowRes;

    // handle node size

    const nodeSize =
      this.highlightedCenterHover === node ||
      this.highlighedNodesHover.has(node) ||
      this.currentPathway === node.replace('path:', '')
        ? data.nonHoverSize + 10
        : data.nonHoverSize;

    // shortest Path
    if (this.shortestPathNodes?.length > 0) {
      if (this.shortestPathClick.includes(node)) {
        return {
          ...data,
          color: 'rgba(255,0,255,1.0)',
          zIndex: 1,
          size: data.size + 5,
          image: lodImage,
        };
      }
      if (this.shortestPathNodes.includes(node)) {
        return {
          ...data,
          color: 'rgba(255,180,255,1.0)',
          zIndex: 1,
          size: data.nonHoverSize,
          image: lodImage,
        };
      } else {
        return {
          ...data,
          color: 'rgba(255,255,255,1.0)',
          size: data.nonHoverSize - 5,
          image: lodImage,
        };
      }
    }
    if (this.shortestPathClick.includes(node)) {
      return {
        ...data,
        color: 'rgba(255,0,255,1.0)',
        zIndex: 1,
        size: data.nonHoverSize + 5,
        image: lodImage,
      };
    }
    if (
      this.currentPathway === node.replace('path:', '') ||
      this.highlightedCenterHover === node
    ) {
      return {
        ...data,
        color: 'rgba(255,0,0,1.0)',
        zIndex: 1,
        size: nodeSize,
        image: lodImage,
      };
    }
    if (
      this.pathwaysContainingIntersection.includes(node.replace('path:', ''))
    ) {
      return {
        ...data,
        color: 'rgba(0,255,0,1.0)',
        zIndex: 1,
        size: nodeSize,
        image: lodImage,
      };
    }
    if (this.pathwaysContainingUnion.includes(node.replace('path:', ''))) {
      return {
        ...data,
        color: 'rgba(0,0,255,1.0)',
        zIndex: 1,
        size: nodeSize,
        image: lodImage,
      };
    }
    if (this.highlighedNodesHover.has(node)) {
      return {
        ...data,
        color: 'rgba(255,200,200,1.0)',
        zIndex: 1,
        size: nodeSize,
        image: lodImage,
      };
    }
    if (this.highlighedNodesClick.has(node)) {
      return {
        ...data,
        color: 'rgba(255,200,200,1.0)',
        zIndex: 1,
        size: nodeSize,
        image: lodImage,
      };
    }
    return {
      ...data,
      hidden: hidden,
      image: lodImage,
    };
  } else {
    return data;
  }
}

/**
 *  Edge reducer function applying reduction function for specific scenarios
 *
 * @param edge edge name
 * @param data edge attributes
 * @returns reduced attributes
 */

export function edgeReducer(
  this: overviewGraph,
  edge: string,
  data: Attributes
): Attributes {
  if (this.renderer) {
    if (this.shortestPathNodes?.length > 0) {
      if (this.shortestPathEdges?.includes(edge)) {
        return {
          ...data,
          color: 'rgba(255,180,255,1.0)',
          zIndex: 1,
          size: 4,
        };
      } else {
        return { ...data, size: 1 };
      }
    }
    if (this.highlighedEdgesHover.has(edge)) {
      return { ...data, color: 'rgba(255,0,0,1.0)', size: 4, zIndex: 1 };
    }
    if (this.highlighedEdgesClick.has(edge)) {
      return { ...data, color: 'rgba(255,0,0,1.0)', size: 1, zIndex: 1 };
    }

    return data;
  } else return data;
}
