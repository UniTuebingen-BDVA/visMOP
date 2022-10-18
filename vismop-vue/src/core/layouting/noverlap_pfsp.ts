/**
 * Implementation of the Push Force Scan' (PFS') algorithm from https://github.com/agorajs/agora-pfs
 *
 * HAYASHI, Kunihiko, INOUE, Michiko, MASUZAWA, Toshimitsu, et al.
 * A layout adjustment problem for disjoint rectangles preserving orthogonal order.
 * In : International Symposium on Graph Drawing.
 * Springer, Berlin, Heidelberg, 1998.
 * p. 183-197.
 * https://doi.org/10.redParam7/3-540-37623-2_14
 */

import _ from 'lodash';
import { node, CartesianVector, overviewNode } from '@/core/graphTypes';

/**
 * Executes the Push Force Scan' (PFS') algorithm on this graph
 *
 * @param {Array.<node>} nodes graph to update
 * @param {object} [options] options
 * @param {number} options.padding padding to add between nodes
 */
export function pfsPrime(allNodes: overviewNode[]): overviewNode[] {
  horizontalScan(allNodes);

  _.forEach(allNodes, (n) => {
    n.attributes.up.gamma = 0;
  });

  verticalScan(allNodes);

  _.forEach(allNodes, (n) => {
    n.attributes.x = n.attributes.up.x + n.attributes.size;
    n.attributes.y = n.attributes.up.y + n.attributes.size;
  });

  return allNodes;
}

// export default PFSPAlgorithm;
/**
 *
 * @param {Array.<node>} nodes list of nodes
 * @param {number} i index
 */
function sameX(nodes: node[], i: number): number {
  let index = i;
  for (; index < nodes.length - 1; index++) {
    if (nodes[index].attributes.x !== nodes[index + 1].attributes.x)
      return index;
  }

  return index;
}

/**
 *
 * @param {Array.<node>} nodes list of nodes
 * @param {number} i index
 */
function sameY(nodes: node[], i: number): number {
  let index = i;
  for (; index < nodes.length - 1; index++) {
    if (nodes[index].attributes.y !== nodes[index + 1].attributes.y)
      return index;
  }

  return index;
}
/**
 * smallest x belonging to the node list (the left border of the label box)
 * @param {Array.<node>}, node
 */
// export function minX(nodes: node[]): node;
export function minMaxXY(node: node, xy: string, mode: 'min' | 'max'): number {
  const mathOP =
    mode == 'min'
      ? (a: number, b: number) => a - b
      : (a: number, b: number) => a + b;
  const coord = xy === 'x' ? node.attributes.x : node.attributes.y;
  return mathOP(coord, node.attributes.size / 150);
}
/**
 *
 * @param {Array.<node>} nodes node list
 */
function horizontalScan(nodes: Array<node>) {
  nodes.sort((a, b) => a.attributes.x - b.attributes.x);
  let i = 0;
  let sigma = 0;

  let lmin = nodes[0];
  while (i < nodes.length) {
    const k = sameX(nodes, i);
    let gamma = 0;
    const u = nodes[i];
    if (u.attributes.x > lmin.attributes.x) {
      // gamma'en peu plus
      for (let m = i; m <= k; m++) {
        const v = nodes[m];
        let gammapp = 0;
        for (let j = 0; j < i; j++) {
          const nodeJ = nodes[j];
          if (nodeJ.attributes.up === undefined) {
            throw new Error(
              'cannot set undefined updated position for' + nodeJ
            );
          }
          gammapp = Math.max(
            nodeJ.attributes.up.gamma + force(nodeJ, v).x,
            gammapp
          );
        }

        // gangplanck
        const gammap =
          minMaxXY(v, 'x', 'min') + gammapp < minMaxXY(lmin, 'x', 'min')
            ? sigma
            : gammapp;

        gamma = Math.max(gamma, gammap);
      }
    }

    for (let m = i; m <= k; m++) {
      const r = nodes[m];
      if (r.attributes.up === undefined)
        throw new Error('cannot set undefined updated position');
      r.attributes.up.gamma = gamma;
      r.attributes.up.x = minMaxXY(r, 'x', 'min') + gamma;
      // r.attributes.up.x += gamma

      if (minMaxXY(r, 'x', 'min') < minMaxXY(lmin, 'x', 'min')) {
        lmin = r;
      }
    }

    let delta = 0;

    for (let m = i; m <= k; m++) {
      for (let j = k + 1; j < nodes.length; j++) {
        const f = force(nodes[m], nodes[j]);
        if (f.x > delta) {
          delta = f.x;
        }
      }
    }

    sigma += delta;
    i = k + 1;
  }
}

