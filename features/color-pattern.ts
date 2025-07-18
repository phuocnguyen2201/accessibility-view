import { MESSAGE } from "../constants/constants";

export async function fetchColormindPalette(): Promise<any> {
  const response = await fetch('http://colormind.io/api/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ model: 'default' })
  });
  const data = await response.json();
  

  figma.ui.postMessage({ type: MESSAGE.PATTERN, data });
  return data;
}
