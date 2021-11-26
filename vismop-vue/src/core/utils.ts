/**
 * Generates a color scale function from blue to red for the given min and max values
 * @param minVal
 * @param maxVal
 * @returns
 */
export function generateColorScale (minVal: number, maxVal: number) {
  const steps = 201 // start at 200 so that small values don't appear white
  const stepsizeSmaller0 = steps / minVal // 0-minval
  const stepsizeLarger0 = steps / (maxVal - 0)

  return function (val: number): string {
    val = Number(val)

    if (isNaN(val)) {
      return '#808080'
    } else if (val < 0 && val > minVal) {
      const rRGB =
        200 - Math.round(val * stepsizeSmaller0) < 0
          ? 0
          : 200 - Math.round(val * stepsizeSmaller0)
      const gRGB =
        200 - Math.round(val * stepsizeSmaller0) < 0
          ? 0
          : 200 - Math.round(val * stepsizeSmaller0)
      const bRGB = 255

      // conversion to keep leading zeros which are cut off by toString for small numbers
      // https://stackoverflow.com/questions/21408523/tostring16-with-leading-zeroes
      const rRGBstr = ('00000' + rRGB.toString(16)).substr(-2)
      const gRGBstr = ('00000' + gRGB.toString(16)).substr(-2)
      const bRGBstr = ('00000' + bRGB.toString(16)).substr(-2)

      return `#${rRGBstr}${gRGBstr}${bRGBstr}`
    } else if (val > 0 && val < maxVal) {
      const rRGB = 255
      const gRGB =
        200 - Math.round(val * stepsizeLarger0) < 0
          ? 0
          : 200 - Math.round(val * stepsizeLarger0)
      const bRGB =
        200 - Math.round(val * stepsizeLarger0) < 0
          ? 0
          : 200 - Math.round(val * stepsizeLarger0)

      const rRGBstr = ('00000' + rRGB.toString(16)).substr(-2)
      const gRGBstr = ('00000' + gRGB.toString(16)).substr(-2)
      const bRGBstr = ('00000' + bRGB.toString(16)).substr(-2)

      return `#${rRGBstr}${gRGBstr}${bRGBstr}`
    } else if (val === 0) {
      return '#DADADA'
    } else {
      if (val <= minVal) {
        return '#0000FF'
      } else if (val >= maxVal) {
        return '#FF0000'
      }
    }
    // failsafe return
    return '#FFFFFF'
  }
}
