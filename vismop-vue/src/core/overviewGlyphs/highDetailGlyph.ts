import { useMainStore } from '@/stores';
import * as d3 from 'd3';
import { PieArcDatum } from 'd3-shape';
import * as _ from 'lodash';
import { glyphData } from '../reactomeGraphs/reactomeTypes';
import { glyphsNoValueGrey } from '@/core/colors';

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
  private accessor: 'value' | 'regressionData.slope';
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
  private omicsAverages: string[] = [];

  constructor(
    glyphData: glyphData,
    targetMeasurement: 'fc' | 'slope',
    drawLabels: boolean,
    glyphIdx: number,
    imgWidth: number,
    pathwayCompare = true
  ) {
    const mainStore = useMainStore();

    this.glyphData = glyphData;
    this.drawLabels = drawLabels;
    this.pathwayCompare = pathwayCompare;
    this.glyphIdx = glyphIdx;
    this.diameter = imgWidth - imgWidth / 10 - (this.drawLabels ? 7 : 0);
    this.accessor =
      targetMeasurement === 'fc' ? 'value' : 'regressionData.slope';

    if (this.glyphData.transcriptomics.available) this.availableOmics += 1;
    if (this.glyphData.proteomics.available) this.availableOmics += 1;
    if (this.glyphData.metabolomics.available) this.availableOmics += 1;

    this.thirdCircle = 2 * (Math.PI / this.availableOmics);
    this.thirdCircleElement = 1.8 * (Math.PI / this.availableOmics);
    this.circlePadding = 0.1 * (Math.PI / this.availableOmics);
    this.layerWidth = this.diameter / 7;
    this.width = imgWidth;
    this.height = imgWidth;
    this.outermostRadius = this.diameter / 2;
    this.firstLayer = this.outermostRadius - this.layerWidth;
    this.secondLayer = this.firstLayer - this.layerWidth;
    this.colorScales =
      targetMeasurement === 'fc'
        ? mainStore.fcColorScales
        : mainStore.slopeColorScales;
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
    this.width = this.diameter + (this.drawLabels ? 15 : 0);
    this.height = this.diameter + (this.drawLabels ? 15 : 0);
    this.backroundArcDat = [];
    this.innerArcDat = [];
    this.outerArcDat = [];
    this.outerColors = [];
    this.innerColors = [];
    this.labelArcData = [];
    this.labelTexts = [];
    this.labelRegTexts = [];
    this.omicsAverages = [];
    this.labelTextOffset = [];
    this.totalNodes = 0;
    this.addedElements = 0;
    this.availableOmics = 0;
    this.highlightSection = 0;
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
    let svg;
    let labelG;
    let glyphG;
    const textSmallThreshold = 5;
    const textTinyThreshold = 12;

    if (this.drawLabels) {
      svg = d3
        .create('svg')
        .attr('viewBox', `0 0 ${this.width} ${this.height}`)
        .attr('width', this.pathwayCompare ? '100%' : '200px')
        .attr('height', this.pathwayCompare ? '100%' : '200px');
      labelG = svg
        .append('g')
        .attr('class', 'glyph')
        .attr('id', `glyph${this.glyphIdx}`)
        .attr('transform', `translate(${this.width / 2},${this.height / 2})`);
      glyphG = labelG.append('g');
    } else {
      svg = d3
        .create('svg')
        .attr('width', this.width)
        .attr('height', this.height);

      labelG = svg
        .append('g')
        .attr('transform', `translate(${this.width / 2},${this.height / 2})`);
      glyphG = labelG.append('g');
    }
    const arcOuter = d3
      .arc<PieArcDatum<number>>()
      .innerRadius(this.firstLayer)
      .outerRadius(this.outermostRadius);

    const arcMiddle = d3
      .arc<PieArcDatum<number>>()
      .innerRadius(this.secondLayer)
      .outerRadius(this.firstLayer);

    const arcSeg = glyphG
      .selectAll('g')
      .data(this.outerArcDat)
      .enter()
      .append('path')
      .attr('d', arcOuter)
      .attr('fill', (_d, i) => this.outerColors[i])
      .attr('class', 'foldArc')
      .attr('id', (_d, i) => `foldArc_${i}`)
      .attr('stroke-width', -2);
    if (!this.pathwayCompare) {
      arcSeg.on('click', (event, d) => {
        event.stopPropagation();
      });
    }

    arcSeg.append('title').text((d) => d.name + '\n' + d.fc.toFixed(3));
    const _graySegments = glyphG
      .selectAll('g')
      .data(this.innerArcDat)
      .enter()
      .append('path')
      .attr('d', arcMiddle)
      .attr('fill', (_d, i) => this.innerColors[i])
      .attr('stroke-width', -2);

    glyphG
      .selectAll('g')
      .data(this.backroundArcDat)
      .enter()
      .append('path')
      .attr('d', arcMiddle)
      .attr('fill', 'none')
      .attr('stroke', '#404040')
      .attr('stroke-width', this.diameter / 45);

    glyphG
      .selectAll('g')
      .data(this.backroundArcDat)
      .enter()
      .append('path')
      .attr('d', arcOuter)
      .attr('id', (d, i) => `omicsArc${i}`)
      .attr('fill', (d) => d.color)
      .attr('stroke', '#404040')
      .attr('stroke-width', this.diameter / 45);

    if (this.drawLabels) {
      const labelArcOmics = d3
        .arc<PieArcDatum<number>>()
        .innerRadius(this.outermostRadius + 4)
        .outerRadius(this.outermostRadius + 4);
      const labelArcRegulated = d3
        .arc<PieArcDatum<number>>()
        .innerRadius((this.firstLayer + this.secondLayer) * 0.5)
        .outerRadius((this.firstLayer + this.secondLayer) * 0.5);

      labelG
        .selectAll('labels')
        .data(this.labelArcData)
        .enter()
        .append('path')
        .attr('id', (_d, i) => `labelArcReg${i}`)
        .attr('d', labelArcRegulated)
        .style('fill', 'none');

      labelG
        .selectAll('labels')
        .data(this.labelArcData)
        .enter()
        .append('text')
        .append('textPath')
        .text((_d, i) => this.labelRegTexts[i])
        .attr('startOffset', '25%')
        .style('text-anchor', 'middle')
        .attr('class', 'glyphText')
        .attr('href', (_d, i) => `#labelArcReg${i}`);

      labelG
        .selectAll('labels')
        .data(this.labelArcData)
        .enter()
        .append('path')
        .attr('class', 'labelArcOmics')
        .attr('id', (_d, i) => `labelArc${i}`)
        .attr('d', labelArcOmics)
        .style('fill', 'none');

      const omicLabel = labelG
        .selectAll('labels')
        .data(this.labelArcData)
        .enter()
        .append('text')
        .append('textPath')
        .text((_d, i) => this.labelTexts[i])
        .attr('startOffset', '25%')
        .attr('class', 'glyphText')
        .attr('href', (_d, i) => `#labelArc${i}`);

      omicLabel.on('mouseenter', (event, dat) => {
        event.stopPropagation();
        event.preventDefault();
        const index = dat.index;
        d3.select(`#glyph${this.glyphIdx}`)
          .select(`#labelArc${index}`)
          .attr('fill-opacity', (_d, _i) => {
            d3.select(`#glyph${this.glyphIdx}`)
              .select('#tspan1')
              .attr('class', 'glyphText')
              .text('Avg:');
            d3.select(`#glyph${this.glyphIdx}`)
              .select('#tspan2')
              .text(this.omicsAverages[index]);
            d3.select(`#glyph${this.glyphIdx}`)
              .select(`#omicsArc${index}`)
              .attr('stroke', '#fc0d0d');
            return 1.0;
          });
      });
      omicLabel.on('mouseleave', (event, dat) => {
        this.removeHighlight(dat);
      });
      omicLabel.on('wheel.zoom', (event, dat) => {
        this.removeHighlight(dat);
      });
      const text = labelG.append('text');

      text
        .append('tspan')
        .attr('class', 'glyphText')
        .attr('id', 'tspan1')
        .attr('x', 0)
        .attr('dy', '-0.5em')
        .text('Total:');

      text
        .append('tspan')
        .attr('id', 'tspan2')
        .attr('class', 'glyphText ')
        .attr('x', 0)
        .attr('dy', '1em')
        .text(this.totalNodes);

      // DOMMouseScroll seems to work in FF
      arcSeg.on('mouseenter', (event, _dat) => {
        event.preventDefault();
        console.log('glyph mouseenter', event, _dat);
        const amtElems = d3
          .select(`#glyph${this.glyphIdx}`)
          .selectAll('.foldArc')
          .size();
        const current_Id = event.target.id.split('foldArc_')[1];
        this.highlightSection = current_Id % amtElems;
        d3.select(`#glyph${this.glyphIdx}`)
          .selectAll('.foldArc')
          .data(this.outerArcDat)
          .attr('fill-opacity', (d, i) => {
            if (i === this.highlightSection) {
              const label = d.name.split(' ')[0]; // more of a temp fix
              d3.select(`#glyph${this.glyphIdx}`)
                .select('#tspan1')
                .attr(
                  'class',
                  label.length > textSmallThreshold
                    ? label.length > textTinyThreshold
                      ? 'glyphTextTiny'
                      : 'glyphTextSmall'
                    : 'glyphText'
                )
                .text(label);
              d3.select(`#glyph${this.glyphIdx}`)
                .select('#tspan2')
                .text(d.fc.toFixed(3));
              return 1.0;
            } else return 0.2;
          });
      });
      arcSeg.on('mouseleave', (event, _dat) => {
        this.highlightSection = 0;
        d3.select(`#glyph${this.glyphIdx}`)
          .selectAll('.foldArc')
          .attr('fill-opacity', (_d, _i) => {
            d3.select(`#glyph${this.glyphIdx}`)
              .select('#tspan1')
              .attr('class', 'glyphText')
              .text('Total:');
            d3.select(`#glyph${this.glyphIdx}`)
              .select('#tspan2')
              .text(this.totalNodes);
            return 1.0;
          });
      });
      arcSeg.on('wheel.zoom', (event, _dat) => {
        event.preventDefault();
        event.stopPropagation();
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
              const label = d.name.split(' ')[0]; // more of a temp fix
              d3.select(`#glyph${this.glyphIdx}`)
                .select('#tspan1')
                .attr(
                  'class',
                  label.length > textSmallThreshold
                    ? label.length > textTinyThreshold
                      ? 'glyphTextTiny'
                      : 'glyphTextSmall'
                    : 'glyphText'
                )
                .text(label);
              d3.select(`#glyph${this.glyphIdx}`)
                .select('#tspan2')
                .text(d.fc.toFixed(3));
              return 1.0;
            } else return 0.2;
          });
      });
    }
    return svg.node() as SVGElement;
  }

  removeHighlight(dat: {
    data?: number;
    value?: number;
    index: any;
    startAngle?: number;
    endAngle?: number;
    padAngle?: number;
  }) {
    const index = dat.index;
    d3.select(`#glyph${this.glyphIdx}`)
      .select(`#labelArc${index}`)
      .attr('fill-opacity', (_d, _i) => {
        d3.select(`#glyph${this.glyphIdx}`)
          .select('#tspan1')
          .attr('class', 'glyphText')
          .text('Total:');
        d3.select(`#glyph${this.glyphIdx}`)
          .select('#tspan2')
          .text(this.totalNodes);
        d3.select(`#glyph${this.glyphIdx}`)
          .select(`#omicsArc${index}`)
          .attr('stroke', '#404040');
        return 1.0;
      });
  }

  prepareOmics(
    omicsType: 'metabolomics' | 'proteomics' | 'transcriptomics'
  ): void {
    this.totalNodes += this.glyphData[omicsType].nodeState.total;
    this.glyphData[omicsType].measurements.sort(
      (a, b) => _.get(a, this.accessor) - _.get(b, this.accessor)
    );
    const omicsColors = this.glyphData[omicsType].measurements.map((elem) =>
      this.colorScales[omicsType](_.get(elem, this.accessor))
    );
    this.outerColors.push(...omicsColors);
    const startAngleVal =
      this.addedElements * this.thirdCircle + this.circlePadding;
    this.omicsAverages.push(this.glyphData[omicsType].meanMeasure.toFixed(3));
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
      color: omicsColors.length > 0 ? 'none' : glyphsNoValueGrey,
    });
    omicsColors.forEach((_element, idx) => {
      const pushDat = {
        data: idx + 1,
        value: idx + 1,
        index: idx,
        startAngle: angleFCs[idx],
        endAngle: angleFCs[idx + 1],
        padAngle: 0,
        name: this.glyphData[omicsType].measurements[idx].name,
        fc: _.get(this.glyphData[omicsType].measurements[idx], this.accessor),
        queryID: this.glyphData[omicsType].measurements[idx].queryId,
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
          index: this.addedElements,
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
          index: this.addedElements,
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
