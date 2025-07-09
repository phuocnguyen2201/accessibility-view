// Helper to convert RGB [0-1] to hex
export function rgbToHex(r, g, b) {
    const to255 = (v) => Math.round(v * 255);
    function pad2(x) { return x.length === 1 ? '0' + x : x; }
    return ('#' +
        [to255(r), to255(g), to255(b)]
            .map(x => pad2(x.toString(16)))
            .join(''));
}
