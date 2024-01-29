<script>
	export let checked = false;
	export let disabled = false;
	export let title = undefined;
	export let ariaAttributes = {};
</script>

<!-- prevent toggle button clicks from triggering parent element on:click -->
<button
	on:click|stopPropagation
	{...ariaAttributes}
	aria-pressed={checked}
	{disabled}
	{title}
>
	<span aria-hidden="true"></span>
</button>

<style>
	button {
		--switch-timing: 150ms 75ms;

		background-color: transparent;
		font-size: var(--toggle-font-size, 1rem);
		height: 1em;
		min-width: 1.75em;
		position: relative;
		width: 1.75em;
	}

	/* ios */
	@supports (-webkit-touch-callout: none) {
		button {
			font-size: var(--toggle-font-size, 2rem);
		}
	}

	span {
		background-color: var(--color-black);
		border-radius: 0.625em;
		display: block;
		height: 100%;
		pointer-events: none;
		transition: background-color 100ms 75ms;
		width: 100%;
	}

	span::before {
		background-color: white;
		border-radius: 50%;
		content: "";
		height: 0.75em;
		left: 0.125em;
		position: absolute;
		top: 0.125em;
		transition: left 175ms ease-in;
		width: 0.75em;
	}

	button[aria-pressed="true"] > span {
		background-color: var(--color-blue);
	}

	button[aria-pressed="true"] > span::before {
		left: calc(100% - (0.75em + 0.125em)); /* minus el width + left */
	}
</style>
