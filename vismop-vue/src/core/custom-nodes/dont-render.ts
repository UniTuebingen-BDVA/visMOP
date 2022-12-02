import { AbstractEdgeProgram } from 'sigma/rendering/webgl/programs/common/edge';
import { EdgeDisplayData, NodeDisplayData } from 'sigma/types';
import { RenderParams } from 'sigma/rendering/webgl/programs/common/program';

export class DontRender extends AbstractEdgeProgram {
    constructor(gl: WebGLRenderingContext)  {
        super(gl, "", "", 0, 0);
        this.bind();
    };
    bind(): void {};
    computeIndices(): void {};
    process(sourceData: NodeDisplayData, targetData: NodeDisplayData, data: EdgeDisplayData, hidden: boolean, offset: number): void {};
    render(params: RenderParams): void {};
}