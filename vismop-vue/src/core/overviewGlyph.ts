import store from '@/store'
import * as d3 from 'd3'
import { stratify } from 'd3'
import { PieArcDatum } from 'd3-shape'
import * as _ from 'lodash'

interface omicsData {
  available: boolean
  foldChanges: {symbol: string, value: number}[]
  meanFoldchange: number
  nodeState: { total: number, regulated: number }
}

export interface glyphData {
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
              proteomicsData.foldChanges.push({ symbol: store.state.proteomicsKeggIDDict[currentEntry], value: fcsCurrent.proteomics })
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
  return outGlyphData
}

export function generateGlyphDataReactome (): { [key: string]: glyphData } {
  const outGlyphData: { [key: string]: glyphData } = {}
  // contains pathway lists
  const pathwayLayouting = store.state.pathwayLayouting
  const fcs = store.state.fcs
  const omicsRecieved = store.state.omicsRecieved
  const overviewData = store.state.overviewData as {pathwayName: string, pathwayId: string, entries: {
    transcriptomics: {measured: {[key: string]: {id: string, value: number, name: string}}, total: number},
    proteomics: {measured: {[key: string]: {id: string, value: number, name: string}}, total: number},
    metabolomics: {measured: {[key: string]: {id: string, value: number, name: string}}, total: number}
    }
  }[]

  for (const pathway of overviewData) {
    const transcriptomicsData = { available: omicsRecieved.transcriptomics, foldChanges: [], meanFoldchange: 0, nodeState: { total: 0, regulated: 0 } } as omicsData
    const proteomicsData = { available: omicsRecieved.proteomics, foldChanges: [], meanFoldchange: 0, nodeState: { total: 0, regulated: 0 } } as omicsData
    const metabolomicsData = { available: omicsRecieved.metabolomics, meanFoldchange: 0, foldChanges: [], nodeState: { total: 0, regulated: 0 } } as omicsData

    transcriptomicsData.nodeState.total = pathway.entries.transcriptomics.total
    for (const measureKey in pathway.entries.transcriptomics.measured) {
      const entry = pathway.entries.transcriptomics.measured[measureKey]
      transcriptomicsData.foldChanges.push({ symbol: entry.name, value: entry.value })
      transcriptomicsData.nodeState.regulated += 1
    }

    proteomicsData.nodeState.total = pathway.entries.proteomics.total
    for (const measureKey in pathway.entries.proteomics.measured) {
      const entry = pathway.entries.proteomics.measured[measureKey]
      proteomicsData.foldChanges.push({ symbol: entry.name, value: entry.value })
      proteomicsData.nodeState.regulated += 1
    }

    metabolomicsData.nodeState.total = pathway.entries.metabolomics.total
    for (const measureKey in pathway.entries.metabolomics.measured) {
      const entry = pathway.entries.metabolomics.measured[measureKey]
      metabolomicsData.foldChanges.push({ symbol: entry.name, value: entry.value })
      metabolomicsData.nodeState.regulated += 1
    }

    transcriptomicsData.foldChanges.sort((a, b) => a.value - b.value)
    proteomicsData.foldChanges.sort((a, b) => a.value - b.value)
    metabolomicsData.foldChanges.sort((a, b) => a.value - b.value)
    transcriptomicsData.meanFoldchange = transcriptomicsData.foldChanges.reduce((a, b) => a + b.value, 0) / transcriptomicsData.foldChanges.length
    proteomicsData.meanFoldchange = proteomicsData.foldChanges.reduce((a, b) => a + b.value, 0) / proteomicsData.foldChanges.length
    metabolomicsData.meanFoldchange = metabolomicsData.foldChanges.reduce((a, b) => a + b.value, 0) / metabolomicsData.foldChanges.length

    outGlyphData[pathway.pathwayId] = { pathwayID: pathway.pathwayId, transcriptomics: transcriptomicsData, proteomics: proteomicsData, metabolomics: metabolomicsData }
  }
  return outGlyphData
}

