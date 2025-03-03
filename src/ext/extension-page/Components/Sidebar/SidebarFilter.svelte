<script>
	import { gl } from "@ext/utils.js";
	import { items, settings, state } from "../../store.js";
	import { settingsDictionary } from "@ext/settings.js";
	import Dropdown from "@shared/Components/Dropdown.svelte";
	import IconButton from "@shared/Components/IconButton.svelte";
	import iconSort from "@shared/img/icon-sort.svg?raw";
	import iconClear from "@shared/img/icon-clear.svg?raw";

	$: disabled = !$state.includes("ready");

	$: sortOrder = $settings["editor_list_sort"];

	let query = "";

	$: filter(query);

	function filter(q) {
		$items = $items.map((item) => {
			const visible = item.filename
				.toLowerCase()
				.includes(q.trim().toLowerCase());
			if (visible !== item.visible) return { ...item, visible };
			return item;
		});
	}

	const orders = Object.values(settingsDictionary).find(
		(i) => i.name === "editor_list_sort",
	).values;

	function updateSortOrder(order) {
		settings.updateSingleSetting("editor_list_sort", order);
	}
</script>

<div class="filter">
	<input
		type="text"
		placeholder="Search and filter here..."
		autocapitalize="off"
		autocomplete="off"
		spellcheck="false"
		autocorrect="off"
		bind:value={query}
		{disabled}
	/>
	<Dropdown icon={iconSort} {disabled} title={gl("settings_editor_list_sort")}>
		{#each orders as order}
			<button
				class:selected={sortOrder === order}
				on:click={() => updateSortOrder(order)}
			>
				{gl(`settings_editor_list_sort_${order}`)}{sortOrder === order
					? " *"
					: ""}
			</button>
		{/each}
	</Dropdown>
	{#if query}
		<IconButton
			icon={iconClear}
			on:click={() => (query = "")}
			{disabled}
			title="Clear"
		/>
	{/if}
</div>

<style>
	.filter {
		font: var(--text-default);
		position: relative;
		width: 100%;
	}

	input {
		background-color: var(--color-bg-theme);
		border: none;
		border-radius: var(--border-radius);
		color: inherit;
		display: block;
		font-size: 87.5%;
		opacity: 0.75;
		padding: 0.25rem 2.5rem;
		width: 100%;
	}

	input:focus {
		opacity: 1;
	}

	input:disabled {
		opacity: var(--opacity-disabled);
	}

	.filter > :global(button) {
		height: 1.25rem;
		position: absolute;
		right: 0.5rem;
		top: 50%;
		transform: translateY(-50%);
		width: 1.25rem;
	}

	.filter :global(input + div) {
		left: 0.5rem;
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
	}

	.filter :global(input:disabled + div > button) {
		opacity: calc(var(--opacity-disabled) * 0.5);
	}
</style>
