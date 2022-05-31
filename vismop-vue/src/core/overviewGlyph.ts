import { useMainStore } from '@/stores';
import * as d3 from 'd3';
import { PieArcDatum } from 'd3-shape';
import * as _ from 'lodash';
import { glyphData, omicsData } from './generalTypes';
import { reactomeEntry } from './reactomeTypes';

export function generateGlyphData(): { [key: string]: glyphData } {
  const outGlyphData: { [key: string]: glyphData } = {};
  const mainStore = useMainStore();
  // contains pathway lists
  const pathwayLayouting = mainStore.pathwayLayouting;
  const fcs = mainStore.fcs;
  const omicsRecieved = mainStore.omicsRecieved;
  const pathwayAmounts = mainStore.pathayAmountDict;
  for (const pathway of pathwayLayouting.pathwayList) {
    const transcriptomicsData = {
      available: omicsRecieved.transcriptomics,
      foldChanges: [],
      meanFoldchange: 0,
      nodeState: { total: 0, regulated: 0 },
    } as omicsData;
    const proteomicsData = {
      available: omicsRecieved.proteomics,
      foldChanges: [],
      meanFoldchange: 0,
      nodeState: { total: 0, regulated: 0 },
    } as omicsData;
    const metabolomicsData = {
      available: omicsRecieved.metabolomics,
      meanFoldchange: 0,
      foldChanges: [],
      nodeState: { total: 0, regulated: 0 },
    } as omicsData;
    const currentAmounts = pathwayAmounts[pathway.value];
    const nodeIDs = pathwayLayouting.pathwayNodeDictionary[pathway.value].map(
      (elem) => elem.split(';')
    );
    const usedIDs: string[] = [];
    nodeIDs.forEach((element) => {
      element.forEach((entry) => {
        const currentEntry = entry.replace('cpd:', '').replace('gl:', '');
        try {
          if (!usedIDs.includes(currentEntry)) {
            const fcsCurrent = fcs[currentEntry];
            if (typeof fcsCurrent.transcriptomics === 'number') {
              transcriptomicsData.foldChanges.push({
                name: mainStore.transcriptomicsKeggIDDict[currentEntry],
                value: fcsCurrent.transcriptomics,
                queryID: '',
              });
              transcriptomicsData.nodeState.regulated += 1;
            }
            if (typeof fcsCurrent.proteomics === 'number') {
              proteomicsData.foldChanges.push({
                name: mainStore.proteomicsKeggIDDict[currentEntry],
                value: fcsCurrent.proteomics,
                queryID: '',
              });
              proteomicsData.nodeState.regulated += 1;
            }
            if (typeof fcsCurrent.metabolomics === 'number') {
              metabolomicsData.foldChanges.push({
                name: currentEntry,
                value: fcsCurrent.metabolomics,
                queryID: '',
              });
              metabolomicsData.nodeState.regulated += 1;
            }
            usedIDs.push(currentEntry);
          }
        } catch (error) {
          console.log('Glyph Data: ', error);
        }
      });
    });
    // transcriptomicsData.foldChanges.sort((a, b) => a.value - b.value)
    // proteomicsData.foldChanges.sort((a, b) => a.value - b.value)
    // metabolomicsData.foldChanges.sort((a, b) => a.value - b.value)
    proteomicsData.nodeState.total = currentAmounts.genes;
    transcriptomicsData.nodeState.total = currentAmounts.genes;
    metabolomicsData.nodeState.total = currentAmounts.compounds;
    transcriptomicsData.meanFoldchange =
      transcriptomicsData.foldChanges.reduce((a, b) => a + b.value, 0) /
      transcriptomicsData.foldChanges.length;
    proteomicsData.meanFoldchange =
      proteomicsData.foldChanges.reduce((a, b) => a + b.value, 0) /
      proteomicsData.foldChanges.length;
    metabolomicsData.meanFoldchange =
      metabolomicsData.foldChanges.reduce((a, b) => a + b.value, 0) /
      metabolomicsData.foldChanges.length;

    outGlyphData[pathway.value] = {
      pathwayID: pathway.value,
      transcriptomics: transcriptomicsData,
      proteomics: proteomicsData,
      metabolomics: metabolomicsData,
    };
  }
  return outGlyphData;
}

