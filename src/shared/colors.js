/**
 * Get theme colors for console log css
 * @param {string=} color
 */
export function getColor(color) {
	if (!color) return "color: inherit";
	const isDark = matchMedia("(prefers-color-scheme: dark)").matches;
	const colors = {
		blue: { dark: "#006fff", light: "#317eff" },
		green: { dark: "#60f36c", light: "#2bb239" },
		yellow: { dark: "#fff600", light: "#b8722c" },
	};
	if (color in colors) {
		const hex = isDark ? colors[color].dark : colors[color].light;
		return `color: ${hex}`;
	}
	return "";
}
