import store from '@/store'
import * as d3 from 'd3'
import { PieArcDatum } from 'd3-shape'
import * as _ from 'lodash'

interface omicsData {
  available: boolean
  foldChanges: {symbol: string, value: number}[]
  meanFoldchange: number
  nodeState: { total: number, regulated: number }
}

interface glyphData {
  pathwayID: string
  proteomics: omicsData;
  metabolomics: omicsData;
  transcriptomics: omicsData
}

export function generateGlyphData (fcsExtent: number[]): { [key: string]: glyphData } {
  const outGlyphData: { [key: string]: glyphData } = {}
  // contains pathway lists
  const pathwayLayouting = store.state.pathwayLayouting
  const fcs = store.state.fcs
  const omicsRecieved = store.state.omicsRecieved
  const pathwayAmounts = store.state.pathayAmountDict
  // const colorScale = generateColorScale(fcsExtent[0], fcsExtent[1])
  for (const pathway of pathwayLayouting.pathwayList) {
    const transcriptomicsData = { available: omicsRecieved.transcriptomics, foldChanges: [], meanFoldchange: 0, nodeState: { total: 0, regulated: 0 } } as omicsData
    const proteomicsData = { available: omicsRecieved.proteomics, foldChanges: [], meanFoldchange: 0, nodeState: { total: 0, regulated: 0 } } as omicsData
    const metabolomicsData = { available: omicsRecieved.metabolomics, meanFoldchange: 0, foldChanges: [], nodeState: { total: 0, regulated: 0 } } as omicsData
    const currentAmounts = pathwayAmounts[pathway.value]
    const nodeIDs = pathwayLayouting.pathwayNodeDictionary[pathway.value].map(elem => elem.split(';'))
    const usedIDs: string[] = []
    nodeIDs.forEach(element => {
      element.forEach(entry => {
        const currentEntry = entry.replace('cpd:', '').replace('gl:', '')
        try {
          if (!(usedIDs.includes(currentEntry))) {
            const fcsCurrent = fcs[currentEntry]
            if (typeof fcsCurrent.transcriptomics === 'number') {
              transcriptomicsData.foldChanges.push({ symbol: store.state.transcriptomicsKeggIDDict[currentEntry], value: fcsCurrent.transcriptomics })
              transcriptomicsData.nodeState.regulated += 1
            }
            if (typeof fcsCurrent.proteomics === 'number') {
              proteomicsData.foldChanges.push({ symbol: store.state.proteomicsKeggDict[currentEntry], value: fcsCurrent.proteomics })
              proteomicsData.nodeState.regulated += 1
            }
            if (typeof fcsCurrent.metabolomics === 'number') {
              metabolomicsData.foldChanges.push({ symbol: currentEntry, value: fcsCurrent.metabolomics })
              metabolomicsData.nodeState.regulated += 1
            }
            usedIDs.push(currentEntry)
          }
        } catch (error) {}
      })
    })
    transcriptomicsData.foldChanges.sort((a, b) => a.value - b.value)
    proteomicsData.foldChanges.sort((a, b) => a.value - b.value)
    metabolomicsData.foldChanges.sort((a, b) => a.value - b.value)
    proteomicsData.nodeState.total = currentAmounts.genes
    transcriptomicsData.nodeState.total = currentAmounts.genes
    metabolomicsData.nodeState.total = currentAmounts.compounds
    transcriptomicsData.meanFoldchange = transcriptomicsData.foldChanges.reduce((a, b) => a + b.value, 0) / transcriptomicsData.foldChanges.length
    proteomicsData.meanFoldchange = proteomicsData.foldChanges.reduce((a, b) => a + b.value, 0) / proteomicsData.foldChanges.length
    metabolomicsData.meanFoldchange = metabolomicsData.foldChanges.reduce((a, b) => a + b.value, 0) / metabolomicsData.foldChanges.length

    outGlyphData[pathway.value] = { pathwayID: pathway.value, transcriptomics: transcriptomicsData, proteomics: proteomicsData, metabolomics: metabolomicsData }
  }
  console.log('TSD', store.state.transcriptomicsSymbolDict)
  return outGlyphData
}

