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
      this.highlightedNodesHover.has(node) ||
      this.currentPathway === node.replace('path:', '')
        ? data.nonHoverSize + 4
        : data.nonHoverSize;
    let color = 'white';
    if (
      this.highlightedCenterHover === node ||
      this.currentPathway === node.replace('path:', '')
    ) {
      color = overviewColors.selected;
    } else if (
      this.highlightedNodesHover.has(node) ||
      this.highlightedNodesClick.has(node)
    ) {
      color = overviewColors.highlight;
    } else if (
      this.pathwaysContainingIntersection.includes(node.split('_')[0])
    ) {
      color = overviewColors.intersection;
    } else if (this.pathwaysContainingUnion.includes(node.split('_')[0])) {
      color = overviewColors.union;
    }

    return {
      ...data,
      color: color,
      zIndex: 1,
      nodeSize: nodeSize,
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
    const hidden =
      this.highlightedEdgesHover.has(edge) ||
      this.highlightedEdgesClick.has(edge) ||
      this.showAllEdges
        ? false
        : true;
    const width = this.highlightedEdgesHover.has(edge) ? 4 : 1;

    const color = overviewColors.edgesHighlight;
    return {
      ...data,
      hidden: hidden,
      color: color,
      size: width,
      zIndex: 1,
    };
  } else return data;
}
