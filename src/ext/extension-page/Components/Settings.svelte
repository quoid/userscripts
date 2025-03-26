<script>
	import * as settingsStorage from "@ext/settings.js";
	import { settings, log } from "../store.js";
	import {
		gl,
		openInBlank,
		downloadToFile,
		parseMatchPatterns,
	} from "@ext/utils.js";
	import { sendNativeMessage } from "@ext/native.js";
	import Toggle from "@shared/Components/Toggle.svelte";
	import IconButton from "@shared/Components/IconButton.svelte";
	import iconEdit from "@shared/img/icon-edit.svg?raw";
	import iconLoader from "@shared/img/icon-loader.svg?raw";

	/** @type {"macos"|"ios"|"ipados"} */
	export let platform;
	/** @type {import("webextension-polyfill").Runtime.Port} - native message port */
	export let nativePort = undefined;
	/** @type {import('svelte/action').Action<HTMLElement, string>} */
	export let navRegister = () => undefined;

	const items = Object.values(settingsStorage.settingsDictionary);

	/** @type {settingsStorage.Group[]} settings group names */
	let groups = ["editor", "general"];
	if (platform !== "macos") {
		groups = ["general"];
	}

	/**
	 * @param {settingsStorage.Group} groupName settings group name
	 * @returns setting items for the specified group
	 */
	const groupItems = (groupName) => {
		// show disabled setting items only in development mode
		if (import.meta.env.MODE === "development") {
			return items.filter(
				(i) => i.group === groupName && platform in i.platforms,
			);
		} else {
			return items.filter(
				(i) => i.group === groupName && platform in i.platforms && !i.disable,
			);
		}
	};

	const indicators = {
		warn: {},
		error: {},
		saving: {},
		loading: {},
		resetting: false,
	};

	let settingsBox;
	// indicates that a global exclude match save has initiated
	indicators.saving["global_exclude_match"] = false;
	// indicates that a global exclude match value has error
	indicators.error["global_exclude_match"] = false;
	// indicates that a global exclude match value has warn
	indicators.warn["global_exclude_match"] = false;

	// global exclude match (gem)
	let gemRender;
	let gemTextarea;
	let gemStyleHeight;
	let gemFocused = false;
	let gemValue = $settings["global_exclude_match"].join("\n");
	let gemParsed;
	$: {
		gemParsed = parseMatchPatterns(gemValue);
		indicators.warn["global_exclude_match"] = gemParsed.warn;
		indicators.error["global_exclude_match"] = gemParsed.error;
	}

	function saveGlobalExcludeMatch() {
		const result = gemParsed;
		for (const item of result.items) {
			if (item.error) {
				log.add(
					`${gl("msg_invalid_match_pattern")}: ${item.value} - ${item.point}`,
					"error",
					true,
				);
			}
			if (item.warn) {
				log.add(`${item.value} - ${item.point}`, "warn", true);
			}
		}
		if (result.error) {
			return console.error("Global exclude includes invalid match patterns");
		}

		// when global exclude match saving, visual indication of saving occurs on element
		// the visual save indication is mostly ux only indicates a setting save was attempted
		// remove visual indication arbitrarily
		indicators.saving["global_exclude_match"] = true;
		setTimeout(() => (indicators.saving["global_exclude_match"] = false), 100);

		// filter duplicate values
		const values = [...new Set(result.values)];
		// compare global exclude match input to saved value
		/** @param {Array} a @param {Array} b */
		const isEqual = (a, b) =>
			a.every((i) => b.includes(i)) && b.every((i) => a.includes(i));
		if (!isEqual(values, $settings["global_exclude_match"])) {
			settings.updateSingleSetting("global_exclude_match", values);
		}
		// update textarea value
		gemValue = values.join("\n");
	}

	/** @type {import('svelte/action').Action<HTMLElement, (c: ResizeObserverEntry) => number>} */
	function actionResize(node, callback) {
		const resizeObserver = new ResizeObserver((entries) => {
			for (const entry of entries) {
				if (typeof callback === "function") {
					callback(entry);
				}
			}
		});
		resizeObserver.observe(node);
		return {
			destroy() {
				resizeObserver.disconnect();
			},
		};
	}

	// called when the user clicks the link to the save location
	function openSaveLocation() {
		if (import.meta.env.SAFARI_PLATFORM === "mac") {
			sendNativeMessage({ name: "OPEN_SAVE_LOCATION" });
		} else {
			const url = new URL(`shareddocuments://${$settings["saveLocation"]}`);
			const a = document.createElement("a");
			a.href = url.href;
			a.click();
		}
	}

	// called when the user clicks the icon next to the save location link
	function changeSaveLocation() {
		if (indicators.loading.changeSaveLocation) return;
		if (import.meta.env.SAFARI_PLATFORM === "mac") {
			// eslint-disable-next-line no-constant-condition -- issue: https://developer.apple.com/forums/thread/697217
			if (nativePort && false) {
				const listener = (message) => {
					if (message.name === "URL_SCHEME_STARTED") {
						indicators.loading.changeSaveLocation = false;
						nativePort.onMessage.removeListener(listener);
					}
				};
				nativePort.onMessage.addListener(listener);
			} else {
				setTimeout(() => (indicators.loading.changeSaveLocation = false), 1000);
			}
			indicators.loading.changeSaveLocation = true;
			sendNativeMessage({ name: "CHANGE_SAVE_LOCATION" });
		} else {
			const a = document.createElement("a");
			a.href = `${$settings["scheme"]}://changesavelocation`;
			a.click();
		}
	}

	async function backupExport() {
		const exportable = items.filter(
			(i) => !i.disable && !i.protect && i.group !== "INTERNAL",
		);
		const obj = await settingsStorage.get(exportable.map((i) => i.name));
		const bak = {
			app: "Userscripts",
			build: $settings["build"],
			version: $settings["version"],
			platform: $settings["platform"],
			timestamp: Date.now(),
			settings: obj,
		};
		const filename = `userscripts-settings-backup.json`;
		downloadToFile(filename, JSON.stringify(bak), "application/json");
	}

	let fileInput;
	async function backupImport() {
		if (!fileInput.files.length) return;
		const file = fileInput.files[0];
		const text = await file.text();
		// clear value to avoid no event triggering when selecting the same file
		fileInput.value = "";
		let json;
		try {
			json = JSON.parse(text);
		} catch (error) {
			log.add(
				`${gl("msg_invalid_backup_file")}: ${file.name} - ${error}`,
				"error",
				true,
			);
			return;
		}
		if (json.app !== "Userscripts" || !json.settings) {
			log.add(`${gl("msg_invalid_backup_file")}: ${file.name}`, "error", true);
			return;
		}
		if (await settingsStorage.set(json.settings)) {
			log.add(gl("msg_backup_import_finish"), "info", true);
			gemValue = $settings["global_exclude_match"].join("\n");
		} else {
			log.add(gl("msg_backup_import_failed"), "error", true);
			return;
		}
	}

	/** @param {string|string[]} keys */
	async function reset(keys = undefined) {
		await settings.reset(keys);
		// update textarea value
		if (keys === undefined || keys.includes("global_exclude_match")) {
			gemValue = $settings["global_exclude_match"].join("\n");
		}
		if (keys === undefined) {
			log.add(gl("msg_settings_reset_finish"), "info", true);
		}
	}

	/** @param {settingsStorage.Group} groupName */
	async function resetGroup(groupName) {
		const unprotectedItems = groupItems(groupName).filter((i) => !i.protect);
		const settingNames = unprotectedItems.map((i) => i.name);
		await reset(settingNames);
	}
