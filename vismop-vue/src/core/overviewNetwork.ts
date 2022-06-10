import { UndirectedGraph } from 'graphology';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import noverlap from 'graphology-layout-noverlap';
import Sigma from 'sigma';
import { graphData } from '@/core/graphTypes';
import getNodeProgramImage from 'sigma/rendering/webgl/programs/node.image';
import DashedEdgeProgram from '@/core/custom-nodes/dashed-edge-program';
import { Attributes } from 'graphology-types';
import drawHover from '@/core/customHoverRenderer';
import { useMainStore } from '@/stores';
import { DEFAULT_SETTINGS } from 'sigma/settings';
import { bidirectional, edgePathFromNodePath } from 'graphology-shortest-path';
import { filterValues } from './generalTypes';
import { PlainObject } from 'sigma/types';
import { animateNodes } from 'sigma/utils/animate';
import { Object } from 'lodash';

export default class overviewGraph {
  // constants
  static readonly DEFAULT_SIZE = 10;
  static readonly ROOT_DEFAULT_SIZE = 15;

  // data structures for reducers
  private shortestPathClick: string[] = [];
  private shortestPathNodes: string[] = [];
  private shortestPathEdges: string[] = [];
  private highlighedEdgesClick = new Set();
  private highlighedNodesClick = new Set();
  //from events SIGMA2 example, initialze sets for highlight on hover:
  private highlighedNodesHover = new Set();
  private highlighedEdgesHover = new Set();
  private highlightedCenterHover = '';
  private currentPathway = '';
  private pathwaysContainingIntersection: string[] = [];
  private pathwaysContainingUnion: string[] = [];

  // renderer and camera
  private renderer;
  private camera;
  private prevFrameZoom;
  private graph;
  private lodRatio = 2.0;
  private cancelCurrentAnimation: (() => void) | null = null;

  // filter
  private filtersChanged = false;
  private filterFuncTrans: (x: number) => boolean = (_x: number) => true;
  private filterFuncProt: (x: number) => boolean = (_x: number) => true;
  private filterFuncMeta: (x: number) => boolean = (_x: number) => true;
  private averageFilter: {
    transcriptomics: filterValues;
    proteomics: filterValues;
    metabolomics: filterValues;
  } = {
    transcriptomics: {
      limits: {
        min: 0,
        max: 0,
      },
      value: {
        min: 0,
        max: 0,
      },
      filterActive: false,
      inside: false,
      disable: true,
    },
    proteomics: {
      limits: {
        min: 0,
        max: 0,
      },
      value: {
        min: 0,
        max: 0,
      },
      filterActive: false,
      inside: false,
      disable: true,
    },
    metabolomics: {
      limits: {
        min: 0,
        max: 0,
      },
      value: {
        min: 0,
        max: 0,
      },
      filterActive: false,
      inside: false,
      disable: true,
    },
  };

  constructor(containerID: string, graphData: graphData) {
    this.graph = UndirectedGraph.from(graphData);
    this.renderer = this.mainGraph(containerID);
    this.camera = this.renderer.getCamera();
    this.prevFrameZoom = this.camera.ratio;
    this.refreshCurrentPathway();
  }