export function generateGlyphs (inputData: { [key: string]: glyphData }): { url: { [key: string]: string }, svg: { [key: string]: unknown }} {
  const outObjURL: { [key: string]: string } = {}
  const outObjSVG: { [key: string]: unknown } = {}

  for (const key in inputData) {
    const glyphData = inputData[key]
    const serializer = new XMLSerializer()
    const glyphSVG = generateGlyphVariation(glyphData, false) as SVGElement
    const glyphSVGstring = serializer.serializeToString(glyphSVG)
    const svgBlob = new Blob([glyphSVGstring], { type: 'image/svg+xml;charset=utf-8' })
    const svgURL = window.URL.createObjectURL(svgBlob)

    const glyphSVGlegend = generateGlyphVariation(glyphData, true)
    // const glyphSVGstringlegend = serializer.serializeToString(glyphSVGlegend)
    // const svgBloblegend = new Blob([glyphSVGstringlegend], { type: 'image/svg+xml;charset=utf-8' })
    // const svgURLlegend = window.URL.createObjectURL(svgBloblegend)
    outObjURL[key] = svgURL
    outObjSVG[key] = glyphSVGlegend
  }

  return { url: outObjURL, svg: outObjSVG }
}

function generateGlyph (glyphDat: glyphData): SVGElement {
  const diameter = 56
  const layerWidth = diameter / 7
  const width = diameter
  const height = diameter
  const outermostRadius = diameter / 2
  const firstLayer = outermostRadius - layerWidth
  const secondLayer = firstLayer - layerWidth
  const innermostRadius = secondLayer - layerWidth
  const colorScaleRB = d3.scaleSequential(d3.interpolateRdBu).domain([store.state.fcQuantiles[1], store.state.fcQuantiles[0]])
  const colorScalePG = d3.scaleSequential(d3.interpolatePRGn).domain(store.state.fcQuantiles)

  // prepare transcriptomics
  let colorsTranscriptomics: string[] = []
  const transcriptomicsArcDat = []
  if (glyphDat.transcriptomics.available) {
    colorsTranscriptomics = glyphDat.transcriptomics.foldChanges.map(elem => colorScaleRB(elem.value))
    const angleRangeTranscriptomicsFCs = _.range(1.5 * Math.PI, 2.5 * Math.PI + (Math.PI / colorsTranscriptomics.length), Math.PI / colorsTranscriptomics.length)
    colorsTranscriptomics.forEach((element, idx) => {
      transcriptomicsArcDat.push({ data: idx + 1, value: idx + 1, index: idx, startAngle: angleRangeTranscriptomicsFCs[idx], endAngle: angleRangeTranscriptomicsFCs[idx + 1], padAngle: 0 })
    })
    const transcriptomicsRegulatedQuotient = glyphDat.transcriptomics.nodeState.regulated / glyphDat.transcriptomics.nodeState.total
    transcriptomicsArcDat.push({ data: 1, value: 1, index: 0, startAngle: 0.5 * Math.PI, endAngle: 0.5 * Math.PI + Math.PI * transcriptomicsRegulatedQuotient, padAngle: 0 })
    transcriptomicsArcDat.push({ data: 2, value: 2, index: 1, startAngle: 0.5 * Math.PI + Math.PI * transcriptomicsRegulatedQuotient, endAngle: 1.5 * Math.PI, padAngle: 0 })
    colorsTranscriptomics.push('black', 'gray')
  }

  // prepare proteomics
  let colorsProteomics: string[] = []
  const proteomicsArcDat = []
  if (glyphDat.proteomics.available) {
    colorsProteomics = glyphDat.proteomics.foldChanges.map(elem => colorScaleRB(elem.value))
    const angleRangeProteomicsFCs = _.range(0.5 * Math.PI, 1.5 * Math.PI + (Math.PI / colorsProteomics.length), Math.PI / colorsProteomics.length)
    colorsProteomics.forEach((element, idx) => {
      proteomicsArcDat.push({ data: idx + 1, value: idx + 1, index: idx, startAngle: angleRangeProteomicsFCs[idx], endAngle: angleRangeProteomicsFCs[idx + 1], padAngle: 0 })
    })
    const proteomicsRegulatedQuotient = glyphDat.proteomics.nodeState.regulated / glyphDat.proteomics.nodeState.total
    proteomicsArcDat.push({ data: 1, value: 1, index: 0, startAngle: 1.5 * Math.PI, endAngle: 1.5 * Math.PI + Math.PI * proteomicsRegulatedQuotient, padAngle: 0 })
    proteomicsArcDat.push({ data: 2, value: 2, index: 1, startAngle: 1.5 * Math.PI + Math.PI * proteomicsRegulatedQuotient, endAngle: 2.5 * Math.PI, padAngle: 0 })
    colorsProteomics.push('black', 'gray')
  }
  // prepare metabolomics
  let colorsMetabolomics: string[] = []
  const metabolomicsArcDat = []
  if (glyphDat.metabolomics.available) {
    colorsMetabolomics = glyphDat.metabolomics.foldChanges.map(elem => colorScalePG(elem.value))
    const angleRangeMetabolomicsFCs = _.range(1.5 * Math.PI, 2.5 * Math.PI + (Math.PI / colorsMetabolomics.length), Math.PI / colorsMetabolomics.length)
    colorsMetabolomics.forEach((element, idx) => {
      metabolomicsArcDat.push({ data: idx + 1, value: idx + 1, index: idx, startAngle: angleRangeMetabolomicsFCs[idx], endAngle: angleRangeMetabolomicsFCs[idx + 1], padAngle: 0 })
    })
    const metabolomicsRegulatedQuotient = glyphDat.metabolomics.nodeState.regulated / glyphDat.metabolomics.nodeState.total
    metabolomicsArcDat.push({ data: 1, value: 1, index: 0, startAngle: 0.5 * Math.PI, endAngle: 0.5 * Math.PI + Math.PI * metabolomicsRegulatedQuotient, padAngle: 0 })
    metabolomicsArcDat.push({ data: 2, value: 2, index: 1, startAngle: 0.5 * Math.PI + Math.PI * metabolomicsRegulatedQuotient, endAngle: 1.5 * Math.PI, padAngle: 0 })
    colorsMetabolomics.push('black', 'gray')
  }

  const svg = d3.create('svg')
    .attr('width', width)
    .attr('height', height)
  const g = svg.append('g')
    .attr('transform', `translate(${width / 2},${height / 2})`)

  const arcOuter = d3.arc<PieArcDatum<number>>().innerRadius(firstLayer).outerRadius(outermostRadius)
  const arcMiddle = d3.arc<PieArcDatum<number>>().innerRadius(secondLayer).outerRadius(firstLayer)
  const arcInner = d3.arc<PieArcDatum<number>>().innerRadius(innermostRadius).outerRadius(secondLayer)

  // segment order: transcriptomics = outer, proteomics = middle, metabolomics = inner
  g.selectAll('g')
    .data(transcriptomicsArcDat)
    .enter()
    .append('path')
    .attr('d', arcOuter)
    .attr('fill', (d, i) => colorsTranscriptomics[i])
  g.selectAll('g')
    .data(proteomicsArcDat)
    .enter()
    .append('path')
    .attr('d', arcMiddle)
    .attr('fill', (d, i) => colorsProteomics[i])
  g.selectAll('g')
    .data(metabolomicsArcDat)
    .enter()
    .append('path')
    .attr('d', arcInner)
    .attr('fill', (d, i) => colorsMetabolomics[i])
  return svg.node() as SVGElement
}

