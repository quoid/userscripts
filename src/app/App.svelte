<svelte:options runes={true} />

<script>
	import logoIcon from "@shared/img/logo-icon.png";
	import LogoText from "@shared/Components/LogoText.svelte";
	import IconDebug from "@shared/img/icon-bug.svg?raw";
	import Dropdown from "@shared/Components/Dropdown.svelte";
	import { i18nInit } from "./i18n.js";

	const baseUrl = "https://github.com/quoid/userscripts";
	const webkit = window.webkit.messageHandlers.controller;

	/** @type {Types.SystemPlatform} */
	let platform = $state("ios");
	/** @type {string} */
	let directory = $state("unknown");
	/** @type {Types.ExtensionStatus} */
	let extStatus = $state("unknown");
	/** @type {boolean} */
	let useSettingsInsteadOfPreferences = $state(true);
	/** @type {boolean} */
	let enableLogger = $state(false);
	/** @type {boolean} */
	let promptLogger = $state(false);
	/** @type {string} */
	let promptLoggerText = $state();
	/** @type {boolean} */
	let OOBE = $state(false);
	/** @type {string} */
	let OOBEText = $state();
	/** @type {Awaited<ReturnType<typeof i18nInit>>["gl"]} */
	let gl = $state();

	window.webapp = {
		updateDirectory: (newDir) => (directory = newDir),
		updateExtStatus: (status) => (extStatus = status),
		switchLogger: (_enableLogger, _promptLogger) => {
			if (import.meta.env.MODE === "development") {
				console.debug(_enableLogger, _promptLogger);
			}
			enableLogger = _enableLogger;
			promptLogger = _enableLogger && _promptLogger;
		},
	};

	// disable context menu
	window.addEventListener("contextmenu", (event) => event.preventDefault());

	async function initialize() {
		// webkit
		const app = await webkit.postMessage("INIT");
		if (import.meta.env.MODE === "development") {
			console.debug(app);
		}
		platform = app.platform;
		directory = app.directory;
		extStatus = app.extStatus;
		useSettingsInsteadOfPreferences = app.useSettingsInsteadOfPreferences;
		enableLogger = app.enableLogger;
		promptLogger = app.enableLogger && app.promptLogger;
		OOBE = app.firstRunTime === 0;
		if (import.meta.env.MODE === "development") {
			// OOBE = true; // DEBUG
			// promptLogger = true; // DEBUG
			// enableLogger = true; // DEBUG
			// directory = "Userscripts App Documents"; // DEBUG
		}
		// i18n
		const i18n = await i18nInit();
		gl = i18n.gl;
		OOBEText =
			platform === "mac"
				? i18n.md("quick_start_guide_mac")
				: i18n.md("quick_start_guide_ios");
		const s1 = app.maxLogFileSize
			? `${app.maxLogFileSize / 1_000_000}MB`
			: "??MB";
		promptLoggerText = i18n.md("native_logger_caveat", s1);

		return app;
	}

	function changeDirectory() {
		webkit.postMessage("CHANGE_DIRECTORY");
	}

	function openDirectory() {
		webkit.postMessage("OPEN_DIRECTORY");
	}

	function showPreferences() {
		webkit.postMessage("SHOW_PREFERENCES");
	}

	function exportLogFiles() {
		webkit.postMessage("EXPORT_LOG_FILES");
	}

	function disableLogger() {
		webkit.postMessage("DISABLE_LOGGER");
		enableLogger = false;
	}

	function dismissLoggerPrompt() {
		webkit.postMessage("DISMISS_LOGGER_PROMPT");
		promptLogger = false;
	}
</script>

