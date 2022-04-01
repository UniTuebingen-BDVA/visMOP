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
import { node, CartesianVector } from '@/core/graphTypes'
const redParam = 1
/**
 * Executes the Push Force Scan' (PFS') algorithm on this graph
 *
 * @param {Array.<node>} nodes graph to update
 * @param {object} [options] options
 * @param {number} options.padding padding to add between nodes
 */
export function pfsPrime (
  allNodes: node[],
  maxModuleNum: number,
  moduleAreas: [number[]] = [[-1, 1, -1, 1]],
  options: { padding: number } = { padding: 0 }
): node[] {
  // TODO: add padding
  console.log(moduleAreas)
  console.log('before', allNodes[0].attributes.x, allNodes[0].attributes.y)

  horizontalScan(allNodes)

  _.forEach(allNodes, n => {
    n.attributes.up.gamma = 0
  })

  verticalScan(allNodes)
  _.forEach(allNodes, n => {
    n.attributes.x = n.attributes.up.x - n.attributes.size / (2 * redParam)
    n.attributes.y = n.attributes.up.y - n.attributes.size / (2 * redParam)
    // delete n.up;
  })
  // const wholeArea = [-1, 1, -1, 1]

  // normInArea(updatedNodes, wholeArea)
  console.log('after', allNodes[0].attributes.x, allNodes[0].attributes.y)
  return allNodes
}

// export default PFSPAlgorithm;
/**
 *
 * @param {Array.<node>} nodes list of nodes
 * @param {number} i index
 */
function sameX (nodes: node[], i: number): number {
  let index = i
  for (; index < nodes.length - 1; index++) {
    if (nodes[index].attributes.x !== nodes[index + 1].attributes.x) return index
  }

  return index
}

function normInArea (nodes: node[], area: number[]) {
  let maxMinXY = [Infinity, -Infinity, Infinity, -Infinity] as number[]
  _.forEach(nodes, n => {
    n.attributes.up.x += n.attributes.size / (2 * redParam)
    n.attributes.up.y += n.attributes.size / (2 * redParam)
    // console.log('in')
    maxMinXY = [Math.min(maxMinXY[0], n.attributes.up.x), Math.max(maxMinXY[1], n.attributes.up.x), Math.min(maxMinXY[2], n.attributes.up.y), Math.max(maxMinXY[3], n.attributes.up.y)]
    // delete n.up;
  })

  _.forEach(nodes, n => {
    n.attributes.x = area[0] + (((area[1] - area[0]) * (n.attributes.up.x - maxMinXY[0])) / (maxMinXY[1] - maxMinXY[0]))
    n.attributes.y = area[2] + (((area[3] - area[2]) * (n.attributes.up.y - maxMinXY[2])) / (maxMinXY[3] - maxMinXY[2]))
    // delete n.up;
  })
}
/**
 *
 * @param {Array.<node>} nodes list of nodes
 * @param {number} i index
 */
function sameY (nodes: node[], i: number): number {
  let index = i
  for (; index < nodes.length - 1; index++) {
    if (nodes[index].attributes.y !== nodes[index + 1].attributes.y) return index
  }

  return index
}
/**
 * smallest x belonging to the node list (the left border of the label box)
 * @param {Array.<node>}, node
 */
// export function minX(nodes: node[]): node;
export function minXY (node: node | node[], xy: string): any {
  if (node instanceof Array) {
    console.log('wrong')
    return _.minBy(node, (v) => minXY(v, xy))
  }
  const coord = xy === 'x' ? node.attributes.x : node.attributes.y

  return coord - node.attributes.size / (2 * redParam)
}

/** biggest x belonging to the node list (the rigth border of the label box)
 * @param {Array.<node>}
 */
// export function maxX(nodes: node[]): node;
export function maxXY (node: node | node[], xy: string): any {
  if (node instanceof Array) {
    console.log('wrong')
    return _.maxBy(node, (v) => maxXY(v, xy))
  }

  const coord = xy === 'x' ? node.attributes.x : node.attributes.y

  return coord - node.attributes.size / (2 * redParam)
}

/**
 *
 * @param {Array.<node>} nodes node list
 */
