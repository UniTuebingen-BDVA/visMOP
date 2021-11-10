import * as _ from 'lodash'
import {
  graphData
} from '@/core/graphTypes'
import Sigma from 'sigma'
import { MultiGraph } from 'graphology'
import forceAtlas2 from 'graphology-layout-forceatlas2'
import random from 'graphology-layout/random'
import ColorFadeEdgeProgram from '@/core/custom-nodes/colorfade-edge-program'
/**
 * Generates a graph data structure from networkx data to be used with graphology and sigma
 * @param nodeLink Node link Data from networkx serialized as json
 * @returns
 */
export function generateInteractionGraphData (
  nodeLink: { [key: string]: [{ [key: string]: string }] }
): graphData {
  console.log('interactionData', nodeLink)
  const graph = {
    attributes: { name: 'BaseNetwork' },
    nodes: [],
    edges: []
  } as graphData
  nodeLink.nodes.forEach(node => {
    graph.nodes.push({ key: node.key, attributes: { label: node.labelName, x: 0, y: 0, color: node.color ? node.color : '#0f0f0f', size: node.size ? node.size : 2 } })
  })
  nodeLink.links.forEach(edge => {
    graph.edges.push({
      key: edge.source + edge.target,
      source: edge.source,
      target: edge.target,
      attributes:
        {
          zIndex: edge.edgeType ? 1 : 0,
          weight: edge.weight,
          type: 'colorFade',
          // type: edge.edgeType ? 'line' : 'dashed',
          // color: edge.edgeType ? 'rgb(75,75,75)' : 'rgb(255,75,75)',
          color: 'rgb(75,75,75)',
          sourceColor: edge.edgeType ? 'rgba(170,170,170,1.0)' : 'rgba(200,140,140,0.8)',
          targetColor: edge.edgeType ? 'rgba(170,170,170,1.0)' : 'rgba(200,140,140,0.8)'
        }
    })
  })
  return graph
}
/**
 *
 * @param {String} elemID target html container for sigma renderer
 * @param nodeLink Node link Data from networkx serialized as json
 * @returns {Sigma} sigma renderer
 */
export function generateInteractionGraph (elemID: string, nodeLink: { [key: string]: [{ [key: string]: string }] }): Sigma {
  const graphData = generateInteractionGraphData(nodeLink)
  const elem = document.getElementById(elemID) as HTMLElement
  const graph = MultiGraph.from(graphData)
  random.assign(graph)
  console.log('NODES', graph.nodes())
  const inferredSettings = forceAtlas2.inferSettings(graph)
  const start = Date.now()
  forceAtlas2.assign(graph, { iterations: 1000, settings: inferredSettings })
  const duration = (Date.now() - start) / 1000
  const renderer = new Sigma(graph, elem, {
    zIndex: true,
    edgeProgramClasses: {
      colorFade: ColorFadeEdgeProgram
    }
  })
  console.log(`layoutDuration: ${duration} S`)
  return renderer
}
