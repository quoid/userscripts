<script>
	import { settingsDictionary } from "../../shared/settings.js";
	import { settings, log } from "../store.js";
	import { parseMatchPatterns, openInBlank, gl } from "../../shared/utils.js";
	import { sendNativeMessage } from "../../shared/native.js";
	import Toggle from "../../shared/Components/Toggle.svelte";
	import IconButton from "../../shared/Components/IconButton.svelte";
	import iconEdit from "../../shared/img/icon-edit.svg?raw";
	import iconLoader from "../../shared/img/icon-loader.svg?raw";

	/** @type {"macos"|"ios"} - native message port */
	export let platform;
	/** @type {import("webextension-polyfill").Runtime.Port} - native message port */
	export let nativePort = undefined;

	const items = Object.values(settingsDictionary);

	/** @type {("general"|"editor")[]} settings group names */
	let groups = ["general", "editor"];
	if (platform === "ios") {
		groups = ["general"];
	}

	/**
	 * @param {typeof groups[number]} groupName settings group name
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
	};

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
	let gemStyleOpacity;
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
			// ios
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
			// ios
		}
	}
</script>

<div class="settings">
	{#each groups as group}
		<div class="section">
			<div class="section__title">
				<div>{gl(`settings_section_${group}`)}</div>
			</div>
			{#each groupItems(group) as item}
				<div class="section__row {item.name}" class:disable={item.disable}>
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
					<label
						aria-labelledby={`${item.name}_label`}
						aria-describedby={`${item.name}_desc`}
					>
						{#if item.nodeType === "Toggle"}
							<Toggle
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
								bind:value={$settings[item.name]}
								on:blur={() =>
									settings.updateSingleSetting(item.name, $settings[item.name])}
							>
								{#each item.values as value}
									<option {value}>
										{gl(`settings_${item.name}_${value}`) || value}
									</option>
								{/each}
							</select>
						{/if}
					</label>
					{#if item.nodeType === "textarea" && item.name === "global_exclude_match"}
						{#if indicators.saving[item.name]}
							<!-- eslint-disable-next-line svelte/no-at-html-tags -->
							<span class="icon__loader">{@html iconLoader}</span>
							{gl(`settings_${item.name}_saving`)}
						{/if}
						<div class="textarea_box">
							<textarea
								aria-labelledby={`${item.name}_label`}
								aria-describedby={`${item.name}_desc`}
								class:warn={gemParsed.warn || indicators.warn[item.name]}
								class:error={gemParsed.error || indicators.error[item.name]}
								disabled={indicators.saving[item.name]}
								placeholder={gl(`settings_${item.name}_placeholder`)}
								spellcheck="false"
								bind:this={gemTextarea}
								bind:value={gemValue}
								on:focus={() => (gemStyleOpacity = 1)}
								on:blur={() => {
									gemStyleOpacity = "revert-layer";
									saveGlobalExcludeMatch();
								}}
								on:scroll={(e) => (gemRender.scrollTop = e.target.scrollTop)}
								use:actionResize={(c) =>
									(gemStyleHeight = c.borderBoxSize[0].blockSize)}
							></textarea>
							<div
								class="textarea"
								style="height: {gemStyleHeight}px; opacity: {gemStyleOpacity};"
								bind:this={gemRender}
							>
								{#each gemParsed.items as p}
									<!-- should not contain any newlines or indents -->
									{p.start}{#if p.warn || p.error}<mark
											class:warn={p.warn}
											class:error={p.error}>{p.value}</mark
										>{:else}{p.value}{/if}{p.separ}
								{/each}
							</div>
						</div>
						<div class="global_exclude_match_refer">
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
					<div class="desc" id={`${item.name}_desc`}>
						{gl(`settings_${item.name}_desc`)}
					</div>
				</div>
			{/each}
		</div>
	{/each}
	<div class="section">
		<div class="section__title">
			<div>{gl(`settings_section_native`)}</div>
		</div>
		<div class="section__row saveLocation">
			<div class="name">{gl("settings_scripts_directory")}</div>
			{#if indicators.loading.changeSaveLocation}
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				<span class="icon__loader">{@html iconLoader}</span>
			{/if}
			<IconButton
				icon={iconEdit}
				on:click={changeSaveLocation}
				title={gl("settings_set_scripts_directory")}
			/>
			<button
				class="link"
				title={$settings["saveLocation"]}
				on:click={openSaveLocation}
			>
				{$settings["saveLocation"]}
			</button>
			<div class="desc">{gl("settings_scripts_directory_desc")}</div>
		</div>
	</div>
	<div class="section">
		<div class="section__title">{gl(`settings_section_about`)}</div>
		<p>
			Userscripts {import.meta.env.BROWSER ?? ""}
			v{$settings["version"]}
			({$settings["build"]})
			<br /><br />
			{gl("settings_about_text1")}
			<button
				class="link"
				on:click={() => openInBlank("https://github.com/quoid/userscripts")}
			>
				{gl("settings_about_button_repo")}
			</button>
			<button
				class="link"
				on:click={() =>
					openInBlank(
						`https://github.com/quoid/userscripts/blob/v${$settings["version"]}/README.md`,
					)}
			>
				{gl("settings_about_button_docs")}
			</button>
			<button
				class="link"
				on:click={() =>
					openInBlank("https://github.com/quoid/userscripts/issues")}
			>
				{gl("settings_about_button_issues")}
			</button>
			<br /><br />
			{gl("settings_about_text2")}
			<button
				class="link"
				on:click={() =>
					openInBlank("https://geo.itunes.apple.com/app/id1463298887")}
			>
				{gl("settings_about_button_store")}
			</button>
			<button
				class="link"
				on:click={() =>
					openInBlank("https://github.com/quoid/userscripts#support")}
			>
				{gl("settings_about_button_beta")}
			</button>
		</p>
	</div>
</div>

<style>
	.settings {
		color: var(--text-color-secondary);
		letter-spacing: var(--letter-spacing-medium);
	}

	.section__title {
		align-items: center;
		border-top: 1px solid var(--color-black);
		border-bottom: 1px solid var(--color-black);
		color: var(--text-color-primary);
		display: flex;
		font: var(--text-default);
		font-weight: 500;
		letter-spacing: var(--letter-spacing-default);
		padding: calc(1rem - 2px) 1rem 1rem 1rem;
	}

	.section__title div {
		flex-grow: 1;
	}

	.section__row {
		align-items: center;
		border-bottom: 1px solid var(--color-black);
		display: flex;
		flex-wrap: wrap;
		padding: 1rem 0;
		margin: 0 2rem;
	}

	.section__row:last-child {
		border-bottom: none;
	}

	.section__row div {
		flex-grow: 1;
	}

	.section__row div.warn {
		color: var(--color-yellow);
	}

	.section__row div.error {
		color: var(--color-red);
	}

	.section__row.disable {
		background: repeating-linear-gradient(
			50deg,
			transparent 0 20px,
			rgb(0 0 0 / 0.1) 20px 25px
		);
	}

	.section__row .name {
		color: var(--text-color-primary);
	}

	.section__row .desc {
		width: 100%;
		padding: 0.25rem 0 0;
		color: var(--text-color-secondary);
		font: var(--text-small);
	}

	.saveLocation > button {
		width: 100%;
		text-align: left;
		overflow-wrap: anywhere;
	}

	.icon__loader {
		display: flex;
		align-items: center;
		margin-right: 0.25rem;
	}

	.icon__loader :global(svg) {
		height: 0.75rem;
		width: 0.75rem;
	}

	.global_exclude_match_refer {
		padding: 0.25rem 0 0;
		font: var(--text-small);
	}

	.textarea_box {
		position: relative;
		width: 100%;
		margin-top: 0.5rem;
	}

	.textarea mark {
		color: transparent;
		color: var(--text-color-primary);
		background-color: red;
		border-radius: var(--border-radius);
		opacity: 1;
	}

	.textarea mark.warn {
		background-color: var(--color-yellow);
		background-color: #808000;
	}

	.textarea,
	textarea {
		background-color: var(--color-black);
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

	.textarea {
		color: transparent;
		overflow: scroll;
		user-select: none;
		-webkit-user-select: none;
		white-space: pre-wrap;
	}

	.textarea::-webkit-scrollbar {
		display: none;
	}

	textarea {
		background-color: transparent;
		position: absolute;
		top: 0;
		z-index: 10;
	}

	/* ios */
	@supports (-webkit-touch-callout: none) {
		textarea {
			min-height: 20rem;
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
		color: var(--text-color-primary);
	}

	p {
		padding: 1rem 2rem 2rem;
	}

	p button {
		margin-right: 0.25rem;
	}
</style>
