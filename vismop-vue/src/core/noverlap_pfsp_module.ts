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
import { node } from '@/core/graphTypes';
import { pfsPrime } from '@/core/noverlap_pfsp';
import { vpsc } from '@/core/noverlap_vpsc';
import {getFocusNormalizeParameter } from '@/core/convexHullsForClusters'
/**
 * Executes the Push Force Scan' (PFS') algorithm on this graph
 *
 * @param {Array.<node>} nodes graph to update
 * @param {object} [options] options
 * @param {number} options.padding padding to add between nodes
 */
export function pfsPrime_modules(
  allNodes: node[],
  maxModuleNum: number,
  moduleAreas: [number[]] = [[0, 1, 0, 1]],
  options: { padding: number } = { padding: 0 }
): node[][] {
  // TODO: add padding
  const updatedNodes = [] as node[][];
  if (moduleAreas[0].length == 0) {moduleAreas.shift()}
  for (let curModuleNum = 0; curModuleNum <= maxModuleNum; curModuleNum++) {
    const moduleNodes = [];
    for (let index = 0; index < allNodes.length; index++) {
      const currentNode = allNodes[index];
      if (currentNode.attributes.modNum === curModuleNum) {
        moduleNodes.push(currentNode);
        // allNodes.splice(index, 1)
      }
    }
  const pfsPrime_moduleNodes = pfsPrime(moduleNodes);
  // const pfsPrime_moduleNodes = vpsc(moduleNodes);
  // const pfsPrime_moduleNodes = moduleNodes;

    normInArea(pfsPrime_moduleNodes, moduleAreas[curModuleNum]);

    updatedNodes.push(moduleNodes);
  }
  // updatedNodes.shift();

  return updatedNodes;
}

export function normInArea(nodes: node[], area: number[], padding = 0.45): void {
  let XYVals = { x: nodes.map(o => o.attributes.x) as number[], y: nodes.map(o => o.attributes.y) as number[] }
  
  area = [
    area[0] + padding,
    area[1] - padding,
    area[2] + padding,
    area[3] - padding,
  ];

  const focusNormalizeParameter = getFocusNormalizeParameter(XYVals)
    _.forEach(nodes, (node) => {
      let centeredX = (node.attributes.x - focusNormalizeParameter.meanX) 
      let centeredY = (node.attributes.y - focusNormalizeParameter.meanY) 
      node.attributes.x =
      area[0] + ((area[1] - area[0]) * (centeredX - focusNormalizeParameter.minCentered)) / (focusNormalizeParameter.maxCentered - focusNormalizeParameter.minCentered);
      node.attributes.y =
      area[2] +((area[3] - area[2]) * (centeredY - focusNormalizeParameter.minCentered)) / (focusNormalizeParameter.maxCentered - focusNormalizeParameter.minCentered);
    })
}

// function getMaxMinXY(nodes: node[]) {
//   let maxMinXY = [Infinity, -Infinity, Infinity, -Infinity] as number[];
//   _.forEach(nodes, (n) => {
//     maxMinXY = [
//       Math.min(maxMinXY[0], n.attributes.x),
//       Math.max(maxMinXY[1], n.attributes.x),
//       Math.min(maxMinXY[2], n.attributes.y),
//       Math.max(maxMinXY[3], n.attributes.y),
//     ];
//   });
//   return maxMinXY;
// }
