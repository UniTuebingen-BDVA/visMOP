import * as _ from 'lodash'
import {
  graphData,
  networkxNodeLink
} from '@/core/graphTypes'
import Sigma from 'sigma'
import { MultiGraph } from 'graphology'
import forceAtlas2 from 'graphology-layout-forceatlas2'
import random from 'graphology-layout/random'
import ColorFadeEdgeProgram from '@/core/custom-nodes/colorfade-edge-program'
import getNodeProgramImage from 'sigma/rendering/webgl/programs/node.image'
import * as d3 from 'd3'
import { PieArcDatum } from 'd3-shape'
const satColors = [
  'rgba(228,26,28,1.0)',
  'rgba(55,126,184,1.0)',
  'rgba(77,175,74,1.0)',
  'rgba(152,78,163,1.0)',
  'rgba(255,127,0,1.0)',
  'rgba(255,255,51,1.0)',
  'rgba(166,86,40,1.0)',
  'rgba(247,129,191,1.0)']
const colors = [
  'rgba(228,127,129,1.0)',
  'rgba(120,155,184,1.0)',
  'rgba(126,175,125,1.0)',
  'rgba(157,121,163,1.0)',
  'rgba(255,191,128,1.0)',
  'rgba(255,255,153,1.0)',
  'rgba(166,136,119,1.0)',
  'rgba(247,187,219,1.0)'
]

/**
 * Generates a graph data structure from networkx data to be used with graphology and sigma
 *
 * @param nodeLink Node link Data from networkx serialized as json
 * @returns
 */
export function generateInteractionGraphData (
  nodeLink: networkxNodeLink
): graphData {
  const svgURLs = generatePieCharts(nodeLink.graph.identities)
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
          type: 'egoNode' in node ? 'circle' : 'image',
          image: svgURLs[node.identity],
          color: 'egoNode' in node ? satColors[parseInt(node.egoNode)] : 'rgba(255,255,255,0.0)',
          size: node.size ? node.size : 5
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
          sourceColor: edge.egoEgoeEdge ? satColors[parseInt(edge.egoEgoeEdge[0])] : 'egoEdge' in edge ? satColors[parseInt(edge.egoEdge)] : colors[parseInt(edge.identity)],
          targetColor: edge.egoEgoeEdge ? satColors[parseInt(edge.egoEgoeEdge[1])] : 'egoEdge' in edge ? satColors[parseInt(edge.egoEdge)] : colors[parseInt(edge.identity)]
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
export function generateInteractionGraph (elemID: string, nodeLink: networkxNodeLink): Sigma {
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
/**
 * svg to url https://stackoverflow.com/questions/13963259/drawing-a-modified-svg-to-a-canvas?rq=1
 * @param identities
 * @returns
 */
function generatePieCharts (identities: number[]): {[key: string]: string} {
  const pieCharts: {[key: string]: string} = {}
  const combinations = combinationOfArray(identities)
  combinations.forEach(elem => {
    elem.sort()
    const serializer = new XMLSerializer()
    console.log('pies', elem.length, elem.map(idx => colors[idx]))
    const pieSVG = generateSinglePieChart(elem.length, elem.map(idx => colors[idx]), 64)
    const pieSVGstring = serializer.serializeToString(pieSVG)
    const svgBlob = new Blob([pieSVGstring], { type: 'image/svg+xml;charset=utf-8' })
    const svgURL = window.URL.createObjectURL(svgBlob)
    console.log('pieAccessor: ', elem, elem.join(';'))
    pieCharts[elem.join(';')] = svgURL
  })
  return pieCharts
}
/**
 *  from https://stackoverflow.com/a/39089422
 * @param arr
 * @returns combinations of array
 */
function combinationOfArray (arr: number[]): number[][] {
  if (arr.length === 1) return [arr]
  else {
    const subarray = combinationOfArray(arr.slice(1))
    return subarray.concat(subarray.map(e => e.concat(arr[0])), [[arr[0]]])
  }
}

function generateSinglePieChart (segments: number, colors: string[], diameter: number): SVGElement {
  const width = diameter + 4
  const height = diameter + 4
  const radius = diameter / 1.8

  const svg = d3.create('svg')
    .attr('width', width)
    .attr('height', height)
  const g = svg.append('g')
    .attr('transform', `translate(${width / 2},${height / 2})`)

  const dummyDat: number[] = []
  _.range(segments).forEach(element => {
    dummyDat.push(1)
  })
  const color = d3.scaleOrdinal()
    .range(colors)
  const pies = d3.pie<number>()(dummyDat)
  const arc = d3.arc<PieArcDatum<number>>().innerRadius(0).outerRadius(radius)
  g.selectAll('path')
    .data(pies)
    .join('path')
    .attr('d', arc)
    .attr('fill', (d, i) => colors[i])

  console.log('PIECHART', svg.node())
  return svg.node() as SVGElement
}
