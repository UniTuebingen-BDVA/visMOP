import * as _ from 'lodash'
import store from '@/store'
import {
  graphData
} from '@/core/graphTypes'
import Sigma from 'sigma'
import { MultiGraph } from 'graphology'
import forceAtlas2 from 'graphology-layout-forceatlas2'
import random from 'graphology-layout/random'
import DashedEdgeProgram from '@/core/custom-nodes/dashed-edge-program'

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
    graph.edges.push({ key: edge.source + edge.target, source: edge.source, target: edge.target, attributes: { weight: edge.weight, type: edge.edgeType ? 'line' : 'dashed', color: 'rgb(75,75,75)', sourceColor: 'rgb(140,140,140)', targetColor: 'rgb(140,140,140)' } })
  })
  return graph
}

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
    edgeProgramClasses: {
      dashed: DashedEdgeProgram
    }
  })
  console.log(`layoutDuration: ${duration} S`)
  return renderer
}
