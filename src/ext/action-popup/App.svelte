<script>
	import { onMount } from "svelte";
	import IconButton from "../shared/Components/IconButton.svelte";
	import Toggle from "../shared/Components/Toggle.svelte";
	import Loader from "../shared/Components/Loader.svelte";
	import PopupItem from "./Components/PopupItem.svelte";
	import View from "./Components/View.svelte";
	import UpdateView from "./Components/Views/UpdateView.svelte";
	import InstallView from "./Components/Views/InstallView.svelte";
	import AllItemsView from "./Components/Views/AllItemsView.svelte";
	import iconOpen from "../shared/img/icon-open.svg?raw";
	import iconUpdate from "../shared/img/icon-update.svg?raw";
	import iconClear from "../shared/img/icon-clear.svg?raw";
	import iconRefresh from "../shared/img/icon-refresh.svg?raw";
	import { extensionPaths, openExtensionPage } from "../shared/utils.js";
	import { connectNative, sendNativeMessage } from "../shared/native.js";
	import * as settingsStorage from "../shared/settings.js";

	let errorNotification;
	let active = true;
	let loading = true;
	let disabled = true;
	let items = [];
	let showUpdates = false;
	let updates = [];
	let main;
	let rowColors;
	let inactive = false;
	let platform;
	let initError;
	let firstGuide;
	let header;
	let warn;
	let err;
	let scriptChecking;
	let scriptInstalled;
	let showInstallPrompt;
	let showInstall;
	let installUserscript; // url, content
	let installViewUserscript; // metadata
	let installViewUserscriptError;
	let showAll;
	let allItems = [];
	let abort = false;

	$: list = items.sort((a, b) => a.name.localeCompare(b.name));

	function getItemBackgroundColor(elements, index) {
		if (elements.length < 2) return null;
		if (elements.length % 2 === 0 && index % 2 === 0) return "light";
		if (elements.length % 2 !== 0 && index % 2 !== 0) return "light";
		return null;
	}

	async function toggleExtension() {
		await settingsStorage.set({ global_active: !active });
		active = await settingsStorage.get("global_active");
		// TODO: delete after migrating all related logic on the native
		sendNativeMessage({ name: "TOGGLE_EXTENSION", active: String(active) });
	}

	async function updateAll() {
		showUpdates = false;
		disabled = true;
		loading = true;
		const response = await sendNativeMessage({ name: "POPUP_UPDATE_ALL" });
		if (response.error) {
			errorNotification = response.error;
		} else {
			if (response.items) items = response.items;
			updates = response.updates;
		}
		disabled = false;
		loading = false;
	}

	async function updateItem(item) {
		disabled = true;
		const currentTab = await browser.tabs.getCurrent();
		const url = currentTab.url;
		const frameUrls = [];
		if (url) {
			const frames = await browser.webNavigation.getAllFrames({
				tabId: currentTab.id,
			});
			frames.forEach((frame) => frameUrls.push(frame.url));
		}
		const message = {
			name: "POPUP_UPDATE_SINGLE",
			filename: item.filename,
			url,
			frameUrls,
		};
		const response = await sendNativeMessage(message);
		if (response.error) {
			errorNotification = response.error;
			showUpdates = false;
		} else {
			updates = updates.filter((e) => e.filename !== item.filename);
			items = response.items;
		}
		disabled = false;
	}

	async function toggleItem(item) {
		if (disabled) return;
		disabled = true;
		const response = await sendNativeMessage({ name: "TOGGLE_ITEM", item });
		if (response.error) {
			errorNotification = response.error;
		} else {
			const i = items.findIndex((el) => el === item);
			const j = allItems.findIndex((el) => el === item);
			item.disabled = !item.disabled;
			items[i] = item;
			if (j >= 0) allItems[j] = item;
		}
		disabled = false;
	}

	async function checkForUpdates() {
		disabled = true;
		initError = false;
		const response = await sendNativeMessage({ name: "POPUP_CHECK_UPDATES" });
		if (response.error) {
			errorNotification = response.error;
			showUpdates = false;
		} else {
			updates = response.updates;
		}
		disabled = false;
	}

	function refreshView() {
		errorNotification = undefined;
		scriptChecking = undefined;
		scriptInstalled = undefined;
		showInstallPrompt = undefined;
		loading = true;
		disabled = true;
		items = [];
		showUpdates = false;
		updates = [];
		inactive = false;
		abort = false;
		initialize();
	}

	async function shouldCheckForUpdates() {
		// if there's no network connectivity, do not check for updates
		if (!window || !window.navigator || !window.navigator.onLine) {
			console.info("user is offline, not running update check");
			return false;
		}
		// when an update check is run, a timestamp is saved to extension storage
		// only check for updates every n milliseconds to avoid delaying popup load regularly
		const checkInterval = 24 * 60 * 60 * 1000; // 24hr, 86400000
		const timestampMs = Date.now();
		let lastUpdateCheck = 0;
		// check extension storage for saved key/val
		// if there's an issue getting extension storage, skip the check
		let lastUpdateCheckObj;
		try {
			lastUpdateCheckObj = await browser.storage.local.get(["lastUpdateCheck"]);
		} catch (error) {
			console.error(`Error checking extension storage ${error}`);
			return false;
		}
		// if extension storage doesn't have key, run the check
		// key/val will be saved after the update check runs
		if (Object.keys(lastUpdateCheckObj).length === 0) {
			console.info("no last check saved, running update check");
			return true;
		}
		// if the val is not a number, something went wrong, check anyway
		// when update re-runs, new val of the proper type will be saved
		if (!Number.isFinite(lastUpdateCheckObj.lastUpdateCheck)) {
			console.info("run check saved with wrong type, running update check");
			return true;
		}
		// at this point it is known that key exists and value is a number
		// update local var with the val saved to extension storage
		lastUpdateCheck = lastUpdateCheckObj.lastUpdateCheck;
		// if less than n milliseconds have passed, don't check
		if (timestampMs - lastUpdateCheck < checkInterval) {
			console.info("not enough time has passed, not running update check");
			return false;
		}

		console.info(
			`${(timestampMs - lastUpdateCheck) / (1000 * 60 * 60)} hours have passed`,
		);
		console.info("running update check");
		// otherwise run the check
		return true;
	}

	async function openSaveLocation() {
		disabled = true;
		loading = true;
		const response = await sendNativeMessage({ name: "OPEN_SAVE_LOCATION" });
		if (response.success) {
			window.close();
		} else if (response.items) {
			showAll = true;
			allItems = response.items;
		} else if (response.error) {
			console.error(`Error opening save location: ${response.error}`);
			errorNotification = response.error;
		}
		disabled = false;
		loading = false;
	}

	async function openContainingApp() {
		browser.tabs.executeScript({
			code: `location="${firstGuide}"`,
		});
		window.close();
	}

	async function initialize() {
		// get platform first since it applies important styling
		let pltfm;
		try {
			pltfm = await sendNativeMessage({ name: "REQ_PLATFORM" });
		} catch (error) {
			console.error(`Error for pltfm promise: ${error}`);
			initError = true;
			loading = false;
			return;
		}
		if (pltfm.error) {
			errorNotification = pltfm.error;
			loading = false;
			disabled = false;
			return;
		}
		platform = pltfm.platform;

		// display native error if there is
		const errorNative = await settingsStorage.get("error_native");
		if (errorNative.error) {
			if (errorNative.saveLocation === "unset") {
				firstGuide = `${errorNative.scheme}://`;
				loading = false;
				return;
			}
			errorNotification = errorNative.error;
			loading = false;
			disabled = false;
			return;
		}

		// set toggle state
		active = await settingsStorage.get("global_active");

		// get matches
		const currentTab = await browser.tabs.getCurrent();
		const url = currentTab.url;
		if (!url) {
			loading = false;
			disabled = false;
			return;
		}
		// strip fragments and query params
		const strippedUrl = url.split(/[?#]/)[0];
		if (strippedUrl === browser.runtime.getURL(extensionPaths.page)) {
			// disable popup on extension page
			inactive = true;
			loading = false;
			return;
		}
		const frameUrls = new Set();
		const frames = await browser.webNavigation.getAllFrames({
			tabId: currentTab.id,
		});
		for (let i = 0; i < frames.length; i++) {
			const frameUrl = frames[i].url;
			if (frameUrl !== url && frameUrl.startsWith("http")) {
				frameUrls.add(frameUrl);
			}
		}
		let matches;
		try {
			matches = await sendNativeMessage({
				name: "POPUP_MATCHES",
				url,
				frameUrls: Array.from(frameUrls),
			});
		} catch (error) {
			console.error(`Error for matches promise: ${error}`);
			initError = true;
			loading = false;
			return;
		}
		if (matches.error) {
			errorNotification = matches.error;
			loading = false;
			disabled = false;
			return;
		}
		items = matches.matches;

		// get updates
		const checkUpdates = await shouldCheckForUpdates();
		if (checkUpdates) {
			let updatesResponse;
			try {
				// save timestamp in ms to extension storage
				const timestampMs = Date.now();
				await browser.storage.local.set({ lastUpdateCheck: timestampMs });
				abort = true;
				updatesResponse = await sendNativeMessage({ name: "POPUP_UPDATES" });
			} catch (error) {
				console.error(`Error for updates promise: ${error}`);
				initError = true;
				loading = false;
				abort = false;
				return;
			}
			if (updatesResponse.error) {
				errorNotification = updatesResponse.error;
				loading = false;
				disabled = false;
				abort = false;
				return;
			}
			updates = updatesResponse.updates;
			abort = false;
		}

		// check if current page url is a userscript
		if (strippedUrl.endsWith(".user.js")) {
			// set checking state
			scriptChecking = true;
			// show checking banner
			showInstallPrompt = "checking...";
			// start async check
			installCheck(currentTab);
		}

		loading = false;
		disabled = false;
	}

	async function abortUpdates() {
		// sends message to swift side canceling all URLSession tasks
		sendNativeMessage({ name: "CANCEL_REQUESTS" });
		// timestamp for checking updates happens right before update fetching
		// that means when this function runs the timestamp has already been saved
		// reloading the window will essentially skip the update check
		// since the subsequent popup load will not check for updates
		window.location.reload();
	}

	/** @type {import("svelte/elements").UIEventHandler<Window>} */
	// async function resizeHandler(event) {
	// 	if (platform !== "macos") {
	// 		const viewport = event.currentTarget.visualViewport;
	// 		console.debug(platform, viewport);
	// 		// add max limits after the window size has been rendered
	// 		// avoid display overflow when window shrinks dynamically
	// 	}
	// }

	/**
	 * Check if the current page contains a user script
	 * @param {import("webextension-polyfill").Tabs.Tab} currentTab
	 */
	async function installCheck(currentTab) {
		// refetch script from URL to avoid tampered DOM content
		let res; // fetch response
		try {
			res = await fetch(currentTab.url);
			if (!res.ok) throw new Error(`httpcode-${res.status}`);
		} catch (error) {
			console.error("Error fetching .user.js url", error);
			errorNotification = "Fetching failed, refresh to retry.";
			showInstallPrompt = undefined;
			return;
		}
		const content = await res.text();
		// caching script data
		installUserscript = { url: currentTab.url, content };
		// send native swift a message, parse metadata and check if installed
		const response = await sendNativeMessage({
			name: "POPUP_INSTALL_CHECK",
			content,
		});
		console.info("POPUP_INSTALL_CHECK:", response);
		if (response.error) {
			console.error(`Error checking .user.js url: ${response.error}`);
			// errorNotification = response.error;
			installViewUserscriptError = response.error;
		} else {
			scriptInstalled = response.installed;
			// caching script metadata
			installViewUserscript = response.metadata;
			// the response will contain the string to display
			// ex: {success: "Click to install"}
			showInstallPrompt = response.success;
		}
		scriptChecking = false;
	}

	async function showInstallView() {
		// show the install view
		showInstall = true;
	}

	async function installConfirm() {
		// clear all banner during installation
		errorNotification = undefined;
		showInstallPrompt = undefined;
		// disabled all buttons
		disabled = true;
		// show loading element
		loading = true;
		// go back to main view
		showInstall = false;
		// double check before send install message
		if (!installUserscript || !installUserscript.content) {
			errorNotification = "Install failed: userscript missing";
		}
		const currentTab = await browser.tabs.getCurrent();
		if (currentTab.url !== installUserscript.url) {
			errorNotification = "Install failed: tab changed unexpectedly";
		}
		if (errorNotification) {
			disabled = false;
			loading = false;
			return;
		}
		// send native swift a message, which will start the install process
		const response = await sendNativeMessage({
			name: "POPUP_INSTALL_SCRIPT",
			content: installUserscript.content,
		});
		if (response.error) {
			errorNotification = response.error;
			disabled = false;
			loading = false;
			return;
		}
		// if response did not have an error, userscript installed successfully
		// refresh popup
		refreshView();
	}

	onMount(async () => {
		await initialize();
	});

	// handle native app messages
	const port = connectNative();
	port.onMessage.addListener((message) => {
		// console.info(message); // DEBUG
		if (message.name === "SAVE_LOCATION_CHANGED") {
			window.location.reload();
		}
	});

	async function gotoExtensionPage() {
		await openExtensionPage();
		window.close();
	}
</script>

{#if showUpdates}
	<View
		headerTitle={"Updates"}
		loading={disabled}
		closeClick={() => (showUpdates = false)}
		showLoaderOnDisabled={true}
		abortClick={abortUpdates}
		abort={showUpdates}
	>
		<UpdateView
			checkClick={checkForUpdates}
			updateClick={updateAll}
			updateSingleClick={updateItem}
			{updates}
		/>
	</View>
{:else if showInstall}
	<View
		headerTitle={"Install Userscript"}
		loading={disabled}
		closeClick={() => (showInstall = false)}
		showLoaderOnDisabled={true}
	>
		<InstallView
			userscript={installViewUserscript}
			installError={installViewUserscriptError}
			installCancelClick={() => (showInstall = false)}
			installConfirmClick={installConfirm}
		/>
	</View>
{:else if showAll}
	<View
		headerTitle={"All Userscripts"}
		loading={disabled}
		closeClick={() => {
			showAll = false;
			refreshView();
		}}
		showLoaderOnDisabled={false}
	>
		<AllItemsView {allItems} allItemsToggleItem={toggleItem} />
	</View>
{:else}
	<div class="header" bind:this={header}>
		<div class="buttons">
			<IconButton
				icon={iconOpen}
				title={"Open save location"}
				on:click={openSaveLocation}
				{disabled}
			/>
			<IconButton
				icon={iconUpdate}
				notification={!!updates.length}
				on:click={() => (showUpdates = true)}
				title={"Show updates"}
				{disabled}
			/>
			<IconButton
				icon={iconRefresh}
				on:click={refreshView}
				title={"Refresh view"}
				{disabled}
			/>
			<Toggle
				checked={active}
				title={"Toggle injection"}
				on:click={toggleExtension}
				{disabled}
			/>
		</div>
		{#if !active}
			<!-- <div class="warn" bind:this={warn}>Injection disabled</div> -->
		{/if}
		{#if showInstallPrompt}
			<div class="warn" class:done={scriptInstalled} bind:this={warn}>
				Userscript
				{#if scriptChecking}
					{showInstallPrompt}
				{:else}
					{scriptInstalled ? "Installed" : "Detected"}:
					<button on:click={showInstallView}>{showInstallPrompt}</button>
				{/if}
			</div>
		{/if}
		{#if errorNotification}
			<div class="error" bind:this={err}>
				{errorNotification}
				<IconButton
					icon={iconClear}
					on:click={() => (errorNotification = undefined)}
					title={"Clear error"}
				/>
			</div>
		{/if}
	</div>
	<div class="main {rowColors || ''}" bind:this={main}>
		{#if loading}
			<Loader abortClick={abortUpdates} {abort} />
		{:else if inactive}
			<div class="none">Popup inactive on extension page</div>
		{:else if firstGuide}
			<div class="none">
				<p>Welcome, first use please:&nbsp;</p>
				<button class="link" on:click={openContainingApp}>
					Open Userscripts App
				</button>
				<p>to complete the initialization</p>
			</div>
		{:else if initError}
			<div class="none">
				Something went wrong:&nbsp;
				<button class="link" on:click={() => window.location.reload()}>
					click to retry
				</button>
			</div>
		{:else if items.length < 1}
			<div class="none">No matched userscripts</div>
		{:else}
			<div class="items" class:disabled>
				{#each list as item, i (item.filename)}
					<PopupItem
						background={getItemBackgroundColor(list, i)}
						enabled={!item.disabled}
						name={item.name}
						subframe={item.subframe}
						type={item.type}
						request={!!item.request}
						on:click={() => toggleItem(item)}
					/>
				{/each}
			</div>
		{/if}
	</div>
	{#if !inactive && platform === "macos"}
		<div class="footer">
			<button class="link" on:click={gotoExtensionPage}>
				Open Extension Page
			</button>
		</div>
	{/if}
{/if}

<style>
	.header {
		background-color: var(--color-bg-secondary);
		position: sticky;
		top: 0;
		z-index: 1;
	}

	.header .buttons {
		align-items: center;
		border-bottom: 1px solid var(--color-black);
		display: flex;
		padding: 0.5rem 1rem calc(0.5rem - 1px) 1rem;
	}

	.header .buttons :global(button:nth-of-type(2)) {
		margin: 0 auto 0 1rem;
	}

	.header .buttons :global(button:nth-of-type(3)) {
		margin-right: 1rem;
	}

	.header .buttons :global(button:nth-of-type(1) svg) {
		transform: scale(0.75);
	}

	.header .buttons :global(button:nth-of-type(2) svg) {
		transform: scale(0.9);
	}

	.header .buttons :global(button:nth-of-type(4)) {
		--toggle-font-size: 1.25rem;
	}

	.error,
	.warn {
		background-color: var(--color-red);
		color: var(--color-bg-secondary);
		font: var(--text-small);
		font-weight: 600;
		letter-spacing: var(--letter-spacing-small);
		line-height: 1.5rem;
		position: relative;
		text-align: center;
	}

	.error :global(button) {
		position: absolute;
		right: 0.5rem;
		top: 0;
	}

	.error :global(button svg) {
		transform: scale(0.5);
	}

	.warn {
		background-color: var(--color-yellow);
	}

	.warn.done {
		background-color: var(--color-green);
	}

	.warn button {
		background: none;
		color: inherit;
		border-bottom: 1px dotted var(--color-bg-secondary);
	}

	button {
		line-height: initial;
		font-weight: inherit;
	}

	.main {
		flex-grow: 1;
		min-height: 12.5rem;
		overflow-y: auto;
		position: relative;
	}

	.none {
		font-weight: 600;
		color: var(--text-color-disabled);
		text-align: center;
		padding: 3rem 0;
		line-height: 2.5;
	}

	.items.disabled {
		opacity: var(--opacity-disabled);
		pointer-events: none;
	}

	.footer {
		border-top: 1px solid var(--color-black);
		font-weight: 600;
		line-height: 1.5rem;
		padding: 0.5rem 0;
		text-align: center;
	}
</style>