function generateGlyphVariation (glyphDat: glyphData, drawLabels: boolean): SVGElement {
  let availableOmics = 0
  if (glyphDat.transcriptomics.available) availableOmics += 1
  if (glyphDat.proteomics.available) availableOmics += 1
  if (glyphDat.metabolomics.available) availableOmics += 1

  const thirdCircle = 2 * (Math.PI / availableOmics)
  const thirdCircleElement = 1.8 * (Math.PI / availableOmics)
  const circlePadding = 0.1 * (Math.PI / availableOmics)
  const diameter = 56
  const layerWidth = diameter / 7
  const width = diameter + (drawLabels ? 7 : 0)
  const height = diameter + (drawLabels ? 7 : 0)
  const outermostRadius = diameter / 2
  const firstLayer = outermostRadius - layerWidth
  const secondLayer = firstLayer - layerWidth
  const innermostRadius = secondLayer - layerWidth
  const colorScaleRB = d3.scaleSequential(d3.interpolateRdBu).domain([store.state.fcQuantiles[1], store.state.fcQuantiles[0]])
  const colorScalePG = d3.scaleSequential(d3.interpolatePRGn).domain(store.state.fcQuantiles)

  const outerArcDat: {
    data: number;
    value: number;
    index: number;
    startAngle: number;
    endAngle: number;
    padAngle: number;
    hoverData: string;
  }[] = []
  const innerArcDat = []
  const outerColors : string[] = []
  const innerColors : string[] = []
  const labelArcData = []
  const labelTexts: string[] = []
  const labelRegTexts: string[] = []
  const labelTextOffset: string[] = []

  // prepare transcriptomics
  let addedElements = 0
  if (glyphDat.transcriptomics.available) {
    const colorsTranscriptomics = glyphDat.transcriptomics.foldChanges.map(elem => colorScaleRB(elem.value))
    outerColors.push(...colorsTranscriptomics)
    const angleRangeTranscriptomicsFCs = _.range(circlePadding, circlePadding + thirdCircleElement + (thirdCircleElement / colorsTranscriptomics.length), thirdCircleElement / colorsTranscriptomics.length)
    colorsTranscriptomics.forEach((element, idx) => {
      const pushDat = { data: idx + 1, value: idx + 1, index: idx, startAngle: angleRangeTranscriptomicsFCs[idx], endAngle: angleRangeTranscriptomicsFCs[idx + 1], padAngle: 0, hoverData: `${glyphDat.transcriptomics.foldChanges[idx].symbol}\nFC: ${glyphDat.transcriptomics.foldChanges[idx].value.toFixed(3)}` }
      outerArcDat.push(pushDat)
    })
    const transcriptomicsRegulatedQuotient = glyphDat.transcriptomics.nodeState.regulated / glyphDat.transcriptomics.nodeState.total
    innerArcDat.push({ data: 1, value: 1, index: 0, startAngle: circlePadding, endAngle: circlePadding + thirdCircleElement * transcriptomicsRegulatedQuotient, padAngle: 0, hoverData: `${glyphDat.transcriptomics.nodeState.regulated} / ${glyphDat.transcriptomics.nodeState.total}` })
    innerArcDat.push({ data: 2, value: 2, index: 1, startAngle: circlePadding + thirdCircleElement * transcriptomicsRegulatedQuotient, endAngle: circlePadding + thirdCircleElement, padAngle: 0, hoverData: '' })
    innerColors.push('gray', '#c2c2c2')
    addedElements += 1
    labelRegTexts.push(`${glyphDat.transcriptomics.nodeState.regulated} of ${glyphDat.transcriptomics.nodeState.total}`)
    if (drawLabels) {
      if (availableOmics === 1) {
        labelArcData.push({ data: 1, value: 1, index: 0, startAngle: circlePadding + thirdCircleElement, endAngle: circlePadding, padAngle: 0 })
        labelTextOffset.push('3.5%')
      } else {
        labelArcData.push({ data: 1, value: 1, index: 0, startAngle: circlePadding, endAngle: circlePadding + thirdCircleElement, padAngle: 0 })
        labelTextOffset.push('0')
      }
      labelTexts.push('Transcriptomics')
    }
  }

  // prepare proteomics
  if (glyphDat.proteomics.available) {
    const colorsProteomics = glyphDat.proteomics.foldChanges.map(elem => colorScaleRB(elem.value))
    outerColors.push(...colorsProteomics)
    const startAngleVal = addedElements * thirdCircle + circlePadding

    const angleRangeProteomicsFCs = _.range(startAngleVal, startAngleVal + thirdCircleElement + (thirdCircleElement / colorsProteomics.length), thirdCircleElement / colorsProteomics.length)
    colorsProteomics.forEach((element, idx) => {
      outerArcDat.push({ data: idx + 1, value: idx + 1, index: idx, startAngle: angleRangeProteomicsFCs[idx], endAngle: angleRangeProteomicsFCs[idx + 1], padAngle: 0, hoverData: `${glyphDat.proteomics.foldChanges[idx].symbol}\nFC: ${glyphDat.proteomics.foldChanges[idx].value.toFixed(3)}` })
    })
    const proteomicsRegulatedQuotient = glyphDat.proteomics.nodeState.regulated / glyphDat.proteomics.nodeState.total
    innerArcDat.push({ data: 1, value: 1, index: 0, startAngle: startAngleVal, endAngle: startAngleVal + thirdCircleElement * proteomicsRegulatedQuotient, padAngle: 0, hoverData: '' })
    innerArcDat.push({ data: 2, value: 2, index: 1, startAngle: startAngleVal + thirdCircleElement * proteomicsRegulatedQuotient, endAngle: startAngleVal + thirdCircleElement, padAngle: 0, hoverData: '' })
    innerColors.push('gray', '#c2c2c2')
    labelRegTexts.push(`${glyphDat.proteomics.nodeState.regulated} of ${glyphDat.proteomics.nodeState.total}`)
    addedElements += 1
    if (drawLabels) {
      if (availableOmics === 1 || availableOmics === 3) {
        labelArcData.push({ data: 1, value: 1, index: 0, startAngle: startAngleVal + thirdCircleElement, endAngle: startAngleVal, padAngle: 0 })
        labelTextOffset.push('3.5%')
      } else {
        labelArcData.push({ data: 1, value: 1, index: 0, startAngle: startAngleVal, endAngle: startAngleVal + thirdCircleElement, padAngle: 0 })
        labelTextOffset.push('0')
      }
      labelTexts.push('Proteomics')
    }
  }
  // prepare metabolomics
  if (glyphDat.metabolomics.available) {
    const colorsMetabolomics = glyphDat.metabolomics.foldChanges.map(elem => colorScalePG(elem.value))
    outerColors.push(...colorsMetabolomics)
    const startAngleVal = addedElements * thirdCircle + circlePadding

    const angleRangeMetabolomicsFCs = _.range(startAngleVal, startAngleVal + thirdCircleElement + (thirdCircleElement / colorsMetabolomics.length), thirdCircleElement / colorsMetabolomics.length)
    colorsMetabolomics.forEach((element, idx) => {
      outerArcDat.push({ data: idx + 1, value: idx + 1, index: idx, startAngle: angleRangeMetabolomicsFCs[idx], endAngle: angleRangeMetabolomicsFCs[idx + 1], padAngle: 0, hoverData: `${glyphDat.metabolomics.foldChanges[idx].symbol}\nFC: ${glyphDat.metabolomics.foldChanges[idx].value.toFixed(3)}` })
    })
    const metabolomicsRegulatedQuotient = glyphDat.metabolomics.nodeState.regulated / glyphDat.metabolomics.nodeState.total
    innerArcDat.push({ data: 1, value: 1, index: 0, startAngle: startAngleVal, endAngle: startAngleVal + thirdCircleElement * metabolomicsRegulatedQuotient, padAngle: 0, hoverData: `${glyphDat.metabolomics.nodeState.regulated} / ${glyphDat.metabolomics.nodeState.total}` })
    innerArcDat.push({ data: 2, value: 2, index: 1, startAngle: startAngleVal + thirdCircleElement * metabolomicsRegulatedQuotient, endAngle: startAngleVal + thirdCircleElement, padAngle: 0, hoverData: '' })
    innerColors.push('gray', '#c2c2c2')
    labelRegTexts.push(`${glyphDat.metabolomics.nodeState.regulated} of ${glyphDat.metabolomics.nodeState.total}`)

    addedElements += 1
    if (drawLabels) {
      if (availableOmics === 1) {
        labelArcData.push({ data: 1, value: 1, index: 0, startAngle: startAngleVal + thirdCircleElement, endAngle: startAngleVal, padAngle: 0 })
        labelTextOffset.push('3.5%')
      } else {
        labelArcData.push({ data: 1, value: 1, index: 0, startAngle: startAngleVal, endAngle: startAngleVal + thirdCircleElement, padAngle: 0 })
        labelTextOffset.push('0')
      }
      labelTexts.push('Metabolomics')
    }
  }

  let svg
  let g

  if (drawLabels) {
    svg = d3.create('svg')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('width', '100%')
      .attr('height', '100%')
    g = svg.append('g')
      .attr('transform', `translate(${width / 2},${height / 2})`)
  } else {
    svg = d3.create('svg')
      .attr('width', width)
      .attr('height', height)
    g = svg.append('g')
      .attr('transform', `translate(${width / 2},${height / 2})`)
  }
  const arcOuter = d3.arc<PieArcDatum<number>>().innerRadius(firstLayer).outerRadius(outermostRadius)
  const arcMiddle = d3.arc<PieArcDatum<number>>().innerRadius(secondLayer).outerRadius(firstLayer)

  // segment order: transcriptomics = outer, proteomics = middle, metabolomics = inner
  g.selectAll('g')
    .data(outerArcDat)
    .enter()
    .append('path')
    .attr('d', arcOuter)
    .attr('fill', (d, i) => outerColors[i])
    .append('title')
    .text((d) => d.hoverData)
  const graySegments = g.selectAll('g')
    .data(innerArcDat)
    .enter()
    .append('path')
    .attr('d', arcMiddle)
    .attr('fill', (d, i) => innerColors[i])
  graySegments
    .on('mouseover', (d, i) => console.log('HOVERTEST', i))
    // .append('title')
    // .text((d) => d.hoverData)

  if (drawLabels) {
    const labelArcOmics = d3.arc<PieArcDatum<number>>().innerRadius(outermostRadius + 1).outerRadius(outermostRadius + 1)
    const labelArcRegulated = d3.arc<PieArcDatum<number>>().innerRadius((firstLayer + secondLayer) * 0.5).outerRadius((firstLayer + secondLayer) * 0.5)

    g.selectAll('labels')
      .data(labelArcData)
      .enter()
      .append('path')
      .attr('id', (d, i) => `labelArcReg${i}`)
      .attr('d', labelArcRegulated)
      .style('fill', 'none')

    g.selectAll('labels')
      .data(labelArcData)
      .enter()
      .append('text')
      .attr('dy', (d, i) => labelTextOffset[i])
      .append('textPath')
      .text((d, i) => labelRegTexts[i])
      .attr('startOffset', '25%')
      .style('text-anchor', 'middle')
      .attr('class', 'glyphText')
      .attr('href', (d, i) => `#labelArcReg${i}`)
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
      .attr('id', (d, i) => `labelArc${i}`)
      .attr('d', labelArcOmics)
      .style('fill', 'none')

    g.selectAll('labels')
      .data(labelArcData)
      .enter()
      .append('text')
      .attr('dy', (d, i) => labelTextOffset[i])
      .append('textPath')
      .text((d, i) => labelTexts[i])
      .attr('startOffset', '25%')
      .style('text-anchor', 'middle')
      .attr('class', 'glyphText')
      .attr('href', (d, i) => `#labelArc${i}`)
      // .attr('transform', (d) => `translate(${labelArc.centroid(d)})`)
  }
  return svg.node() as SVGElement
}
