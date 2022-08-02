import { useMainStore } from '@/stores';
import * as d3 from 'd3';
import { PieArcDatum } from 'd3-shape';
import * as _ from 'lodash';
import { glyphData } from '../generalTypes';
import { noValueGrey } from './glyphConstants';

/**
 * Glyph class for glyphs describing the results of omics or multiomics experiments on a per pathway basis
 */
export class HighDetailGlyph {
  private totalNodes = 0;
  private addedElements = 0;
  private availableOmics = 0;
  private highlightSection = 0;
  private drawLabels = false;
  private pathwayCompare = false;
  private glyphIdx;
  private glyphData: glyphData;
  private diameter: number;
  private thirdCircle: number;
  private thirdCircleElement: number;
  private circlePadding: number;
  private layerWidth: number;
  private width: number;
  private height: number;
  private outermostRadius: number;
  private firstLayer: number;
  private secondLayer: number;
  private outerArcDat: {
    data: number;
    value: number;
    index: number;
    startAngle: number;
    endAngle: number;
    padAngle: number;
    name: string;
    fc: number;
    queryID: string;
  }[] = [];
  private innerArcDat: {
    data: number;
    value: number;
    index: number;
    startAngle: number;
    endAngle: number;
    padAngle: number;
    hoverData: string;
  }[] = [];
  private backroundArcDat: {
    data: number;
    value: number;
    index: number;
    startAngle: number;
    endAngle: number;
    padAngle: number;
    color: string;
  }[] = [];
  private outerColors: string[] = [];
  private innerColors: string[] = [];
  private labelArcData: {
    data: number;
    value: number;
    index: number;
    startAngle: number;
    endAngle: number;
    padAngle: number;
  }[] = [];
  private labelTexts: string[] = [];
  private labelRegTexts: string[] = [];
  private labelTextOffset: string[] = [];
  private colorScales;

