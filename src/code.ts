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
import { NOTIFY_MESSAGES, MESSAGE } from '../constants/constants';
import { clearAllVisionSimulationFrames, simulateVision } from '../features/vision-simulation';
import { checkContrast, checkContrastWithOnChangeColors, applyNewColorsToTheFrame } from '../features/color-contrast';
import {
  savePairToPalette,
  getLocalPaletteColors,
  setColorRole,
  computePaletteMatrix,
  suggestAccessibleFixes,
  type ColorRole,
} from '../features/palette-audit';
import {
  runNonTextContrastCheck,
  selectAndZoomToNode,
  showNonTextBadges,
  clearNonTextBadges,
} from '../features/non-text-contrast';
import {
  getAccessibleColorPatternDualHexes,
  wcagContrastTargetFromPluginFields,
  type WcagContrastTarget,
} from '../features/color-pattern';
import "./style.css";

let pageIsOpening: boolean = false;

/** Last hue rotation used for the AI color pattern view (kept when only WCAG target changes). */
let colorPatternHueOffset = 0;

function postColorPatternPalette(
  hueOffsetDegrees = 0,
  target: WcagContrastTarget = { level: 'AA', textSize: 'normal' }
) {
  const { lightTheme, darkTheme } = getAccessibleColorPatternDualHexes(
    hueOffsetDegrees,
    target
  );
  figma.ui.postMessage({
    type: MESSAGE.COLOR_PATTERN_PALETTE,
    lightTheme,
    darkTheme,
  });
}

type PluginMessage = {
  type: string;
  colorType?: string;
  textColor?: string;
  frameColor?: string;
  value?: string;
  count?: number;
  hexCode?: string;
  wcagLevel?: string;
  textSize?: string;
  preset?: string;
  message?: string;
  mode?: string;
  contrast?: number;
  nodeId?: string;
  show?: boolean;
  styleId?: string;
  role?: string;
  fgId?: string;
  bgId?: string;
  minRatio?: number;
};

function runAndSendNonTextCheck() {
  const selection = figma.currentPage.selection;
  if (!selection || selection.length === 0) {
    figma.notify(NOTIFY_MESSAGES.SELECT_LAYER);
    figma.ui.postMessage({ type: MESSAGE.NON_TEXT_CONTRAST.RESULTS, results: [] });
    return;
  }
  const results = runNonTextContrastCheck(selection);
  figma.ui.postMessage({ type: MESSAGE.NON_TEXT_CONTRAST.RESULTS, results });
}

async function sendPaletteColorsAndMatrix() {
  const colors = await getLocalPaletteColors();
  const matrix = computePaletteMatrix(colors);
  figma.ui.postMessage({ type: MESSAGE.PALETTE_AUDIT.COLORS, colors, matrix });
}

