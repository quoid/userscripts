<script>
	export let closeHandler;
	import { fade, fly } from "svelte/transition";
	import IconButton from "@shared/Components/IconButton.svelte";
	import iconClose from "@shared/img/icon-close.svg?raw";

	let nav = false;
	const navAnchors = new Map();

	/** @type {import('svelte/action').Action<HTMLElement, string>} */
	function navRegister(node, lang) {
		navAnchors.set(node, lang);
		nav = !!navAnchors.size;
		return {
			destroy() {
				navAnchors.delete(node);
				nav = !!navAnchors.size;
			},
		};
	}

	/** @param {HTMLElement} node */
	function navClick(node) {
		node.scrollIntoView({ behavior: "smooth" });
		if (!node.classList.contains("target_hint")) {
			node.classList.add("target_hint");
			setTimeout(() => node.classList.remove("target_hint"), 1000);
		}
	}
</script>

<div
	class="wrapper"
	in:fade={{ duration: 150 }}
	out:fade={{ duration: 150, delay: 75 }}
>
	<!-- This is just an auxiliary close method, no need to consider a11y -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="mask" on:click|self={closeHandler}></div>
	<div
		class="modal"
		in:fly={{ y: 50, duration: 150, delay: 75 }}
		out:fly={{ y: 50, duration: 150, delay: 0 }}
	>
		{#if nav}
			<nav>
				<ul>
					{#each navAnchors as [node, lang] (lang)}
						<li>
							<button on:click={() => navClick(node)}>
								{lang}
							</button>
						</li>
					{/each}
				</ul>
			</nav>
		{/if}
		<div class="close">
			<IconButton icon={iconClose} on:click={closeHandler} title="Close" />
		</div>
		<div class="scroll">
			<slot {navRegister} />
		</div>
	</div>
</div>

<style>
	.wrapper {
		align-items: center;
		backdrop-filter: blur(3px);
		-webkit-backdrop-filter: blur(3px);
		background-color: light-dark(rgb(0 0 0 / 0.15), rgb(0 0 0 / 0.45));
		color: var(--text-color-secondary);
		display: flex;
		font: var(--text-medium);
		height: 100%;
		letter-spacing: var(--letter-spacing-medium);
		justify-content: center;
		left: 0;
		position: absolute;
		top: 0;
		width: 100%;
		z-index: 90;
	}

	.mask {
		position: absolute;
		width: 100%;
		height: 100%;
	}

	.modal {
		background-color: var(--color-bg-secondary);
		border-radius: var(--border-radius);
		box-shadow: var(--box-shadow);
		width: 35rem;
		z-index: 99;
		position: relative;
	}

	.scroll {
		border-radius: var(--border-radius);
		max-height: calc(100svh - 5rem);
		overflow-y: auto;
		overscroll-behavior: none;
	}

	.close {
		position: absolute;
		right: -2rem;
		transform: translateX(100%);
		text-align: center;
	}

	.close :global(button) {
		width: 3.5rem;
		height: 3.5rem;
	}

	nav {
		position: absolute;
		left: -2rem;
		transform: translateX(-100%);
		text-align: right;
	}

	nav button {
		background: none;
		color: inherit;
		font: var(--text-large);
		font-weight: 700;
		opacity: 0.75;
		padding: 1rem 0.5rem;
	}

	nav button:hover {
		opacity: 1;
	}

	:global(.target_hint) {
		animation: highlight 1000ms ease-out;
	}

	@keyframes highlight {
		from {
			background-color: var(--text-color-disabled);
		}
	}
</style>
