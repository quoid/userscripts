<script>
	export let color = "currentColor";
	export let disabled = false;
	export let icon;
	export let title;
	export let errorDot = false;
	export let warnDot = false;
	export let infoDot = false;
</script>

<button
	class:infoDot={infoDot || warnDot || errorDot}
	class:warnDot
	class:errorDot
	on:click
	{disabled}
	style="--svg-fill: {color};"
	{title}
>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html icon}
</button>

<style>
	button {
		align-items: center;
		background-color: transparent;
		color: inherit;
		cursor: pointer;
		display: flex;
		height: 1.5rem;
		justify-content: center;
		overflow: visible;
		position: relative;
		width: 1.5rem;
	}

	button.infoDot::after {
		background-color: var(--color-blue);
		border: 2px solid var(--color-bg-secondary);
		border-radius: 50%;
		content: "";
		height: 0.75rem;
		left: 0;
		position: absolute;
		top: 0;
		width: 0.75rem;
	}

	button.warnDot::after {
		background-color: var(--color-yellow);
	}

	button.errorDot::after {
		background-color: var(--color-red);
	}

	button:disabled {
		opacity: var(--opacity-disabled);
		pointer-events: none;
	}

	button :global(svg) {
		fill: var(--svg-fill);
		height: auto;
		opacity: 0.75;
		pointer-events: none; /* prevent svg from triggering click events */
		transform: scale(0.667);
		width: 100%;
	}

	@media (hover: hover) {
		button:hover :global(svg) {
			opacity: 1;
		}
	}
</style>
