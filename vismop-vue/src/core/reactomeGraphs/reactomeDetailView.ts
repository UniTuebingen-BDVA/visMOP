import { useMainStore } from '@/stores';
import * as d3 from 'd3';
import {
  foldChangesByID,
  foldChangesByType,
  layoutJSON,
  reactomeEdge,
  shape,
  connector,
  segment,
  reactomeNode,
  graphJSON,
} from './reactomeTypes';
import { glyph } from '../overviewGlyphs/overviewGlyph';

const _colorsAlternative: { [key: string]: string } = {
  // from https://github.com/reactome-pwp/diagram/blob/master/src/main/resources/org/reactome/web/diagram/profiles/diagram/profile_02.json
  Chemical: '#A5D791',
  ChemicalDrug: '#B89AE6',
  compartment: 'rgba(235, 178, 121, 0.5)',
  compartmentEdge: 'rgb(235, 178, 121)',
  Complex: '#ABD1E3',
  Entity: '#A5D791',
  EntitySet: '#A0BBCD',
  Gene: '#F3D1AF',
  ProcessNode: '#A5D791',
  EncapsulatedNode: '#A5D791',
  Protein: '#8DC7BB',
  RNA: '#A5D791',
  ComplexDrug: '#FFFFFF',
  EntitySetDrug: '#FFFFFF',
};
// main color table containing grays for most nodes to indicated the unavailibility of the corresponding elements in the suppliet dataset
const colors: { [key: string]: string } = {
  Chemical: '#999999',
  ChemicalDrug: '#999999',
  compartment: 'rgba(180, 180, 180, 0.5)',
  compartmentEdge: 'rgb(180, 180, 180)',
  Complex: '#999999',
  Entity: '#999999',
  EntitySet: '#999999',
  Gene: '#999999',
  ProcessNode: '#999999',
  EncapsulatedNode: '#999999',
  Protein: '#999999',
  RNA: '#999999',
  ComplexDrug: '#999999',
  EntitySetDrug: '#999999',
};
const lineColor = '#333333';
const fontSize = '10px';
const compartmentFontSize = '16px';

