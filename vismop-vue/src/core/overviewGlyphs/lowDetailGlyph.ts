import { useMainStore } from '@/stores';
import * as d3 from 'd3';
import { PieArcDatum } from 'd3-shape';
import * as _ from 'lodash';
import { glyphData } from '@/core/reactomeGraphs/reactomeTypes';
import { glyphsNoValueGrey } from '@/core/colors';

/**
 * Glyph class for glyphs describing the results of omics or multiomics experiments on a per pathway basis
 */
export class LowDetailGlyph {
  private addedElements = 0;
  private availableOmics = 0;
  private drawLabels = false;
  private glyphData: glyphData;
  private accessor: 'value' | 'regressionData.slope';
  private diameter: number;
  private thirdCircle: number;
  private thirdCircleElement: number;
  private circlePadding: number;
  private width: number;
  private height: number;
  private radius: number;
  private outerArcDat: {
    data: number;
    value: number;
    index: number;
    startAngle: number;
    endAngle: number;
    padAngle: number;
  }[] = [];
  private outerColors: string[] = [];
  private colorScales;
  pathwayCompare: boolean;
  glyphIdx: number;

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
    this.colorScales =
      targetMeasurement === 'fc'
        ? mainStore.fcColorScales
        : mainStore.slopeColorScales;
    if (this.glyphData.transcriptomics.available) this.availableOmics += 1;
    if (this.glyphData.proteomics.available) this.availableOmics += 1;
    if (this.glyphData.metabolomics.available) this.availableOmics += 1;

    this.thirdCircle = 2 * (Math.PI / this.availableOmics);
    this.thirdCircleElement = 1.8 * (Math.PI / this.availableOmics);
    this.circlePadding = 0.1 * (Math.PI / this.availableOmics);
    this.width = imgWidth;
    this.height = imgWidth;
    this.radius = this.diameter / 2;
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

  setDrawLabels() {
    console.log('NOT IMPLEMENTED');
  }

  prepareOmics(
    omicsType: 'metabolomics' | 'proteomics' | 'transcriptomics'
  ): void {
    this.glyphData[omicsType].measurements.sort(
      (a, b) => _.get(a, this.accessor) - _.get(b, this.accessor)
    );
    const avgColor =
      this.glyphData[omicsType].measurements.length > 0
        ? this.colorScales[omicsType](this.glyphData[omicsType].meanMeasure)
        : glyphsNoValueGrey;
    this.outerColors.push(avgColor);
    const startAngleVal =
      this.addedElements * this.thirdCircle + this.circlePadding;
    const pushDat = {
      data: 1,
      value: 1,
      index: 1,
      startAngle: startAngleVal,
      endAngle: startAngleVal + this.thirdCircleElement,
      padAngle: 0,
    };
    this.outerArcDat.push(pushDat);
    this.addedElements += 1;
  }
  /**
   * Returns SVGElement of the glyph
   * @returns SVGElement of the glyph
   */
  generateGlyphSvg(): SVGElement {
    const svg = d3
      .create('svg')
      .attr('width', this.width)
      .attr('height', this.height);

    const g = svg
      .append('g')
      .attr('transform', `translate(${this.width / 2},${this.height / 2})`);
    const arcOuter = d3
      .arc<PieArcDatum<number>>()
      .innerRadius(this.radius / 4)
      .outerRadius(this.radius - 2);

    const _arcSeg = g
      .selectAll('g')
      .data(this.outerArcDat)
      .enter()
      .append('path')
      .attr('d', arcOuter)
      .attr('fill', (_d, i) => this.outerColors[i])
      .attr('class', 'foldArc')
      .attr('stroke', '#404040')
      .attr('stroke-width', this.diameter / 45);
    return svg.node() as SVGElement;
  }
}
