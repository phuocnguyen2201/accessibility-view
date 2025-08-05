import { MESSAGE } from "../constants/constants";

export async function fetchColormindPalette() {

  let loading: string = 'true';
  let colors = ['#A8D5BA'];
  //figma.ui.postMessage({ type: MESSAGE.LOADING, loading, colors});
  try {
      const response = await fetch(
      `https://figma-proxy-rho.vercel.app/api/proxy`,
      {
        method: 'GET',
        headers: { "Content-Type": "application/json" },
      })

      if(!response.ok){
        throw new Error('Failed to fetch colors');
      }

      const data = await response.json();

      colors = data.colors;
      loading = 'fasle';
      figma.ui.postMessage({ type: MESSAGE.PATTERN,loading, colors }); 
    }
    catch(err){
      throw new Error('Error: ');
    }
    finally{
      loading = 'fasle';
      figma.ui.postMessage({type: MESSAGE.LOADING, loading, colors});
    }
  
}
