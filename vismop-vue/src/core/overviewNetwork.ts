import { UndirectedGraph } from 'graphology'
import forceAtlas2 from 'graphology-layout-forceatlas2'
import noverlap from 'graphology-layout-noverlap'
import Sigma from 'sigma'
import { graphData } from '@/core/graphTypes'
import getNodeProgramImage from 'sigma/rendering/webgl/programs/node.image'
import DashedEdgeProgram from '@/core/custom-nodes/dashed-edge-program'
import { Attributes } from 'graphology-types'
import drawHover from '@/core/customHoverRenderer'
import store from '@/store'
import { DEFAULT_SETTINGS } from 'sigma/settings'
import { bidirectional, edgePathFromNodePath } from 'graphology-shortest-path'
import * as d3 from 'd3'

export default class overviewGraph {
  private currentPathway = '';
  private pathwaysContainingIntersection: string[] = []
  private pathwaysContainingUnion: string[] = []
  private renderer;

  constructor (containerID: string, graphData: graphData) {
    this.renderer = this.mainGraph(containerID, graphData)
    this.refreshCurrentPathway()
  }

  /**
     * Initializes the omics graph
     * @param {string} elemID
     * @param {graphData} graphData
     * @returns {Sigma} Sigma instance
     */
  mainGraph (elemID: string, graphData: graphData): Sigma {
    console.log(graphData)

    // select target div and initialize graph
    const elem = document.getElementById(elemID) as HTMLCanvasElement
    // draw rectangle per cluster
    // const ctx = elem.getContext('2d') as CanvasRenderingContext2D
    // ctx.rect(20, 20, 100, 100)
    // ctx.fill()
    // Blue rectangle
    // ctx.beginPath()
    // ctx.lineWidth = 10
    // ctx.strokeStyle = 'blue'
    // ctx.rect(50, 50, 150, 80)
    // ctx.stroke()
    const graph = UndirectedGraph.from(graphData)
    // console.log('NODES', graph.nodes())
    // noverlap.assign(graph)

    // const inferredSettings = forceAtlas2.inferSettings(graph)

    let shortestPathClick: string[] = []
    let shortestPathNodes: string[] = []
    let shortestPathEdges: string[] = []

    let highlighedEdgesClick = new Set()
    let highlighedNodesClick = new Set()
    // from events SIGMA2 example, initialze sets for highlight on hover:
    let highlighedNodesHover = new Set()
    let highlighedEdgesHover = new Set()
    let highlightedCenterHover = ''

    // node reducers change and return nodes based on an accessor function
    const nodeReducer = (node: string, data: Attributes) => {
      const nodeSize = (highlighedNodesHover.has(node) || (this.currentPathway === node.replace('path:', ''))) ? 15 : 10
      if (shortestPathNodes?.length > 0) {
        if (shortestPathClick.includes(node)) {
          return { ...data, color: 'rgba(255,0,255,1.0)', zIndex: 1, size: 15 }
        }
        if (shortestPathNodes.includes(node)) {
          return { ...data, color: 'rgba(255,180,255,1.0)', zIndex: 1, size: 10 }
        } else {
          return { ...data, color: 'rgba(255,255,255,1.0)', size: 5 }
        }
      }
      if (shortestPathClick.includes(node)) {
        return { ...data, color: 'rgba(255,0,255,1.0)', zIndex: 1, size: 15 }
      }
      if ((this.currentPathway === node.replace('path:', '')) || (highlightedCenterHover === node)) {
        return { ...data, color: 'rgba(255,0,0,1.0)', zIndex: 1, size: nodeSize }
      }
      if (this.pathwaysContainingIntersection.includes(node.replace('path:', ''))) {
        return { ...data, color: 'rgba(0,255,0,1.0)', zIndex: 1, size: nodeSize }
      }
      if (this.pathwaysContainingUnion.includes(node.replace('path:', ''))) {
        return { ...data, color: 'rgba(0,0,255,1.0)', zIndex: 1, size: nodeSize }
      }
      if (highlighedNodesHover.has(node)) {
        return { ...data, color: 'rgba(255,200,200,1.0)', zIndex: 1, size: nodeSize }
      }
      if (highlighedNodesClick.has(node)) {
        return { ...data, color: 'rgba(255,200,200,1.0)', zIndex: 1, size: nodeSize }
      }
      return data
    }

    // same for edges
    const edgeReducer = (edge: string, data: Attributes) => {
      if (shortestPathNodes?.length > 0) {
        if (shortestPathEdges?.includes(edge)) {
          return { ...data, color: 'rgba(255,180,255,1.0)', zIndex: 1, size: 4 }
        } else {
          return { ...data, size: 1 }
        }
      }
      if (highlighedEdgesHover.has(edge)) {
        return { ...data, color: 'rgba(255,0,0,1.0)', size: 4, zIndex: 1 }
      }
      if (highlighedEdgesClick.has(edge)) {
        return { ...data, color: 'rgba(255,0,0,1.0)', size: 1, zIndex: 1 }
      }

      return data
    }
    // end example

    // construct Sigma main instance
    const renderer = new Sigma(graph, elem, {
      nodeReducer: nodeReducer,
      edgeReducer: edgeReducer,
      zIndex: true, // enabling zIndex parameter
      renderLabels: true, // do not render labels w/o hover
      labelRenderedSizeThreshold: 20,
      edgeProgramClasses: {
        ...DEFAULT_SETTINGS.edgeProgramClasses,
        dashed: DashedEdgeProgram
      },
      nodeProgramClasses: {
        ...DEFAULT_SETTINGS.nodeProgramClasses,
        image: getNodeProgramImage()
      },
      hoverRenderer: drawHover
    })
    console.log('Node Programs:')
    console.log(renderer.getSetting('nodeProgramClasses'))

    // To directly assign the positions to the nodes:
    // const start = Date.now()
    // forceAtlas2.assign(graph, { iterations: 500, settings: inferredSettings })
    // const duration = (Date.now() - start) / 1000
    // console.log(`layoutDuration: ${duration} S`)
    // const layout = new FA2Layout(graph, {settings: sensibleSettings });
    // layout.start();

    // TODO: from events example:
    renderer.on('enterNode', ({ node }) => {
      // console.log('Entering: ', node)
      highlighedNodesHover = new Set(graph.neighbors(node))
      highlighedNodesHover.add(node)
      highlightedCenterHover = node

      highlighedEdgesHover = new Set(graph.edges(node))

      renderer.refresh()
    })

    renderer.on('leaveNode', ({ node }) => {
      console.log('Leaving:', node)

      highlighedNodesHover.clear()
      highlighedEdgesHover.clear()
      highlightedCenterHover = ''

      renderer.refresh()
    })

    renderer.on('clickNode', ({ node, event }) => {
      console.log('clicking Node: ', node)
      console.log('clicking event', event)
      if (event.original.ctrlKey) {
        store.dispatch('selectPathwayCompare', [node])
      } else if (event.original.altKey) {
        if (shortestPathClick.length === 2) shortestPathClick.pop()
        shortestPathClick.push(node)
        if (shortestPathClick.length === 2) {
          shortestPathNodes = bidirectional(graph, shortestPathClick[0], shortestPathClick[1]) as string[]
          if (shortestPathNodes?.length > 0) {
            shortestPathEdges = edgePathFromNodePath(graph, shortestPathNodes as string[])
            console.log('shortest Path edges', shortestPathEdges)
            store.dispatch('selectPathwayCompare', shortestPathNodes)
          } else {
            shortestPathClick = []
          }
        }
      } else {
        shortestPathClick = []
        shortestPathNodes = []
        shortestPathEdges = []
        highlighedEdgesClick.clear()
        highlighedNodesClick.clear()
        highlighedNodesClick = new Set(graph.neighbors(node))
        highlighedEdgesClick = new Set(graph.edges(node))
        store.dispatch('focusPathwayViaOverview', node)
      }
    })

    return renderer
  }

