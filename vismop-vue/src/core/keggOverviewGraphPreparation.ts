import * as _ from 'lodash'
import {
  node,
  edge,
  entry,
  graphData,
  relation,
  baseNodeAttr,
  baseEdgeAttr,
  upDatedPos
} from '@/core/graphTypes'
import store from '@/store'
import { pfsPrime } from '@/core/noverlap_pfsp'

/**
 * Function generating a graph representation of multiomics data, to be used with sigma and graphology
 * @param nodeList list of node data
 * @param fcsExtent extent of foldchange values
 * @returns
 */
export function generateGraphData (
  nodeList: { [key: string]: entry},
  fcsExtent: number[],
  glyphs: {[key: string]: string},
  moduleAreas: [number[]] = [[]]
): graphData {
  const fadeGray = 'rgba(30,30,30,0.2)'
  const graph = {
    attributes: { name: 'BaseNetwork' },
    nodes: [],
    edges: [],
    options: []
  } as graphData
  const addedEdges: string[] = []
  let index = 0
  let maxModuleNum = 0
  for (const entryKey in nodeList) {
    const entry = nodeList[entryKey]
    if (!entry.isempty) {
      const currentNames = entry.name
      const keggID = entry.keggID
      if (currentNames) {
        const initPosX = entry.initialPosX
        const initPosY = entry.initialPosY
        const modNum = entry.moduleNum
        maxModuleNum = Math.max(maxModuleNum, modNum)
        const color = '#FFFFFF'
        const trueName = store.state.pathwayLayouting.pathwayList.find(elem => elem.value === currentNames[0].replace('path:', ''))?.text
        const currentNode = {
          index: index,
          key: keggID,
          // label: "",
          attributes: {
            entryType: _.escape(entry.entryType),
            type: 'image',
            image: glyphs[entryKey.replace('path:', '')],
            name: _.escape(currentNames[0]),
            color: color,
            label: `Name: ${_.escape(trueName)}`,
            x: initPosX,
            y: initPosY,
            up: { x: initPosX, y: initPosY, gamma: 0 },
            zIndex: 1,
            size: 10,
            fixed: false // fixed property on nodes excludes nodes from layouting
          } as baseNodeAttr
        } as node
        graph.nodes.push(currentNode)
        for (const relation of entry.outgoingEdges) {
          const currentEdge = generateForceGraphEdge(relation)
          if ((!addedEdges.includes(currentEdge.key)) && (!addedEdges.includes(`${currentEdge.target}+${currentEdge.source}`))) {
            graph.edges.push(currentEdge)
            addedEdges.push(currentEdge.key)
          }
        }
        for (const relation of entry.outgoingOnceRemoved) {
          const currentEdge = generateForceGraphEdge(relation)
          if ((!addedEdges.includes(currentEdge.key)) && (!addedEdges.includes(`${currentEdge.target}+${currentEdge.source}`))) {
            graph.edges.push(currentEdge)
            addedEdges.push(currentEdge.key)
          }
        }
        index += 1
      }
    }
  }
  graph.nodes = pfsPrime(graph.nodes, maxModuleNum, moduleAreas)
  console.log('here I am', graph)
  return graph
}

/**
 * Parses a kegg relation into an edge representation
 * @param {relation} relation object
 * @returns {edge}, edge object
 */
function generateForceGraphEdge (relation: relation): edge {
  const fadeGray = 'rgba(30,30,30,0.2)'

  const edgeColors: { [key: string]: string } = {
    maplink: '#999999',
    maplinkOnceRemoved: '#FF0000'
  }

  const edgeType = relation.edgeType

  if (edgeType === 'relation') {
    const entry1 = relation.source
    const entry2 = relation.target
    const relationType = relation.relationType
    const edge = {
      key: relation.relationID,
      source: entry1,
      target: entry2,
      undirected: true,
      attributes: {
        type: '',
        zIndex: 0,
        color: edgeColors[relationType]
      } as baseEdgeAttr
    } as edge
    return edge
  } else {
    const entry1 = relation.source
    const entry2 = relation.target
    const relationType = relation.relationType
    const edge = {
      key: relation.relationID,
      source: entry1,
      target: entry2,
      undirected: true,
      attributes: {
        type: '',
        zIndex: 0,
        color: edgeColors[relationType]
      } as baseEdgeAttr
    } as edge
    return edge
  }
}