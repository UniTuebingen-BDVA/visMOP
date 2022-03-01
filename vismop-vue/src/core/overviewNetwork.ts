import { MultiGraph } from 'graphology'
import forceAtlas2 from 'graphology-layout-forceatlas2'
import Sigma from 'sigma'
import { graphData } from '@/core/graphTypes'
import getNodeProgramImage from 'sigma/rendering/webgl/programs/node.image'
import { Attributes } from 'graphology-types'
import drawHover from '@/core/customHoverRenderer'
import store from '@/store'
import { DEFAULT_SETTINGS } from 'sigma/settings'
import noverlap from 'graphology-layout-noverlap'

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
    const elem = document.getElementById(elemID) as HTMLElement
    const graph = MultiGraph.from(graphData)
    // console.log('NODES', graph.nodes())
    // noverlap.assign(graph)

    // const inferredSettings = forceAtlas2.inferSettings(graph)

    // from events SIGMA2 example, initialze sets for highlight on hover:
    let highlighedNodes = new Set()
    let highlighedEdges = new Set()
    // node reducers change and return nodes based on an accessor function
    const nodeReducer = (node: string, data: Attributes) => {
      if (this.currentPathway === node.replace('path:', '')) {
        return { ...data, color: 'rgba(255,0,0,1.0)', zIndex: 1 }
      }
      if (this.pathwaysContainingIntersection.includes(node.replace('path:', ''))) {
        return { ...data, color: 'rgba(0,255,0,1.0)', zIndex: 1 }
      }
      if (this.pathwaysContainingUnion.includes(node.replace('path:', ''))) {
        return { ...data, color: 'rgba(0,0,255,1.0)', zIndex: 1 }
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
    const renderer = new Sigma(graph, elem, {
      nodeReducer: nodeReducer,
      edgeReducer: edgeReducer,
      zIndex: true, // enabling zIndex parameter
      renderLabels: false, // do not render labels w/o hover
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
      console.log('Entering: ', node)
      highlighedNodes = new Set(graph.neighbors(node))
      highlighedNodes.add(node)

      highlighedEdges = new Set(graph.edges(node))

      renderer.refresh()
    })

    renderer.on('leaveNode', ({ node }) => {
      console.log('Leaving:', node)

      highlighedNodes.clear()
      highlighedEdges.clear()

      renderer.refresh()
    })

    renderer.on('clickNode', ({ node, event }) => {
      console.log('clicking Node: ', node)
      console.log('clicking event', event)
      if (event.original.ctrlKey) store.dispatch('selectPathwayCompare', node)
      else store.dispatch('focusPathwayViaOverview', node)
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