  /**
     * Pans to the specified Node
     * @param {Sigma} renderer
     * @param {string} nodeKey
     */
  panToNode (renderer: Sigma, nodeKey: string): void {
    console.log('pantestNode', {
      ...(renderer.getNodeDisplayData(nodeKey) as { x: number; y: number }),
      ratio: 0.3
    })
    this.panZoomToTarget(renderer, {
      ...(renderer.getNodeDisplayData(nodeKey) as { x: number; y: number }),
      ratio: 0.3
    })
  }

  /**
     * Pans and zooms to the specified Node
     * @param {Sigma} renderer
     * @param {string} nodeKey
     */
  panZoomToTarget (
    renderer: Sigma,
    target: { x: number; y: number; ratio: number }
  ) {
    console.log('pantest', target)
    renderer.getCamera().animate(target, {
      easing: 'linear',
      duration: 1000
    })
  }

  public refreshCurrentPathway () {
    this.currentPathway = store.state.pathwayDropdown
    this.renderer.refresh()
  }

  public setPathwaysContainingIntersecion (val: string[] = []) {
    this.pathwaysContainingIntersection = val
    this.renderer.refresh()
  }

  public setPathwaysContainingUnion (val: string[] = []) {
    this.pathwaysContainingUnion = val
    this.renderer.refresh()
  }

  public killGraph () {
    this.renderer.kill()
  }
}
