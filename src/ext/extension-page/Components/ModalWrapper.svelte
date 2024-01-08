<script>
	export let component;
	export let componentProps;
	export let closeHandler;
	import { fade, fly } from "svelte/transition";
	import IconButton from "../../shared/Components/IconButton.svelte";
	import iconClose from "../../shared/img/icon-close.svg?raw";
</script>

<div
	class="wrapper"
	in:fade={{ duration: 150 }}
	out:fade={{ duration: 150, delay: 75 }}
>
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div class="mask" on:click|self={closeHandler}></div>
	<div
		class="modal"
		in:fly={{ y: 50, duration: 150, delay: 75 }}
		out:fly={{ y: 50, duration: 150, delay: 0 }}
	>
		<div class="close">
			<IconButton
				icon={iconClose}
				on:click={closeHandler}
				title="Close settings"
			/>
		</div>
		<div class="scroll">
			<svelte:component this={component} {...componentProps} />
		</div>
	</div>
</div>

<style>
	.wrapper {
		align-items: center;
		backdrop-filter: blur(3px);
		-webkit-backdrop-filter: blur(3px);
		background-color: rgba(0 0 0 / 0.45);
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
		max-height: 90%;
		width: 35rem;
		z-index: 99;
		position: relative;
	}

	.scroll {
		height: stretch;
		overflow-y: auto;
		overscroll-behavior: none;
	}

	.close {
		position: absolute;
		right: -5rem;
		text-align: center;
	}

	.close :global(button) {
		width: 3.5rem;
		height: 3.5rem;
	}
</style>
