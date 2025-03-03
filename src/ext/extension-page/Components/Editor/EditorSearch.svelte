<script>
	import { tick } from "svelte";
	import IconButton from "@shared/Components/IconButton.svelte";
	import iconArrowDown from "@shared/img/icon-arrow-down.svg?raw";
	import iconArrowUp from "@shared/img/icon-arrow-up.svg?raw";
	import iconClose from "@shared/img/icon-close.svg?raw";

	// determines whether or not search bar is shown
	export let active;
	// the codemirror instance
	export let instance;
	// passed from codemirror, called when close button on search bar clicked
	export let closeHandler = () => {};
	// bound to input element for focusing
	let inp;
	// bound to input value for feeding query and updating count
	let inputValue;

	// store the search overlay for later removal
	let searchOverlay = {};
	// array of selection ranges for query matches
	let ranges = [];
	// the currently selected range
	let rangesIndex = 0;
	// next/prev marks text, store those marks here for later removal
	const marks = [];

	// the search query
	$: query = inputValue ? inputValue.trim() : "";

	// focus input on show
	$: if (active) focusInput();
	// runs when search bar is hidden
	$: if (!active) {
		inputValue = undefined;
		instance.removeOverlay(searchOverlay);
		instance.focus();
		rangesIndex = 0;
		ranges = [];
		marks.forEach((marker) => marker.clear());
	}

	export async function focusInput() {
		await tick();
		inp.focus();
		// if text entered, highlight it on focus
		if (inp.value) inp.setSelectionRange(0, inp.value.length);
	}

	function keys(e) {
		if (e.key === "Escape") closeHandler();
		if (e.key === "Enter") next();
	}

	function highlightMatches() {
		const cm = instance;
		// set up regex pattern, replace certain characters
		const pattern = new RegExp(
			// query.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&"),\
			query.replace(/[-[\]/{}()*+?.\\^$|]/g, "\\$&"),
			"gi",
		);
		// if overlay already exists, remove if from codemirror
		if (searchOverlay) cm.removeOverlay(searchOverlay);
		if (query.length > 0) {
			// create the overlay
			searchOverlay = {
				token(stream) {
					pattern.lastIndex = stream.pos;
					const match = pattern.exec(stream.string);
					if (match && match.index === stream.pos) {
						stream.pos += match[0].length || 1;
						return "searching";
					} else if (match) {
						stream.pos = match.index;
					} else {
						stream.skipToEnd();
					}
				},
			};
			cm.addOverlay(searchOverlay);
		}
	}

	export function getMatches() {
		const cursor = instance.getSearchCursor(
			query,
			{ line: 0, ch: 0 },
			{ caseFold: true },
		);
		// reset ranges count on update
		ranges = [];
		rangesIndex = 0;
		marks.forEach((marker) => marker.clear());
		while (cursor.findNext()) {
			// push range to array
			ranges.push({ anchor: cursor.from(), head: cursor.to() });
		}
	}

	function next() {
		const cm = instance;
		let i = rangesIndex;
		if (ranges.length) {
			// at the end of the results, reset to top
			if (i === ranges.length) {
				i = 0;
				rangesIndex = 0;
			}
			cm.setSelection(ranges[i].anchor, ranges[i].head);
			cm.scrollIntoView({ from: ranges[i].anchor, to: ranges[i].head }, 20);
			// mark currently selected element
			marks.forEach((marker) => marker.clear());
			const m = cm.markText(ranges[i].anchor, ranges[i].head, {
				className: "cm-search-mark",
			});
			marks.push(m);
			// increment display index after getting data from array
			// display index is always +1 compared to index within array
			rangesIndex++;
		}
	}

	function previous() {
		// end of results is the first in the array
		const cm = instance;
		if (ranges.length) {
			if (rangesIndex === 0 || rangesIndex === 1) {
				rangesIndex = ranges.length;
			} else {
				--rangesIndex;
			}
			const i = rangesIndex - 1;
			cm.setSelection(ranges[i].anchor, ranges[i].head);
			cm.scrollIntoView({ from: ranges[i].anchor, to: ranges[i].head }, 20);
			// mark currently selected element
			marks.forEach((marker) => marker.clear());
			const m = cm.markText(ranges[i].anchor, ranges[i].head, {
				className: "cm-search-mark",
			});
			marks.push(m);
		}
	}
</script>

{#if active}
	<div class="editor__search">
		<input
			type="text"
			bind:this={inp}
			bind:value={inputValue}
			on:input={highlightMatches}
			on:input={getMatches}
			on:keydown={keys}
		/>
		<span>{rangesIndex}/{query ? ranges.length : "?"}</span>
		<IconButton icon={iconArrowDown} on:click={() => next()} />
		<IconButton icon={iconArrowUp} on:click={() => previous()} />
		<IconButton icon={iconClose} on:click={closeHandler} />
	</div>
{/if}

<style>
	.editor__search {
		align-items: center;
		border: 1px solid var(--border-color);
		background-color: var(--color-bg-theme);
		border-radius: var(--border-radius);
		box-shadow: var(--box-shadow);
		display: flex;
		padding: 0.25rem;
		position: absolute;
		right: 1.5rem;
		top: 0;
		z-index: 4;
	}

	input {
		border: none;
		color: var(--text-color-secondary);
		flex-grow: 1;
		font: var(--text-small);
		font-family: var(--editor-font);
		padding: 0.25rem;
	}

	span {
		color: var(--text-color-disabled);
		flex-shrink: 0;
		font: var(--text-small);
		font-family: var(--editor-font);
		margin: 0 0.5rem;
		min-width: 2.25em;
	}

	:global(.editor__search button) {
		flex-shrink: 0;
	}

	:global(div.editor__search button svg) {
		width: 45%;
	}
</style>
