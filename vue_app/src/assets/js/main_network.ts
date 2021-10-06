import {MultiGraph} from "graphology";
import FA2Layout from "graphology-layout-forceatlas2/worker";
import forceAtlas2 from "graphology-layout-forceatlas2";
import Sigma from "sigma"
import { graphData, nodeAttr } from './graphTypes';
import CustomNodeProgram from "./custom-nodes/custom-node-program";
import arrowProgram from "sigma/rendering/webgl/programs/edge.arrow"
import { Attributes, EdgeKey, NodeKey } from "graphology-types";
import drawHover from "./customHoverRenderer";
import { animateNodes } from "sigma/utils/animate";
import { PlainObject } from "sigma/types";

export function mainGraph(elemID: string, data: graphData): Sigma {
    console.log(data)
    const elem = document.getElementById(elemID) as HTMLElement;
    const graph = MultiGraph.from(data)
    console.log("NODES",graph.nodes())
    const inferredSettings = forceAtlas2.inferSettings(graph);

    //from events example:
    let highlighedNodes = new Set();
    let highlighedEdges = new Set();
    
    const nodeReducer = (node: NodeKey, data: Attributes) => {
      if (highlighedNodes.has(node)) return { ...data, color: "#f00", zIndex: 1 };
    
      return data;
    };
    
    const edgeReducer = (edge: EdgeKey, data: Attributes) => {
      if (highlighedEdges.has(edge)) return { ...data, color: "#f00", zIndex: 1 };
    
      return data;
    };
    //end example

    const renderer = new Sigma(graph, elem,{
        nodeReducer: nodeReducer,
        edgeReducer: edgeReducer,
        zIndex: true,
        renderLabels: false,
        nodeProgramClasses:{
            splitSquares: CustomNodeProgram
        },
        edgeProgramClasses:{},
        hoverRenderer: drawHover,
    });
    console.log(`Node Programs:`)
    console.log(renderer.getSetting("nodeProgramClasses"))

    // To directly assign the positions to the nodes:
    const start = Date.now()
    forceAtlas2.assign(graph,{iterations:500 , settings: inferredSettings});
    const duration = (Date.now() - start)/1000
    console.log(`layoutDuration: ${duration} S`)
    //const layout = new FA2Layout(graph, {settings: sensibleSettings });
    //layout.start();
    
    //TODO: from events example:
    renderer.on("enterNode", ({ node }) => {
        console.log("Entering: ", node);
        highlighedNodes = new Set(graph.neighbors(node));
        highlighedNodes.add(node);
      
        highlighedEdges = new Set(graph.edges(node));
      
        renderer.refresh();
      });
      
      renderer.on("leaveNode", ({ node }) => {
        console.log("Leaving:", node);
      
        highlighedNodes.clear();
        highlighedEdges.clear();
      
        renderer.refresh();
      });



    return renderer
}

export function panToNode(renderer: Sigma, nodeKey: string){
    renderer.getCamera().animate({...renderer.getNodeDisplayData(nodeKey) as { x: number; y: number }, ratio:0.05}, {
        easing: "linear",
        duration: 500,
      });
      
}

export function layoutToPathway(renderer: Sigma, pathway: string, nodeIDs: string[]){
    const graph = renderer.getGraph()
    const inferredSettings = forceAtlas2.inferSettings(graph);

    nodeIDs.forEach(
        nodeID => {
            graph.updateNode(
                nodeID,
                (attr:Attributes) => {
                    console.log("layout attr",attr)
                    return {
                        ...attr,
                        fixed: true,
                        x: (attr.origPos[pathway][0] - 0.5) * 1000,
                        y: (attr.origPos[pathway][1] - 0.5) * 1000
                    }
                }
            )
        }
    )
    forceAtlas2.assign(graph,{iterations:500 , settings: inferredSettings});
}