export default class ReactomeDetailView {
  private mainSVG: d3.Selection<SVGSVGElement, unknown, HTMLElement, unknown>;
  private mainChartArea: d3.Selection<
    SVGGElement,
    unknown,
    HTMLElement,
    unknown
  >;
  private comparmentG: d3.Selection<SVGGElement, unknown, HTMLElement, unknown>;
  private nodesG: d3.Selection<SVGGElement, unknown, HTMLElement, unknown>;
  private linesG: d3.Selection<SVGGElement, unknown, HTMLElement, unknown>;
  private tooltipG: d3.Selection<SVGGElement, unknown, HTMLElement, unknown>;
  private layoutData: layoutJSON;
  private graphData: graphJSON;
  private containerID: string;
  private colorScaleTranscriptomics = useMainStore().fcScales.transcriptomics;
  private colorScaleProteomics = useMainStore().fcScales.proteomics;
  private colorScaleMetabolomics = useMainStore().fcScales.metabolomics;
  private foldChanges: foldChangesByType;
  private foldChangeReactome: foldChangesByID;
  /**
   * Initializes the Reactome detail View
   * @param {layoutJSON} layoutData
   * @param {graphJSON} graphData
   * @param {string} containerID
   * @param {proteomics: {[key: number]: number}, transcriptomics:{[key: number]: number}, metabolomics:{[key: number]: number}} foldchanges
   * @param {foldChangesByID} foldChangeReactome
   */
  constructor(
    layoutData: layoutJSON,
    graphData: graphJSON,
    containerID: string,
    foldchanges: foldChangesByType,
    foldChangeReactome: foldChangesByID
  ) {
    this.containerID = containerID;
    this.layoutData = layoutData;
    this.graphData = graphData;
    this.foldChanges = foldchanges; // by stable ID: R-MMU-12345
    this.foldChangeReactome = foldChangeReactome; // by internal ID: 12345
    console.log(foldChangeReactome);
    const box = document.querySelector(containerID)?.getBoundingClientRect();
    const width = box?.width as number;
    const height = box?.height as number;
    this.mainSVG = d3
      .select(containerID)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, this.layoutData.maxX, this.layoutData.maxY]);
    this.mainChartArea = this.mainSVG.append('g');
    this.comparmentG = this.mainChartArea.append('g');
    this.linesG = this.mainChartArea.append('g');
    this.nodesG = this.mainChartArea.append('g');
    this.tooltipG = this.mainChartArea
      .append('g')
      .attr('id', 'tooltipG')
      .on('click', (_event, _d) => {
        d3.select('#tooltipG').selectAll('svg').remove();
        d3.select('#tooltipG').selectAll('circle').remove();
      });

    // order of drawing corresponds to ordering of elements
    // draw Compartments
    this.drawCompartments();
    // todo draw shadows (i.e. the subpathways?!)
    // draw Nodes
    this.drawNodes();

    this.drawSegments();
    this.drawConnectors();
    this.drawReactionNodes();
    this.drawEndShapes();
    this.drawLinks();
    const zoom = d3.zoom<SVGSVGElement, unknown>().on('zoom', (event) => {
      const { transform } = event;
      this.mainChartArea.attr('transform', transform);
    });
    this.mainSVG.call(zoom);
  }
  /*
  Major drawing functions
  */

  /**
   * Function to draw cellular compartments contained in the diagram.
   */
  private drawCompartments() {
    this.comparmentG
      .selectAll()
      .data(this.layoutData.compartments)
      .enter()
      .append('rect')
      .attr('id', function (d, i) {
        return 'compartment' + i;
      })
      .attr('x', (d) => d.prop.x)
      .attr('y', (d) => d.prop.y)
      .attr('width', (d) => d.prop.width)
      .attr('height', (d) => d.prop.height)
      .attr('stroke-width', 6)
      .attr('stroke', colors.compartmentEdge)
      .attr('fill', colors.compartment);

    const entriesWithInsets = this.layoutData.compartments.filter((d) => {
      return 'insets' in d;
    });
    this.comparmentG
      .selectAll()
      .data(entriesWithInsets)
      .enter()
      .append('rect')
      .attr('id', function (d, i) {
        return 'compartment_inset' + i;
      })
      .attr('x', (d) => d.insets.x)
      .attr('y', (d) => d.insets.y)
      .attr('width', (d) => d.insets.width)
      .attr('height', (d) => d.insets.height)
      .attr('stroke-width', 6)
      .attr('stroke', colors.compartmentEdge)
      .attr('fill', 'none');
    this.comparmentG
      .selectAll()
      .data(this.layoutData.compartments)
      .enter()
      .append('text')
      .attr('x', (d) => d.textPosition.x)
      .attr('y', (d) => d.textPosition.y)
      .attr('dy', '1em')
      .style('font-size', compartmentFontSize)
      .style('font-weight', 'bold')
      .text((d) => d.displayName);
  }

  /**
   * Function to draw segments of edges in the layoutJSON file.
   */
  private drawSegments() {
    const filteredData = this.layoutData.edges.filter((d) => {
      return 'segments' in d;
    });
    this.linesG
      .append('g')
      .selectAll('path')
      .data(filteredData)
      .enter()
      .append('path')
      .attr('d', (d) => this.makeEdgePath(d))
      .attr('stroke', lineColor)
      .attr('fill', 'none');
  }

  /**
   * Function to draw connector lines between different nodes. Connectors can also contain end shapes which correspond
   * to different acitons of the given connection, e.g. activation, inhibiton
   */
  private drawConnectors() {
    const connectorsLineG = this.linesG.append('g');
    const connectorsShapeG = this.nodesG.append('g');

    const connectors: connector[] = [];
    for (const node of this.layoutData.nodes) {
      if ('connectors' in node) {
        for (const connector of node.connectors) {
          connectors.push(connector);
        }
      }
    }
    connectorsLineG
      .selectAll('path')
      .data(connectors)
      .enter()
      .append('path')
      .attr('d', (d) => this.segmentsToPath(d.segments))
      .attr('stroke', lineColor)
      .attr('fill', 'none');

    const connectorsWithEndShape = connectors.filter((d) => {
      return 'endShape' in d;
    });
    connectorsShapeG
      .selectAll('path')
      .data(connectorsWithEndShape)
      .enter()
      .append('path')
      .attr('d', (d) => this.drawDecorators(d.endShape))
      .attr('stroke', lineColor)
      .attr('fill', (d) => (d.endShape.empty ? 'white' : lineColor));
  }

  /**
   * Draw links, which are connecting lines indicating distant nodes or related processes
   */
  private drawLinks() {
    if ('links' in this.layoutData) {
      this.linesG
        .selectAll()
        .data(this.layoutData.links)
        .enter()
        .append('path')
        .attr('id', (d, i) => 'test' + i)
        .attr('d', (d) => this.segmentsToPath(d.segments))
        .attr('stroke', lineColor)
        .attr('fill', 'none')
        .attr('stroke-dasharray', (d) =>
          d.renderableClass === 'EntitySetAndMemberLink' ||
          d.renderableClass === 'EntitySetAndEntitySetLink'
            ? '4 2'
            : null
        );
      /*
      const entriesWithReactionShape = this.layoutData.links.filter((d) => {
        return "reactionShape" in d;
      });
    
      this.nodesG.append('g')
        .selectAll('path')
        .data(entriesWithReactionShape)
        .enter()
        .append('path')
        .attr('d', d => this.drawDecorators(d.reactionShape))
        .attr('stroke', lineColor)
        .attr('fill', d => d.reactionShape.empty ? 'white' : lineColor)
      */
      const entriesWithEndShape = this.layoutData.links.filter((d) => {
        return 'endShape' in d;
      });
      this.nodesG
        .append('g')
        .selectAll('path')
        .data(entriesWithEndShape)
        .enter()
        .append('path')
        .attr('d', (d) => this.drawDecorators(d.endShape))
        .attr('stroke', lineColor)
        .attr('fill', (d) => (d.reactionShape.empty ? 'white' : lineColor));
    }
  }

  /**
   * Draws reaction nodes. As many Edges between nodes correspond to reactions between molecules, the reaction nodes indicate such reactions
   */
  private drawReactionNodes() {
    const entriesWithReactionShape = this.layoutData.edges.filter((d) => {
      return 'reactionShape' in d;
    });
    this.nodesG
      .append('g')
      .selectAll('path')
      .data(entriesWithReactionShape)
      .enter()
      .append('path')
      .attr('d', (d) => this.drawDecorators(d.reactionShape))
      .attr('stroke', lineColor)
      .attr('fill', (d) => (d.reactionShape.empty ? 'white' : lineColor));
  }

  /**
   *  Draws end shapes of reaction participants. Many Reactions are inhibited or catalysed by other molecules, which is indicated by a specific shape for the nodes
   */
  private drawEndShapes() {
    const entriesWithEndShape = this.layoutData.edges.filter((d) => {
      return 'endShape' in d;
    });
    this.nodesG
      .append('g')
      .selectAll('path')
      .data(entriesWithEndShape)
      .enter()
      .append('path')
      .attr('d', (d) => this.drawDecorators(d.endShape))
      .attr('stroke', lineColor)
      .attr('fill', (d) => (d.endShape.empty ? 'white' : lineColor));
  }

  /**
   * Function to generate edge decorated elements, given a shape object it returns a svg path string which then is used for direct drawing
   * @param {shape} shape shape for which to generate the path string
   * @returns string, a svg path string
   */
  private drawDecorators(shape: shape): string {
    let outString = '';
    if (shape.type === 'BOX') {
      outString += `M${shape.a.x},${shape.a.y}L${shape.b.x},${shape.a.y}L${shape.b.x},${shape.b.y}L${shape.a.x},${shape.b.y}z`;
    }
    if (shape.type === 'ARROW') {
      outString += `M${shape.a.x},${shape.a.y}L${shape.b.x},${shape.b.y}L${shape.c.x},${shape.c.y}z`;
    }
    if (shape.type === 'CIRCLE') {
      outString += `M${shape.c.x + shape.r},${shape.c.y}`;
      outString += `A${shape.r},${shape.r},0,0,1,${shape.c.x},${
        shape.c.y + shape.r
      }`;
      outString += `A${shape.r},${shape.r},0,0,1,${shape.c.x - shape.r},${
        shape.c.y
      }`;
      outString += `A${shape.r},${shape.r},0,0,1,${shape.c.x},${
        shape.c.y - shape.r
      }`;
      outString += `A${shape.r},${shape.r},0,0,1,${shape.c.x + shape.r},${
        shape.c.y
      }z`;
    }
    if (shape.type === 'STOP') {
      outString += `M${shape.a.x},${shape.a.y}L${shape.b.x},${shape.b.y}`;
    }
    if (shape.type === 'DOUBLE CIRCLE') {
      outString += `M${shape.c.x + shape.r},${shape.c.y}`;
      outString += `A${shape.r},${shape.r},0,0,1,${shape.c.x},${
        shape.c.y + shape.r
      }`;
      outString += `A${shape.r},${shape.r},0,0,1,${shape.c.x - shape.r},${
        shape.c.y
      }`;
      outString += `A${shape.r},${shape.r},0,0,1,${shape.c.x},${
        shape.c.y - shape.r
      }`;
      outString += `A${shape.r},${shape.r},0,0,1,${shape.c.x + shape.r},${
        shape.c.y
      }z`;
      outString += `M${shape.c.x + shape.r1},${shape.c.y}`;
      outString += `A${shape.r1},${shape.r1},0,0,1,${shape.c.x},${
        shape.c.y + shape.r1
      }`;
      outString += `A${shape.r1},${shape.r1},0,0,1,${shape.c.x - shape.r1},${
        shape.c.y
      }`;
      outString += `A${shape.r1},${shape.r1},0,0,1,${shape.c.x},${
        shape.c.y - shape.r1
      }`;
      outString += `A${shape.r1},${shape.r1},0,0,1,${shape.c.x + shape.r1},${
        shape.c.y
      }z`;
    }
    return outString;
  }

  /*
  Node Drawing Functions
  */
  /**
   * Wrapper function filtering and calling the drawing function for the acutal nodes (found in the nodes array of the layout file)
   */
  private drawNodes() {
    const chemicals = this.layoutData.nodes.filter((d) => {
      return (
        d.renderableClass === 'Chemical' || d.renderableClass === 'ChemicalDrug'
      );
    });
    const complexes = this.layoutData.nodes.filter((d) => {
      return d.renderableClass === 'Complex';
    });
    const proteins = this.layoutData.nodes.filter((d) => {
      return d.renderableClass === 'Protein';
    });
    const processNode = this.layoutData.nodes.filter((d) => {
      return d.renderableClass === 'ProcessNode';
    });
    const entitySet = this.layoutData.nodes.filter((d) => {
      return d.renderableClass === 'EntitySet';
    });
    const nonChemicals = this.layoutData.nodes.filter((d) => {
      return (
        d.renderableClass !== 'Chemical' &&
        d.renderableClass !== 'Complex' &&
        d.renderableClass !== 'Protein' &&
        d.renderableClass !== 'ProcessNode' &&
        d.renderableClass !== 'EntitySet'
      );
    });

    this.drawRect(nonChemicals);
    this.drawProtein(proteins);
    this.drawChemical(chemicals);
    this.drawComplex(complexes);
    this.drawEntitySet(entitySet);
    this.drawProcesses(processNode);
  }

  /**
   * "Catch All" function to draw nodes which are not filtered in the draw nodes function, which are then drawn as a rectangle.
   * Ideally this function can be deprecated at some point.
   *
   * @param {reactomeNode[]} data reactomeNode array containing all the nodes to be drawn
   */
  private drawRect(data: reactomeNode[]) {
    const nodeG = this.nodesG.append('g').selectAll().data(data);
    const enterG = nodeG
      .enter()
      .append('g')
      .attr('class', ' nodeG')
      .attr('transform', (d) => `translate(${d.position.x},${d.position.y})`);
    const textLines: { text: string; textLength: number }[][] = [];

    for (const node of data) {
      textLines.push(
        this.generateLinesFromText(node.displayName, node.prop.width)
      );
    }

    for (const lines of textLines) {
      for (const line of lines) {
        line.textLength = lines.length;
      }
    }

    enterG
      .append('rect')
      .attr('id', function (d, i) {
        return '' + d.renderableClass + i;
      })
      .attr('x', (d) => -d.prop.width / 2)
      .attr('y', (d) => -d.prop.height / 2)
      .attr('width', (d) => d.prop.width)
      .attr('height', (d) => d.prop.height)
      .attr('stroke-width', 1)
      .attr('stroke', lineColor)
      .attr('fill', (d) => colors[d.renderableClass]);
    enterG
      .append('text')
      .attr('class', 'nodeText')
      .append('tspan')
      .attr('width', (d) => d.prop.width * 0.9)
      .style('text-anchor', 'middle')
      .style('alignment-baseline', 'middle')
      .style('font-size', fontSize)
      .selectAll('tspan')
      .data((d, i) => textLines[i])
      .enter()
      .append('tspan')
      .attr('x', 0)
      .attr('y', (d, i) => (i - d.textLength / 2 + 0.8) * 12)
      .text((d) => d.text);
  }

  /**
   * Draw nodes as proteins. Protein nodes are squares with rounded corners and two subsegments, the left one corresponding the measurment
   * values stemming from transcriptomics values of the protein in question and the right one corresponding to protomics measurement
   * values
   *
   * @param {reactomeNode[]} data  reactomeNode array containing all the nodes to be drawn
   */
  private drawProtein(data: reactomeNode[]) {
    const nodeG = this.nodesG.append('g').selectAll().data(data);
    const enterG = nodeG
      .enter()
      .append('g')
      .attr('class', ' nodeG')
      .attr('transform', (d) => `translate(${d.position.x},${d.position.y})`);
    const textLines: { text: string; textLength: number }[][] = [];

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;

    for (const node of data) {
      textLines.push(
        this.generateLinesFromText(node.displayName, node.prop.width)
      );
    }

    for (const lines of textLines) {
      for (const line of lines) {
        line.textLength = lines.length;
      }
    }

    enterG
      .append('path')
      .attr('id', function (d, i) {
        return 'protein' + i;
      })
      .attr('d', (d) => this.proteinPath(d, 'left'))
      .attr('fill', (d) =>
        d.reactomeId in this.foldChanges.transcriptomics
          ? this.colorScaleTranscriptomics(
              this.foldChanges.transcriptomics[d.reactomeId]
            )
          : colors[d.renderableClass]
      )
      .append('title')
      .text((d) =>
        d.reactomeId in this.foldChanges.transcriptomics
          ? 'Transcriptomics:' + this.foldChanges.transcriptomics[d.reactomeId]
          : ''
      );

    enterG
      .append('path')
      .attr('id', function (d, i) {
        return 'protein' + i;
      })
      .attr('d', (d) => this.proteinPath(d, 'right'))
      .attr('fill', (d) =>
        d.reactomeId in this.foldChanges.proteomics
          ? this.colorScaleProteomics(this.foldChanges.proteomics[d.reactomeId])
          : colors[d.renderableClass]
      )
      .append('title')
      .text((d) =>
        d.reactomeId in this.foldChanges.proteomics
          ? 'Proteomics:' + this.foldChanges.proteomics[d.reactomeId]
          : ''
      );

    enterG
      .append('path')
      .attr('id', function (d, i) {
        return 'protein' + i;
      })
      .attr('d', (d) => this.proteinPath(d, 'full'))
      .attr('stroke-width', 1)
      .attr('stroke', lineColor)
      .attr('fill', 'none');

    enterG.on('click', (event, d) => {
      const mainStore = useMainStore();
      // maybe save uniprot id when drawing?
      const uniprotID = self.graphData.nodes[d.reactomeId].identifier;
      mainStore.addClickedNode({ queryID: uniprotID, name: d.displayName });
    });

    enterG
      .append('text')
      .attr('class', 'nodeText')
      .append('tspan')
      .attr('width', (d) => d.prop.width * 0.9)
      .style('text-anchor', 'middle')
      .style('alignment-baseline', 'middle')
      .style('font-size', fontSize)
      .selectAll('tspan')
      .data((d, i) => textLines[i])
      .enter()
      .append('tspan')
      .attr('x', 0)
      .attr('y', (d, i) => (i - d.textLength / 2 + 0.8) * 12)
      .text((d) => d.text);
  }

  /**
   * Draw nodes as complexes. Many biological molecules are available not as isolated entities but in complexes together with other
   * molecules.
   * Complexes are hexagonal nodes with three subsegments. The left, center and, right segments belong the measurements stemming from
   * transcriptomics, proteomics and metabolomics data respectively. Colors show average values for said categories.
   * Clicking on the node opens a glyph view showing each measurement value distinctly.
   *
   * @param {reactomeNode[]} data  reactomeNode array containing all the nodes to be drawn
   */
  private drawComplex(data: reactomeNode[]) {
    const nodeG = this.nodesG.append('g').selectAll().data(data);
    const enterG = nodeG
      .enter()
      .append('g')
      .attr('class', ' nodeG')
      .attr('transform', (d) => `translate(${d.position.x},${d.position.y})`);
    const textLines: { text: string; textLength: number }[][] = [];
    const size = 100;

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    for (const node of data) {
      textLines.push(
        this.generateLinesFromText(node.displayName, node.prop.width)
      );
    }

    for (const lines of textLines) {
      for (const line of lines) {
        line.textLength = lines.length;
      }
    }
    enterG
      .append('path')
      .attr('d', (d) => this.complexPath(d, 'left'))
      .attr('fill', (d) => this.complexColor(d.reactomeId, 'transcriptomics'))
      .append('title')
      .text((d) =>
        d.reactomeId in this.foldChanges.transcriptomics
          ? 'Transcriptomics:' + this.foldChanges.transcriptomics[d.reactomeId]
          : ''
      );

    enterG
      .append('path')
      .attr('d', (d) => this.complexPath(d, 'center'))
      .attr('fill', (d) => this.complexColor(d.reactomeId, 'proteomics'))
      .append('title')
      .text((d) =>
        d.reactomeId in this.foldChanges.proteomics
          ? 'Proteomics:' + this.foldChanges.proteomics[d.reactomeId]
          : ''
      );

    enterG
      .append('path')
      .attr('d', (d) => this.complexPath(d, 'right'))
      .attr('fill', (d) => this.complexColor(d.reactomeId, 'metabolomics'))
      .append('title')
      .text((d) =>
        d.reactomeId in this.foldChanges.metabolomics
          ? 'Metabolomics:' + this.foldChanges.metabolomics[d.reactomeId]
          : ''
      );

    const _complex = enterG
      .append('path')
      .attr('id', function (d, i) {
        return 'node' + i;
      })
      .attr('d', (d) => this.complexPath(d, 'full'))
      .attr('stroke-width', 1)
      .attr('stroke', lineColor)
      .attr('fill', 'none');

    enterG.on('click', (event, d) => {
      self.tooltipG.selectAll('svg').remove();
      self.tooltipG.selectAll('circle').remove();
      self.tooltipG.attr(
        'transform',
        `translate(${d.position.x - size},${d.position.y - size})`
      );
      self.tooltipG
        .append('circle')
        .attr('r', size)
        .attr('cx', size)
        .attr('cy', size)
        .attr('fill', 'white');
      self.tooltipG.append(() => {
        const currentGlyph = new glyph(
          self.foldChangeReactome[d.reactomeId],
          true,
          d.reactomeId,
          28,
          false
        );
        return currentGlyph.generateGlyphSvg();
      });
    });
    enterG
      .append('text')
      .attr('class', 'nodeText')
      .append('tspan')
      .attr('width', (d) => d.prop.width * 0.9)
      .style('text-anchor', 'middle')
      .style('alignment-baseline', 'middle')
      .style('font-size', fontSize)
      .selectAll('tspan')
      .data((d, i) => textLines[i])
      .enter()
      .append('tspan')
      .attr('x', 0)
      .attr('y', (d, i) => (i - d.textLength / 2 + 0.8) * 12)
      .text((d) => d.text);
  }

  /**
   * Draw nodes as entity sets. Some roles can be fullfilled by a set of entities (e.g. kinases) such entities are then shown in an
   * entity set. Entity sets are quares with rounded edges, an inset second border and two subsegments, the left one corresponding the
   * measurment values stemming from transcriptomics values of the protein in question and the right one corresponding to protomics
   * measurement values. Clicking on the node opens a glyph view showing each measurement value distinctly.
   *
   * @param {reactomeNode[]} data  reactomeNode array containing all the nodes to be drawn
   */
  private drawEntitySet(data: reactomeNode[]) {
    const nodeG = this.nodesG.append('g').selectAll().data(data);
    const enterG = nodeG
      .enter()
      .append('g')
      .attr('class', ' nodeG')
      .attr('transform', (d) => `translate(${d.position.x},${d.position.y})`);
    const textLines: { text: string; textLength: number }[][] = [];
    const size = 100;

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    for (const node of data) {
      textLines.push(
        this.generateLinesFromText(node.displayName, node.prop.width)
      );
    }

    for (const lines of textLines) {
      for (const line of lines) {
        line.textLength = lines.length;
      }
    }
    enterG
      .append('path')
      .attr('id', function (d, i) {
        return 'protein' + i;
      })
      .attr('d', (d) => this.proteinPath(d, 'left'))
      .attr('fill', (d) =>
        d.reactomeId in this.foldChanges.transcriptomics
          ? this.colorScaleTranscriptomics(
              this.foldChanges.transcriptomics[d.reactomeId]
            )
          : colors[d.renderableClass]
      )
      .append('title')
      .text((d) =>
        d.reactomeId in this.foldChanges.transcriptomics
          ? 'Transcriptomics:' + this.foldChanges.transcriptomics[d.reactomeId]
          : ''
      );

    enterG
      .append('path')
      .attr('id', function (d, i) {
        return 'protein' + i;
      })
      .attr('d', (d) => this.proteinPath(d, 'right'))
      .attr('fill', (d) =>
        d.reactomeId in this.foldChanges.proteomics
          ? this.colorScaleProteomics(this.foldChanges.proteomics[d.reactomeId])
          : colors[d.renderableClass]
      )
      .append('title')
      .text((d) =>
        d.reactomeId in this.foldChanges.proteomics
          ? 'Proteomics:' + this.foldChanges.proteomics[d.reactomeId]
          : ''
      );

    enterG
      .append('path')
      .attr('id', function (d, i) {
        return 'protein' + i;
      })
      .attr('d', (d) => this.proteinPath(d, 'full'))
      .attr('stroke-width', 1)
      .attr('stroke', lineColor)
      .attr('fill', 'none');
    enterG
      .append('path')
      .attr('id', function (d, i) {
        return 'protein' + i;
      })
      .attr('d', (d) => this.proteinPath(d, 'outline'))
      .attr('stroke-width', 1)
      .attr('stroke', lineColor)
      .attr('fill', 'none');

    enterG
      .append('text')
      .attr('class', 'nodeText')
      .append('tspan')
      .attr('width', (d) => d.prop.width * 0.9)
      .style('text-anchor', 'middle')
      .style('alignment-baseline', 'middle')
      .style('font-size', fontSize)
      .selectAll('tspan')
      .data((d, i) => textLines[i])
      .enter()
      .append('tspan')
      .attr('x', 0)
      .attr('y', (d, i) => (i - d.textLength / 2 + 0.8) * 12)
      .text((d) => d.text);

    enterG.on('click', (event, d) => {
      self.tooltipG.selectAll('svg').remove();
      self.tooltipG.selectAll('circle').remove();
      self.tooltipG.attr(
        'transform',
        `translate(${d.position.x - size},${d.position.y - size})`
      );
      self.tooltipG
        .append('circle')
        .attr('r', size)
        .attr('cx', size)
        .attr('cy', size)
        .attr('fill', 'white');
      self.tooltipG.append(() => {
        const currentGlyph = new glyph(
          self.foldChangeReactome[d.reactomeId],
          true,
          d.reactomeId,
          28,
          false
        );
        return currentGlyph.generateGlyphSvg();
      });
    });
  }

  /**
   * Draws nodes as procceses. Some pathways link to other pathways which are involved peripherally in the current pathways.
   * Processes are drawn as recatngles with three subsegments. The left, center and, right segments belong the measurements stemming from
   * transcriptomics, proteomics and metabolomics data respectively. Clicking on the node opens a glyph view showing each measurement
   * value distinctly.
   *
   * @param {reactomeNode[]} data  reactomeNode array containing all the nodes to be drawn
   */
  private drawProcesses(data: reactomeNode[]) {
    const nodeG = this.nodesG.append('g').selectAll().data(data);
    const enterG = nodeG
      .enter()
      .append('g')
      .attr('class', ' nodeG')
      .attr('transform', (d) => `translate(${d.position.x},${d.position.y})`);
    const textLines: { text: string; textLength: number }[][] = [];
    const size = 100;

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    for (const node of data) {
      textLines.push(
        this.generateLinesFromText(node.displayName, node.prop.width)
      );
    }

    for (const lines of textLines) {
      for (const line of lines) {
        line.textLength = lines.length;
      }
    }

    enterG
      .append('rect')
      .attr('id', function (d, i) {
        return '' + d.renderableClass + i;
      })
      .attr('x', (d) => -d.prop.width / 2)
      .attr('y', (d) => -d.prop.height / 2)
      .attr('width', (d) => d.prop.width)
      .attr('height', (d) => d.prop.height)
      .attr('stroke-width', 1)
      .attr('stroke', lineColor)
      .attr('fill', 'none');

    enterG
      .append('rect')
      .attr('id', function (d, i) {
        return '' + d.renderableClass + i;
      })
      .attr('x', (d) => -d.prop.width / 2)
      .attr('y', (d) => -d.prop.height / 2)
      .attr('width', (d) => d.prop.width / 3)
      .attr('height', (d) => d.prop.height)
      .attr('stroke', 'none')
      .attr('fill', (d) => this.complexColor(d.reactomeId, 'transcriptomics'));
    enterG
      .append('rect')
      .attr('id', function (d, i) {
        return '' + d.renderableClass + i;
      })
      .attr('x', (d) => -d.prop.width / 6)
      .attr('y', (d) => -d.prop.height / 2)
      .attr('width', (d) => d.prop.width / 3)
      .attr('height', (d) => d.prop.height)
      .attr('stroke', 'none')
      .attr('fill', (d) => this.complexColor(d.reactomeId, 'proteomics'));
    enterG
      .append('rect')
      .attr('id', function (d, i) {
        return '' + d.renderableClass + i;
      })
      .attr('x', (d) => +d.prop.width / 6)
      .attr('y', (d) => -d.prop.height / 2)
      .attr('width', (d) => d.prop.width / 3)
      .attr('height', (d) => d.prop.height)
      .attr('stroke', 'none')
      .attr('fill', (d) => this.complexColor(d.reactomeId, 'metabolomics'));

    enterG.on('click', (_event, d) => {
      self.tooltipG.selectAll('svg').remove();
      self.tooltipG.selectAll('circle').remove();
      self.tooltipG.attr(
        'transform',
        `translate(${d.position.x - size},${d.position.y - size})`
      );
      self.tooltipG
        .append('circle')
        .attr('r', size)
        .attr('cx', size)
        .attr('cy', size)
        .attr('fill', 'white');
      self.tooltipG.append(() => {
        const currentGlyph = new glyph(
          self.foldChangeReactome[d.reactomeId],
          true,
          d.reactomeId,
          28,
          false
        );
        return currentGlyph.generateGlyphSvg();
      });
    });

    enterG
      .append('text')
      .attr('class', 'nodeText')
      .append('tspan')
      .attr('width', (d) => d.prop.width * 0.9)
      .style('text-anchor', 'middle')
      .style('alignment-baseline', 'middle')
      .style('font-size', fontSize)
      .selectAll('tspan')
      .data((d, i) => textLines[i])
      .enter()
      .append('tspan')
      .attr('x', 0)
      .attr('y', (d, i) => (i - d.textLength / 2 + 0.8) * 12)
      .text((d) => d.text);
  }

  /**
   * Draws nodes as chemical. Small molecules are drawn as chemical (both drugs and regular metabolites). The nodes are drawn
   * as ellipses showing measurement values as a color.
   *
   * @param {reactomeNode[]} data  reactomeNode array containing all the nodes to be drawn
   */
  private drawChemical(data: reactomeNode[]) {
    const nodeG = this.nodesG.append('g').selectAll().data(data);
    const enterG = nodeG
      .enter()
      .append('g')
      .attr('class', ' nodeG')
      .attr('transform', (d) => `translate(${d.position.x},${d.position.y})`);

    enterG
      .append('ellipse')
      .attr('id', function (d, i) {
        return 'chemical' + i;
      })
      .attr('rx', (d) => d.prop.width / 2)
      .attr('ry', (d) => d.prop.height / 2)
      .attr('stroke-width', 1)
      .attr('stroke', lineColor)
      .attr('fill', (d) =>
        d.reactomeId in this.foldChanges.metabolomics
          ? this.colorScaleMetabolomics(
              this.foldChanges.metabolomics[d.reactomeId]
            )
          : colors[d.renderableClass]
      )
      .append('title')
      .text((d) =>
        d.reactomeId in this.foldChanges.metabolomics
          ? 'Metabolomics:' + this.foldChanges.metabolomics[d.reactomeId]
          : ''
      );

    enterG
      .append('text')
      .attr('class', 'nodeText')
      .style('text-anchor', 'middle')
      .style('alignment-baseline', 'middle')
      .style('dominant-baseline', 'central')
      .style('font-size', fontSize)
      .text((d) => d.displayName);
  }

  /*
  Node Drawing auxilliary functions
  */

  /**
   * Generates a svg-path string corresponding to the indicated protein node type. This can be either 'full', 'left' or 'right' depending
   *  if the complete shape, the shape corresponding to the transcriptomics measurements or the proteomics measurement should be drawn.
   *
   * @param {reactomeNode} node node for which to generate the path string
   * @param {string} type one of 'full', 'left', 'right. String indicating which portion of the protein node should be generated
   * @returns {string} a path string
   */
  private proteinPath(node: reactomeNode, type: string): string {
    const yHalf = node.prop.height / 2;
    const xHalf = node.prop.width / 2;
    const radius = 4;

    let pathString = '';
    if (type === 'outline') {
      pathString += `M${-(xHalf - 3) + radius},${yHalf - 3}`;
      pathString += `A${radius},${radius},0,0,1,${-(xHalf - 3)},${
        yHalf - 3 - radius
      }`;
      pathString += `L${-(xHalf - 3)},${-(yHalf - 3) + radius}`;
      pathString += `A${radius},${radius},0,0,1,${-(xHalf - 3) + radius},${-(
        yHalf - 3
      )}`;
      pathString += `L${xHalf - 3 - radius},${-(yHalf - 3)}`;
      pathString += `A${radius},${radius},0,0,1,${xHalf - 3},${
        -(yHalf - 3) + radius
      }`;
      pathString += `L${xHalf - 3},${yHalf - 3 - radius}`;
      pathString += `A${radius},${radius},0,0,1,${xHalf - 3 - radius},${
        yHalf - 3
      }z`;
    }
    if (type === 'full') {
      pathString += `M${-xHalf + radius},${yHalf}`;
      pathString += `A${radius},${radius},0,0,1,${-xHalf},${yHalf - radius}`;
      pathString += `L${-xHalf},${-yHalf + radius}`;
      pathString += `A${radius},${radius},0,0,1,${-xHalf + radius},${-yHalf}`;
      pathString += `L${xHalf - radius},${-yHalf}`;
      pathString += `A${radius},${radius},0,0,1,${xHalf},${-yHalf + radius}`;
      pathString += `L${xHalf},${yHalf - radius}`;
      pathString += `A${radius},${radius},0,0,1,${xHalf - radius},${yHalf}z`;
    }
    if (type === 'left') {
      pathString += `M${-xHalf + radius},${yHalf}`;
      pathString += `A${radius},${radius},0,0,1,${-xHalf},${yHalf - radius}`;
      pathString += `L${-xHalf},${-yHalf + radius}`;
      pathString += `A${radius},${radius},0,0,1,${-xHalf + radius},${-yHalf}`;
      pathString += `L0,${-yHalf}`;
      pathString += `L0,${yHalf}z`;
    }
    if (type === 'right') {
      pathString += `M0,${-yHalf}`;
      pathString += `L${xHalf - radius},${-yHalf}`;
      pathString += `A${radius},${radius},0,0,1,${xHalf},${-yHalf + radius}`;
      pathString += `L${xHalf},${yHalf - radius}`;
      pathString += `A${radius},${radius},0,0,1,${xHalf - radius},${yHalf}`;
      pathString += `L0,${yHalf}z`;
    }
    return pathString;
  }

  /**
   * Generates a color corresponding to the fold change which is belongs to the supplied reactome ID
   *
   * @param {number} reactomeId id of the entry for which the fold change color should be generated
   * @param {string} type one of 'transcriptomics', 'proteomics', 'metabolomics' indicating for which type of measurment the color should be generated
   * @returns {string} color string
   */
  private complexColor(reactomeId: number, type: string): string {
    let color = colors.Complex;
    if (reactomeId in this.foldChangeReactome) {
      if (type === 'proteomics') {
        color =
          this.foldChangeReactome[reactomeId].proteomics.meanFoldchange !== -100
            ? this.colorScaleProteomics(
                this.foldChangeReactome[reactomeId].proteomics.meanFoldchange
              )
            : colors.Complex;
      }
      if (type === 'transcriptomics') {
        color =
          this.foldChangeReactome[reactomeId].transcriptomics.meanFoldchange !==
          -100
            ? this.colorScaleTranscriptomics(
                this.foldChangeReactome[reactomeId].transcriptomics
                  .meanFoldchange
              )
            : colors.Complex;
      }
      if (type === 'metabolomics') {
        color =
          this.foldChangeReactome[reactomeId].metabolomics.meanFoldchange !==
          -100
            ? this.colorScaleMetabolomics(
                this.foldChangeReactome[reactomeId].metabolomics.meanFoldchange
              )
            : colors.Complex;
      }
    }
    return color;
  }

  /**
   * Funciton generating a svg-path string corresponding to the selection of 'type' for the drawing of complex nodes.
   *
   * @param {reactomeNode} node reactome node object for which the svg-path string should be generated
   * @param {string} type on of 'full', 'left', 'center', 'right' indicating the portion of the node for which the svg-path string should be generated
   * @returns
   */
  private complexPath(node: reactomeNode, type: string): string {
    const yHalf = node.prop.height / 2;
    const yTwoFifth = node.prop.height / 4;
    const xHalf = node.prop.width / 2;
    const xTwoFifth = (3 * node.prop.width) / 7;
    const xSixth = node.prop.width / 6;
    let pathString = '';
    if (type === 'full') {
      pathString = `M${-xTwoFifth},${yHalf}L${-xHalf},${yTwoFifth}L${-xHalf},${-yTwoFifth}L${-xTwoFifth},${-yHalf}L${xTwoFifth},${-yHalf}L${xHalf},${-yTwoFifth}L${xHalf},${yTwoFifth}L${xTwoFifth},${yHalf}z`;
    }
    if (type === 'left') {
      pathString = `M${-xTwoFifth},${yHalf}L${-xHalf},${yTwoFifth}L${-xHalf},${-yTwoFifth}L${-xTwoFifth},${-yHalf}L${-xSixth},${-yHalf}L${-xSixth},${yHalf}z`;
    }
    if (type === 'center') {
      pathString = `M${-xSixth},${-yHalf}L${-xSixth},${yHalf}L${xSixth},${yHalf}L${xSixth},${-yHalf}z`;
    }
    if (type === 'right') {
      pathString = `M${xSixth},${-yHalf}L${xTwoFifth},${-yHalf}L${xHalf},${-yTwoFifth}L${xHalf},${yTwoFifth}L${xTwoFifth},${yHalf}L${xSixth},${yHalf}z`;
    }
    return pathString;
  }

  /**
   * Generates svg-path string corresponding to the lines of the supplied edge-datum
   *
   * @param {reactomeEdge} datum datum of reactome edge type
   * @returns {string} svg-path string
   */
  private makeEdgePath(datum: reactomeEdge): string {
    let outStr = '';
    if ('segments' in datum && datum.segments.length > 0) {
      const startPoint = datum.segments[0];
      const endPoint = datum.segments[datum.segments.length - 1];
      if ('inputs' in datum) {
        for (const input of datum.inputs) {
          if ('points' in input) {
            outStr += `M${input.points[0].x},${input.points[0].y}`;
            for (const point of input.points) {
              outStr += `L${point.x},${point.y}`;
            }
            outStr += `L${startPoint.from.x},${startPoint.from.y}`;
          }
        }
      }
      if ('outputs' in datum) {
        for (const output of datum.outputs) {
          if ('points' in output) {
            outStr += `M${output.points[0].x},${output.points[0].y}`;
            for (const point of output.points) {
              outStr += `L${point.x},${point.y}`;
            }
            outStr += `L${endPoint.to.x},${endPoint.to.y}`;
          }
        }
      }
      outStr += `M${startPoint.from.x},${startPoint.from.y}`;
      for (const entry of datum.segments) {
        outStr += `L${entry.to.x},${entry.to.y}`;
      }
    }
    // outStr += this.catalystPaths(datum)
    return outStr;
  }

  /**
   * Generates a svg-path string for the supplied array of segments
   *
   * @param {segment[]} segments array of segments to be converted to a svg-path string
   * @returns {string} svg-path string corresponding to the supplied segment array
   */
  private segmentsToPath(segments: segment[]): string {
    let outStr = '';
    for (let index = 0; index < segments.length; index++) {
      const element = segments[index];
      if (index === 0) outStr += `M${element.from.x},${element.from.y}`;
      outStr += `L${element.to.x},${element.to.y}`;
    }
    return outStr;
  }

  /**
   * Returns the width of the supplied text
   *
   * @param {string} text text for which the width should be returned
   * @returns {number} width of supplied text in px
   */
  private getTextWidth(text: string): number {
    const context = document
      .createElement('canvas')
      .getContext('2d') as CanvasRenderingContext2D;
    const width = context.measureText(text).width;
    return width;
  }

  /**
   * Function which splits text into lines with a maximum width
   *
   * @param {string} text text which should be split into lines of text
   * @param {number} width target width which corresponds to the maximum width of each line
   * @returns lines of text which then can be placed in the svg
   */
  private generateLinesFromText(
    text: string,
    width: number
  ): { text: string; textLength: number }[] {
    // adapted from https://observablehq.com/@mbostock/fit-text-to-circle

    const words = text.split(/\s+|,|:/g);
    if (!words[words.length - 1]) words.pop();
    if (!words[0]) words.shift();

    let line: { text: string; textLength: number } = {
      text: '',
      textLength: 0,
    };
    const lines = [];
    for (let i = 0; i < words.length; ++i) {
      const lineText = (line.text ? line.text + ' ' : '') + words[i];
      const lineWidth = this.getTextWidth(lineText);
      if (lineWidth < width) {
        line.text = lineText;
      } else {
        lines.push(line);
        line = { text: words[i], textLength: 0 };
      }
    }
    lines.push(line);
    return lines;
  }

  /**
   * Clears the reactome detail view
   */
  clearView() {
    this.mainSVG.remove();
  }

  /**
   * Refreshes the size of the svg
   */
  refreshSize() {
    const box = document
      .querySelector(this.containerID)
      ?.getBoundingClientRect();
    const width = box?.width as number;
    const height = box?.height as number;
    this.mainSVG.attr('width', width).attr('height', height);
  }
}
