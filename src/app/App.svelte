<script>
	import icon from "./img/icon.png";
	import logo from "./img/logo.svg?raw";

	const baseUrl = "https://github.com/quoid/userscripts";

	let version = "v0.0.0";
	let build = "(0)";
	let directory = "init";

	window.APP = {
		show: () => {},
		printVersion: (v, b) => {
			version = v;
			build = b;
		},
		printDirectory: (d) => {
			directory = d;
		},
	};

	function changeDirectory() {
		window.webkit?.messageHandlers.controller.postMessage("CHANGE_DIRECTORY");
	}

	function openDirectory() {
		window.webkit?.messageHandlers.controller.postMessage("OPEN_DIRECTORY");
	}
</script>

<main>
	<div class="section icons">
		<img class="icon" src={icon} alt="Userscripts App Icon" draggable="false" />
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		<div class="logo">{@html logo}</div>
		<div class="version">
			{#if import.meta.env.GIT_TAG && import.meta.env.GIT_COMMIT}
				<a href="{baseUrl}/releases/tag/{import.meta.env.GIT_TAG}">
					{import.meta.env.GIT_TAG}
				</a>
				(<a href="{baseUrl}/commit/{import.meta.env.GIT_COMMIT}">
					{import.meta.env.GIT_COMMIT.slice(0, 7)}
				</a>)
			{:else}
				<span>{version}</span>
				<span>{build}</span>
			{/if}
		</div>
	</div>
	<div class="section guide">
		<p>
			You can turn on the Userscripts iOS Safari extension in Settings or
			Safari, then use the extension in Safari. Please refer to the "Usage"
			section in the
			<a
				href="{baseUrl}/blob/{import.meta.env.GIT_TAG ??
					'main'}/README.md#usage">README of this version</a
			>.
		</p>
	</div>
	<div class="section action">
		<button id="changedir" on:click={changeDirectory}>
			Change Userscripts Directory
		</button>
		<div class="current">CURRENT DIRECTORY:</div>
		<button id="directory" class="link" on:click={openDirectory}>
			{directory}
		</button>
	</div>
	<div class="section footer">
		<div class="links">
			<a href="{baseUrl}/blob/{import.meta.env.GIT_TAG ?? 'main'}/README.md"
				>Documentation</a
			>
			<a href="{baseUrl}/discussions">Discussions</a>
			<a href="{baseUrl}/issues">Report an Issue</a>
			<a href="{baseUrl}#privacy-policy">Privacy Policy</a>
		</div>
	</div>
</main>

<style>
	main {
		display: flex;
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
	}

	.section {
		display: flex;
		place-items: center;
		flex-direction: column;
		gap: min(0.5rem, 16px);
	}

	.section.icons,
	.section.footer {
		flex: 1;
		place-content: flex-end;
	}

	.section.footer .links {
		display: flex;
		flex-flow: row wrap;
		place-content: center;
		gap: min(0.5rem, 16px);
	}

	a {
		color: var(--color-blue);
	}

	.icon {
		height: min(8rem, 256px);
		width: min(8rem, 256px);
	}

	.logo :global(svg) {
		display: flex;
		height: min(1.5rem, 32px);
	}

	.links,
	.version,
	.current {
		color: var(--text-color-disabled);
		font: var(--text-small);
		font-weight: bold;
		letter-spacing: var(--letter-spacing-small);
	}

	button#changedir {
		background-color: var(--color-blue);
		border: none;
		border-radius: var(--border-radius);
		color: var(--color-bg-secondary);
		font: var(--text-default);
		font-weight: 500;
		letter-spacing: var(--letter-spacing-default);
		padding: 0.5rem 1rem;
	}

	button#changedir:active {
		background-color: #6296c7;
	}

	button#directory {
		color: var(--editor-default);
		font-family: var(--editor-font);
		font-size: 0.875rem;
		font-weight: 400;
		word-break: break-all;
		text-decoration: none;
	}
</style>
