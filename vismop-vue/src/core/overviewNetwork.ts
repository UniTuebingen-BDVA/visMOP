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
  private currentPathway = '';
  private pathwaysContainingIntersection: string[] = [];
  private pathwaysContainingUnion: string[] = [];
  private renderer;
  private camera;
  private prevFrameZoom;
  private graph;
  private lodRatio = 2.0;
  private cancelCurrentAnimation: (() => void) | null = null;
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

    let shortestPathClick: string[] = [];
    let shortestPathNodes: string[] = [];
    let shortestPathEdges: string[] = [];

    let highlighedEdgesClick = new Set();
    let highlighedNodesClick = new Set();
    // from events SIGMA2 example, initialze sets for highlight on hover:
    let highlighedNodesHover = new Set();
    let highlighedEdgesHover = new Set();
    let highlightedCenterHover = '';

    // node reducers change and return nodes based on an accessor function
    const nodeReducer = (node: string, data: Attributes) => {
      // handle filter
      const hidden = data.hidden;
      let condition = false;
      let xDisplay: number | undefined = -100;
      let yDisplay: number | undefined = -100;
      if (this.renderer) {
        const currentView = this.renderer.viewRectangle();
        xDisplay = this.renderer.getNodeDisplayData(node)?.x;
        yDisplay = this.renderer.getNodeDisplayData(node)?.y;

        if (!xDisplay) {
          xDisplay = -100;
        }
        if (!yDisplay) {
          yDisplay = -100;
        }
        condition =
          this.renderer.getCamera().ratio < 0.4 &&
          xDisplay >= currentView.x1 &&
          xDisplay <= currentView.x2 &&
          yDisplay >= currentView.y1 - currentView.height &&
          yDisplay <= currentView.y2;
      }

      const lodImage = condition ? data.imageHighRes : data.imageLowRes;

      const nodeSize =
        highlighedNodesHover.has(node) ||
        this.currentPathway === node.replace('path:', '')
          ? 15
          : 10;
      if (shortestPathNodes?.length > 0) {
        if (shortestPathClick.includes(node)) {
          return {
            ...data,
            color: 'rgba(255,0,255,1.0)',
            zIndex: 1,
            size: 15,
            image: lodImage,
          };
        }
        if (shortestPathNodes.includes(node)) {
          return {
            ...data,
            color: 'rgba(255,180,255,1.0)',
            zIndex: 1,
            size: 10,
            image: lodImage,
          };
        } else {
          return {
            ...data,
            color: 'rgba(255,255,255,1.0)',
            size: 5,
            image: lodImage,
          };
        }
      }
      if (shortestPathClick.includes(node)) {
        return {
          ...data,
          color: 'rgba(255,0,255,1.0)',
          zIndex: 1,
          size: 15,
          image: lodImage,
        };
      }
      if (
        this.currentPathway === node.replace('path:', '') ||
        highlightedCenterHover === node
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
      if (highlighedNodesHover.has(node)) {
        return {
          ...data,
          color: 'rgba(255,200,200,1.0)',
          zIndex: 1,
          size: nodeSize,
          image: lodImage,
        };
      }
      if (highlighedNodesClick.has(node)) {
        return {
          ...data,
          color: 'rgba(255,200,200,1.0)',
          zIndex: 1,
          size: nodeSize,
          image: lodImage,
        };
      }
      return { ...data, hidden: hidden, image: lodImage };
    };

    // same for edges
    const edgeReducer = (edge: string, data: Attributes) => {
      if (shortestPathNodes?.length > 0) {
        if (shortestPathEdges?.includes(edge)) {
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
      if (highlighedEdgesHover.has(edge)) {
        return { ...data, color: 'rgba(255,0,0,1.0)', size: 4, zIndex: 1 };
      }
      if (highlighedEdgesClick.has(edge)) {
        return { ...data, color: 'rgba(255,0,0,1.0)', size: 1, zIndex: 1 };
      }

      return data;
    };
    // end example

    // construct Sigma main instance
    const renderer = new Sigma(this.graph, elem, {
      nodeReducer: nodeReducer,
      edgeReducer: edgeReducer,
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
      highlighedNodesHover = new Set(this.graph.neighbors(node));
      highlighedNodesHover.add(node);
      highlightedCenterHover = node;

      highlighedEdgesHover = new Set(this.graph.edges(node));

      renderer.refresh();
    });

    renderer.on('beforeRender', () => {
      this.zoomLod();
      this.filterElements();
    });

    renderer.on('leaveNode', ({ node }) => {
      console.log('Leaving:', node);

      highlighedNodesHover.clear();
      highlighedEdgesHover.clear();
      highlightedCenterHover = '';
      renderer.refresh();
    });

    renderer.on('clickNode', ({ node, event }) => {
      console.log('clicking Node: ', node);
      console.log('clicking event', event);
      if (event.original.ctrlKey) {
        mainStore.selectPathwayCompare([node]);
      } else if (event.original.altKey) {
        if (shortestPathClick.length === 2) shortestPathClick.pop();
        shortestPathClick.push(node);
        if (shortestPathClick.length === 2) {
          shortestPathNodes = bidirectional(
            this.graph,
            shortestPathClick[0],
            shortestPathClick[1]
          ) as string[];
          if (shortestPathNodes?.length > 0) {
            shortestPathEdges = edgePathFromNodePath(
              this.graph,
              shortestPathNodes as string[]
            );
            console.log('shortest Path edges', shortestPathEdges);
            mainStore.selectPathwayCompare(shortestPathNodes);
          } else {
            shortestPathClick = [];
          }
        }
      } else {
        shortestPathClick = [];
        shortestPathNodes = [];
        shortestPathEdges = [];
        highlighedEdgesClick.clear();
        highlighedNodesClick.clear();
        highlighedNodesClick = new Set(this.graph.neighbors(node));
        highlighedEdgesClick = new Set(this.graph.edges(node));
        mainStore.focusPathwayViaOverview(node);
      }
    });

    return renderer;
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
          easing: 'quadraticOut',
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
        };
      });
      this.cancelCurrentAnimation = animateNodes(this.graph, tarPositions, {
        duration: 2000,
        easing: 'quadraticOut',
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

  public resetZoom() {
    this.camera.animatedReset({ duration: 1000 });
  }

  public refreshCurrentPathway() {
    const mainStore = useMainStore();
    this.currentPathway = mainStore.pathwayDropdown.value;
    this.renderer.refresh();
  }

  public setPathwaysContainingIntersecion(val: string[] = []) {
    this.pathwaysContainingIntersection = val;
    this.renderer.refresh();
  }

  public setPathwaysContainingUnion(val: string[] = []) {
    this.pathwaysContainingUnion = val;
    this.renderer.refresh();
  }

  public killGraph() {
    this.renderer.kill();
  }

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
