<script>
	import { onMount } from "svelte";
	import { blur } from "svelte/transition";
	import { items, log, notifications, settings, v4state } from "./store.js";
	import Sidebar from "./Components/Sidebar/Sidebar.svelte";
	import Editor from "./Components/Editor/Editor.svelte";
	import Settings from "./Components/Settings.svelte";
	import ModalWrapper from "./Components/ModalWrapper.svelte";
	import Notification from "./Components/Notification.svelte";
	import LogoText from "@shared/Components/LogoText.svelte";
	import { connectNative, sendNativeMessage } from "@ext/native.js";

	const logger = [];

	$: $log.some((item) => {
		if (!logger.includes(item)) {
			console[item.type](item.message);
			logger.push(item);
		}
	});

	// disables default cmd+s (save) and cmd+f (find) behavior
	function preventKeyCommands(e) {
		if (e.metaKey && (e.code === "KeyS" || e.code === "KeyF")) {
			return e.preventDefault();
		}
	}

	// currently inactive, but could be used to globally prevent auto text replacement in app
	// function preventAutoTextReplacements(e) {
	// 	if (e.inputType === "insertReplacementText" && e.data === ". ") {
	// 		e.preventDefault();
	// 		e.target.value += " ";
	// 	}
	// }

	onMount(async () => {
		log.add("Requesting initialization data", "info", false);
		const initData = await sendNativeMessage({ name: "PAGE_INIT_DATA" });
		if (initData.error) return console.error(initData.error);
		await settings.init(initData);
		v4state.add("items-loading");
		v4state.remove("init");

		log.add("Requesting all files in save location", "info", false);
		const files = await sendNativeMessage({ name: "PAGE_ALL_FILES" });
		if (files.error) return console.error(files.error);
		items.set(files);
		v4state.remove("items-loading");
		v4state.loadUrlState();
	});

	// handle native app messages
	const nativePort = connectNative();
	nativePort.onMessage.addListener((message) => {
		// console.info(message); // DEBUG
		if (message.name === "SAVE_LOCATION_CHANGED") {
			window.location.reload();
		}
	});

	let splitterActive = false;
	let sidebarHidden = false;
	let sidebarWidth = "23svw";
	const sidebarMinWidth = "20rem";
	const editorMinWidth = "20rem";

	function sidebarSwitch() {
		if (!sidebarHidden && !$items.find((i) => i.active)) {
			log.add("Please select or create a new item first.", "info", true);
			return;
		}
		sidebarHidden = !sidebarHidden;
	}

	function handleSplitterDrag(event) {
		if (event.type === "mouseup") {
			splitterActive = false;
		} else if (event.type === "mousedown") {
			splitterActive = true;
		} else if (event.type === "mousemove") {
			const vw = window.innerWidth;
			const sw = (event.x / vw) * 100;
			sidebarWidth = `max(min(${sw}svw, 100svw - ${editorMinWidth}), ${sidebarMinWidth})`;
		}
		event.preventDefault();
	}
</script>

<svelte:window on:keydown={preventKeyCommands} />

{#if $v4state.includes("init")}
	<div class="initializer" out:blur={{ duration: 350 }}>
		<LogoText />
		{#if $v4state.includes("init-error")}
			<span>Failed to initialize app, check the browser console</span>
		{:else}
			<span>Initializing app...</span>
		{/if}
	</div>
{/if}
<main
	style:--sidebar-width={sidebarWidth}
	style:--sidebar-min-width={sidebarMinWidth}
>
	{#if !sidebarHidden}
		<Sidebar {sidebarSwitch} />
		<div
			role="none"
			class="splitter"
			class:dragging={splitterActive}
			on:mousedown={handleSplitterDrag}
			on:mouseup={handleSplitterDrag}
		></div>
	{/if}
	<Editor {sidebarHidden} {sidebarSwitch} />
</main>
{#if splitterActive}
	<div
		role="none"
		class="resize-mask"
		on:mouseup={handleSplitterDrag}
		on:mousemove={handleSplitterDrag}
	></div>
{/if}
<ul>
	{#each $notifications as item (item.id)}
		<Notification on:click={() => notifications.remove(item.id)} {item} />
	{/each}
</ul>
{#if $v4state.includes("settings")}
	<ModalWrapper closeHandler={() => v4state.remove("settings")} let:navRegister>
		<Settings platform="macos" {nativePort} {navRegister} />
	</ModalWrapper>
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

	main {
		display: flex;
		flex: 1 0 0;
		overflow: hidden;
	}

	.resize-mask {
		background-color: transparent;
		cursor: col-resize;
		position: fixed;
		inset: 0;
		z-index: 20;
	}

	.splitter {
		--splitter-width: 6px;
		--splitter-offset: calc(var(--splitter-width) / 2);
		--sidebar-fixed-width: max(var(--sidebar-min-width), var(--sidebar-width));

		background-color: transparent;
		cursor: col-resize;
		position: fixed;
		left: calc(var(--sidebar-fixed-width) - var(--splitter-offset));
		width: var(--splitter-width);
		height: 100svh;
		z-index: 21;
		transition: background-color 0.2s ease-in-out;

		&:hover,
		&.dragging {
			background-color: var(--color-blue);
		}
	}

	ul {
		bottom: 1rem;
		left: 50%;
		position: fixed;
		transform: translateX(-50%);
		z-index: 98;
	}
</style>
