import * as _ from 'lodash'
import { node, edge, entry, graphData, relation, nodeAttr } from '@/core/graphTypes'

export function generateGraphData (nodeList: { [key: string]: entry }, fcsExtent: number[]): graphData {
  const fadeGray = 'rgba(30,30,30,0.2)'
  const graph = { attributes: { name: 'BaseNetwork' }, nodes: [], edges: [] } as graphData
  const addedEdges: string[] = []
  console.log('fcsExtent', fcsExtent)
  const colorScale = generateColorScale(fcsExtent[0], fcsExtent[1])
  // console.log("NodeList", nodeList)
  for (const entryKey in nodeList) {
    const entry = nodeList[entryKey]
    // console.log("entry", entry)
    if (!entry.isempty) {
      const currentNames = entry.name
      const keggID = entry.kegg_ID
      if (currentNames) {
        const init_pos_x = entry.initial_pos_x
        const init_pos_y = entry.initial_pos_y
        const color = (entry.entry_type == 'gene') ? (typeof (entry.trascriptomicsValue) === 'string' ? '#808080' : (colorScale(entry.trascriptomicsValue))) : '#808080'
        const secondaryColor = (entry.entry_type == 'gene') ? (typeof (entry.proteomicsValue) === 'string' ? '#808080' : (colorScale(entry.proteomicsValue))) : '#808080'
        const currentNode = {
          key: keggID,
          // label: "",
          attributes:
                        {
                          entryType: _.escape(entry.entry_type),
                          type: (entry.entry_type == 'gene') ? 'splitSquares' : 'circle',
                          name: _.escape(currentNames[0]),
                          color: color,
                          secondaryColor: secondaryColor,
                          outlineColor: 'rgba(30,30,30,1.0)',
                          nonFadeColor: color,
                          nonFadeColorSecondary: secondaryColor,
                          fadeColor: fadeGray,
                          fadeColorSecondary: fadeGray,
                          label: `Name: ${_.escape(currentNames[0])}\nTrans:${entry.trascriptomicsValue}\nProt: ${entry.proteomicsValue}`,
                          x: init_pos_x,
                          y: init_pos_y,
                          z: 1,
                          initialX: init_pos_x,
                          initialY: init_pos_y,
                          origPos: entry.orig_pos,
                          size: 3,
                          fixed: false // fixed property on nodes excludes nodes from layouting
                        } as nodeAttr

        } as node
        // if(entry.entry_type == "pathway")
        // {console.log("currentnode",currentNode)}
        graph.nodes.push(currentNode)
        for (const relation of entry.outgoing_edges) {
          let current_edge = {} as edge
          current_edge = generateForceGraphEdge(relation)
          // console.log(current_edge)
          // console.log("currentedge",current_edge)
          if (!(addedEdges.includes(current_edge.key))) {
            graph.edges.push(current_edge)
            addedEdges.push(current_edge.key)
          }
        }
      }
    }
  }
  return graph
}

/**
   * Parses a relation into a cytso
   * @param {Object} relation, relation object
   * @returns {Object}, cytoscape style edge
   */
function generateForceGraphEdge (relation: relation): edge {
  const fadeGray = 'rgba(30,30,30,0.2)'

  const edgeColors: { [key: string]: string } =
    {
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
    const relationType = relation.relation_type
    const edge = {
      key: relation.relation_ID,
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
  }

  // if (edgeType === "reaction"){
  else {
    const entry1 = relation.source
    const entry2 = relation.target

    const edge = {
      key: relation.relation_ID,
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

function generateColorScale (min_val: number, max_val: number) {
  const steps = 201 // start at 200 so that small values don't appear white
  const stepsize_smaller0 = steps / (min_val) // 0-minval
  const stepsize_larger0 = steps / (max_val - 0)

  return function (val: number) {
    val = Number(val)

    if (isNaN(val)) {
      return '#808080'
    } else if (val < 0 && val > min_val) {
      const rRGB = ((200 - Math.round(val * stepsize_smaller0)) < 0 ? 0 : (200 - Math.round(val * stepsize_smaller0)))
      const gRGB = ((200 - Math.round(val * stepsize_smaller0)) < 0 ? 0 : (200 - Math.round(val * stepsize_smaller0)))
      const bRGB = 255

      // conversion to keep leading zeros which are cut off by toString for small numbers
      // https://stackoverflow.com/questions/21408523/tostring16-with-leading-zeroes
      const rRGBstr = ('00000' + (rRGB).toString(16)).substr(-2)
      const gRGBstr = ('00000' + (gRGB).toString(16)).substr(-2)
      const bRGBstr = ('00000' + (bRGB).toString(16)).substr(-2)

      return `#${rRGBstr}${gRGBstr}${bRGBstr}`
    } else if (val > 0 && val < max_val) {
      const rRGB = 255
      const gRGB = ((200 - Math.round(val * stepsize_larger0)) < 0 ? 0 : (200 - Math.round(val * stepsize_larger0)))
      const bRGB = ((200 - Math.round(val * stepsize_larger0)) < 0 ? 0 : (200 - Math.round(val * stepsize_larger0)))

      const rRGBstr = ('00000' + (rRGB).toString(16)).substr(-2)
      const gRGBstr = ('00000' + (gRGB).toString(16)).substr(-2)
      const bRGBstr = ('00000' + (bRGB).toString(16)).substr(-2)

      return `#${rRGBstr}${gRGBstr}${bRGBstr}`
    } else if (val === 0) {
      return '#DADADA'
    } else {
      if (val <= min_val) {
        return '#0000FF'
      } else if (val >= max_val) {
        return '#FF0000'
      }
    }
  }
}