  /**
   * Initializes the omics graph
   * @param {string} elemID
   * @param {graphData} graphData
   * @returns {Sigma} Sigma instance
   */
  mainGraph(elemID: string): Sigma {
    const mainStore = useMainStore();

    // select target div and initialize graph
    const elem = document.getElementById(elemID) as HTMLElement;

    // console.log('NODES', graph.nodes())

    const inferredSettings = forceAtlas2.inferSettings(this.graph);

    // end example

    // construct Sigma main instance
    const renderer = new Sigma(this.graph, elem, {
      nodeReducer: this.nodeReducer,
      edgeReducer: this.edgeReducer,
      zIndex: true, // enabling zIndex parameter
      renderLabels: true, // do not render labels w/o hover
      labelRenderedSizeThreshold: 20,
      edgeProgramClasses: {
        ...DEFAULT_SETTINGS.edgeProgramClasses,
        dashed: DashedEdgeProgram,
      },
      nodeProgramClasses: {
        ...DEFAULT_SETTINGS.nodeProgramClasses,
        image: getNodeProgramImage(),
      },
      hoverRenderer: drawHover,
    });
    console.log('Node Programs:');
    console.log(renderer.getSetting('nodeProgramClasses'));

    // To directly assign the positions to the nodes:
    const start = Date.now();
    forceAtlas2.assign(this.graph, {
      iterations: 500,
      settings: inferredSettings,
    });
    noverlap.assign(this.graph);
    const duration = (Date.now() - start) / 1000;
    console.log(`layoutDuration: ${duration} S`);
    // const layout = new FA2Layout(graph, {settings: sensibleSettings });
    // layout.start();
    this.graph.forEachNode((node, attributes) => {
      attributes.layoutX = attributes.x;
      attributes.layoutY = attributes.y;
    });
    // TODO: from events example:
    renderer.on('enterNode', ({ node }) => {
      // console.log('Entering: ', node)
      this.highlighedNodesHover = new Set(this.graph.neighbors(node));
      this.highlighedNodesHover.add(node);
      this.highlightedCenterHover = node;

      this.highlighedEdgesHover = new Set(this.graph.edges(node));

      renderer.refresh();
    });

    renderer.on('beforeRender', () => {
      this.zoomLod();
      this.filterElements();
    });

    renderer.on('leaveNode', ({ node }) => {
      console.log('Leaving:', node);

      this.highlighedNodesHover.clear();
      this.highlighedEdgesHover.clear();
      this.highlightedCenterHover = '';
      renderer.refresh();
    });

    renderer.on('clickNode', ({ node, event }) => {
      console.log('clicking Node: ', node);
      console.log('clicking event', event);
      if (event.original.ctrlKey) {
        mainStore.selectPathwayCompare([node]);
      } else if (event.original.altKey) {
        if (this.shortestPathClick.length === 2) this.shortestPathClick.pop();
        this.shortestPathClick.push(node);
        if (this.shortestPathClick.length === 2) {
          this.shortestPathNodes = bidirectional(
            this.graph,
            this.shortestPathClick[0],
            this.shortestPathClick[1]
          ) as string[];
          if (this.shortestPathNodes?.length > 0) {
            this.shortestPathEdges = edgePathFromNodePath(
              this.graph,
              this.shortestPathNodes as string[]
            );
            console.log('shortest Path edges', this.shortestPathEdges);
            mainStore.selectPathwayCompare(this.shortestPathNodes);
          } else {
            this.shortestPathClick = [];
          }
        }
      } else {
        this.shortestPathClick = [];
        this.shortestPathNodes = [];
        this.shortestPathEdges = [];
        this.highlighedEdgesClick.clear();
        this.highlighedNodesClick.clear();
        this.highlighedNodesClick = new Set(this.graph.neighbors(node));
        this.highlighedEdgesClick = new Set(this.graph.edges(node));
        mainStore.focusPathwayViaOverview(node);
      }
    });

    return renderer;
  }
  /**
   * node reducer function applying reduction function for specific scenarios
   *
   * @param node Node name
   * @param data Node Attributes
   * @returns reduced Attributes
   */
  nodeReducer(node: string, data: Attributes): Attributes {
    if (this.renderer) {
      // handle lod detail

      const hidden = data.hidden;
      let lodCondition = false;
      let xDisplay: number | undefined = -100;
      let yDisplay: number | undefined = -100;

      const currentView = this.renderer.viewRectangle();
      xDisplay = this.renderer.getNodeDisplayData(node)?.x;
      yDisplay = this.renderer.getNodeDisplayData(node)?.y;

      if (!xDisplay) {
        xDisplay = -100;
      }
      if (!yDisplay) {
        yDisplay = -100;
      }
      lodCondition =
        this.renderer.getCamera().ratio < 0.4 &&
        xDisplay >= currentView.x1 &&
        xDisplay <= currentView.x2 &&
        yDisplay >= currentView.y1 - currentView.height &&
        yDisplay <= currentView.y2;

      const lodImage = lodCondition ? data.imageHighRes : data.imageLowRes;

      // handle node size

      const nodeSize =
        this.highlightedCenterHover === node ||
        this.highlighedNodesHover.has(node) ||
        this.currentPathway === node.replace('path:', '')
          ? data.nonHoverSize + 10
          : data.nonHoverSize;

      // shortest Path
      if (this.shortestPathNodes?.length > 0) {
        if (this.shortestPathClick.includes(node)) {
          return {
            ...data,
            color: 'rgba(255,0,255,1.0)',
            zIndex: 1,
            size: data.size + 5,
            image: lodImage,
          };
        }
        if (this.shortestPathNodes.includes(node)) {
          return {
            ...data,
            color: 'rgba(255,180,255,1.0)',
            zIndex: 1,
            size: data.nonHoverSize,
            image: lodImage,
          };
        } else {
          return {
            ...data,
            color: 'rgba(255,255,255,1.0)',
            size: data.nonHoverSize - 5,
            image: lodImage,
          };
        }
      }
      if (this.shortestPathClick.includes(node)) {
        return {
          ...data,
          color: 'rgba(255,0,255,1.0)',
          zIndex: 1,
          size: data.nonHoverSize - 5,
          image: lodImage,
        };
      }
      if (
        this.currentPathway === node.replace('path:', '') ||
        this.highlightedCenterHover === node
      ) {
        return {
          ...data,
          color: 'rgba(255,0,0,1.0)',
          zIndex: 1,
          size: nodeSize,
          image: lodImage,
        };
      }
      if (
        this.pathwaysContainingIntersection.includes(node.replace('path:', ''))
      ) {
        return {
          ...data,
          color: 'rgba(0,255,0,1.0)',
          zIndex: 1,
          size: nodeSize,
          image: lodImage,
        };
      }
      if (this.pathwaysContainingUnion.includes(node.replace('path:', ''))) {
        return {
          ...data,
          color: 'rgba(0,0,255,1.0)',
          zIndex: 1,
          size: nodeSize,
          image: lodImage,
        };
      }
      if (this.highlighedNodesHover.has(node)) {
        return {
          ...data,
          color: 'rgba(255,200,200,1.0)',
          zIndex: 1,
          size: nodeSize,
          image: lodImage,
        };
      }
      if (this.highlighedNodesClick.has(node)) {
        return {
          ...data,
          color: 'rgba(255,200,200,1.0)',
          zIndex: 1,
          size: nodeSize,
          image: lodImage,
        };
      }
      return {
        ...data,
        hidden: hidden,
        image: lodImage,
      };
    } else {
      return data;
    }
  }

