import * as d3 from 'd3'
import { entries } from 'lodash'
import { layoutJSON, reactomeEdge } from '../core/reactomeTypes'

export default class ReactomeDetailView {
  private mainSVG: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>
  private mainChartArea: d3.Selection<SVGGElement, unknown, HTMLElement, any>
  private layoutData: layoutJSON
  private containerID: string
  constructor (layoutData: layoutJSON, containerID: string) {
    this.containerID = containerID
    this.layoutData = layoutData
    const box = document.querySelector(containerID)?.getBoundingClientRect()
    const width = box?.width as number
    const height = box?.height as number
    this.mainSVG = d3.select(containerID).append('svg').attr('width', width).attr('height', height).attr('viewBox', [0, 0, this.layoutData.maxX, this.layoutData.maxY])
    this.mainChartArea = this.mainSVG.append('g')
    this.drawNodes()
    this.drawSegments()
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .on('zoom', (event) => {
        const { transform } = event
        this.mainChartArea.attr('transform', transform).attr('stroke-width', 5 / transform.k)
      })
    this.mainSVG.call(zoom)
    console.log('DRAW DETAIL')
  }

  private drawNodes () {
    this.mainChartArea.append('g')
      .selectAll('rect')
      .data(this.layoutData.nodes)
      .enter()
      .append('rect')
      .attr('id', function (d, i) {
        return 'node' + i
      })
      .attr('x', d => d.prop.x)
      .attr('y', d => d.prop.y)
      .attr('width', d => d.prop.width)
      .attr('height', d => d.prop.height)
      .attr('stroke-width', 1)
      .attr('fill', ('red'))
  }

  private drawSegments () {
    this.mainChartArea.append('g')
      .selectAll('path')
      .data(this.layoutData.edges)
      .enter()
      .append('path')
      .attr('d', d => this.makePathString(d))
      .attr('stroke', 'black')
      .attr('fill', 'none')
  }

  private makePathString (datum: reactomeEdge) {
    let outStr = ''
    const startPoint = datum.segments[0]
    const endPoint = datum.segments[datum.segments.length - 1]
    for (const input of datum.inputs) {
      if ('points' in input) {
        outStr += `M${input.points[0].x},${input.points[0].y}`
        for (const point of input.points) {
          outStr += `L${point.x},${point.y}`
        }
        outStr += `L${startPoint.from.x},${startPoint.from.y}`
      }
    }
    for (const output of datum.outputs) {
      if ('points' in output) {
        outStr += `M${output.points[0].x},${output.points[0].y}`
        for (const point of output.points) {
          outStr += `L${point.x},${point.y}`
        }
        outStr += `L${endPoint.to.x},${endPoint.to.y}`
      }
    }
    outStr += `M${startPoint.from.x},${startPoint.from.y}`
    for (const entry of datum.segments) {
      outStr += `L${entry.to.x},${entry.to.y}`
    }

    outStr += this.catalystPaths(datum)
    return outStr
  }

  private catalystPaths (datum: reactomeEdge) {
    let outStr = ''
    if ('catalysts' in datum) {
      for (const catalyst of datum.catalysts) {
        if ('points' in catalyst) {
          outStr += `M${catalyst.points[0].x},${catalyst.points[0].y}`
          for (let index = 1; index < catalyst.points.length; index++) {
            const point = catalyst.points[index]
            outStr += `L${point.x},${point.y}`
          }
        }
        outStr += `L${datum.position.x},${datum.position.y}`
      }
    }
    return outStr
  }

  refreshSize () {
    const box = document.querySelector(this.containerID)?.getBoundingClientRect()
    const width = box?.width as number
    const height = box?.height as number
    this.mainSVG.attr('width', width).attr('height', height)
  }
}
