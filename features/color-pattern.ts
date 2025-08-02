import { MESSAGE } from "../constants/constants";

export function fetchColormindPalette() {

  let loading: boolean = true;
  figma.ui.postMessage({ type: MESSAGE.LOADING, loading});

  const headers = {'content-type': 'application/json' ,'X-goog-api-key': `${process.env.GOOGLE_GEMINI_API_KEY}`};
  const content = [{parts: [{text: 'Give 4 random colors pattern with hex code, just the hex code, make it an array'}]}];

  const response = fetch(
    `${process.env.GOOGLE_GEMINI_API_URL}`,
    {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        contents: content,
      }),
    })
    .then((res)=>{
      debugger;
      if(!res.ok){
        throw new Error('Failed to fetch colors');
      }
      return res.json();
    })
    .then((data)=>{
      debugger;
      console.log(data.candidates[0].content.parts[0].text)
      const listColor = data.candidates[0].content.parts[0].text

      figma.ui.postMessage({ type: MESSAGE.PATTERN, listColor });
    }).finally(()=>{
      figma.ui.postMessage({ type: MESSAGE.LOADING, loading: false});
    })
  
}
