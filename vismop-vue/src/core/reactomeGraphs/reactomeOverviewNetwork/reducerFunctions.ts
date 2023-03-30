import OverviewGraph from './overviewNetwork';
import { Attributes } from 'graphology-types';
import { overviewColors } from '@/core/colors';

/**
 * node reducer function applying reduction function for specific scenarios
 *
 * @param node Node name
 * @param data Node Attributes
 * @returns reduced Attributes
 */
export function nodeReducer(
  this: OverviewGraph,
  node: string,
  data: Attributes
): Attributes {
  if (this.renderer) {
    // handle lod detail

    const hidden =
      data.filterHidden ||
      data.zoomHidden ||
      data.clusterHidden ||
      data.hierarchyHidden;
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

    const lodImage = lodCondition ? data.imageHighDetail : data.imageLowDetail;

    // handle node size

    const nodeSize =
      this.highlightedCenterHover === node ||
      this.highlighedNodesHover.has(node) ||
      this.currentPathway === node.replace('path:', '')
        ? data.nonHoverSize + 4
        : data.nonHoverSize;

    if (
      this.currentPathway === node.replace('path:', '') ||
      this.highlightedCenterHover === node
    ) {
      return {
        ...data,
        color: overviewColors.selected,
        zindex: 1,
        size: nodeSize,
        image: lodImage,
        hidden: hidden,
      };
    }
    if (this.pathwaysContainingIntersection.includes(node.split('_')[0])) {
      return {
        ...data,
        color: overviewColors.intersection,
        zindex: 1,
        size: nodeSize,
        image: lodImage,
        hidden: hidden,
      };
    }
    if (this.pathwaysContainingUnion.includes(node.split('_')[0])) {
      return {
        ...data,
        color: overviewColors.union,
        zindex: 1,
        size: nodeSize,
        image: lodImage,
        hidden: hidden,
      };
    }
    if (this.highlighedNodesHover.has(node)) {
      return {
        ...data,
        color: overviewColors.highlight,
        zIndex: 1,
        size: nodeSize,
        image: lodImage,
        hidden: hidden,
      };
    }
    if (this.highlightedNodesClick.has(node)) {
      return {
        ...data,
        color: overviewColors.highlight,
        zIndex: 1,
        size: nodeSize,
        image: lodImage,
        hidden: hidden,
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
  this: OverviewGraph,
  edge: string,
  data: Attributes
): Attributes {
  if (this.renderer) {
    if (this.highlighedEdgesHover.has(edge)) {
      return {
        ...data,
        color: overviewColors.edgesHighlight,
        size: 4,
        zIndex: 1,
        hidden: false,
      };
    }
    if (this.highlightedEdgesClick.has(edge)) {
      return {
        ...data,
        color: overviewColors.edgesHighlight,
        size: 1,
        zIndex: 1,
        hidden: false,
      };
    }
    return {
      ...data,
      hidden: data.hierarchyHidden ? true : data.hidden,
      color: overviewColors.edgesHighlight,
    };
  } else return data;
}