<main>
	{#await initialize() then app}
		{#if OOBE}
			<div class="guide-overlay">
				<header>{gl("quick_start_guide_title")}</header>
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				<x-markdown>{@html OOBEText}</x-markdown>
				<button onclick={() => (OOBE = false)}>{gl("button_dismiss")}</button>
			</div>
		{/if}
		{#if promptLogger}
			<div class="modal-overlay">
				<div class="modal-content">
					<header>{gl("native_logger_enabled_title")}</header>
					<!-- eslint-disable-next-line svelte/no-at-html-tags -->
					<x-markdown>{@html promptLoggerText}</x-markdown>
					<div class="buttons">
						<button class="red" onclick={disableLogger}>
							{gl("button_disable")}
						</button>
						<button onclick={dismissLoggerPrompt}>
							{gl("button_ok")}
						</button>
					</div>
				</div>
			</div>
		{/if}
		{#if enableLogger}
			<div class="debug">
				<Dropdown icon={IconDebug} title="New item" right>
					<button onclick={exportLogFiles}>
						{gl("export_log_files")}
					</button>
					<button class="red2" onclick={disableLogger}>
						{gl("disable_logger")}
					</button>
				</Dropdown>
			</div>
		{/if}
		<div class="section app">
			<img
				alt="Userscripts App Icon"
				class="icon"
				draggable="false"
				src={logoIcon}
			/>
			<div class="logo">
				<LogoText />
			</div>
			<div class="version">
				{#if import.meta.env.GIT_TAG && import.meta.env.GIT_COMMIT}
					<a href="{baseUrl}/releases/tag/{import.meta.env.GIT_TAG}">
						{import.meta.env.GIT_TAG}
					</a>
					<span
						>(<a href="{baseUrl}/commit/{import.meta.env.GIT_COMMIT}">
							{import.meta.env.GIT_COMMIT.slice(0, 7)}
						</a>)</span
					>
				{:else}
					<span>v{app.version}</span>
					<span>({app.build})</span>
				{/if}
			</div>
			{#if platform === "mac"}
				<div class="status">
					<!-- <span class="icon"></span> -->
					<span class="text">{gl("safari_extension_status")}:</span>
					<span class={extStatus}>{gl(extStatus)}</span>
				</div>
				<button onclick={showPreferences}>
					{useSettingsInsteadOfPreferences
						? gl("open_safari_settings")
						: gl("open_safari_preferences")}
				</button>
			{/if}
		</div>
		<div class="section guide">
			<button onclick={() => (OOBE = true)}>{gl("show_usage_guide")}</button>
		</div>
		<div class="section action">
			<button onclick={changeDirectory}>{gl("change_directory")}</button>
			<div class="current">{gl("current_directory")}</div>
			<button id="directory" class="link" onclick={openDirectory}>
				{directory}
			</button>
		</div>
		<div class="section footer">
			<div class="links">
				<a href="{baseUrl}/blob/{import.meta.env.GIT_TAG ?? 'main'}/README.md"
					>{gl("documentation")}</a
				>
				<a href="{baseUrl}/discussions">{gl("discussions")}</a>
				<a href="{baseUrl}/issues">{gl("report_an_issue")}</a>
				<a href="{baseUrl}#privacy-policy">{gl("privacy_policy")}</a>
			</div>
		</div>
	{:catch error}
		<div class="section">
			{error}
		</div>
	{/await}
</main>

<style>
	main {
		flex-direction: column;
		place-items: center;
		place-content: center;
		gap: min(2rem, 32px);
		min-height: 100svh;
		min-height: -webkit-fill-available;
		padding: 16px;
		text-align: center;
		-webkit-touch-callout: none;
		user-select: none;
		cursor: default;
	}

	.guide-overlay {
		flex-flow: column;
		background-color: var(--color-bg-primary);
		place-content: space-between;
		place-items: center;
		position: fixed;
		padding: 2rem 1rem 3rem;
		gap: 2rem;
		inset: 0;
		z-index: 10;
	}

	@media (width < 500px) {
		.guide-overlay {
			padding: 2rem 0;
		}
	}

	.modal-overlay {
		backdrop-filter: blur(5px);
		background-color: rgb(0 0 0 / 0.5);
		place-content: center;
		place-items: center;
		position: fixed;
		inset: 0;
		z-index: 10;
	}

	.modal-content {
		flex-flow: column;
		background-color: var(--color-bg-secondary);
		border-radius: 0.5rem;
		box-shadow: var(--box-shadow);
		place-content: space-between;
		place-items: center;
		gap: 2rem;
		padding: 2rem 0;
		max-width: 80svw;
		max-height: 80svh;
	}

	@media (width < 500px) {
		.modal-content {
			gap: 1.5rem;
			padding: 1.5rem 0;
		}
	}

	.guide-overlay header,
	.modal-content header {
		font: var(--text-large);
		font-weight: bold;
		margin: 0.5rem;
	}

	.modal-content .buttons {
		gap: 20svw;
	}

	.section {
		place-items: center;
		flex-direction: column;
		gap: min(0.5rem, 16px);
	}

	.section.app,
	.section.footer {
		flex: 1;
		place-content: flex-end;
	}

	.section.footer .links {
		flex-flow: row wrap;
		place-content: center;
		gap: min(0.5rem, 16px);
	}

	a {
		color: var(--color-blue);
	}

	.section.app .icon {
		height: min(8rem, 256px);
		width: min(8rem, 256px);
	}

	.section.app .logo :global(svg) {
		display: flex;
		height: min(1.5rem, 32px);
	}

	.section.app .status {
		place-items: center;
		gap: 0.5rem;
		padding-top: 0.5rem;
	}

	.section.app .status .icon {
		background-color: var(--color-yellow);
		border-radius: 50%;
		height: 0.5rem;
		width: 0.5rem;
	}

	.section.app .status .enabled {
		color: var(--color-green);
	}

	.section.app .status .disabled {
		color: var(--color-yellow);
	}

	.section.app .status .error {
		color: var(--color-red);
	}

	.section.app .version {
		gap: 6px;
	}

	.links,
	.version,
	.current {
		color: var(--text-color-disabled);
		font: var(--text-small);
		font-weight: bold;
		letter-spacing: var(--letter-spacing-small);
	}

	button {
		align-items: center;
		border: none;
		cursor: pointer;
		padding: 0 0.5rem;
		user-select: none;
		background-color: var(--color-blue);
		border-radius: var(--border-radius);
		color: var(--color-bg-secondary);
		font: var(--text-default);
		font-weight: bold;
		letter-spacing: var(--letter-spacing-default);
	}

	button.red,
	button.red2:hover {
		color: var(--color-white);
		background-color: var(--color-red);
	}

	button.red2 {
		color: var(--color-red);
	}

	button:active {
		filter: brightness(75%);
	}

	/* ios */
	@supports (-webkit-touch-callout: none) {
		button {
			padding: 0.5rem 1rem;
		}
	}

	button#directory {
		background: none;
		color: var(--editor-default);
		font-family: var(--editor-font);
		font-size: 0.875rem;
		font-weight: 400;
		padding-top: 0;
		text-decoration: none;
		word-break: break-all;
	}

	.debug {
		position: fixed;
		top: 1rem;
		right: 1.5rem;
		color: var(--text-color-primary);
	}

	.debug :global(svg) {
		transform: scale(1);
	}
</style>