function horizontalScan (nodes: Array<node>) {
  nodes.sort((a, b) => a.attributes.x - b.attributes.x)
  let i = 0
  let sigma = 0

  let lmin = nodes[0]
  while (i < nodes.length) {
    const k = sameX(nodes, i)
    let gamma = 0
    const u = nodes[i]
    if (u.attributes.x > lmin.attributes.x) {
      // gamma'en peu plus
      for (let m = i; m <= k; m++) {
        const v = nodes[m]
        let gammapp = 0
        for (let j = 0; j < i; j++) {
          const nodeJ = nodes[j]
          if (nodeJ.attributes.up === undefined) { throw new Error('cannot set undefined updated position for' + nodeJ) }
          gammapp = Math.max(nodeJ.attributes.up.gamma + force(nodeJ, v).x, gammapp)
        }

        // gangplanck
        const gammap = minXY(v, 'x') + gammapp < minXY(lmin, 'x') ? sigma : gammapp

        gamma = Math.max(gamma, gammap)
      }
    }

    for (let m = i; m <= k; m++) {
      const r = nodes[m]
      if (r.attributes.up === undefined) throw new Error('cannot set undefined updated position')
      r.attributes.up.gamma = gamma
      // r.attributes.up.x = minXY(r, 'x') + gamma
      r.attributes.up.x += gamma

      if (minXY(r, 'x') < minXY(lmin, 'x')) {
        lmin = r
      }
    }

    let delta = 0

    for (let m = i; m <= k; m++) {
      for (let j = k + 1; j < nodes.length; j++) {
        const f = force(nodes[m], nodes[j])
        if (f.x > delta) {
          delta = f.x
        }
      }
    }

    sigma += delta
    i = k + 1
  }
}

/**
 *
 * @param {Array.<node>} nodes node list
 */
function verticalScan (nodes: Array<node>) {
  nodes.sort((a, b) => a.attributes.y - b.attributes.y)

  let i = 0
  let lmin = nodes[0]
  let sigma = 0

  while (i < nodes.length) {
    const u = nodes[i]
    const k = sameY(nodes, i)

    let gamma = 0
    if (u.attributes.y > lmin.attributes.y) {
      for (let m = i; m <= k; m++) {
        let gammapp = 0
        const v = nodes[m]
        for (let j = 0; j < i; j++) {
          const nodeJ = nodes[j]
          if (nodeJ.attributes.up === undefined) { throw new Error('cannot set undefined updated position' + nodeJ) }

          gammapp = Math.max(nodeJ.attributes.up.gamma + force(nodeJ, v).y, gammapp)
        }

        const gammap = minXY(v, 'y') + gammapp < minXY(lmin, 'y') ? sigma : gammapp

        gamma = Math.max(gamma, gammap)
      }
    }
    for (let m = i; m <= k; m++) {
      const r = nodes[m]
      if (r.attributes.up === undefined) throw new Error('cannot set undefined updated position' + r)

      r.attributes.up.gamma = gamma
      r.attributes.up.y += gamma

      // r.attributes.up.y = minXY(r, 'y') + gamma

      if (minXY(r, 'y') < minXY(lmin, 'y')) {
        lmin = r
      }
    }

    let delta = 0
    for (let m = i; m <= k; m++) {
      for (let j = k + 1; j < nodes.length; j++) {
        const f = force(nodes[m], nodes[j])
        if (f.y > delta) {
          delta = f.y
        }
      }
    }
    sigma += delta
    i = k + 1
  }
}
/**
 * @param {node} p1
 * @param {node} p2
 *
 * @returns {number} the delta (x axis) between two points
 */
export function deltaX (p1: node, p2: node): number {
  return p2.attributes.x - p1.attributes.x
}

/**
 * @param {node} p1
 * @param {node} p2
 *
 * @returns {number} the delta (y axis) between two points
 */
export function deltaY (p1: node, p2: node): number {
  return p2.attributes.y - p1.attributes.y
}

/**
 *
 * @param {node} vi
 * @param {node} vj
 */
function force (vi: node, vj: node): CartesianVector {
  const f = { x: 0, y: 0 }

  const deltax = deltaX(vi, vj)
  const deltay = deltaY(vi, vj)
  const adeltax = Math.abs(deltax)
  const adeltay = Math.abs(deltay)

  const gij = deltay / deltax

  const Gij = (vi.attributes.size / redParam + vj.attributes.size / redParam) / (vi.attributes.size / redParam + vj.attributes.size / redParam)

  if ((Gij >= gij && gij > 0) || (-Gij <= gij && gij < 0) || gij === 0) {
    f.x = (deltax / adeltax) * ((vi.attributes.size / redParam + vj.attributes.size / redParam) / 2 - adeltax)
    f.y = f.x * gij
  }
  if ((Gij < gij && gij > 0) || (-Gij > gij && gij < 0)) {
    f.y = (deltay / adeltay) * ((vi.attributes.size / redParam + vj.attributes.size / redParam) / 2 - adeltay)
    f.x = f.y / gij
  }
  // console.log('force', f)

  return f
}