export function generateGlyphDataReactome(): { [key: string]: glyphData } {
  const outGlyphData: { [key: string]: glyphData } = {};
  const mainStore = useMainStore();

  // contains pathway lists
  const omicsRecieved = mainStore.omicsRecieved;
  const overviewData = mainStore.overviewData as reactomeEntry[];
  for (const pathway of overviewData) {
    const transcriptomicsData = {
      available: omicsRecieved.transcriptomics,
      foldChanges: [],
      meanFoldchange: 0,
      nodeState: { total: 0, regulated: 0 },
    } as omicsData;
    const proteomicsData = {
      available: omicsRecieved.proteomics,
      foldChanges: [],
      meanFoldchange: 0,
      nodeState: { total: 0, regulated: 0 },
    } as omicsData;
    const metabolomicsData = {
      available: omicsRecieved.metabolomics,
      meanFoldchange: 0,
      foldChanges: [],
      nodeState: { total: 0, regulated: 0 },
    } as omicsData;

    transcriptomicsData.nodeState.total = pathway.entries.transcriptomics.total;
    for (const measureKey in pathway.entries.transcriptomics.measured) {
      const entry = pathway.entries.transcriptomics.measured[measureKey];
      transcriptomicsData.foldChanges.push({
        name: entry.name,
        value: entry.value,
        queryID: entry.queryId,
      });
      transcriptomicsData.nodeState.regulated += 1;
    }

    proteomicsData.nodeState.total = pathway.entries.proteomics.total;
    for (const measureKey in pathway.entries.proteomics.measured) {
      const entry = pathway.entries.proteomics.measured[measureKey];
      proteomicsData.foldChanges.push({
        name: entry.name,
        value: entry.value,
        queryID: entry.queryId,
      });
      proteomicsData.nodeState.regulated += 1;
    }

    metabolomicsData.nodeState.total = pathway.entries.metabolomics.total;
    for (const measureKey in pathway.entries.metabolomics.measured) {
      const entry = pathway.entries.metabolomics.measured[measureKey];
      metabolomicsData.foldChanges.push({
        name: entry.name,
        value: entry.value,
        queryID: entry.queryId,
      });
      metabolomicsData.nodeState.regulated += 1;
    }

    transcriptomicsData.foldChanges.sort((a, b) => a.value - b.value);
    proteomicsData.foldChanges.sort((a, b) => a.value - b.value);
    metabolomicsData.foldChanges.sort((a, b) => a.value - b.value);
    transcriptomicsData.meanFoldchange =
      transcriptomicsData.foldChanges.reduce((a, b) => a + b.value, 0) /
      transcriptomicsData.foldChanges.length;
    proteomicsData.meanFoldchange =
      proteomicsData.foldChanges.reduce((a, b) => a + b.value, 0) /
      proteomicsData.foldChanges.length;
    metabolomicsData.meanFoldchange =
      metabolomicsData.foldChanges.reduce((a, b) => a + b.value, 0) /
      metabolomicsData.foldChanges.length;

    outGlyphData[pathway.pathwayId] = {
      pathwayID: pathway.pathwayId,
      transcriptomics: transcriptomicsData,
      proteomics: proteomicsData,
      metabolomics: metabolomicsData,
    };
  }
  return outGlyphData;
}

export function generateGlyphs(inputData: { [key: string]: glyphData }, diameter = 28): {
  url: { [key: string]: string };
  svg: { [key: string]: SVGElement };
} {
  const outObjURL: { [key: string]: string } = {};
  const outObjSVG: { [key: string]: SVGElement } = {};
  let idx = 0;
  for (const key in inputData) {
    const glyphData = inputData[key];
    const serializer = new XMLSerializer();
    const glyphSVG = generateGlyphVariation(
      glyphData,
      false,
      idx,
      true,
      diameter
    ) as SVGElement;
    const glyphSVGstring = serializer.serializeToString(glyphSVG);
    const svgBlob = new Blob([glyphSVGstring], {
      type: 'image/svg+xml;charset=utf-8',
    });
    const svgURL = window.URL.createObjectURL(svgBlob);

    const glyphSVGlegend = generateGlyphVariation(glyphData, true, idx, true, diameter);
    // const glyphSVGstringlegend = serializer.serializeToString(glyphSVGlegend)
    // const svgBloblegend = new Blob([glyphSVGstringlegend], { type: 'image/svg+xml;charset=utf-8' })
    // const svgURLlegend = window.URL.createObjectURL(svgBloblegend)
    outObjURL[key] = svgURL;
    outObjSVG[key] = glyphSVGlegend;
    idx += 1;
  }

  return { url: outObjURL, svg: outObjSVG };
}

