<script>
	import { quintInOut } from "svelte/easing";
	import IconButton from "@shared/Components/IconButton.svelte";
	import Loader from "@shared/Components/Loader.svelte";
	import iconArrowLeft from "@shared/img/icon-arrow-left.svg?raw";

	export let loading = false;
	export let headerTitle = "View Header";
	export let closeClick;
	export let showLoaderOnDisabled = true;
	export let abort = false;
	export let abortClick = () => {};

	function slide(node, params) {
		return {
			delay: params?.delay || 0,
			duration: params?.duration || 150,
			easing: params?.easing || quintInOut,
			css: (t) => `transform: translateX(${(t - 1) * 18}rem);`,
		};
	}
</script>

<div class="view" transition:slide>
	<div class="view__header">
		{headerTitle}
		<IconButton icon={iconArrowLeft} title={"Go back"} on:click={closeClick} />
	</div>
	<div class="view__body">
		{#if loading && showLoaderOnDisabled}
			<Loader backgroundColor="var(--color-bg-primary)" {abortClick} {abort} />
		{:else}
			<slot><div>Slot content is required...</div></slot>
		{/if}
	</div>
</div>

<style>
	.view {
		background-color: var(--color-bg-secondary);
		display: flex;
		flex-direction: column;
		position: absolute;
		text-align: center;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		z-index: 3;
	}

	.view__header {
		background-color: var(--color-bg-secondary);
		border-bottom: 1px solid var(--border-color);
		flex-shrink: 0;
		font-weight: 600;
		padding: 0.5rem 1rem calc(0.5rem - 1px);
		position: sticky;
		top: 0;
		z-index: 5;
	}

	.view :global(.loader) {
		background-color: var(--color-bg-secondary);
	}

	.view__header :global(button) {
		left: 1rem;
		position: absolute;
		top: 0.5rem;
	}

	.view__body {
		flex-grow: 1;
		overflow-y: auto;
		position: relative;
	}

	/* ios */
	@supports (-webkit-touch-callout: none) {
		.view {
			height: auto;
		}

		.view__body {
			overflow-y: visible;
		}
	}
</style>