  constructor(
    glyphData: glyphData,
    drawLabels: boolean,
    glyphIdx: number,
    diameter: number,
    pathwayCompare = true
  ) {
    const mainStore = useMainStore();

    this.glyphData = glyphData;
    this.drawLabels = drawLabels;
    this.pathwayCompare = pathwayCompare;
    this.glyphIdx = glyphIdx;
    this.diameter = diameter;

    if (this.glyphData.transcriptomics.available) this.availableOmics += 1;
    if (this.glyphData.proteomics.available) this.availableOmics += 1;
    if (this.glyphData.metabolomics.available) this.availableOmics += 1;

    this.thirdCircle = 2 * (Math.PI / this.availableOmics);
    this.thirdCircleElement = 1.8 * (Math.PI / this.availableOmics);
    this.circlePadding = 0.1 * (Math.PI / this.availableOmics);
    this.layerWidth = this.diameter / 7;
    this.width = this.diameter + this.diameter / 5 + (this.drawLabels ? 7 : 0);
    this.height = this.diameter + this.diameter / 5 + (this.drawLabels ? 7 : 0);
    this.outermostRadius = this.diameter / 2;
    this.firstLayer = this.outermostRadius - this.layerWidth;
    this.secondLayer = this.firstLayer - this.layerWidth;
    this.colorScales = mainStore.fcScales;
    if (this.glyphData.transcriptomics.available) {
      this.prepareOmics('transcriptomics');
    }
    if (this.glyphData.proteomics.available) {
      this.prepareOmics('proteomics');
    }
    if (this.glyphData.metabolomics.available) {
      this.prepareOmics('metabolomics');
    }
  }
  /**
   * Function to change the behaviour of the generateGlyphSvg Funvtion
   * @param val Boolean to set draw labels to
   */
  setDrawLabels(val: boolean) {
    this.drawLabels = val;
    this.width = this.diameter + (this.drawLabels ? 7 : 0);
    this.height = this.diameter + (this.drawLabels ? 7 : 0);
    this.backroundArcDat = [];
    this.innerArcDat = [];
    this.outerArcDat = [];
    if (this.glyphData.transcriptomics.available) {
      this.prepareOmics('transcriptomics');
    }
    if (this.glyphData.proteomics.available) {
      this.prepareOmics('proteomics');
    }
    if (this.glyphData.metabolomics.available) {
      this.prepareOmics('metabolomics');
    }
  }
  /**
   * Returns SVGElement of the glyph
   * @returns SVGElement of the glyph
   */
  generateGlyphSvg(): SVGElement {
    const mainStore = useMainStore();
    let svg;
    let g;

    if (this.drawLabels) {
      svg = d3
        .create('svg')
        .attr(
          'viewBox',
          this.pathwayCompare ? `0 0 ${this.width} ${this.height}` : '0 0 35 35'
        )
        .attr('width', this.pathwayCompare ? '100%' : '200px')
        .attr('height', this.pathwayCompare ? '100%' : '200px');
      g = svg
        .append('g')
        .attr('class', 'glyph')
        .attr('id', `glyph${this.glyphIdx}`)
        .attr('transform', `translate(${this.width / 2},${this.height / 2})`);
      // DOMMouseScroll seems to work in FF
      g.on('mouseenter', (_event, _dat) => {
        const amtElems = d3
          .select(`#glyph${this.glyphIdx}`)
          .selectAll('.foldArc')
          .size();
        this.highlightSection = 0 % amtElems;
        d3.select(`#glyph${this.glyphIdx}`)
          .selectAll('.foldArc')
          .data(this.outerArcDat)
          .attr('fill-opacity', (d, i) => {
            if (i === this.highlightSection) {
              d3.select(`#glyph${this.glyphIdx}`)
                .select('#tspan1')
                .text(d.name.split(' ')[0]); // more of a temp fix
              d3.select(`#glyph${this.glyphIdx}`)
                .select('#tspan2')
                .text(d.fc.toFixed(3));
              return 1.0;
            } else return 0.2;
          });
      });
      g.on('mouseleave', (_event, _dat) => {
        this.highlightSection = 0;
        d3.select(`#glyph${this.glyphIdx}`)
          .selectAll('.foldArc')
          .attr('fill-opacity', (_d, _i) => {
            d3.select(`#glyph${this.glyphIdx}`)
              .select('#tspan1')
              .text('Total:');
            d3.select(`#glyph${this.glyphIdx}`)
              .select('#tspan2')
              .text(this.totalNodes);
            return 1.0;
          });
      });
      g.on('wheel.zoom', (event, _dat) => {
        const amtElems = d3
          .select(`#glyph${this.glyphIdx}`)
          .selectAll('.foldArc')
          .size();
        this.highlightSection =
          (((this.highlightSection + (event.wheelDelta > 0 ? 1 : -1)) %
            amtElems) +
            amtElems) %
          amtElems;
        d3.select(`#glyph${this.glyphIdx}`)
          .selectAll('.foldArc')
          .data(this.outerArcDat)
          .attr('fill-opacity', (d, i) => {
            if (i === this.highlightSection) {
              d3.select(`#glyph${this.glyphIdx}`)
                .select('#tspan1')
                .text(d.name.split(' ')[0]); // more of a temp fix
              d3.select(`#glyph${this.glyphIdx}`)
                .select('#tspan2')
                .text(d.fc.toFixed(3));
              return 1.0;
            } else return 0.2;
          });
        event.stopPropagation();
      });
    } else {
      svg = d3
        .create('svg')
        .attr('width', this.width)
        .attr('height', this.height);

      g = svg
        .append('g')
        .attr('transform', `translate(${this.width / 2},${this.height / 2})`);
    }
    const arcOuter = d3
      .arc<PieArcDatum<number>>()
      .innerRadius(this.firstLayer)
      .outerRadius(this.outermostRadius);

    const arcMiddle = d3
      .arc<PieArcDatum<number>>()
      .innerRadius(this.secondLayer)
      .outerRadius(this.firstLayer);

    const arcSeg = g
      .selectAll('g')
      .data(this.outerArcDat)
      .enter()
      .append('path')
      .attr('d', arcOuter)
      .attr('fill', (_d, i) => this.outerColors[i])
      .attr('class', 'foldArc')
      .attr('stroke-width', -2);
    if (!this.pathwayCompare) {
      arcSeg.on('click', (event, d) => {
        mainStore.addClickedNode({ queryID: d.queryID, name: d.name });
        event.stopPropagation();
      });
    }

    arcSeg.append('title').text((d) => d.name + '\n' + d.fc.toFixed(3));
    const _graySegments = g
      .selectAll('g')
      .data(this.innerArcDat)
      .enter()
      .append('path')
      .attr('d', arcMiddle)
      .attr('fill', (_d, i) => this.innerColors[i])
      .attr('stroke-width', -2);

    g.selectAll('g')
      .data(this.backroundArcDat)
      .enter()
      .append('path')
      .attr('d', arcOuter)
      .attr('fill', (d) => d.color)
      .attr('stroke', '#404040')
      .attr(
        'stroke-width',
        this.drawLabels ? this.diameter / 45 : this.diameter / 45
      );

    g.selectAll('g')
      .data(this.backroundArcDat)
      .enter()
      .append('path')
      .attr('d', arcMiddle)
      .attr('fill', 'none')
      .attr('stroke', '#404040')
      .attr(
        'stroke-width',
        this.drawLabels ? this.diameter / 45 : this.diameter / 45
      );
    if (this.drawLabels) {
      const labelArcOmics = d3
        .arc<PieArcDatum<number>>()
        .innerRadius(this.outermostRadius + 2)
        .outerRadius(this.outermostRadius + 2);
      const labelArcRegulated = d3
        .arc<PieArcDatum<number>>()
        .innerRadius((this.firstLayer + this.secondLayer) * 0.5)
        .outerRadius((this.firstLayer + this.secondLayer) * 0.5);

      g.selectAll('labels')
        .data(this.labelArcData)
        .enter()
        .append('path')
        .attr('id', (_d, i) => `labelArcReg${i}`)
        .attr('d', labelArcRegulated)
        .style('fill', 'none');

      g.selectAll('labels')
        .data(this.labelArcData)
        .enter()
        .append('text')
        .append('textPath')
        .text((_d, i) => this.labelRegTexts[i])
        .attr('startOffset', '25%')
        .style('text-anchor', 'middle')
        .attr('class', 'glyphText')
        .attr('href', (_d, i) => `#labelArcReg${i}`);

      g.selectAll('labels')
        .data(this.labelArcData)
        .enter()
        .append('path')
        .attr('id', (_d, i) => `labelArc${i}`)
        .attr('d', labelArcOmics)
        .style('fill', 'none');

      g.selectAll('labels')
        .data(this.labelArcData)
        .enter()
        .append('text')
        .append('textPath')
        .text((_d, i) => this.labelTexts[i])
        .attr('startOffset', '25%')
        .attr('class', 'glyphText')
        .attr('href', (_d, i) => `#labelArc${i}`);

      const text = g.append('text').attr('class', 'glyphText centeredText');

      text
        .append('tspan')
        .attr('id', 'tspan1')
        .attr('x', 0)
        .attr('dy', '-0.5em')
        .text('Total:');

      text
        .append('tspan')
        .attr('id', 'tspan2')
        .attr('x', 0)
        .attr('dy', '1em')
        .text(this.totalNodes);
    }
    return svg.node() as SVGElement;
  }
  prepareOmics(
    omicsType: 'metabolomics' | 'proteomics' | 'transcriptomics'
  ): void {
    this.totalNodes += this.glyphData[omicsType].nodeState.total;
    this.glyphData[omicsType].foldChanges.sort((a, b) => a.value - b.value);
    const omicsColors = this.glyphData[omicsType].foldChanges.map((elem) =>
      this.colorScales[omicsType](elem.value)
    );
    this.outerColors.push(...omicsColors);
    const startAngleVal =
      this.addedElements * this.thirdCircle + this.circlePadding;

    const angleFCs = _.range(
      startAngleVal,
      startAngleVal +
        this.thirdCircleElement +
        this.thirdCircleElement / omicsColors.length,
      this.thirdCircleElement / omicsColors.length
    );

    this.backroundArcDat.push({
      data: 1,
      value: 1,
      index: 1,
      startAngle: startAngleVal,
      endAngle: startAngleVal + this.thirdCircleElement,
      padAngle: 0,
      color: omicsColors.length > 0 ? 'none' : noValueGrey,
    });
    omicsColors.forEach((_element, idx) => {
      const pushDat = {
        data: idx + 1,
        value: idx + 1,
        index: idx,
        startAngle: angleFCs[idx],
        endAngle: angleFCs[idx + 1],
        padAngle: 0,
        name: this.glyphData[omicsType].foldChanges[idx].name,
        fc: this.glyphData[omicsType].foldChanges[idx].value,
        queryID: this.glyphData[omicsType].foldChanges[idx].queryID,
      };
      this.outerArcDat.push(pushDat);
    });
    const omicsRegulatedQuotient =
      this.glyphData[omicsType].nodeState.regulated /
      this.glyphData[omicsType].nodeState.total;

    this.innerArcDat.push({
      data: 1,
      value: 1,
      index: 0,
      startAngle: startAngleVal,
      endAngle:
        startAngleVal + this.thirdCircleElement * omicsRegulatedQuotient,
      padAngle: 0,
      hoverData: `${this.glyphData[omicsType].nodeState.regulated} / ${this.glyphData[omicsType].nodeState.total}`,
    });
    this.innerArcDat.push({
      data: 2,
      value: 2,
      index: 1,
      startAngle:
        startAngleVal + this.thirdCircleElement * omicsRegulatedQuotient,
      endAngle: startAngleVal + this.thirdCircleElement,
      padAngle: 0,
      hoverData: '',
    });
    this.innerColors.push('gray', '#c2c2c2');
    this.labelRegTexts.push(
      `${this.glyphData[omicsType].nodeState.regulated} of ${this.glyphData[omicsType].nodeState.total}`
    );

    if (this.drawLabels) {
      if (this.availableOmics === 1) {
        this.labelArcData.push({
          data: 1,
          value: 1,
          index: 0,
          startAngle: startAngleVal + this.thirdCircleElement,
          endAngle: startAngleVal,
          padAngle: 0,
        });
        this.labelTextOffset.push('3.5%');
        this.labelTexts.push(
          `+ ← ${omicsType[0].toUpperCase() + omicsType.slice(1)} ← -`
        );
      } else {
        this.labelArcData.push({
          data: 1,
          value: 1,
          index: 0,
          startAngle: startAngleVal,
          endAngle: startAngleVal + this.thirdCircleElement,
          padAngle: 0,
        });
        this.labelTextOffset.push('0');
        this.labelTexts.push(
          `- → ${omicsType[0].toUpperCase() + omicsType.slice(1)} → +`
        );
      }
    }
    this.addedElements += 1;
  }
}