export function generateGlyphs (inputData: { [key: string]: glyphData }): { url: { [key: string]: string }, svg: { [key: string]: unknown }} {
  const outObjURL: { [key: string]: string } = {}
  const outObjSVG: { [key: string]: unknown } = {}
  let idx = 0
  for (const key in inputData) {
    const glyphData = inputData[key]
    const serializer = new XMLSerializer()
    const glyphSVG = generateGlyphVariation(glyphData, false, idx) as SVGElement
    const glyphSVGstring = serializer.serializeToString(glyphSVG)
    const svgBlob = new Blob([glyphSVGstring], { type: 'image/svg+xml;charset=utf-8' })
    const svgURL = window.URL.createObjectURL(svgBlob)

    const glyphSVGlegend = generateGlyphVariation(glyphData, true, idx)
    // const glyphSVGstringlegend = serializer.serializeToString(glyphSVGlegend)
    // const svgBloblegend = new Blob([glyphSVGstringlegend], { type: 'image/svg+xml;charset=utf-8' })
    // const svgURLlegend = window.URL.createObjectURL(svgBloblegend)
    outObjURL[key] = svgURL
    outObjSVG[key] = glyphSVGlegend
    idx += 1
  }

  return { url: outObjURL, svg: outObjSVG }
}

export function generateGlyphVariation (glyphDat: glyphData, drawLabels: boolean, glyphIdx: number, pathwayCompare = true): SVGElement {
  let availableOmics = 0
  if (glyphDat.transcriptomics.available) availableOmics += 1
  if (glyphDat.proteomics.available) availableOmics += 1
  if (glyphDat.metabolomics.available) availableOmics += 1

  const thirdCircle = 2 * (Math.PI / availableOmics)
  const thirdCircleElement = 1.8 * (Math.PI / availableOmics)
  const circlePadding = 0.1 * (Math.PI / availableOmics)
  const diameter = 28
  const layerWidth = diameter / 7
  const width = diameter + (drawLabels ? 7 : 0)
  const height = diameter + (drawLabels ? 7 : 0)
  const outermostRadius = diameter / 2
  const firstLayer = outermostRadius - layerWidth
  const secondLayer = firstLayer - layerWidth
  const innermostRadius = secondLayer - layerWidth
  const colorScaleTranscriptomics = store.state.fcScales.transcriptomics
  const colorScaleProteomics = store.state.fcScales.proteomics
  const colorScaleMetabolomics = store.state.fcScales.metabolomics
  let highlightSection = 0

  const outerArcDat: {
    data: number;
    value: number;
    index: number;
    startAngle: number;
    endAngle: number;
    padAngle: number;
    symbol: string;
    fc: number
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
  let totalNodes = 0
  if (glyphDat.transcriptomics.available) {
    totalNodes += glyphDat.transcriptomics.nodeState.total
    const colorsTranscriptomics = glyphDat.transcriptomics.foldChanges.map(elem => colorScaleTranscriptomics(elem.value))
    outerColors.push(...colorsTranscriptomics)
    const angleRangeTranscriptomicsFCs = _.range(circlePadding, circlePadding + thirdCircleElement + (thirdCircleElement / colorsTranscriptomics.length), thirdCircleElement / colorsTranscriptomics.length)
    colorsTranscriptomics.forEach((element, idx) => {
      const pushDat = { data: idx + 1, value: idx + 1, index: idx, startAngle: angleRangeTranscriptomicsFCs[idx], endAngle: angleRangeTranscriptomicsFCs[idx + 1], padAngle: 0, symbol: glyphDat.transcriptomics.foldChanges[idx].symbol, fc: glyphDat.transcriptomics.foldChanges[idx].value }
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
        labelTexts.push('+ ← Transcriptomics ← -')
      } else {
        labelArcData.push({ data: 1, value: 1, index: 0, startAngle: circlePadding, endAngle: circlePadding + thirdCircleElement, padAngle: 0 })
        labelTextOffset.push('0')
        labelTexts.push('- → Transcriptomics → +')
      }
    }
  }
  // prepare proteomics
  if (glyphDat.proteomics.available) {
    totalNodes += glyphDat.proteomics.nodeState.total
    const colorsProteomics = glyphDat.proteomics.foldChanges.map(elem => colorScaleProteomics(elem.value))
    outerColors.push(...colorsProteomics)
    const startAngleVal = addedElements * thirdCircle + circlePadding

    const angleRangeProteomicsFCs = _.range(startAngleVal, startAngleVal + thirdCircleElement + (thirdCircleElement / colorsProteomics.length), thirdCircleElement / colorsProteomics.length)
    colorsProteomics.forEach((element, idx) => {
      outerArcDat.push({ data: idx + 1, value: idx + 1, index: idx, startAngle: angleRangeProteomicsFCs[idx], endAngle: angleRangeProteomicsFCs[idx + 1], padAngle: 0, symbol: glyphDat.proteomics.foldChanges[idx].symbol, fc: glyphDat.proteomics.foldChanges[idx].value })
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
        labelTexts.push('+ ← Proteomics ← -')
      } else {
        labelArcData.push({ data: 1, value: 1, index: 0, startAngle: startAngleVal, endAngle: startAngleVal + thirdCircleElement, padAngle: 0 })
        labelTextOffset.push('0')
        labelTexts.push('- → Proteomics → +')
      }
    }
  }
  // prepare metabolomics
  if (glyphDat.metabolomics.available) {
    totalNodes += glyphDat.metabolomics.nodeState.total
    const colorsMetabolomics = glyphDat.metabolomics.foldChanges.map(elem => colorScaleMetabolomics(elem.value))
    outerColors.push(...colorsMetabolomics)
    const startAngleVal = addedElements * thirdCircle + circlePadding

    const angleRangeMetabolomicsFCs = _.range(startAngleVal, startAngleVal + thirdCircleElement + (thirdCircleElement / colorsMetabolomics.length), thirdCircleElement / colorsMetabolomics.length)
    colorsMetabolomics.forEach((element, idx) => {
      outerArcDat.push({ data: idx + 1, value: idx + 1, index: idx, startAngle: angleRangeMetabolomicsFCs[idx], endAngle: angleRangeMetabolomicsFCs[idx + 1], padAngle: 0, symbol: glyphDat.metabolomics.foldChanges[idx].symbol, fc: glyphDat.metabolomics.foldChanges[idx].value })
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
        labelTexts.push('+ ← Metabolomics ← -')
      } else {
        labelArcData.push({ data: 1, value: 1, index: 0, startAngle: startAngleVal, endAngle: startAngleVal + thirdCircleElement, padAngle: 0 })
        labelTextOffset.push('0')
        labelTexts.push('- → Metabolomics → +')
      }
    }
  }

  let svg
  let g: d3.Selection<any, any, any, any>

  if (drawLabels) {
    svg = d3.create('svg')
      .attr('viewBox', pathwayCompare ? `0 0 ${width} ${height}` : '0 0 35 35')
      .attr('width', pathwayCompare ? '100%' : '100px')
      .attr('height', pathwayCompare ? '100%' : '100px')
    g = svg.append('g')
      .attr('class', 'glyph')
      .attr('id', `glyph${glyphIdx}`)
      .attr('transform', `translate(${width / 2},${height / 2})`)
    // DOMMouseScroll seems to work in FF
    g.on('mouseenter', (event, dat) => {
      const amtElems = d3.select(`#glyph${glyphIdx}`).selectAll('.foldArc').size()
      highlightSection = 0 % amtElems
      d3.select(`#glyph${glyphIdx}`)
        .selectAll('.foldArc')
        .data(outerArcDat)
        .attr('fill-opacity', (d, i) => {
          if (i === highlightSection) {
            d3.select(`#glyph${glyphIdx}`).select('#tspan1').text(d.symbol)
            d3.select(`#glyph${glyphIdx}`).select('#tspan2').text(d.fc.toFixed(3))
            return 1.0
          } else return 0.2
        })
    })
    g.on('mouseleave', (event, dat) => {
      highlightSection = 0
      d3.select(`#glyph${glyphIdx}`)
        .selectAll('.foldArc')
        .attr('fill-opacity', (d, i) => {
          d3.select(`#glyph${glyphIdx}`).select('#tspan1').text('Total:')
          d3.select(`#glyph${glyphIdx}`).select('#tspan2').text(totalNodes)
          return 1.0
        })
    })
    g.on('wheel.zoom', (event, dat) => {
      const amtElems = d3.select(`#glyph${glyphIdx}`).selectAll('.foldArc').size()
      highlightSection = ((highlightSection + ((event.detail > 0) ? 1 : -1)) % amtElems + amtElems) % amtElems
      d3.select(`#glyph${glyphIdx}`)
        .selectAll('.foldArc')
        .data(outerArcDat)
        .attr('fill-opacity', (d, i) => {
          if (i === highlightSection) {
            d3.select(`#glyph${glyphIdx}`).select('#tspan1').text(d.symbol)
            d3.select(`#glyph${glyphIdx}`).select('#tspan2').text(d.fc.toFixed(3))
            return 1.0
          } else return 0.2
        })
      event.stopPropagation()
    })
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
    .attr('class', 'foldArc')
    .attr('strokewidth', -2)
    .append('title')
    .text((d) => d.symbol + '\n' + d.fc.toFixed(3))
  const graySegments = g.selectAll('g')
    .data(innerArcDat)
    .enter()
    .append('path')
    .attr('d', arcMiddle)
    .attr('fill', (d, i) => innerColors[i])
  // graySegments
    // .on('mouseover', (d, i) => console.log('HOVERTEST', i))
    // .append('title')
    // .text((d) => d.hoverData)

  if (drawLabels) {
    const labelArcOmics = d3.arc<PieArcDatum<number>>().innerRadius(outermostRadius + 2).outerRadius(outermostRadius + 2)
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
      // .attr('dy', (d, i) => labelTextOffset[i])
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
      // .attr('dy', (d, i) => labelTextOffset[i])
      .append('textPath')
      .text((d, i) => labelTexts[i])
      .attr('startOffset', '25%')
      .attr('class', 'glyphText')
      .attr('href', (d, i) => `#labelArc${i}`)
      // .attr('transform', (d) => `translate(${labelArc.centroid(d)})`)
    const text = g
      .append('text')
      .attr('class', 'glyphText centeredText')

    text.append('tspan')
      .attr('id', 'tspan1')
      .attr('x', 0)
      .attr('dy', '-0.5em')
      .text('Total:')

    text.append('tspan')
      .attr('id', 'tspan2')
      .attr('x', 0)
      .attr('dy', '1em')
      .text(totalNodes)
  }
  return svg.node() as SVGElement
}

/* old
function generateGlyph (glyphDat: glyphData): SVGElement {
  const diameter = 56
  const layerWidth = diameter / 7
  const width = diameter
  const height = diameter
  const outermostRadius = diameter / 2
  const firstLayer = outermostRadius - layerWidth
  const secondLayer = firstLayer - layerWidth
  const innermostRadius = secondLayer - layerWidth
  const colorScaleTranscriptomics = store.state.fcScales.transcriptomics
  const colorScaleProteomics = store.state.fcScales.proteomics
  const colorScaleMetabolomics = store.state.fcScales.metabolomics

  // prepare transcriptomics
  let colorsTranscriptomics: string[] = []
  const transcriptomicsArcDat = []
  if (glyphDat.transcriptomics.available) {
    colorsTranscriptomics = glyphDat.transcriptomics.foldChanges.map(elem => colorScaleTranscriptomics(elem.value))
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
    colorsProteomics = glyphDat.proteomics.foldChanges.map(elem => colorScaleProteomics(elem.value))
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
    colorsMetabolomics = glyphDat.metabolomics.foldChanges.map(elem => colorScaleMetabolomics(elem.value))
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
*/
