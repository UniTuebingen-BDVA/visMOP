import {MultiGraph} from "graphology";
import FA2Layout from "graphology-layout-forceatlas2/worker";
import forceAtlas2 from "graphology-layout-forceatlas2";
import Sigma from "sigma"
import { graphData } from './graphTypes';
import CustomNodeProgram from "./custom-nodes/custom-node-program";
import arrowProgram from "sigma/rendering/webgl/programs/edge.arrow"


export function mainGraph(elemID: string, data: graphData): Sigma {
    console.log(data)
    const elem = document.getElementById(elemID) as HTMLElement;
    const graph = MultiGraph.from(data)
    const sensibleSettings = forceAtlas2.inferSettings(graph);
    const renderer = new Sigma(graph, elem,{
        nodeProgramClasses:{
            splitSquares: CustomNodeProgram
        },
        edgeProgramClasses:{}
    });
    console.log(`Node Programs:`)
    console.log(renderer.getSetting("nodeProgramClasses"))

    // To directly assign the positions to the nodes:
    const start = Date.now()
    forceAtlas2.assign(graph,{iterations:500 , settings: sensibleSettings});
    const duration = (Date.now() - start)/1000
    console.log(`layoutDuration: ${duration} S`)
    //const layout = new FA2Layout(graph, {settings: sensibleSettings });
    //layout.start();
    return renderer
}
