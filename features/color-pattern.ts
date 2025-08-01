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
                text: 'Give 4 random colors pattern with hex code, just the hex code, make it an array',
              },
            ],
          },
        ],
      }),
    })
    .then((res)=>{ 
      return res.json();
    })
    .then((data)=>{
      debugger;
      console.log(data.candidates[0].content.parts[0].text)
      const listColor = data.candidates[0].content.parts[0].text
      figma.ui.postMessage({ type: MESSAGE.PATTERN, listColor });
    }).finally(()=>{
      loading = false;
      figma.ui.postMessage({ type: MESSAGE.LOADING, loading});
    })
  
}