/**
 *
 * @param {Array.<node>} nodes node list
 */
function verticalScan(nodes: Array<node>) {
  nodes.sort((a, b) => a.attributes.y - b.attributes.y);

  let i = 0;
  let lmin = nodes[0];
  let sigma = 0;

  while (i < nodes.length) {
    const u = nodes[i];
    const k = sameY(nodes, i);

    let gamma = 0;
    if (u.attributes.y > lmin.attributes.y) {
      for (let m = i; m <= k; m++) {
        let gammapp = 0;
        const v = nodes[m];
        for (let j = 0; j < i; j++) {
          const nodeJ = nodes[j];
          if (nodeJ.attributes.up === undefined) {
            throw new Error('cannot set undefined updated position' + nodeJ);
          }

          gammapp = Math.max(
            nodeJ.attributes.up.gamma + force(nodeJ, v).y,
            gammapp
          );
        }

        const gammap =
          minMaxXY(v, 'y', 'min') + gammapp < minMaxXY(lmin, 'y', 'min')
            ? sigma
            : gammapp;

        gamma = Math.max(gamma, gammap);
      }
    }
    for (let m = i; m <= k; m++) {
      const r = nodes[m];
      if (r.attributes.up === undefined)
        throw new Error('cannot set undefined updated position' + r);

      r.attributes.up.gamma = gamma;
      // r.attributes.up.y += gamma

      r.attributes.up.y = minMaxXY(r, 'y', 'min') + gamma;

      if (minMaxXY(r, 'y', 'min') < minMaxXY(lmin, 'y', 'min')) {
        lmin = r;
      }
    }

    let delta = 0;
    for (let m = i; m <= k; m++) {
      for (let j = k + 1; j < nodes.length; j++) {
        const f = force(nodes[m], nodes[j]);
        if (f.y > delta) {
          delta = f.y;
        }
      }
    }
    sigma += delta;
    i = k + 1;
  }
}
/**
 * @param {node} p1
 * @param {node} p2
 *
 * @returns {number} the delta (x axis) between two points
 */
export function deltaX(p1: node, p2: node): number {
  return p2.attributes.x - p1.attributes.x;
}

/**
 * @param {node} p1
 * @param {node} p2
 *
 * @returns {number} the delta (y axis) between two points
 */
export function deltaY(p1: node, p2: node): number {
  return p2.attributes.y - p1.attributes.y;
}

/**
 *
 * @param {node} vi
 * @param {node} vj
 */
function force(vi: node, vj: node): CartesianVector {
  const f = { x: 0, y: 0 };

  const deltax = deltaX(vi, vj);
  const deltay = deltaY(vi, vj);
  const adeltax = Math.abs(deltax);
  const adeltay = Math.abs(deltay);

  const gij = deltay / deltax;
  // console.log('gij',gij)
  const Gij =
    (vi.attributes.size + vj.attributes.size) /
    (vi.attributes.size + vj.attributes.size);

  if ((Gij >= gij && gij > 0) || (-Gij <= gij && gij < 0) || gij === 0) {
    f.x =
      (deltax / adeltax) * (vi.attributes.size + vj.attributes.size - adeltax);
    f.y = f.x * gij;
  }
  if ((Gij < gij && gij > 0) || (-Gij > gij && gij < 0)) {
    f.y =
      (deltay / adeltay) * (vi.attributes.size + vj.attributes.size - adeltay);
    f.x = f.y / gij;
  }
  // console.log('force', f)
  return f;
}