export function generateGlyphVariation(
  glyphDat: glyphData,
  drawLabels: boolean,
  glyphIdx: number,
  pathwayCompare = true,
  diameter: number
): SVGElement {
  const mainStore = useMainStore();

  let availableOmics = 0;
  if (glyphDat.transcriptomics.available) availableOmics += 1;
  if (glyphDat.proteomics.available) availableOmics += 1;
  if (glyphDat.metabolomics.available) availableOmics += 1;

  const thirdCircle = 2 * (Math.PI / availableOmics);
  const thirdCircleElement = 1.8 * (Math.PI / availableOmics);
  const circlePadding = 0.1 * (Math.PI / availableOmics);
  const layerWidth = diameter / 7;
  const width = diameter + (drawLabels ? 7 : 0);
  const height = diameter + (drawLabels ? 7 : 0);
  const outermostRadius = diameter / 2;
  const firstLayer = outermostRadius - layerWidth;
  const secondLayer = firstLayer - layerWidth;
  const colorScaleTranscriptomics = mainStore.fcScales.transcriptomics;
  const colorScaleProteomics = mainStore.fcScales.proteomics;
  const colorScaleMetabolomics = mainStore.fcScales.metabolomics;
  let highlightSection = 0;

  const outerArcDat: {
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
  const innerArcDat = [];
  const outerColors: string[] = [];
  const innerColors: string[] = [];
  const labelArcData = [];
  const labelTexts: string[] = [];
  const labelRegTexts: string[] = [];
  const labelTextOffset: string[] = [];

  // prepare transcriptomics
  let addedElements = 0;
  let totalNodes = 0;
  if (glyphDat.transcriptomics.available) {
    totalNodes += glyphDat.transcriptomics.nodeState.total;
    glyphDat.transcriptomics.foldChanges.sort((a, b) => a.value - b.value);
    const colorsTranscriptomics = glyphDat.transcriptomics.foldChanges.map(
      (elem) => colorScaleTranscriptomics(elem.value)
    );
    outerColors.push(...colorsTranscriptomics);
    const angleRangeTranscriptomicsFCs = _.range(
      circlePadding,
      circlePadding +
        thirdCircleElement +
        thirdCircleElement / colorsTranscriptomics.length,
      thirdCircleElement / colorsTranscriptomics.length
    );
    colorsTranscriptomics.forEach((_element, idx) => {
      const pushDat = {
        data: idx + 1,
        value: idx + 1,
        index: idx,
        startAngle: angleRangeTranscriptomicsFCs[idx],
        endAngle: angleRangeTranscriptomicsFCs[idx + 1],
        padAngle: 0,
        name: glyphDat.transcriptomics.foldChanges[idx].name,
        fc: glyphDat.transcriptomics.foldChanges[idx].value,
        queryID: glyphDat.transcriptomics.foldChanges[idx].queryID,
      };
      outerArcDat.push(pushDat);
    });
    const transcriptomicsRegulatedQuotient =
      glyphDat.transcriptomics.nodeState.regulated /
      glyphDat.transcriptomics.nodeState.total;
    innerArcDat.push({
      data: 1,
      value: 1,
      index: 0,
      startAngle: circlePadding,
      endAngle:
        circlePadding + thirdCircleElement * transcriptomicsRegulatedQuotient,
      padAngle: 0,
      hoverData: `${glyphDat.transcriptomics.nodeState.regulated} / ${glyphDat.transcriptomics.nodeState.total}`,
    });
    innerArcDat.push({
      data: 2,
      value: 2,
      index: 1,
      startAngle:
        circlePadding + thirdCircleElement * transcriptomicsRegulatedQuotient,
      endAngle: circlePadding + thirdCircleElement,
      padAngle: 0,
      hoverData: '',
    });
    innerColors.push('gray', '#c2c2c2');
    addedElements += 1;
    labelRegTexts.push(
      `${glyphDat.transcriptomics.nodeState.regulated} of ${glyphDat.transcriptomics.nodeState.total}`
    );
    if (drawLabels) {
      if (availableOmics === 1) {
        labelArcData.push({
          data: 1,
          value: 1,
          index: 0,
          startAngle: circlePadding + thirdCircleElement,
          endAngle: circlePadding,
          padAngle: 0,
        });
        labelTextOffset.push('3.5%');
        labelTexts.push('+ ← Transcriptomics ← -');
      } else {
        labelArcData.push({
          data: 1,
          value: 1,
          index: 0,
          startAngle: circlePadding,
          endAngle: circlePadding + thirdCircleElement,
          padAngle: 0,
        });
        labelTextOffset.push('0');
        labelTexts.push('- → Transcriptomics → +');
      }
    }
  }
  // prepare proteomics
  if (glyphDat.proteomics.available) {
    totalNodes += glyphDat.proteomics.nodeState.total;
    glyphDat.proteomics.foldChanges.sort((a, b) => a.value - b.value);
    const colorsProteomics = glyphDat.proteomics.foldChanges.map((elem) =>
      colorScaleProteomics(elem.value)
    );
    outerColors.push(...colorsProteomics);
    const startAngleVal = addedElements * thirdCircle + circlePadding;

    const angleRangeProteomicsFCs = _.range(
      startAngleVal,
      startAngleVal +
        thirdCircleElement +
        thirdCircleElement / colorsProteomics.length,
      thirdCircleElement / colorsProteomics.length
    );
    colorsProteomics.forEach((_element, idx) => {
      const pushDat = {
        data: idx + 1,
        value: idx + 1,
        index: idx,
        startAngle: angleRangeProteomicsFCs[idx],
        endAngle: angleRangeProteomicsFCs[idx + 1],
        padAngle: 0,
        name: glyphDat.proteomics.foldChanges[idx].name,
        fc: glyphDat.proteomics.foldChanges[idx].value,
        queryID: glyphDat.proteomics.foldChanges[idx].queryID,
      };
      outerArcDat.push(pushDat);
    });
    const proteomicsRegulatedQuotient =
      glyphDat.proteomics.nodeState.regulated /
      glyphDat.proteomics.nodeState.total;
    innerArcDat.push({
      data: 1,
      value: 1,
      index: 0,
      startAngle: startAngleVal,
      endAngle:
        startAngleVal + thirdCircleElement * proteomicsRegulatedQuotient,
      padAngle: 0,
      hoverData: '',
    });
    innerArcDat.push({
      data: 2,
      value: 2,
      index: 1,
      startAngle:
        startAngleVal + thirdCircleElement * proteomicsRegulatedQuotient,
      endAngle: startAngleVal + thirdCircleElement,
      padAngle: 0,
      hoverData: '',
    });
    innerColors.push('gray', '#c2c2c2');
    labelRegTexts.push(
      `${glyphDat.proteomics.nodeState.regulated} of ${glyphDat.proteomics.nodeState.total}`
    );
    addedElements += 1;
    if (drawLabels) {
      if (availableOmics === 1 || availableOmics === 3) {
        labelArcData.push({
          data: 1,
          value: 1,
          index: 0,
          startAngle: startAngleVal + thirdCircleElement,
          endAngle: startAngleVal,
          padAngle: 0,
        });
        labelTextOffset.push('3.5%');
        labelTexts.push('+ ← Proteomics ← -');
      } else {
        labelArcData.push({
          data: 1,
          value: 1,
          index: 0,
          startAngle: startAngleVal,
          endAngle: startAngleVal + thirdCircleElement,
          padAngle: 0,
        });
        labelTextOffset.push('0');
        labelTexts.push('- → Proteomics → +');
      }
    }
  }
  // prepare metabolomics
  if (glyphDat.metabolomics.available) {
    totalNodes += glyphDat.metabolomics.nodeState.total;
    glyphDat.metabolomics.foldChanges.sort((a, b) => a.value - b.value);
    const colorsMetabolomics = glyphDat.metabolomics.foldChanges.map((elem) =>
      colorScaleMetabolomics(elem.value)
    );
    outerColors.push(...colorsMetabolomics);
    const startAngleVal = addedElements * thirdCircle + circlePadding;

    const angleRangeMetabolomicsFCs = _.range(
      startAngleVal,
      startAngleVal +
        thirdCircleElement +
        thirdCircleElement / colorsMetabolomics.length,
      thirdCircleElement / colorsMetabolomics.length
    );
    colorsMetabolomics.forEach((_element, idx) => {
      const pushDat = {
        data: idx + 1,
        value: idx + 1,
        index: idx,
        startAngle: angleRangeMetabolomicsFCs[idx],
        endAngle: angleRangeMetabolomicsFCs[idx + 1],
        padAngle: 0,
        name: glyphDat.metabolomics.foldChanges[idx].name,
        fc: glyphDat.metabolomics.foldChanges[idx].value,
        queryID: glyphDat.metabolomics.foldChanges[idx].queryID,
      };
      outerArcDat.push(pushDat);
    });
    const metabolomicsRegulatedQuotient =
      glyphDat.metabolomics.nodeState.regulated /
      glyphDat.metabolomics.nodeState.total;
    innerArcDat.push({
      data: 1,
      value: 1,
      index: 0,
      startAngle: startAngleVal,
      endAngle:
        startAngleVal + thirdCircleElement * metabolomicsRegulatedQuotient,
      padAngle: 0,
      hoverData: `${glyphDat.metabolomics.nodeState.regulated} / ${glyphDat.metabolomics.nodeState.total}`,
    });
    innerArcDat.push({
      data: 2,
      value: 2,
      index: 1,
      startAngle:
        startAngleVal + thirdCircleElement * metabolomicsRegulatedQuotient,
      endAngle: startAngleVal + thirdCircleElement,
      padAngle: 0,
      hoverData: '',
    });
    innerColors.push('gray', '#c2c2c2');
    labelRegTexts.push(
      `${glyphDat.metabolomics.nodeState.regulated} of ${glyphDat.metabolomics.nodeState.total}`
    );

    addedElements += 1;
    if (drawLabels) {
      if (availableOmics === 1) {
        labelArcData.push({
          data: 1,
          value: 1,
          index: 0,
          startAngle: startAngleVal + thirdCircleElement,
          endAngle: startAngleVal,
          padAngle: 0,
        });
        labelTextOffset.push('3.5%');
        labelTexts.push('+ ← Metabolomics ← -');
      } else {
        labelArcData.push({
          data: 1,
          value: 1,
          index: 0,
          startAngle: startAngleVal,
          endAngle: startAngleVal + thirdCircleElement,
          padAngle: 0,
        });
        labelTextOffset.push('0');
        labelTexts.push('- → Metabolomics → +');
      }
    }
  }

  let svg;
  let g;

  if (drawLabels) {
    svg = d3
      .create('svg')
      .attr('viewBox', pathwayCompare ? `0 0 ${width} ${height}` : '0 0 35 35')
      .attr('width', pathwayCompare ? '100%' : '200px')
      .attr('height', pathwayCompare ? '100%' : '200px');
    g = svg
      .append('g')
      .attr('class', 'glyph')
      .attr('id', `glyph${glyphIdx}`)
      .attr('transform', `translate(${width / 2},${height / 2})`);
    // DOMMouseScroll seems to work in FF
    g.on('mouseenter', (_event, _dat) => {
      const amtElems = d3
        .select(`#glyph${glyphIdx}`)
        .selectAll('.foldArc')
        .size();
      highlightSection = 0 % amtElems;
      d3.select(`#glyph${glyphIdx}`)
        .selectAll('.foldArc')
        .data(outerArcDat)
        .attr('fill-opacity', (d, i) => {
          if (i === highlightSection) {
            d3.select(`#glyph${glyphIdx}`)
              .select('#tspan1')
              .text(d.name.split(' ')[0]); // more of a temp fix
            d3.select(`#glyph${glyphIdx}`)
              .select('#tspan2')
              .text(d.fc.toFixed(3));
            return 1.0;
          } else return 0.2;
        });
    });
    g.on('mouseleave', (_event, _dat) => {
      highlightSection = 0;
      d3.select(`#glyph${glyphIdx}`)
        .selectAll('.foldArc')
        .attr('fill-opacity', (_d, _i) => {
          d3.select(`#glyph${glyphIdx}`).select('#tspan1').text('Total:');
          d3.select(`#glyph${glyphIdx}`).select('#tspan2').text(totalNodes);
          return 1.0;
        });
    });
    g.on('wheel.zoom', (event, _dat) => {
      const amtElems = d3
        .select(`#glyph${glyphIdx}`)
        .selectAll('.foldArc')
        .size();
      highlightSection =
        (((highlightSection + (event.wheelDelta > 0 ? 1 : -1)) % amtElems) +
          amtElems) %
        amtElems;
      d3.select(`#glyph${glyphIdx}`)
        .selectAll('.foldArc')
        .data(outerArcDat)
        .attr('fill-opacity', (d, i) => {
          if (i === highlightSection) {
            d3.select(`#glyph${glyphIdx}`)
              .select('#tspan1')
              .text(d.name.split(' ')[0]); // more of a temp fix
            d3.select(`#glyph${glyphIdx}`)
              .select('#tspan2')
              .text(d.fc.toFixed(3));
            return 1.0;
          } else return 0.2;
        });
      event.stopPropagation();
    });
  } else {
    svg = d3.create('svg').attr('width', width).attr('height', height);

    g = svg
      .append('g')
      .attr('transform', `translate(${width / 2},${height / 2})`);
  }
  const arcOuter = d3
    .arc<PieArcDatum<number>>()
    .innerRadius(firstLayer)
    .outerRadius(outermostRadius);
  const arcMiddle = d3
    .arc<PieArcDatum<number>>()
    .innerRadius(secondLayer)
    .outerRadius(firstLayer);

  // segment order: transcriptomics = outer, proteomics = middle, metabolomics = inner
  const arcSeg = g
    .selectAll('g')
    .data(outerArcDat)
    .enter()
    .append('path')
    .attr('d', arcOuter)
    .attr('fill', (_d, i) => outerColors[i])
    .attr('class', 'foldArc')
    .attr('strokewidth', -2);
  if (!pathwayCompare) {
    arcSeg.on('click', (event, d) => {
      mainStore.addClickedNode({ queryID: d.queryID, name: d.name });
      event.stopPropagation();
    });
  }

  arcSeg.append('title').text((d) => d.name + '\n' + d.fc.toFixed(3));
  const _graySegments = g
    .selectAll('g')
    .data(innerArcDat)
    .enter()
    .append('path')
    .attr('d', arcMiddle)
    .attr('fill', (_d, i) => innerColors[i]);
  // graySegments
  // .on('mouseover', (d, i) => console.log('HOVERTEST', i))
  // .append('title')
  // .text((d) => d.hoverData)

  if (drawLabels) {
    const labelArcOmics = d3
      .arc<PieArcDatum<number>>()
      .innerRadius(outermostRadius + 2)
      .outerRadius(outermostRadius + 2);
    const labelArcRegulated = d3
      .arc<PieArcDatum<number>>()
      .innerRadius((firstLayer + secondLayer) * 0.5)
      .outerRadius((firstLayer + secondLayer) * 0.5);

    g.selectAll('labels')
      .data(labelArcData)
      .enter()
      .append('path')
      .attr('id', (_d, i) => `labelArcReg${i}`)
      .attr('d', labelArcRegulated)
      .style('fill', 'none');

    g.selectAll('labels')
      .data(labelArcData)
      .enter()
      .append('text')
      // .attr('dy', (d, i) => labelTextOffset[i])
      .append('textPath')
      .text((_d, i) => labelRegTexts[i])
      .attr('startOffset', '25%')
      .style('text-anchor', 'middle')
      .attr('class', 'glyphText')
      .attr('href', (_d, i) => `#labelArcReg${i}`);
    /*
      .data(innerArcDat)
      .enter()
      .append('text')
      .attr('class', 'glyphText')
      .attr('transform', (d) => `translate(${arcMiddle.centroid(d)})`)
      .append('tspan')
      .text((d) => d.hoverData)
      */

    g.selectAll('labels')
      .data(labelArcData)
      .enter()
      .append('path')
      .attr('id', (_d, i) => `labelArc${i}`)
      .attr('d', labelArcOmics)
      .style('fill', 'none');

    g.selectAll('labels')
      .data(labelArcData)
      .enter()
      .append('text')
      // .attr('dy', (d, i) => labelTextOffset[i])
      .append('textPath')
      .text((_d, i) => labelTexts[i])
      .attr('startOffset', '25%')
      .attr('class', 'glyphText')
      .attr('href', (_d, i) => `#labelArc${i}`);
    // .attr('transform', (d) => `translate(${labelArc.centroid(d)})`)
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
      .text(totalNodes);
  }
  return svg.node() as SVGElement;
}
