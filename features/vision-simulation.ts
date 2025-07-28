import { MESSAGE, NOTIFY_MESSAGES } from "../constants/constants";

// Color blindness simulation matrices (for linear color space)
const COLOR_BLINDNESS_MATRICES = {
    PROTANOPIA: [
      [0.567, 0.433, 0],
      [0.558, 0.442, 0],
      [0, 0.242, 0.758],
    ],
    DEUTERANOPIA: [
      [0.625, 0.375, 0],
      [0.7, 0.3, 0],
      [0, 0.3, 0.7],
    ],
    TRITANOPIA: [
      [0.95, 0.05, 0],
      [0, 0.433, 0.567],
      [0, 0.475, 0.525],
    ],
    ACHROMATOPSIA: [
      [0.299, 0.587, 0.114],
      [0.299, 0.587, 0.114],
      [0.299, 0.587, 0.114],
    ],
  };
  
function applyColorMatrix(color: RGB, matrix: number[][]): RGB {
    // Apply matrix transformation directly to linear color values
    const r = color.r, g = color.g, b = color.b;
    return {
      r: Math.min(1, Math.max(0, r * matrix[0][0] + g * matrix[0][1] + b * matrix[0][2])),
      g: Math.min(1, Math.max(0, r * matrix[1][0] + g * matrix[1][1] + b * matrix[1][2])),
      b: Math.min(1, Math.max(0, r * matrix[2][0] + g * matrix[2][1] + b * matrix[2][2])),
    };
  }
  
function adjustColorsForColorBlindnessType(node: SceneNode, matrix: number[][]) {
    if ('fills' in node && Array.isArray(node.fills)) {
      const fills = node.fills as Paint[];
      const newFills = fills.map(fill => {
        if (fill.type === 'SOLID' && 'color' in fill) {
          const { r, g, b } = fill.color;
          // Check if the color is not white
          if (!(r === 1 && g === 1 && b === 1)) {
            return { ...fill, color: applyColorMatrix(fill.color, matrix) };
          }
        } else if (fill.type === 'GRADIENT_LINEAR' || fill.type === 'GRADIENT_RADIAL') {
          // Handle gradient fills
          const gradientFill = fill as GradientPaint;
          const newGradientStops = gradientFill.gradientStops.map(stop => ({
            ...stop,
            color: {
              ...applyColorMatrix(stop.color, matrix),
              a: stop.color.a // Preserve alpha channel
            }
          }));
          return {
            ...fill,
            gradientStops: newGradientStops
          } as Paint;
        }
        return fill;
      });
      node.fills = newFills;
    }
    if ('children' in node) {
      for (const child of node.children) {
        adjustColorsForColorBlindnessType(child, matrix);
      }
    }
  }

export function simulateVision(node: SceneNode, msg: string) {
  // Get bounds of the selected node
  const { x, y, width, height } = node;
  const gap = 40;
  const types = [
    { key: MESSAGE.COLOR_BLINDNESS.KEY.PROTANOPIA, label: MESSAGE.COLOR_BLINDNESS.LABEL.PROTANOPIA },
    { key: MESSAGE.COLOR_BLINDNESS.KEY.DEUTERANOPIA, label: MESSAGE.COLOR_BLINDNESS.LABEL.DEUTERANOPIA },
    { key: MESSAGE.COLOR_BLINDNESS.KEY.TRITANOPIA, label: MESSAGE.COLOR_BLINDNESS.LABEL.TRITANOPIA },
    { key: MESSAGE.COLOR_BLINDNESS.KEY.ACHROMATOPSIA, label: MESSAGE.COLOR_BLINDNESS.LABEL.ACHROMATOPSIA },
  ];

  const type = types.find(t => t.key === msg);
  if (!type) return;

  // Check if a frame with the same name exists
  const existingFrame = figma.currentPage.findOne(
    n => n.type === "FRAME" && n.name === type.label
  );
  if (existingFrame) {
    existingFrame.remove();
    return;
  }

  const frame = figma.createFrame();
  frame.x = x + width + gap;
  frame.y = y;
  frame.resize(width, height);
  frame.clipsContent = true;
  frame.name = type.label;
  figma.currentPage.appendChild(frame);

  const clone = node.clone();
  clone.x = 0;
  clone.y = 0;
  frame.appendChild(clone);

  adjustColorsForColorBlindnessType(clone, COLOR_BLINDNESS_MATRICES[type.key as keyof typeof COLOR_BLINDNESS_MATRICES]);

  figma.currentPage.selection = [frame];
  // figma.viewport.scrollAndZoomIntoView([frame]);
}

export function clearAllVisionSimulationFrames() {
  const types = [
    { key: MESSAGE.COLOR_BLINDNESS.KEY.PROTANOPIA, label: MESSAGE.COLOR_BLINDNESS.LABEL.PROTANOPIA },
    { key: MESSAGE.COLOR_BLINDNESS.KEY.DEUTERANOPIA, label: MESSAGE.COLOR_BLINDNESS.LABEL.DEUTERANOPIA },
    { key: MESSAGE.COLOR_BLINDNESS.KEY.TRITANOPIA, label: MESSAGE.COLOR_BLINDNESS.LABEL.TRITANOPIA },
    { key: MESSAGE.COLOR_BLINDNESS.KEY.ACHROMATOPSIA, label: MESSAGE.COLOR_BLINDNESS.LABEL.ACHROMATOPSIA },
  ];
  const simulationLabels = types.map(t => t.label);
  const framesToRemove = figma.currentPage.findAll(
    n => n.type === "FRAME" && simulationLabels.includes(n.name)
  );
  for (const frame of framesToRemove) {
    frame.remove();
  }
}