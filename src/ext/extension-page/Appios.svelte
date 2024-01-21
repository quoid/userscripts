<script>
	import { onMount } from "svelte";
	import { blur } from "svelte/transition";
	import { log, notifications, settings, state } from "./store.js";
	import Settings from "./Components/Settings.svelte";
	import Notification from "./Components/Notification.svelte";
	import logo from "../shared/img/logo.svg?raw";
	import { sendNativeMessage } from "../shared/native.js";

	const logger = [];

	/** @type {"ios"|"ipados"} */
	let platform = "ios";

	$: $log.some((item) => {
		if (!logger.includes(item)) {
			// eslint-disable-next-line no-console -- not arbitrary console command
			console[item.type](item.message);
			logger.push(item);
		}
	});

	onMount(async () => {
		log.add("Requesting initialization data", "info", false);
		const initData = await sendNativeMessage({ name: "PAGE_INIT_DATA" });
		if (initData.error) return console.error(initData.error);
		if (initData.platform === "ipados") platform = "ipados";
		await settings.init(initData);
		state.remove("init");
		state.loadUrlState();
		// Since now the only view on iOS
		state.add("settings");
	});
</script>

{#if $state.includes("init")}
	<div class="initializer" out:blur={{ duration: 350 }}>
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		{@html logo}
		{#if $state.includes("init-error")}
			<span>Failed to initialize app, check the browser console</span>
		{:else}
			<span>Initializing app...</span>
		{/if}
	</div>
{/if}
<ul>
	{#each $notifications as item (item.id)}
		<Notification on:click={() => notifications.remove(item.id)} {item} />
	{/each}
</ul>
{#if $state.includes("settings")}
	<Settings {platform} />
{/if}

<style>
	.initializer {
		align-items: center;
		background-color: var(--color-bg-primary);
		display: flex;
		flex-direction: column;
		height: 100%;
		justify-content: center;
		left: 0;
		opacity: 1;
		position: absolute;
		top: 0;
		visibility: visible;
		width: 100%;
		z-index: 99;
	}

	.initializer :global(svg) {
		height: 1.5rem;
		margin-bottom: 0.5rem;
	}

	.initializer span {
		color: var(--text-color-secondary);
		font: var(--text-medium);
	}

	div:not(.initializer) {
		display: flex;
		flex: 1 0 0;
		overflow: hidden;
	}

	ul {
		bottom: 1rem;
		left: 50%;
		position: fixed;
		transform: translateX(-50%);
		z-index: 98;
	}
</style>
