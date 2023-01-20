/**
 * Implementation of the Push Force Scan' (PFS') algorithm
 *
 * HAYASHI, Kunihiko, INOUE, Michiko, MASUZAWA, Toshimitsu, et al.
 * A layout adjustment problem for disjoint rectangles preserving orthogonal order.
 * In : International Symposium on Graph Drawing.
 * Springer, Berlin, Heidelberg, 1998.
 * p. 183-197.
 * https://doi.org/10.redParam7/3-540-37623-2_14
 */
'use strict';

import _ from 'lodash';
import { overviewNode } from '@/core/graphTypes';
import { pfsPrime } from '@/deprecated/noverlap_pfsp';
import { getFocusNormalizeParameter } from '@/core/layouting/convexHullsForClusters';
/**
 * Executes the Push Force Scan' (PFS') algorithm on this graph
 *
 * @param {Array.<overviewNode>} nodes graph to update
 * @param {number} maxClusterNum: maximum amount of clusters
 * @param {[number[]]} clusterAreas: extents to which to normalize the coordinates
 * @param {object} [options] options
 * @param {number} options.padding padding to add between nodes
 */
export function pfsPrime_clusters(
  allNodes: overviewNode[],
  maxClusterNum: number,
  clusterAreas: [number[]] = [[0, 1, 0, 1]],
  options: { padding: number } = { padding: 0.45 }
): overviewNode[][] {
  // TODO: add padding
  const updatedNodes: overviewNode[][] = [];
  const rootNodes: overviewNode[] = [];
  for (
    let curClusterNum = -1;
    curClusterNum <= maxClusterNum;
    curClusterNum++
  ) {
    const clusterNodes = [];
    for (let index = 0; index < allNodes.length; index++) {
      const currentNode = allNodes[index];
      if (
        currentNode.attributes.clusterNum === curClusterNum &&
        !currentNode.attributes.isRoot
      ) {
        clusterNodes.push(currentNode);
      } else if (
        currentNode.attributes.clusterNum === curClusterNum &&
        currentNode.attributes.isRoot
      ) {
        rootNodes.push(currentNode);
      }
    }
    //const pfsPrime_clusterNodes = pfsPrime(clusterNodes);
    // const pfsPrime_clusterNodes = vpsc(clusterNodes);
    const pfsPrime_clusterNodes = clusterNodes;
    if (curClusterNum > -1) {
      normInArea(
        pfsPrime_clusterNodes,
        clusterAreas[curClusterNum],
        options.padding
      );
    }

    updatedNodes.push(pfsPrime_clusterNodes);
  }
  updatedNodes.push(rootNodes);

  return updatedNodes;
}

export function normInArea(
  nodes: overviewNode[],
  area: number[],
  padding: number
): void {
  const XYVals = {
    x: nodes.map((o) => o.attributes.x) as number[],
    y: nodes.map((o) => o.attributes.y) as number[],
  };

  area = [
    area[0] + padding,
    area[1] - padding,
    area[2] + padding,
    area[3] - padding,
  ];

  const focusNormalizeParameter = getFocusNormalizeParameter(XYVals);
  _.forEach(nodes, (node) => {
    const centeredX = node.attributes.x - focusNormalizeParameter.meanX;
    const centeredY = node.attributes.y - focusNormalizeParameter.meanY;
    node.attributes.x =
      area[0] +
      ((area[1] - area[0]) *
        (centeredX - focusNormalizeParameter.minCentered)) /
        (focusNormalizeParameter.maxCentered -
          focusNormalizeParameter.minCentered);
    node.attributes.y =
      area[2] +
      ((area[3] - area[2]) *
        (centeredY - focusNormalizeParameter.minCentered)) /
        (focusNormalizeParameter.maxCentered -
          focusNormalizeParameter.minCentered);
  });
}
