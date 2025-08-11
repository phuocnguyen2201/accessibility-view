// This plugin will open a window to prompt the user to enter a number, and
// it will then create that many rectangles on the screen.

// This file holds the main code for plugins. Code in this file has access to
// the *figma document* via the figma global object.
// You can access browser APIs in the <script> tag inside "ui.html" which has a
// full browser environment (See https://www.figma.com/plugin-docs/how-plugins-run).

// This shows the HTML page in "ui.html".
figma.showUI(__uiFiles__.main,{width : 400, height: 700, title: MESSAGE.WINDOW.MAIN });

// Calls to "parent.postMessage" from within the HTML page will trigger this
// callback. The callback will be passed the "pluginMessage" property of the
// posted message.
import { NOTIFY_MESSAGES, MESSAGE, COLOR_URL } from '../constants/constants';
import {clearAllVisionSimulationFrames, simulateVision} from '../features/vision-simulation';
import { checkContrast, checkContrastWithOnChangeColors, applyNewColorsToTheFrame } from '../features/color-contrast';
import "./style.css";

let pageIsOpening: boolean = false;
const url = COLOR_URL.PROXY;
figma.ui.onmessage =  (msg: {type: string, colorType: string, textColor: string, frameColor: string, value: string, count?: number, hexCode: string}) => {

  //Open vision simulation view.
  if (msg.type === MESSAGE.VIEW.VISION_SIMULATION) {
    figma.showUI(__uiFiles__.vision_simulation,
      { width: 400, height: 550, title: MESSAGE.WINDOW.VISION_SIMULATION });
      return;
  }

  if (msg.type === MESSAGE.CHECK_CONTRAST) {
    figma.showUI(__uiFiles__.color_contrast,
      { width: 400, height: 550, title: MESSAGE.WINDOW.COLOR_CONTRAST });
      return;
  }

  //Simulation the POV of color blindness.
  if (
    [MESSAGE.COLOR_BLINDNESS.KEY.PROTANOPIA, 
      MESSAGE.COLOR_BLINDNESS.KEY.TRITANOPIA, 
      MESSAGE.COLOR_BLINDNESS.KEY.DEUTERANOPIA, 
      MESSAGE.COLOR_BLINDNESS.KEY.ACHROMATOPSIA].includes(msg.type)
  ) {
    const selection = figma.currentPage.selection;
    if (!selection || selection.length === 0) {
      figma.notify(NOTIFY_MESSAGES.SELECT_LAYER);
      return;
    }
    simulateVision(selection[0], msg.type);
    return;
  }

  if(msg.type === MESSAGE.CLEAR){
    clearAllVisionSimulationFrames();
    return;
  }

  //Check contrast
  if(msg.type === MESSAGE.VIEW.COLOR_CONTRAST){
    figma.showUI(__uiFiles__.color_contrast, { width : 400, height: 700, title: MESSAGE.WINDOW.COLOR_CONTRAST });
    pageIsOpening = true;
    const selection = figma.currentPage.selection;
    if (selection && selection.length === 1 && selection[0].type === 'FRAME') {
      checkContrast(selection[0]);
    }
    return;
  }

  //Open the ai gen color pattern.
  if(msg.type === MESSAGE.VIEW.AI_PATTERN){
    figma.showUI(__uiFiles__.color_pattern, { width : 400, height: 700, title: MESSAGE.WINDOW.AI_COLOR_PATTERN });
    
    figma.ui.postMessage({ type: MESSAGE.URL, url}); 
    return;
  }

  if(msg.type === MESSAGE.GENERATE){
    figma.ui.postMessage({ type: MESSAGE.URL, url});
    return;
  }

  if(msg.type === MESSAGE.BACK){
    figma.showUI(__uiFiles__.main, { width : 400, height: 700, title: MESSAGE.WINDOW.MAIN });
    pageIsOpening = false;
    return;
  }

  if(msg.type === MESSAGE.CHANGE_COLOR){
    debugger;
    const frameColor = msg.colorType === 'frame'? msg.frameColor = msg.value: msg.frameColor;
    const textColor = msg.colorType === 'text'? msg.textColor = msg.value: msg.textColor;
    const selection = figma.currentPage.selection;

    checkContrastWithOnChangeColors(frameColor, textColor);
    
    applyNewColorsToTheFrame(selection[0], msg.frameColor, msg.textColor);
    return;
  }

  if([MESSAGE.NOTIFY, MESSAGE.SWAP].includes(msg.type)){
    const selection = figma.currentPage.selection;
    applyNewColorsToTheFrame(selection[0], msg.frameColor, msg.textColor);
    return;
  }

  if (msg.type === MESSAGE.SWAP){
    const selection = figma.currentPage.selection;
  }
  // Make sure to close the plugin when you're done. Otherwise the plugin will
  // keep running, which shows the cancel button at the bottom of the screen.
  figma.closePlugin();
};

// Listen for selection changes and auto-check contrast if a frame is selected
figma.on("selectionchange", () => {
  if(!pageIsOpening) return;

  const selection = figma.currentPage.selection;
  if (selection && selection.length === 1 && selection[0].type === 'FRAME') {
    checkContrast(selection[0]);
  }
  return;
});



