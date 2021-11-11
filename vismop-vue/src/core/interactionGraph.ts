import * as _ from 'lodash'
import {
  graphData
} from '@/core/graphTypes'
import Sigma from 'sigma'
import { MultiGraph } from 'graphology'
import forceAtlas2 from 'graphology-layout-forceatlas2'
import random from 'graphology-layout/random'
import ColorFadeEdgeProgram from '@/core/custom-nodes/colorfade-edge-program'
import getNodeProgramImage from 'sigma/rendering/webgl/programs/node.image'
import * as d3 from 'd3'
import { PieArcDatum } from 'd3-shape'
const colors = ['rgb(127,201,127)', 'rgb(190,174,212)', 'rgb(253,192,134)', 'rgb(255,255,153)', 'rgb(56,108,176)', 'rgb(240,2,127)', 'rgb(191,91,23)', 'rgb(102,102,102)']
/**
 * Generates a graph data structure from networkx data to be used with graphology and sigma
 * @param nodeLink Node link Data from networkx serialized as json
 * @returns
 */
export function generateInteractionGraphData (
  nodeLink: { [key: string]: [{ [key: string]: string }] }
): graphData {
  const pieSVG = generatePieCharts()

  console.log('interactionData', nodeLink)
  const graph = {
    attributes: { name: 'BaseNetwork' },
    nodes: [],
    edges: []
  } as graphData
  nodeLink.nodes.forEach(node => {
    graph.nodes.push(
      {
        key: node.key,
        attributes:
        {
          label: node.labelName,
          x: 0,
          y: 0,
          type: 'image',
          image: pieSVG,
          color: node.color ? node.color : '#0f0f0f',
          size: node.size ? node.size : 2
        }
      })
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
          color: edge.color ? edge.color : 'rgb(75,75,75)',
          sourceColor: edge.edgeType ? edge.color ? edge.color : 'rgba(170,170,170,1.0)' : edge.color ? edge.color : 'rgba(200,140,140,0.8)',
          targetColor: edge.edgeType ? edge.color ? edge.color : 'rgba(170,170,170,1.0)' : edge.color ? edge.color : 'rgba(200,140,140,0.8)'
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
    nodeProgramClasses: {
      image: getNodeProgramImage()
    },
    edgeProgramClasses: {
      colorFade: ColorFadeEdgeProgram
    }
  })
  console.log(`layoutDuration: ${duration} S`)
  return renderer
}

function generatePieCharts (): {[key: string]: SVGElement} {
  const pieCharts = {}

  console.log(generateSinglePieChart(3, colors.slice(0, 3)))
  return pieCharts
}

function generateSinglePieChart (segments: number, colors: string[]): SVGElement {
  const width = 50
  const height = 50
  const radius = 20

  const svg = d3.create('svg')
    .attr('width', width)
    .attr('height', height)

  const dummyDat: number[] = []
  _.range(segments).forEach(element => {
    dummyDat.push(1)
  })
  const color = d3.scaleOrdinal()
    .range(colors)
  const pies = d3.pie<number>()(dummyDat)
  const arc = d3.arc<PieArcDatum<number>>().innerRadius(0).outerRadius(radius)
  svg.selectAll('path')
    .data(pies)
    .join('path')
    .attr('d', arc)
    .attr('fill', (d, i) => colors[i])
    .attr('stroke', 'black')

  console.log('PIECHART', svg.node())
  return svg.node() as SVGElement
}