  /**
   *  Edge reducer function applying reduction function for specific scenarios
   *
   * @param edge edge name
   * @param data edge attributes
   * @returns reduced attributes
   */

  edgeReducer(edge: string, data: Attributes): Attributes {
    if (this.shortestPathNodes?.length > 0) {
      if (this.shortestPathEdges?.includes(edge)) {
        return {
          ...data,
          color: 'rgba(255,180,255,1.0)',
          zIndex: 1,
          size: 4,
        };
      } else {
        return { ...data, size: 1 };
      }
    }
    if (this.highlighedEdgesHover.has(edge)) {
      return { ...data, color: 'rgba(255,0,0,1.0)', size: 4, zIndex: 1 };
    }
    if (this.highlighedEdgesClick.has(edge)) {
      return { ...data, color: 'rgba(255,0,0,1.0)', size: 1, zIndex: 1 };
    }

    return data;
  }

  /**
   * Pans and zooms to the specified Node
   * @param {Sigma} renderer
   * @param {string} nodeKey
   */
  panZoomToTarget(
    renderer: Sigma,
    target: { x: number; y: number; ratio: number }
  ) {
    console.log('pantest', target);
    renderer.getCamera().animate(target, {
      easing: 'linear',
      duration: 1000,
    });
  }

  /**
   * Pans to the specified Node
   * @param {Sigma} renderer
   * @param {string} nodeKey
   */
  panToNode(renderer: Sigma, nodeKey: string): void {
    console.log('pantestNode', {
      ...(renderer.getNodeDisplayData(nodeKey) as { x: number; y: number }),
      ratio: 0.3,
    });
    this.panZoomToTarget(renderer, {
      ...(renderer.getNodeDisplayData(nodeKey) as { x: number; y: number }),
      ratio: 0.3,
    });
  }
  /**
   *  Defines behaviour for node animations triggered by the zoom level
   */
  zoomLod() {
    //console.log( 'zoomBehaivour Last/Now: ',this.prevFrameZoom, this.camera.ratio);
    if (
      this.prevFrameZoom > this.lodRatio &&
      this.camera.ratio < this.lodRatio
    ) {
      if (this.cancelCurrentAnimation) this.cancelCurrentAnimation();
      const tarPositions: PlainObject<PlainObject<number>> = {};
      this.graph.forEachNode((node, attributes) => {
        tarPositions[node] = {
          x: attributes.layoutX,
          y: attributes.layoutY,
          size: attributes.isRoot
            ? overviewGraph.ROOT_DEFAULT_SIZE
            : overviewGraph.DEFAULT_SIZE,
          nonHoverSize: attributes.isRoot
            ? overviewGraph.ROOT_DEFAULT_SIZE
            : overviewGraph.DEFAULT_SIZE,
        };
      });
      this.cancelCurrentAnimation = animateNodes(this.graph, tarPositions, {
        duration: 2000,
        //easing: 'quadraticOut',
      });
      this.graph.forEachNode((node, attributes) => {
        attributes.hidden = false;
      });
    }
    if (
      this.prevFrameZoom < this.lodRatio &&
      this.camera.ratio > this.lodRatio
    ) {
      if (this.cancelCurrentAnimation) this.cancelCurrentAnimation();
      const tarPositions: PlainObject<PlainObject<number>> = {};
      this.graph.forEachNode((node, attributes) => {
        tarPositions[node] = {
          x: this.graph.getNodeAttribute(attributes.rootId, 'layoutX'),
          y: this.graph.getNodeAttribute(attributes.rootId, 'layoutY'),
          size: attributes.isRoot ? 30 : 0,
          nonHoverSize: attributes.isRoot ? 30 : 0,
        };
      });
      this.cancelCurrentAnimation = animateNodes(
        this.graph,
        tarPositions,
        {
          duration: 2000,
          easing: 'quadraticOut',
        },
        () => {
          this.graph.forEachNode((node, attributes) => {
            if (!attributes.isRoot) attributes.hidden = true;
          });
        }
      );
    }
    this.prevFrameZoom = this.camera.ratio;
  }

