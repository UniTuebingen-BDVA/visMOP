import { useMainStore } from '@/stores';
import * as d3 from 'd3';
import { PieArcDatum } from 'd3-shape';
import * as _ from 'lodash';
import { glyphData } from '../generalTypes';
import { glyphsNoValueGrey } from '@/core/colors';

/**
 * Glyph class for glyphs describing the results of omics or multiomics experiments on a per pathway basis
 */
export class ModuleSummaryGlyph {
  private addedElements = 0;
  private availableOmics = 0;
  private drawLabels = false;
  private glyphData: glyphData;
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
  glyphId: string;

  constructor(glyphData: glyphData, glyphId: string, diameter: number) {
    const mainStore = useMainStore();

    this.glyphData = glyphData;
    this.glyphId = glyphId;
    this.diameter = diameter;

    if (this.glyphData.transcriptomics.available) this.availableOmics += 1;
    if (this.glyphData.proteomics.available) this.availableOmics += 1;
    if (this.glyphData.metabolomics.available) this.availableOmics += 1;

    this.thirdCircle = 2 * (Math.PI / this.availableOmics);
    this.thirdCircleElement = 1.8 * (Math.PI / this.availableOmics);
    this.circlePadding = 0.1 * (Math.PI / this.availableOmics);
    this.width = this.diameter + this.diameter / 5 + (this.drawLabels ? 7 : 0);
    this.height = this.diameter + this.diameter / 5 + (this.drawLabels ? 7 : 0);
    this.radius = this.diameter / 2;
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

  setDrawLabels() {
    console.log('NOT IMPLEMENTED');
  }

  prepareOmics(
    omicsType: 'metabolomics' | 'proteomics' | 'transcriptomics'
  ): void {
    this.glyphData[omicsType].foldChanges.sort((a, b) => a.value - b.value);
    const avgColor =
      this.glyphData[omicsType].foldChanges.length > 0
        ? this.colorScales[omicsType](
            this.glyphData[omicsType].foldChanges.reduce(
              (a, b) => a + b.value,
              0
            ) / this.glyphData[omicsType].foldChanges.length
          )
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
