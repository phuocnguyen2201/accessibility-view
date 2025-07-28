import { MESSAGE } from "../constants/constants";

export function fetchColormindPalette() {
  let loading: boolean = true;
  figma.ui.postMessage({ type: MESSAGE.LOADING, loading});

  const response = fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`,
    {
    
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: 'Explain how AI works in a few words',
              },
            ],
          },
        ],
      }),
    })
    .then((res)=>{ 
      res.json();
    })
    .then((data)=>{
      debugger;
      figma.ui.postMessage({ type: MESSAGE.PATTERN, data });
    }).finally(()=>{
      loading = false;
      figma.ui.postMessage({ type: MESSAGE.LOADING, loading});
    })
  
}