  /**
   * Resets camera zoom and position
   */
  public resetZoom() {
    this.camera.animatedReset({ duration: 1000 });
  }

  /**
   * Refresehes sets current pathway to the versionen selected in the store
   */
  public refreshCurrentPathway() {
    const mainStore = useMainStore();
    this.currentPathway = mainStore.pathwayDropdown.value;
    this.renderer.refresh();
  }

  /**
   * Sets Pathways containing an intersection of the selected entities of interest
   * @param val list of IDs defining the intersection
   */
  public setPathwaysContainingIntersecion(val: string[] = []) {
    this.pathwaysContainingIntersection = val;
    this.renderer.refresh();
  }

  /**
   * Sets Pathways containing an union of the selected entities of interest
   * @param val  lost of IDs defining the union
   */
  public setPathwaysContainingUnion(val: string[] = []) {
    this.pathwaysContainingUnion = val;
    this.renderer.refresh();
  }

  /**
   * Kills the Graph instance
   */
  public killGraph() {
    this.renderer.kill();
  }

  /**
   * Function used to apply the GUI filter to a single overview node
   * @param attributes node attributes
   * @returns boolean, indicating pass or block by filter
   */
  filterFunction(attributes: Record<string, number>) {
    if (attributes.isRoot) {
      return false;
    } else if (
      this.filterFuncTrans(attributes.averageTranscriptomics) &&
      this.filterFuncProt(attributes.averageProteomics) &&
      this.filterFuncMeta(attributes.averageMetabolonmics)
    ) {
      return false;
    } else {
      return true;
    }
  }

