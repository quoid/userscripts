<script>
	import { fade } from "svelte/transition";
	import iconLoader from "../../shared/img/icon-loader.svg?raw";

	export let abort = false;
	export let abortClick = () => {};
	export let backgroundColor = "var(--color-bg-secondary)";
</script>

<div
	class="loader"
	style="background-color: {backgroundColor};"
	out:fade={{ duration: 125 }}
>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html iconLoader}
	{#if abort}
		<div>
			Fetching resources, <button class="link" on:click={abortClick}>
				cancel request
			</button>
		</div>
	{/if}
</div>

<style>
	.loader {
		align-items: center;
		display: flex;
		flex-direction: column;
		justify-content: center;
		inset: 0;
		position: absolute;
		z-index: 90;
	}

	.loader :global(svg) {
		height: 2rem;
		width: 2rem;
	}

	.loader div {
		color: var(--text-color-disabled);
		font: var(--text-small);
		letter-spacing: var(--letter-spacing-small);
		margin-top: 1rem;
	}
</style>
