<script>
	// inspired by https://github.com/zerodevx/svelte-toast
	import { onMount } from "svelte";
	import { fade, fly } from "svelte/transition";
	import { tweened } from "svelte/motion";
	import { linear } from "svelte/easing";
	import { notifications } from "../store.js";
	import IconButton from "@shared/Components/IconButton.svelte";
	import iconClose from "@shared/img/icon-close.svg?raw";
	import iconError from "@shared/img/icon-error.svg?raw";
	import iconInfo from "@shared/img/icon-info.svg?raw";
	import iconWarn from "@shared/img/icon-warn.svg?raw";

	export let item;

	const timeout = 5000;
	const progress = tweened(1, { duration: timeout, easing: linear });
	const icon =
		item.type === "error"
			? iconError
			: item.type === "info"
				? iconInfo
				: iconWarn;
	let previousProgress;

	function pause() {
		previousProgress = $progress;
		progress.set($progress, { duration: 0 });
	}

	function resume() {
		progress.set(0, { duration: timeout * previousProgress });
	}

	$: if (!$progress) notifications.remove(item.id);

	onMount(() => progress.set(0));
</script>

<li
	class:error={item.type === "error"}
	class:info={item.type === "info"}
	class:warn={item.type === "warn"}
	in:fly={{ y: 24, duration: 150 }}
	out:fade={{ duration: 150 }}
	on:mouseover={pause}
	on:mouseout={resume}
	on:focus={pause}
	on:blur={resume}
>
	<progress value={$progress}></progress>
	<div>
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		<div class="icon">{@html icon}</div>
		<span>{item.message}</span>
		<IconButton icon={iconClose} on:click />
	</div>
</li>

<style>
	li {
		background-color: var(--color-bg-theme);
		border: 1px solid var(--border-color);
		border-radius: var(--border-radius);
		box-shadow: var(--box-shadow);
		color: var(--text-color-secondary);
		font: var(--text-medium);
		line-height: 1.25rem;
		margin-bottom: 0.5rem;
		width: 20rem;
	}

	progress,
	progress::-webkit-progress-bar,
	progress::-webkit-progress-value {
		border-radius: var(--border-radius) 0 0 0;
	}

	progress {
		appearance: none;
		background: transparent;
		border: none;
		display: block;
		filter: brightness(0.8);
		height: 0.125rem;
		pointer-events: none;
		width: 100%;
	}

	progress::-webkit-progress-bar {
		background-color: transparent;
	}

	progress::-webkit-progress-value {
		background-color: var(--color-blue);
	}

	.error progress::-webkit-progress-value {
		background-color: var(--color-red);
	}

	.warn progress::-webkit-progress-value {
		background-color: var(--color-yellow);
	}

	li > div {
		align-items: flex-start;
		display: flex;
		padding: 0.5rem 1rem;
	}

	.icon {
		align-items: center;
		display: flex;
		flex-shrink: 0;
		height: 1.25rem;
		justify-content: center;
		width: 1.5rem;
	}

	.error .icon {
		color: var(--color-red);
	}

	.info .icon {
		color: var(--color-blue);
	}

	.warn .icon {
		color: var(--color-yellow);
	}

	.icon :global(svg) {
		fill: currentcolor;
		height: auto;
		pointer-events: none;
		width: 66.7%;
	}

	li:last-child {
		margin-bottom: 0;
	}

	span {
		flex-grow: 1;
		margin: 0 1rem 0 0.25rem;
	}

	li :global(button) {
		flex-shrink: 0;
		height: 1.25rem;
		width: 1rem;
	}
</style>
