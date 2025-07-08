// This plugin will open a window to prompt the user to enter a number, and
// it will then create that many rectangles on the screen.

// This file holds the main code for plugins. Code in this file has access to
// the *figma document* via the figma global object.
// You can access browser APIs in the <script> tag inside "ui.html" which has a
// full browser environment (See https://www.figma.com/plugin-docs/how-plugins-run).

// This shows the HTML page in "ui.html".
figma.showUI(__html__);

// Calls to "parent.postMessage" from within the HTML page will trigger this
// callback. The callback will be passed the "pluginMessage" property of the
// posted message.
import { BUTTON_IDS, NOTIFY_MESSAGES } from './constants/button';

import { simulateVision } from './features/vision-simulation';

figma.ui.onmessage =  (msg: {type: string, count?: number}) => {

  if (msg.type === BUTTON_IDS.ANALYSIS) {

    // Get the selected node
    const selection = figma.currentPage.selection;
    if (!selection || selection.length === 0) {
      figma.notify(NOTIFY_MESSAGES.SELECT_LAYER);
      return;
    }
    simulateVision(selection[0]);
  }

  if (msg.type === BUTTON_IDS.CHECK_CONTRAST) {

    const selection = figma.currentPage.selection;
    if (!selection || selection.length === 0) {
      figma.notify('Please select a frame with a text layer.');
      return;
    }
    const frame = selection[0];
    let frameColor = '#ffffff';
    let textColor = '#000000';
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
    figma.ui.postMessage({ type: 'CONTRAST_RESULT', frameColor, textColor });
    return;
  }

  // Make sure to close the plugin when you're done. Otherwise the plugin will
  // keep running, which shows the cancel button at the bottom of the screen.
  figma.closePlugin();
};

// Helper to convert RGB [0-1] to hex
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


