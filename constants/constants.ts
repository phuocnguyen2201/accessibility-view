  export const BUTTON_IDS = {
    ANALYSIS: 'analysis',
    CHECK_CONTRAST: 'check-contrast',
  };
  
  export const BUTTON_LABELS = {
    ANALYSIS: 'Analysis',
    CHECK_CONTRAST: 'Check Contrast',
  };
  
  export const NOTIFY_MESSAGES = {
    INVALID_RECTANGLES: 'Invalid number of rectangles.',
    SELECT_LAYER: 'Please select a layer to analyze.',
    SELECT_LAYER_NOT_A_SIMULATION_FRAME: 'Please select a different frame (not a simulation frame)',
    HEX_CODE_COPIED_TO_CLIPBOARD: 'The Hex code copied to your clipboard'
  };

  export const COLORS = {
    WHITE: '#ffffff',
    BLACK: '#000000',
  };
  export const FILL_TYPES = {
    SOLID: 'SOLID',
    GRADIENT_LINEAR: 'GRADIENT_LINEAR',
    GRADIENT_RADIAL: 'GRADIENT_RADIAL',
    GRADIENT_ANGULAR: 'GRADIENT_ANGULAR',
    GRADIENT_DIAMOND: 'GRADIENT_DIAMOND',
  };
  export const MESSAGE = {
    CHECK_CONTRAST : 'CHECK_CONTRAST',
    RES_CONTRAST : 'RES_CONSTRAST',

    BACK : 'BACK',
    CLEAR: 'CLEAR',
    PATTERN: 'PATTERN',
    CHANGE_COLOR: 'CHANGE-COLOR',
    LOADING: 'LOADING',
    GENERATE: 'GENERATE',
    /** Recompute color pattern palette for a new WCAG target without changing hue offset. */
    WCAG_PATTERN_TARGET: 'WCAG_PATTERN_TARGET',
    URL: 'URL',
    COLOR_PATTERN_PALETTE: 'COLOR_PATTERN_PALETTE',
    NOTIFY: 'NOTIFY',
    SWAP: 'SWAP',
    SHOW_TOAST: 'SHOW_TOAST',
    SAVE_PALETTE_PAIR: 'SAVE_PALETTE_PAIR',

    NON_TEXT_CONTRAST: {
      RUN: 'NON_TEXT_CONTRAST_RUN',
      RESULTS: 'NON_TEXT_CONTRAST_RESULTS',
      SELECT_NODE: 'NON_TEXT_CONTRAST_SELECT_NODE',
      TOGGLE_BADGES: 'NON_TEXT_CONTRAST_TOGGLE_BADGES',
    },

    PALETTE_AUDIT: {
      GET_COLORS: 'PALETTE_AUDIT_GET_COLORS',
      COLORS: 'PALETTE_AUDIT_COLORS',
      SET_ROLE: 'PALETTE_AUDIT_SET_ROLE',
      SUGGEST_FIX: 'PALETTE_AUDIT_SUGGEST_FIX',
      SUGGESTIONS: 'PALETTE_AUDIT_SUGGESTIONS',
    },

    COLOR_BLINDNESS: {
      KEY:{ 
        PROTANOPIA : 'PROTANOPIA',

        DEUTERANOPIA : 'DEUTERANOPIA',
    
        TRITANOPIA : 'TRITANOPIA',
    
        ACHROMATOPSIA : 'ACHROMATOPSIA',},
      LABEL:{
        PROTANOPIA : 'Protanopia',

        DEUTERANOPIA : 'Deuteranopia',
    
        TRITANOPIA : 'Tritanopia',
    
        ACHROMATOPSIA : 'Achromatopsia',
      }  
     
    },


    VIEW:{
      AI_PATTERN : 'AI_PATTERN',
      COLOR_CONTRAST: 'COLOR_CONTRAST',
      VISION_SIMULATION: 'VISION_SIMULATION',
      NON_TEXT_CONTRAST: 'NON_TEXT_CONTRAST',
      PALETTE_AUDIT: 'PALETTE_AUDIT'
    },

    WINDOW:{
      MAIN : 'Accessibility View',
      COLOR_CONTRAST: 'Check Color Contrast',
      VISION_SIMULATION: 'Vision Simulation',
      AI_COLOR_PATTERN: 'AI Random Color Generator',
      NON_TEXT_CONTRAST: 'Non-Text Contrast Checker',
      PALETTE_AUDIT: 'Palette Audit'
    }

  };