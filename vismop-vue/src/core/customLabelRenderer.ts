// TODO
// adapted from default hover renderer from SIGMA v.2 TODO License stuff!!!!!
// TODO

/**
 * Sigma.js Canvas Renderer Hover Component
 * =========================================
 *
 * Function used by the canvas renderer to display a single node's hovered
 * state.
 * @module
 */
import { vec2 } from 'gl-matrix';
import { Settings } from 'sigma/settings';
import { NodeDisplayData, PartialButFor } from 'sigma/types';

function splitText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth = 100
): { text: string[]; maxWidth: number; maximumAllowedWidth: number } {
  const internalText = text.replaceAll('\n', ' ');
  const internalTextArray = internalText.split(' ');
  const firstWord = internalTextArray.shift();
  const textRows = [firstWord ? firstWord : ''];
  let longestRowWidth = 0;
  let currentRow = 0;
  internalTextArray.forEach((word) => {
    const currRowWidth = context.measureText(textRows[currentRow]).width;
    const currWordWidth = context.measureText(' ' + word).width;
    if (currRowWidth + currWordWidth < maxWidth) {
      if (textRows[currentRow].length != 0) textRows[currentRow] += ' ';
      textRows[currentRow] += word;
    } else {
      currentRow += 1;
      textRows.push(word);
    }
  });
  textRows.forEach((row) => {
    const currentRowWidth = context.measureText(row).width;
    if (currentRowWidth > longestRowWidth) {
      longestRowWidth = currentRowWidth;
    }
  });
  return {
    text: textRows,
    maxWidth: longestRowWidth,
    maximumAllowedWidth: maxWidth,
  };
}

export function drawLabel(
  context: CanvasRenderingContext2D,
  data: PartialButFor<NodeDisplayData, 'x' | 'y' | 'size' | 'label' | 'color'>,
  settings: Settings
): void {
  if (!data.label) {
    return;
  }
  const size = settings.labelSize;
  const font = settings.labelFont;
  const weight = settings.labelWeight;
  const labelText = splitText(context, data.label);
  const normalized = vec2.normalize(
    vec2.create(),
    vec2.fromValues(data.layoutX, data.layoutY)
  );
  const angleToX = -Math.atan2(normalized[1], normalized[0]);
  const rotCenter = vec2.fromValues(data.x, data.y);
  context.fillStyle = '#000';
  context.font = `${weight} ${size}px ${font}`;
  labelText.text.forEach((row, i) => {
    if (data.isRoot) {
      const rotatedPos = vec2.rotate(
        vec2.create(),
        vec2.fromValues(data.x + data.size + 12, data.y),
        rotCenter,
        angleToX
      );
      context.fillText(
        row,
        rotatedPos[0] - (Math.abs(angleToX) / Math.PI) * labelText.maxWidth,
        rotatedPos[1] +
          size / 3 +
          (i - (labelText.text.length / 2 - 0.5)) * size +
          Math.sin(angleToX) * ((size * labelText.text.length) / 2)
      );
    } else {
      context.fillText(
        row,
        data.layoutX < 0 && data.isRoot
          ? data.x - labelText.maxWidth - data.size - 3
          : data.x + data.size + 3,
        data.y + size / 3 + (i - (labelText.text.length / 2 - 0.5)) * size
      );
    }
  });
}
/**
 * Draw an hovered node.
 * - if there is no label => display a shadow on the node
 * - if the label box is bigger than node size => display a label box that contains the node with a shadow
 * - else node with shadow and the label box
 */
