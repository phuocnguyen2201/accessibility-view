// This plugin will open a window to prompt the user to enter a number, and
// it will then create that many rectangles on the screen.

// This file holds the main code for plugins. Code in this file has access to
// the *figma document* via the figma global object.
// You can access browser APIs in the <script> tag inside "ui.html" which has a
// full browser environment (See https://www.figma.com/plugin-docs/how-plugins-run).

// This shows the HTML page in "ui.html".
figma.showUI(__uiFiles__.main,{width : 400, height: 700, title: 'Accessibility View' });

// Calls to "parent.postMessage" from within the HTML page will trigger this
// callback. The callback will be passed the "pluginMessage" property of the
// posted message.
import { NOTIFY_MESSAGES, MESSAGE } from '../constants/constants';

import {simulateVision} from '../features/vision-simulation';
import { checkContrast } from '../features/color-contrast';
import "./style.css";

figma.ui.onmessage =  (msg: {type: string, count?: number}) => {

  if (msg.type === MESSAGE.VIEW.VISION_SIMULATION) {
    figma.showUI(__uiFiles__.vision_simulation,
      { width: 450, height: 400, title: "Vision Simulation" });
      return;
  }

  if (msg.type === MESSAGE.REQ_CONTRAST) {

    const selection = figma.currentPage.selection;
    if (!selection || selection.length === 0) {
      figma.notify(NOTIFY_MESSAGES.SELECT_LAYER);
      return;
    }
    checkContrast(selection[0]);
    return;
  }

  if (
    [MESSAGE.COLOR_BLINDNESS.PROTANOPIA, MESSAGE.COLOR_BLINDNESS.PROTANOPIA, MESSAGE.COLOR_BLINDNESS.DEUTERANOPIA, MESSAGE.COLOR_BLINDNESS.ACHROMATOPSIA].includes(msg.type)
  ) {
    const selection = figma.currentPage.selection;
    if (!selection || selection.length === 0) {
      figma.notify(NOTIFY_MESSAGES.SELECT_LAYER);
      return;
    }
    simulateVision(selection[0], msg.type);
    return;
  }

  if(msg.type === MESSAGE.VIEW.COLOR_CONTRAST){
    figma.showUI(__uiFiles__.color_contrast,{width : 400, height: 700, title: 'Accessibility View' });
    return;
  }

  if(msg.type === MESSAGE.VIEW.AI_PATTERN){
    figma.showUI(__uiFiles__.color_pattern,{width : 400, height: 700, title: 'Accessibility View' });
    return;
  }

  if(msg.type === MESSAGE.BACK){
    figma.showUI(__uiFiles__.main,{width : 400, height: 700, title: 'Accessibility View' });
    return;
  }
  // Make sure to close the plugin when you're done. Otherwise the plugin will
  // keep running, which shows the cancel button at the bottom of the screen.
  figma.closePlugin();
};



