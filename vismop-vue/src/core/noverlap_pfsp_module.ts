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
'use strict'

import _ from 'lodash'
import { node } from '@/core/graphTypes'
import { pfsPrime } from '@/core/noverlap_pfsp'
/**
  * Executes the Push Force Scan' (PFS') algorithm on this graph
  *
  * @param {Array.<node>} nodes graph to update
  * @param {object} [options] options
  * @param {number} options.padding padding to add between nodes
  */
export function pfsPrime_modules (
  allNodes: node[],
  maxModuleNum: number,
  moduleAreas: [number[]] = [[0, 1, 0, 1]],
  options: { padding: number } = { padding: 0 }
): [node[]] {
  // TODO: add padding
  let updatedNodes = [[]] as [node[]]

  for (let curModuleNum = 0; curModuleNum <= maxModuleNum; curModuleNum++) {
    const moduleNodes = []
    for (let index = 0; index < allNodes.length; index++) {
      const currentNode = allNodes[index]
      if (currentNode.attributes.modNum === curModuleNum) {
        moduleNodes.push(currentNode)
        // allNodes.splice(index, 1)
      }
    }
    let pfsPrime_moduleNodes = pfsPrime(moduleNodes)

    normInArea(pfsPrime_moduleNodes, moduleAreas[curModuleNum])

    updatedNodes.push(pfsPrime_moduleNodes)
  }
  updatedNodes.shift(); 
  
  return updatedNodes
}

function normInArea (nodes: node[], area: number[], padding = 0.1) {
  const maxMinXY = getMaxMinXY(nodes)
  area = [area[0] + padding, area[1]- padding, area[2]+ padding, area[3]- padding]
  // rand einbauen 
  _.forEach(nodes, n => {
    n.attributes.x = area[0] + (((area[1] - area[0]) * (n.attributes.x - maxMinXY[0])) / (maxMinXY[1] - maxMinXY[0]))
    n.attributes.y = area[2] + (((area[3] - area[2]) * (n.attributes.y - maxMinXY[2])) / (maxMinXY[3] - maxMinXY[2]))
    // delete n.up;
  })
}

function getMaxMinXY (nodes: node[]) {
  let maxMinXY = [Infinity, -Infinity, Infinity, -Infinity] as number[]
  _.forEach(nodes, n => {
    maxMinXY = [Math.min(maxMinXY[0], n.attributes.x), Math.max(maxMinXY[1], n.attributes.x), Math.min(maxMinXY[2], n.attributes.y), Math.max(maxMinXY[3], n.attributes.y)]
  })
  return maxMinXY
}