export function drawHover(
  context: CanvasRenderingContext2D,
  data: PartialButFor<NodeDisplayData, 'x' | 'y' | 'size' | 'label' | 'color'>,
  settings: Settings
): void {
  const size = settings.labelSize;
  const font = settings.labelFont;
  const weight = settings.labelWeight;

  context.font = `${weight} ${size}px ${font}`;

  // Then we draw the label background
  context.fillStyle = '#FFF';
  context.shadowOffsetX = 0;
  context.shadowOffsetY = 0;
  context.shadowBlur = 8;
  context.shadowColor = '#000';

  const MARGIN = 2;

  if (typeof data.label === 'string') {
    const labelText = splitText(context, data.label);
    const boxWidth = Math.round(labelText.maxWidth + 9);
    const boxHeight = Math.round(size * labelText.text.length + 2 * MARGIN);
    const radius =
      Math.max(data.size, (size * labelText.text.length) / 2) + MARGIN;

    const normalized = vec2.normalize(
      vec2.create(),
      vec2.fromValues(data.layoutX, data.layoutY)
    );
    const angleToX = -Math.atan2(normalized[1], normalized[0]);
    const rotCenter = vec2.fromValues(data.x, data.y);
    const rotatedPos = vec2.rotate(
      vec2.create(),
      vec2.fromValues(data.x + data.size + 12, data.y),
      rotCenter,
      angleToX
    );

    const xDeltaCoord = Math.sqrt(
      Math.abs(Math.pow(radius, 2) - Math.pow(boxHeight / 2, 2))
    );
    if (data.isRoot) {
      const rootX1 =
        rotatedPos[0] -
        (Math.abs(angleToX) / Math.PI) * labelText.maxWidth -
        MARGIN;
      const rootX2 = rootX1 + boxWidth;
      const rootY1 =
        rotatedPos[1] -
        2 * MARGIN -
        size / 3 -
        (labelText.text.length / 2 - 0.5) * size +
        Math.sin(angleToX) * ((size * labelText.text.length) / 2);
      const rootY2 = rootY1 + boxHeight;

      // sort points by angle to center
      console.log(data.label);
      const angleOrder = addAngleOrder(
        [
          [rootX1, rootY1],
          [rootX2, rootY1],
          [rootX2, rootY2],
          [rootX1, rootY2],
        ],
        [data.x, data.y]
      );
      const cond1 =
        vec2.dist(rotCenter, angleOrder[0].coords) >
        vec2.dist(rotCenter, angleOrder[1].coords);

      const cond2 =
        vec2.dist(rotCenter, angleOrder[0].coords) >
        vec2.dist(rotCenter, angleOrder[2].coords);

      const angleRadian = cond1
        ? Math.asin(
            vec2.dist(angleOrder[0].coords, angleOrder[2].coords) / 2 / radius
          )
        : Math.asin(boxHeight / 2 / radius);

      context.beginPath();
      context.moveTo(angleOrder[0].coords[0], angleOrder[0].coords[1]);
      if (!cond1) {
        context.lineTo(angleOrder[1].coords[0], angleOrder[1].coords[1]);
      }
      if (!cond2) {
        context.lineTo(angleOrder[2].coords[0], angleOrder[2].coords[1]);
      }
      context.lineTo(angleOrder[3].coords[0], angleOrder[3].coords[1]);
      context.lineTo(data.x, data.y);
      //context.arc(data.x, data.y, radius, angleRadian, -angleRadian);
      context.closePath();
      context.fill();
    } else {
      const angleRadian = Math.asin(boxHeight / 2 / radius);

      context.beginPath();
      context.moveTo(data.x + xDeltaCoord, data.y + boxHeight / 2);
      context.lineTo(data.x + radius + boxWidth, data.y + boxHeight / 2);
      context.lineTo(data.x + radius + boxWidth, data.y - boxHeight / 2);
      context.lineTo(data.x + xDeltaCoord, data.y - boxHeight / 2);
      context.arc(data.x, data.y, radius, angleRadian, -angleRadian);
      context.closePath();
      context.fill();
    }
  } else {
    context.beginPath();
    context.arc(data.x, data.y, data.size + MARGIN, 0, Math.PI * 2);
    context.closePath();
    context.fill();
  }

  context.shadowOffsetX = 0;
  context.shadowOffsetY = 0;
  context.shadowBlur = 0;

  // And finally we draw the label
  drawLabel(context, data, settings);
}

function sortPointsByDistance(
  points: [number, number][],
  center: [number, number]
) {
  const pointList: {
    coords: [number, number];
    dist: number;
    distRank: number;
  }[] = [];
  points.forEach((point) => {
    const pointVec = vec2.fromValues(point[0], point[1]);
    const centerVec = vec2.fromValues(center[0], center[1]);
    const pointObj = {
      coords: point,
      dist: vec2.dist(centerVec, pointVec),
      distRank: -1,
    };
    pointList.push(pointObj);
  });
  pointList.sort((a, b) => a.dist - b.dist);
  pointList.forEach((elem, i) => {
    elem.distRank = i;
  });
  return pointList;
}

function addAngleOrder(points: [number, number][], center: [number, number]) {
  const pointObjList: {
    coords: vec2;
    angle: number;
    angleRank: number;
  }[] = [];
  points.forEach((point) => {
    let angle = Math.atan2(point[1] - center[1], point[0] - center[0]);
    if (angle < 0) angle = angle + 2 * Math.PI;
    console.log(angle);
    const pointObj = {
      coords: vec2.fromValues(point[0], point[1]),
      angle: angle,
      angleRank: -1,
    };
    pointObjList.push(pointObj);
  });
  pointObjList.sort((a, b) => a.angle - b.angle);
  pointObjList.forEach((elem, i) => {
    elem.angleRank = i;
  });
  return pointObjList;
}
