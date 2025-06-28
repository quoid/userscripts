/**
 * Get theme colors for console log css
 * @param {string=} color
 */
export function getColor(color) {
	if (!color) return "color: inherit";
	const isDark = matchMedia("(prefers-color-scheme: dark)").matches;
	/** @type {string} */
	let hex;
	if (color === "blue") {
		hex = isDark ? "#006fff" : "#317eff";
	} else if (color === "green") {
		hex = isDark ? "#60f36c" : "#2bb239";
	} else if (color === "yellow") {
		hex = isDark ? "#fff600" : "#b8722c";
	} else {
		return "";
	}
	return `color: ${hex}`;
}
