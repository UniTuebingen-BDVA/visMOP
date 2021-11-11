import * as _ from 'lodash'
import { generateColorScale } from '@/core/utils'
import {
  node,
  edge,
  entry,
  graphData,
  relation,
  nodeAttr
} from '@/core/graphTypes'
/**
 * Function generating a graph representation of multiomics data, to be used with sigma and graphology
 * @param nodeList list of node data
 * @param fcsExtent extent of foldchange values
 * @returns
 */
export function generateGraphData (
  nodeList: { [key: string]: entry },
  fcsExtent: number[]
): graphData {
  const fadeGray = 'rgba(30,30,30,0.2)'
  const graph = {
    attributes: { name: 'BaseNetwork' },
    nodes: [],
    edges: []
  } as graphData
  const addedEdges: string[] = []
  console.log('fcsExtent', fcsExtent)
  const colorScale = generateColorScale(fcsExtent[0], fcsExtent[1])
  // console.log("NodeList", nodeList)
  for (const entryKey in nodeList) {
    const entry = nodeList[entryKey]
    // console.log("entry", entry)
    if (!entry.isempty) {
      const currentNames = entry.name
      const keggID = entry.keggID
      if (currentNames) {
        const initPosX = entry.initialPosX
        const initPosY = entry.initialPosY
        const color =
          entry.entryType === 'gene'
            ? typeof entry.trascriptomicsValue === 'string'
              ? '#808080'
              : colorScale(entry.trascriptomicsValue)
            : typeof entry.metabolomicsValue === 'string'
              ? '#808080'
              : colorScale(entry.metabolomicsValue)
        const secondaryColor =
          entry.entryType === 'gene'
            ? typeof entry.proteomicsValue === 'string'
              ? '#808080'
              : colorScale(entry.proteomicsValue)
            : '#808080'
        const currentNode = {
          key: keggID,
          // label: "",
          attributes: {
            entryType: _.escape(entry.entryType),
            type: entry.entryType === 'gene' ? 'splitSquares' : 'circle',
            name: _.escape(currentNames[0]),
            color: color,
            secondaryColor: secondaryColor,
            outlineColor: 'rgba(30,30,30,1.0)',
            nonFadeColor: color,
            nonFadeColorSecondary: secondaryColor,
            fadeColor: fadeGray,
            fadeColorSecondary: fadeGray,
            label: generateLabel(_.escape(currentNames[0]), entry),
            x: initPosX,
            y: initPosY,
            z: 1,
            initialX: initPosX,
            initialY: initPosY,
            origPos: entry.origPos,
            size: 3,
            fixed: false // fixed property on nodes excludes nodes from layouting
          } as nodeAttr
        } as node
        // if(entry.entryType == "pathway")
        // {console.log("currentnode",currentNode)}
        graph.nodes.push(currentNode)
        for (const relation of entry.outgoingEdges) {
          let currentEdge = {} as edge
          currentEdge = generateForceGraphEdge(relation)
          // console.log(current_edge)
          // console.log("currentedge",current_edge)
          if (!addedEdges.includes(currentEdge.key)) {
            graph.edges.push(currentEdge)
            addedEdges.push(currentEdge.key)
          }
        }
        if (currentNames[0] === 'C05125') {
          console.log('TESTMETA', currentNode)
          console.log('TESTMETA', entry)
        }
      }
    }
  }
  return graph
}
function generateLabel (name: string, entry: entry): string {
  const stringContainer: string[] = [`Name: ${name}`]
  if (entry.trascriptomicsValue !== 'NA') {
    stringContainer.push(`Trans:\t${entry.trascriptomicsValue}`)
  }
  if (entry.proteomicsValue !== 'NA') {
    stringContainer.push(`Prot:\t${entry.proteomicsValue}`)
  }
  if (entry.metabolomicsValue !== 'NA') {
    stringContainer.push(`Meta:\t${entry.metabolomicsValue}`)
  }
  return stringContainer.join('\n')
}

/**
 * Parses a kegg relation into an edge representation
 * @param {relation} relation object
 * @returns {edge}, edge object
 */
function generateForceGraphEdge (relation: relation): edge {
  const fadeGray = 'rgba(30,30,30,0.2)'

  const edgeColors: { [key: string]: string } = {
    ECrel: '#BE0032',
    PPrel: '#A1CAF1',
    GErel: '#008856',
    PCrel: '#875692',
    maplink: '#F3C300',
    reaction: '#222222',
    pathCon: '#222222'
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
      attributes: {
        z: 0,
        type: 'fadeColor',
        sourceColor: edgeColors[relationType],
        targetColor: edgeColors[relationType],
        nonFadeColor: edgeColors[relationType],
        fadeColor: fadeGray
      }
    } as edge
    return edge
  } else {
    const entry1 = relation.source
    const entry2 = relation.target

    const edge = {
      key: relation.relationID,
      source: entry1,
      target: entry2,
      attributes: {
        z: 0,
        type: 'fadeColor',
        sourceColor: edgeColors.reaction,
        targetColor: edgeColors.reaction,
        nonFadeColor: edgeColors.reaction,
        fadeColor: fadeGray
      }
    } as edge
    return edge
  }
}