  /**
   * Apply GUI filter to graph
   */
  filterElements() {
    if (this.filtersChanged) {
      this.filtersChanged = false;
      const tarPositions: PlainObject<PlainObject<number>> = {};
      this.graph.forEachNode((node, attributes) => {
        if (!this.filterFunction(attributes)) attributes.hidden = false;
      });
      this.graph.forEachNode((node, attributes) => {
        if (this.filterFunction(attributes)) {
          tarPositions[node] = {
            x: this.graph.getNodeAttribute(attributes.rootId, 'layoutX'),
            y: this.graph.getNodeAttribute(attributes.rootId, 'layoutY'),
          };
        } else {
          tarPositions[node] = {
            x: attributes.layoutX,
            y: attributes.layoutY,
          };
        }
      });
      this.cancelCurrentAnimation = animateNodes(
        this.graph,
        tarPositions,
        {
          duration: 2000,
          //easing: 'quadraticOut',
        },
        () => {
          this.graph.forEachNode((node, attributes) => {
            this.filterFunction(attributes)
              ? (attributes.hidden = true)
              : (attributes.hidden = false);
          });
        }
      );
    }
  }

  /**
   * Call this function when GUI filters are changed to set member variables to the new filter functions
   * @param transcriptomics set of transcriptomics GUI filter values
   * @param proteomics  set of proteomics GUI filter values
   * @param metabolomics  set of metabolomics GUI filter values
   */
  public setAverageFilter(
    transcriptomics: filterValues,
    proteomics: filterValues,
    metabolomics: filterValues
  ) {
    this.averageFilter.transcriptomics = transcriptomics;
    this.averageFilter.proteomics = proteomics;
    this.averageFilter.metabolomics = metabolomics;

    this.filterFuncTrans = this.averageFilter.transcriptomics.filterActive
      ? this.averageFilter.transcriptomics.inside
        ? (x: number) => {
            return (
              x <= this.averageFilter.transcriptomics.value.max &&
              x >= this.averageFilter.transcriptomics.value.min
            );
          }
        : (x: number) => {
            return (
              x >= this.averageFilter.transcriptomics.value.max ||
              x <= this.averageFilter.transcriptomics.value.min
            );
          }
      : (_x: number) => true;
    this.filterFuncProt = this.averageFilter.proteomics.filterActive
      ? this.averageFilter.proteomics.inside
        ? (x: number) => {
            return (
              x <= this.averageFilter.proteomics.value.max &&
              x >= this.averageFilter.proteomics.value.min
            );
          }
        : (x: number) => {
            return (
              x >= this.averageFilter.proteomics.value.max ||
              x <= this.averageFilter.proteomics.value.min
            );
          }
      : (_x: number) => true;
    this.filterFuncMeta = this.averageFilter.metabolomics.filterActive
      ? this.averageFilter.metabolomics.inside
        ? (x: number) => {
            return (
              x <= this.averageFilter.metabolomics.value.max &&
              x >= this.averageFilter.metabolomics.value.min
            );
          }
        : (x: number) => {
            return (
              x >= this.averageFilter.metabolomics.value.max ||
              x <= this.averageFilter.metabolomics.value.min
            );
          }
      : (_x: number) => true;
    this.filtersChanged = true;
    this.renderer.refresh();
  }
}