</script>

<div class="settings_box" bind:this={settingsBox}>
	{#each groups as group (group)}
		<div class="section">
			<div
				class="section_header"
				use:navRegister={gl(`settings_section_${group}`)}
			>
				<div class="name">{gl(`settings_section_${group}`)}</div>
				{#if indicators.resetting}
					<button class="reset" on:click={() => resetGroup(group)}
						>{gl("settings_section_tools_reset_section")}</button
					>
				{/if}
			</div>
			{#each groupItems(group) as item (item.name)}
				{@const ariaAttributes = {
					"aria-labelledby": `${item.name}_label`,
					"aria-describedby": `${item.name}_desc`,
				}}
				<div class="section_row {item.name}" class:disable={item.disable}>
					<div class="row_grid">
						<div
							id={`${item.name}_label`}
							class="name"
							class:warn={item.nodeClass.warn === $settings[item.name] ||
								indicators.warn[item.name]}
							class:error={item.nodeClass.error === $settings[item.name] ||
								indicators.error[item.name]}
						>
							{gl(`settings_${item.name}`)}
						</div>
						<div class="desc" id={`${item.name}_desc`}>
							{gl(`settings_${item.name}_desc`)}
						</div>
						<div class="action1">
							{#if item.nodeType === "Toggle"}
								<Toggle
									{ariaAttributes}
									checked={$settings[item.name]}
									on:click={() =>
										settings.updateSingleSetting(
											item.name,
											!$settings[item.name],
										)}
								/>
							{/if}
							{#if item.nodeType === "select"}
								<select
									{...ariaAttributes}
									bind:value={$settings[item.name]}
									on:blur={() =>
										settings.updateSingleSetting(
											item.name,
											$settings[item.name],
										)}
								>
									{#each item.values as value (value)}
										<option {value}>
											{gl(`settings_${item.name}_${value}`) || value}
										</option>
									{/each}
								</select>
							{/if}
						</div>
						<div class="action2 type_{item.nodeType}">
							{#if indicators.resetting && !indicators.saving[item.name] && !item.protect && (item.name !== "global_exclude_match" || !gemFocused)}
								<button class="reset" on:click={() => reset(item.name)}
									>{gl("settings_section_tools_reset_single")}</button
								>
							{/if}
							{#if item.nodeType === "textarea"}
								{#if indicators.saving[item.name]}
									<div class="circling saving">
										<!-- eslint-disable-next-line svelte/no-at-html-tags -->
										{@html iconLoader}
										{gl(`settings_${item.name}_saving`)}
									</div>
								{/if}
								{#if gemFocused}
									<!-- Must escape tab nav, otherwise it will cause an infinite loop -->
									<button tabindex="-1" class="done"
										>{gl("settings_global_exclude_match_done")}</button
									>
								{/if}
							{/if}
						</div>
					</div>
					{#if item.nodeType === "textarea" && item.name === "global_exclude_match"}
						<div class="textarea_box">
							<textarea
								{...ariaAttributes}
								class:warn={gemParsed.warn || indicators.warn[item.name]}
								class:error={gemParsed.error || indicators.error[item.name]}
								disabled={indicators.saving[item.name]}
								placeholder={gl(`settings_${item.name}_placeholder`)}
								spellcheck="false"
								bind:this={gemTextarea}
								bind:value={gemValue}
								on:focus={() => (gemFocused = true)}
								on:blur={() => {
									gemFocused = false;
									saveGlobalExcludeMatch();
								}}
								on:scroll={(e) => (gemRender.scrollTop = e.target.scrollTop)}
								use:actionResize={(c) =>
									(gemStyleHeight = c.borderBoxSize[0].blockSize)}
							></textarea>
							<div
								class="textarea"
								style:height="{gemStyleHeight}px"
								style:opacity={gemFocused ? 1 : "revert-layer"}
								bind:this={gemRender}
							>
								{#each gemParsed.items as p (p)}
									<!-- should not contain any newlines or indents -->
									{p.start}{#if p.warn || p.error}<mark
											class:warn={p.warn}
											class:error={p.error}>{p.value}</mark
										>{:else}{p.value}{/if}{p.separ}
								{/each}
							</div>
						</div>
						<div class="global_exclude_match_refer desc">
							{gl(`settings_${item.name}_refer`)}
							<button
								class="link"
								on:click={() =>
									openInBlank(
										"https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Match_patterns#match_pattern_structure",
									)}
							>
								Match pattern structure
							</button>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/each}
	<div class="section">
		<div class="section_header" use:navRegister={gl(`settings_section_native`)}>
			<div>{gl(`settings_section_native`)}</div>
		</div>
		<div class="section_row saveLocation">
			<div class="row_grid">
				<div class="name">{gl("settings_scripts_directory")}</div>
				<div class="desc">{gl("settings_scripts_directory_desc")}</div>
				<div class="action1">
					<div class="circling">
						{#if indicators.loading.changeSaveLocation}
							<!-- eslint-disable-next-line svelte/no-at-html-tags -->
							{@html iconLoader}
						{/if}
						<IconButton
							icon={iconEdit}
							on:click={changeSaveLocation}
							title={gl("settings_set_scripts_directory")}
						/>
					</div>
				</div>
			</div>
			<button
				class="link"
				title={$settings["saveLocation"]}
				on:click={openSaveLocation}
			>
				{$settings["saveLocation"]}
			</button>
		</div>
	</div>
	<div class="section">
		<div class="section_header" use:navRegister={gl(`settings_section_tools`)}>
			<div>{gl(`settings_section_tools`)}</div>
		</div>
		<div class="section_row tools">
			<div class="buttons">
				{#if indicators.resetting}
					<button
						on:click={() => (reset(), (indicators.resetting = false))}
						class="danger">{gl("settings_section_tools_reset_all")}</button
					>
					<button on:click={() => (indicators.resetting = false)}
						>{gl("settings_section_tools_goback")}</button
					>
				{:else}
					<button on:click={backupExport}
						>{gl("settings_section_tools_export")}</button
					>
					<button on:click={() => fileInput.click()}
						>{gl("settings_section_tools_import")}</button
					>
					<button
						on:click={() => (
							settingsBox.scrollIntoView({ behavior: "smooth" }),
							(indicators.resetting = true)
						)}>{gl("settings_section_tools_reset")}</button
					>
				{/if}
			</div>
			<input
				bind:this={fileInput}
				on:change={backupImport}
				type="file"
				accept="application/json"
				style:display="none"
			/>
			<div class="desc">{gl("settings_scripts_tools_desc")}</div>
		</div>
	</div>
	<div class="section">
		<div class="section_header" use:navRegister={gl(`settings_section_about`)}>
			{gl(`settings_section_about`)}
		</div>
		<div class="section_row">
			<article>
				<p>
					Userscripts {import.meta.env.BROWSER ?? ""}
					{#if import.meta.env.GIT_TAG && import.meta.env.GIT_COMMIT}
						<button
							class="link"
							on:click={() =>
								openInBlank(
									`https://github.com/quoid/userscripts/releases/tag/${
										import.meta.env.GIT_TAG
									}`,
								)}
						>
							{import.meta.env.GIT_TAG}
						</button>
						(<button
							class="link"
							on:click={() =>
								openInBlank(
									`https://github.com/quoid/userscripts/commit/${
										import.meta.env.GIT_COMMIT
									}`,
								)}
						>
							{import.meta.env.GIT_COMMIT.slice(0, 7)}
						</button>)
					{:else}
						v{$settings["version"]}
						({$settings["build"]})
					{/if}
				</p>
				<p>
					{gl("settings_about_text1")}
					<button
						class="link"
						on:click={() => openInBlank("https://github.com/quoid/userscripts")}
					>
						{gl("settings_about_button_repo")}
					</button>
					|
					<button
						class="link"
						on:click={() =>
							openInBlank(
								`https://github.com/quoid/userscripts/blob/${
									import.meta.env.GIT_TAG ?? "main"
								}/README.md`,
							)}
					>
						{gl("settings_about_button_docs")}
					</button>
					|
					<button
						class="link"
						on:click={() =>
							openInBlank("https://github.com/quoid/userscripts/issues")}
					>
						{gl("settings_about_button_issues")}
					</button>
				</p>
				<p>
					{gl("settings_about_text2")}
					<button
						class="link"
						on:click={() =>
							openInBlank("https://geo.itunes.apple.com/app/id1463298887")}
					>
						{gl("settings_about_button_store")}
					</button>
					|
					<button
						class="link"
						on:click={() =>
							openInBlank("https://github.com/quoid/userscripts#support")}
					>
						{gl("settings_about_button_beta")}
					</button>
				</p>
			</article>
		</div>
	</div>
</div>

<style>
	.settings_box {
		--toggle-font-size: 1.1rem;
		--row-gap: 0.25rem;
		--column-gap: 1.25rem;

		background-color: var(--color-bg-secondary);
		color: var(--text-color-secondary);
		letter-spacing: var(--letter-spacing-medium);
	}

	/* ios */
	@supports (-webkit-touch-callout: none) {
		.settings_box {
			--toggle-font-size: 1.8rem;
		}
	}

	.section_header {
		display: flex;
		align-items: center;
		border-top: 1px solid var(--border-color);
		border-bottom: 1px solid var(--border-color);
		background-color: var(--color-bg-primary);
		color: var(--text-color-primary);
		font: var(--text-default);
		font-weight: 600;
		letter-spacing: var(--letter-spacing-default);
		padding: calc(1rem - 2px) 1rem 1rem;
	}

	.section_header .name {
		flex: 1;
	}

	.section_row {
		display: flex;
		flex-direction: column;
		gap: var(--row-gap);
		border-bottom: 1px solid var(--border-color);
		margin: 0 2rem;
		padding: 1rem 0;
	}

	.section_row.disable {
		background: repeating-linear-gradient(
			50deg,
			transparent 0 20px,
			rgb(0 0 0 / 0.1) 20px 25px
		);
	}

	.section_row:last-child {
		border-bottom: none;
	}

	.section_row div.warn {
		color: var(--color-yellow);
	}

	.section_row div.error {
		color: var(--color-red);
	}

	.section_row .name {
		font-weight: 500;
	}

	.section_row .desc {
		color: var(--text-color-secondary);
		font: var(--text-small);
		font-weight: 500;
	}

	.row_grid {
		display: grid;
		align-items: center;
		grid-template-columns: 1fr auto;
		grid-template-areas:
			"name action1"
			"desc action2";
		gap: var(--row-gap) var(--column-gap);
	}

	.row_grid .name {
		grid-area: name;
		color: var(--text-color-primary);
	}

	.row_grid .desc {
		grid-area: desc;
	}

	.row_grid .action1 {
		grid-area: action1;
	}

	.row_grid .action2 {
		grid-area: action2;
		align-self: start;
	}

	.row_grid .action2.type_textarea {
		align-self: end;
		min-width: 5rem;
	}

	.row_grid .action1,
	.row_grid .action2 {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
	}

	select {
		color: var(--text-color-primary);
		font-size: 125%;
	}

	/* ios */
	@supports (-webkit-touch-callout: none) {
		select {
			font-size: 100%;
		}
	}

	.circling {
		display: flex;
		align-items: center;
		gap: var(--row-gap);
	}

	.circling > :global(svg) {
		height: 0.75rem;
		width: 0.75rem;
		stroke: var(--text-color-primary);
	}

	.textarea_box {
		position: relative;
		width: 100%;
		margin: var(--row-gap) 0;
	}

	/* Sync two layers */
	.textarea,
	textarea {
		background-color: var(--color-bg-theme);
		border-radius: var(--border-radius);
		border: 1px solid transparent;
		color: inherit;
		font-family: var(--editor-font);
		letter-spacing: initial;
		max-height: 50rem;
		max-width: 100%;
		min-height: 10rem;
		min-width: 100%;
		opacity: 0.75;
		overscroll-behavior: none;
		padding: 0.5rem;
		width: 100%;
		word-break: break-all;
	}

	/* Lower layer */
	.textarea::-webkit-scrollbar {
		display: none;
	}

	.textarea {
		/* Text is colored by the upper layer by default */
		color: transparent;
		overflow: scroll;
		user-select: none;
		-webkit-user-select: none;
		white-space: pre-wrap;
	}

	.textarea mark {
		/* Deeper the color of marked text when lose focus */
		color: var(--text-color-primary);
		background-color: light-dark(#ffae9e, red);
		border-radius: var(--border-radius);
		opacity: 1;
	}

	.textarea mark.warn {
		background-color: var(--color-yellow);
		background-color: light-dark(#fff000, #808000);
	}

	/* Upper layer */
	textarea {
		background-color: transparent;
		position: absolute;
		top: 0;
		z-index: 10;
	}

	/* ios */
	@supports (-webkit-touch-callout: none) {
		textarea {
			min-height: 15rem;
		}
	}

	textarea:focus::placeholder {
		color: transparent;
	}

	textarea.warn {
		border: 1px solid var(--color-yellow);
	}

	textarea.error {
		border: 1px solid var(--color-red);
	}

	textarea:focus {
		opacity: 1;

		/* Must have color when text selected, otherwise the text will fade */
		color: var(--text-color-primary);
	}

	button.done {
		background-color: var(--color-bg-theme);
		border-radius: var(--border-radius);
		color: var(--text-color-primary);
		font-weight: 600;
		padding: 0 0.5rem;
	}

	.saveLocation > button {
		text-align: left;
		overflow-wrap: anywhere;
	}

	.tools .buttons {
		display: flex;
		flex-wrap: wrap;
		gap: var(--column-gap);
		justify-content: space-between;
		padding: 0.5rem 0;
	}

	.tools button {
		flex: 1;
		background-color: var(--color-bg-theme);
		border-radius: var(--border-radius);
		color: var(--text-color-primary);
		font-weight: 600;
		opacity: 0.75;
		padding: 0.5rem 1rem;
	}

	.tools button.danger {
		color: var(--color-red);
		font-weight: 700;
	}

	@media (hover: hover) {
		.tools button:hover {
			background-color: var(--color-blue);
			color: light-dark(var(--color-white), var(--color-black));
			opacity: 1;
		}

		.tools button.danger:hover {
			background: var(--color-red);
			color: var(--color-white);
		}

		button.reset:hover {
			opacity: 1;
		}
	}

	/* ios */
	@supports (-webkit-touch-callout: none) {
		.tools button.danger {
			background: var(--color-red);
			color: var(--color-white);
		}
	}

	.tools button:active,
	button.reset:active {
		opacity: 0.75;
	}

	button.reset {
		background: var(--color-red);
		border-radius: var(--border-radius);
		color: var(--color-white);
		font-weight: 700;
		line-height: calc(var(--toggle-font-size) + 0.1rem);
		opacity: 0.75;
		padding: 0 0.1rem;
	}

	.section_header button.reset {
		margin-right: 1rem;
		padding: 0 0.5rem;
	}

	article {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 0.5rem 0 1rem;
	}
</style>
