/**
 * Implementation of the Fast Node Overlap Removal (VPSC) algorithm
 *
 * Tim Dwyer, Kim Marriott, Peter J.Stuckey
 * A new algorithm for removing node overlapping in graph visualization,
 * Graph Drawing 2005
 * Pages 153-164,
 * Lecture Notes in Computer Science, vol 3843.
 * 2006,
 * Springer, Berlin, Heidelberg
 * ISBN 978-3-540-31667-1,
 * Online ISBN 978-3-540-31667-1,
 * https://doi.org/10.1007/11618058_15.
 * (https://link.springer.com/chapter/10.1007%2F11618058_15)
 *
 * courtesy to the webcola framework
 */

import { removeOverlaps, Rectangle } from 'webcola'
import _ from 'lodash'
import { node } from '@/core/graphTypes'
import { minXY, maxXY } from '@/core/noverlap_pfsp'

export function vpsc (
  nodes: node[],
  options = { padding: 0 }
): node[] {
  const rects: Rectangle[] = _.map(
    nodes,
    (node) => new Rectangle(minXY(node, 'x'), maxXY(node, 'x'), minXY(node, 'y'), maxXY(node, 'y'))
  )
  removeOverlaps(rects)
  _.forEach(nodes, (node, index) => { 
    node.attributes.x = rects[index].cx()
    node.attributes.y = rects[index].cy()
  })

  return nodes
}
