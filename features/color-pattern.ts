import { MESSAGE } from "../constants/constants";

export async function fetchColormindPalette() {
  const body = {method: 'POST',};
  //const apiKey: string = process.env.GOOGLE_GEMINI_API_KEY?.toString()??'';
  const response = await fetch(
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
    });
    debugger;
    console.log(response)
  figma.ui.postMessage({ type: MESSAGE.PATTERN, response });
}
