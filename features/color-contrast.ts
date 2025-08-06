
import { COLORS, MESSAGE } from '../constants/constants';

 export function checkContrast(selection: SceneNode){
  const frame = selection;
    let frameColor = COLORS.BLACK;
    let textColor = COLORS.WHITE;
    // Get frame fill color
    if ('fills' in frame && Array.isArray(frame.fills) && frame.fills.length > 0 && frame.fills[0].type === 'SOLID') {
      const c = frame.fills[0].color;
      frameColor = rgbToHex(c.r, c.g, c.b);
    }
    // Find first text node inside the frame
    let textNode = null;
    if ('children' in frame) {
      textNode = frame.children.find(child => child.type === 'TEXT');
    }
    if (textNode && 'fills' in textNode && Array.isArray(textNode.fills) && textNode.fills.length > 0 && textNode.fills[0].type === 'SOLID') {
      const c = textNode.fills[0].color;
      textColor = rgbToHex(c.r, c.g, c.b);
    }
    // Calculate the contrast level and wcag standard.
    let contrast = getContrastRatio(frameColor, textColor);
    let levels = getWcagLevels(contrast)

    figma.ui.postMessage({ type: MESSAGE.RES_CONTRAST, frameColor, textColor, contrast, levels });
 }

export function checkContrastWithOnChangeColors(frameColor: string, textColor: string) {
  // Calculate the contrast level and wcag standard.
  let contrast = getContrastRatio(frameColor, textColor);
  let levels = getWcagLevels(contrast);
  figma.ui.postMessage({ type: MESSAGE.RES_CONTRAST, frameColor, textColor, contrast, levels });
}

export function applyNewColorsToTheFrame(selection: SceneNode,frameColor: string, textColor: string){
  //let message = frameColor != undefined? frameColor: textColor;
debugger;
  if (selection && selection.type === 'FRAME') {
    // Set frame background color as before
    if ('fills' in selection && Array.isArray(selection.fills) && selection.fills.length > 0 && selection.fills[0].type === 'SOLID') {
      const colors = hexToRgb(frameColor);
      const newFill = {
        type: 'SOLID' as const,
        color: {
          r: colors[0] / 255,
          g: colors[1] / 255,
          b: colors[2] / 255
        }
      };
      selection.fills = [newFill];
    }
    // Set text color for all TEXT children
    if ('children' in selection) {
      for (const child of selection.children) {
        if (child.type === 'TEXT') {
          const colors = hexToRgb(textColor);
          const newFill = {
            type: 'SOLID' as const,
            color: {
              r: colors[0] / 255,
              g: colors[1] / 255,
              b: colors[2] / 255
            }
          };
          child.fills = [newFill];
        }
      }
    }
  }
  else if (selection && selection.type === 'TEXT'){
    const colors = hexToRgb(textColor);
    const newFill = {
      type: 'SOLID' as const,
      color: {
        r: colors[0] / 255,
        g: colors[1] / 255,
        b: colors[2] / 255
      }
    };
    selection.fills = [newFill];
  }
}

function rgbToHex(r: number, g: number, b: number): string {
    const to255 = (v: number) => Math.round(v * 255);
    function pad2(x: string) { return x.length === 1 ? '0' + x : x; }
    return (
      '#' +
      [to255(r), to255(g), to255(b)]
        .map(x => pad2(x.toString(16)))
        .join('')
    );
  }

  function luminance(rgb: Array<number>): number {
    const a = rgb.map((v: number) => {
      v = v / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
  }

  function hexToRgb(hex: string) {
    hex = hex.replace('#', '');
    if (hex.length === 3) {
      hex = hex.split('').map((x) => x + x).join('');
    }
    const num = parseInt(hex, 16);
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
  }
   function getContrastRatio(hex1: string, hex2: string) {
    const lum1 = luminance(hexToRgb(hex1));
    const lum2 = luminance(hexToRgb(hex2));
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    return (brightest + 0.05) / (darkest + 0.05);
  }
   function getWcagLevels(contrast: number) {
    return {
      AA_large: contrast >= 3,
      AA_small: contrast >= 4.5,
      AAA_large: contrast >= 4.5,
      AAA_small: contrast >= 7,
    };
  }