figma.ui.onmessage = (msg: PluginMessage) => {

  //Open the non-text contrast checker (WCAG 1.4.11) for the current selection.
  if (msg.type === MESSAGE.VIEW.NON_TEXT_CONTRAST) {
    figma.showUI(__uiFiles__.non_text_contrast,
      { width: 420, height: 640, title: MESSAGE.WINDOW.NON_TEXT_CONTRAST });
    runAndSendNonTextCheck();
    return;
  }

  if (msg.type === MESSAGE.NON_TEXT_CONTRAST.RUN) {
    runAndSendNonTextCheck();
    return;
  }

  if (msg.type === MESSAGE.NON_TEXT_CONTRAST.SELECT_NODE) {
    if (msg.nodeId) selectAndZoomToNode(msg.nodeId);
    return;
  }

  if (msg.type === MESSAGE.NON_TEXT_CONTRAST.TOGGLE_BADGES) {
    if (msg.show) {
      showNonTextBadges(runNonTextContrastCheck(figma.currentPage.selection));
    } else {
      clearNonTextBadges();
    }
    return;
  }

  //Open Palette Audit Mode: role-tag local color styles and score every meaningful pair.
  if (msg.type === MESSAGE.VIEW.PALETTE_AUDIT) {
    figma.showUI(__uiFiles__.palette_audit,
      { width: 480, height: 700, title: MESSAGE.WINDOW.PALETTE_AUDIT });
    sendPaletteColorsAndMatrix();
    return;
  }

  if (msg.type === MESSAGE.PALETTE_AUDIT.GET_COLORS) {
    sendPaletteColorsAndMatrix();
    return;
  }

  if (msg.type === MESSAGE.PALETTE_AUDIT.SET_ROLE) {
    if (msg.styleId) {
      const role = (msg.role as ColorRole) || null;
      setColorRole(msg.styleId, role).then(sendPaletteColorsAndMatrix);
    }
    return;
  }

  if (msg.type === MESSAGE.PALETTE_AUDIT.SUGGEST_FIX) {
    if (msg.fgId && msg.bgId && typeof msg.minRatio === 'number') {
      getLocalPaletteColors().then((colors) => {
        const matrix = computePaletteMatrix(colors);
        const cell = matrix.find((c) => c.fgId === msg.fgId && c.bgId === msg.bgId);
        if (cell) {
          const suggestions = suggestAccessibleFixes(cell, msg.minRatio as number);
          figma.ui.postMessage({
            type: MESSAGE.PALETTE_AUDIT.SUGGESTIONS,
            fgId: cell.fgId,
            bgId: cell.bgId,
            suggestions,
          });
        }
      });
    }
    return;
  }

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
  if (msg.type === MESSAGE.VIEW.AI_PATTERN) {
    figma.showUI(__uiFiles__.color_pattern, { width: 480, height: 700, title: MESSAGE.WINDOW.AI_COLOR_PATTERN });
    colorPatternHueOffset = 0;
    postColorPatternPalette(0);
    return;
  }

  if (msg.type === MESSAGE.WCAG_PATTERN_TARGET) {
    const target = wcagContrastTargetFromPluginFields(msg);
    postColorPatternPalette(colorPatternHueOffset, target);
    return;
  }

  if (msg.type === MESSAGE.GENERATE) {
    const target = wcagContrastTargetFromPluginFields(msg);
    colorPatternHueOffset = Math.floor(Math.random() * 360);
    postColorPatternPalette(colorPatternHueOffset, target);
    return;
  }

  if(msg.type === MESSAGE.BACK){
    figma.showUI(__uiFiles__.main, { width : 400, height: 700, title: MESSAGE.WINDOW.MAIN });
    pageIsOpening = false;
    return;
  }

  if(msg.type === MESSAGE.CHANGE_COLOR){
    debugger;
    const frameColor =
      msg.colorType === 'frame' ? msg.value ?? '' : msg.frameColor ?? '';
    const textColor =
      msg.colorType === 'text' ? msg.value ?? '' : msg.textColor ?? '';
    const selection = figma.currentPage.selection;

    checkContrastWithOnChangeColors(frameColor, textColor);
    
    applyNewColorsToTheFrame(selection[0], frameColor, textColor);
    return;
  }

  if (msg.type === MESSAGE.SHOW_TOAST) {
    if (msg.message) figma.notify(msg.message);
    return;
  }

  if (msg.type === MESSAGE.SAVE_PALETTE_PAIR) {
    const { frameColor, textColor, contrast } = msg;
    if (frameColor && textColor && typeof contrast === 'number') {
      savePairToPalette({
        frameColor,
        textColor,
        contrast,
        mode: msg.mode === 'ui-element' ? 'ui-element' : 'text',
        textSize: msg.textSize === 'large' ? 'large' : 'normal',
      }).then(() => {
        figma.notify('Pair saved to palette');
      });
    }
    return;
  }

  if([MESSAGE.NOTIFY, MESSAGE.SWAP].includes(msg.type)){
    const selection = figma.currentPage.selection;
    applyNewColorsToTheFrame(
      selection[0],
      msg.frameColor ?? '',
      msg.textColor ?? ''
    );
    return;
  }

  if (msg.type === MESSAGE.SWAP){
    //const selection = figma.currentPage.selection;
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



