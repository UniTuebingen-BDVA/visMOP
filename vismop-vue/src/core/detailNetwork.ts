import Graph, { MultiGraph } from 'graphology'
import FA2Layout from 'graphology-layout-forceatlas2/worker'
import forceAtlas2 from 'graphology-layout-forceatlas2'
import Sigma from 'sigma'
import { graphData } from '@/core/graphTypes'
import SquareNodeProgram from '@/core/custom-nodes/square-node-program'
import ColorFadeEdgeProgram from '@/core/custom-nodes/colorfade-edge-program'
import OutlineCircleProgram from '@/core/custom-nodes/circle-outline-node-program'
import { Attributes } from 'graphology-types'
import drawHover from '@/core/customHoverRenderer'
import { PlainObject } from 'sigma/types'
import { subgraph } from 'graphology-operators'
import store from '@/store'

export default class pathwayGraph {
  private canvasContainer: HTMLElement;
  private completeGraphModel: MultiGraph;
  private currentSigma: Sigma;
  private currentGraphModel: MultiGraph;
  constructor (graphData: graphData, containerID: string, initialPathway: string, initialNodeIds: string[]) {
    this.canvasContainer = document.getElementById(containerID) as HTMLElement
    this.completeGraphModel = MultiGraph.from(graphData)
    this.currentGraphModel = this.layoutToPathway(initialPathway, initialNodeIds)
    this.currentSigma = this.drawCurrentGraph()
  }

  /**
 * Initializes the omics graph
 * @param {string} elemID
 * @param {graphData} graphData
 * @returns {Sigma} Sigma instance
 */
  private drawCurrentGraph (): Sigma {
    if (this.currentSigma) {
      this.currentSigma.kill()
    }

    const inferredSettings = forceAtlas2.inferSettings(this.currentGraphModel)

    // from events SIGMA2 example, initialze sets for highlight on hover:
    let highlighedNodes = new Set()
    let highlighedEdges = new Set()

    // node reducers change and return nodes based on an accessor function
    const nodeReducer = (node: unknown, data: Attributes) => {
      if (highlighedNodes.has(node)) {
        return { ...data, outlineColor: 'rgba(255,0,0,1.0)', zIndex: 1 }
      }

      return data
    }

    // same for edges
    const edgeReducer = (edge: unknown, data: Attributes) => {
      if (highlighedEdges.has(edge)) {
        return {
          ...data,
          sourceColor: 'rgba(255,0,0,1.0)',
          targetColor: 'rgba(255,0,0,1.0)',
          zIndex: 1
        }
      }

      return data
    }
    // end example

    // construct Sigma main instance
    const sigmaInstance = new Sigma(this.currentGraphModel, this.canvasContainer, {
      nodeReducer: nodeReducer,
      edgeReducer: edgeReducer,
      zIndex: true, // enabling zIndex parameter
      renderLabels: false, // do not render labels w/o hover
      nodeProgramClasses: {
        splitSquares: SquareNodeProgram,
        outlineCircle: OutlineCircleProgram
      },
      edgeProgramClasses: {
        fadeColor: ColorFadeEdgeProgram
      },
      hoverRenderer: drawHover
    })

    // TODO: from events example:
    sigmaInstance.on('enterNode', ({ node }) => {
      console.log('Entering: ', node)
      highlighedNodes = new Set(this.currentGraphModel.neighbors(node))
      highlighedNodes.add(node)

      highlighedEdges = new Set(this.currentGraphModel.edges(node))

      sigmaInstance.refresh()
    })

    sigmaInstance.on('leaveNode', ({ node }) => {
      console.log('Leaving:', node)

      highlighedNodes.clear()
      highlighedEdges.clear()

      sigmaInstance.refresh()
    })

    sigmaInstance.on('clickNode', ({ node }) => {
      console.log('clicking Node: ', node)
      store.dispatch('addClickedNode', { queryID: node, name: '' })
    })
    return sigmaInstance
  }

  /**
   * Applies a KEGG-Layout to a subset of the nodes
   * @param {Sigma} renderer
   * @param {string} pathway
   * @param {string[]} nodeIDs
   */
  private layoutToPathway (
    pathway: string,
    nodeIDs: string[]
  ): MultiGraph {
    const copyGraph = subgraph(this.completeGraphModel, function (nodeID, attr) {
      return nodeIDs.includes(nodeID)
    })

    const layoutScaling = 2500
    const newPosisitons: PlainObject<PlainObject<number>> = {}
    copyGraph.forEachNode((nodeID, attributes) => {
      attributes.fixed = true
      attributes.hidden = false
      // attributes.x= center_x + (attributes.origPos[pathway][0] - 0.5) * 250
      // attributes.y= center_y + (attributes.origPos[pathway][1] - 0.5) * 250
      attributes.color = attributes.nonFadeColor as string
      attributes.secondaryColor = attributes.nonFadeColorSecondary as string
      attributes.outlineColor = 'rgba(30,30,30,1.0)'
      attributes.zIndex = 2
      const origPos = attributes.origPos as { [key: string]: [number, number] }
      newPosisitons[nodeID] = {
        x: (origPos[pathway][0] - 0.5) * layoutScaling,
        y: (-1 * origPos[pathway][1] - 0.5) * layoutScaling
      }
    })
    copyGraph.updateEachNodeAttributes((node, attr) => {
      return {
        ...attr,
        ...newPosisitons[node]
      }
    })
    return copyGraph
  }

  public selectNewPathway (pathway: string, nodeIDs: string[]) {
    this.currentGraphModel = this.layoutToPathway(pathway, nodeIDs)
    this.currentSigma = this.drawCurrentGraph()
  }

  public refresh () {
    this.currentSigma.refresh()
    this.currentSigma.resize()
  }

  public killGraph () {
    this.currentSigma.kill()
  }
}
