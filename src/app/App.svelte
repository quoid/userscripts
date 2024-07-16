<script>
	import icon from "./img/icon.png";
	import logo from "./img/logo.svg?raw";

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
	<img class="icon" src={icon} alt="Userscripts App Icon" draggable="false" />
	<div class="logo">
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		{@html logo}
	</div>
	<div class="version">
		{#if import.meta.env.GIT_TAG && import.meta.env.GIT_COMMIT}
			<a
				href="https://github.com/quoid/userscripts/releases/tag/{import.meta.env
					.GIT_TAG}"
			>
				{import.meta.env.GIT_TAG}
			</a>
			(<a
				href="https://github.com/quoid/userscripts/commit/{import.meta.env
					.GIT_COMMIT}"
			>
				{import.meta.env.GIT_COMMIT.slice(0, 7)}
			</a>)
		{:else}
			<span>{version}</span>
			<span>{build}</span>
		{/if}
	</div>
	<br />
	<p>
		You can turn on the Userscripts iOS Safari extension in Settings or Safari,
		then use the extension in Safari. Please refer to the "Usage" section in the
		<a
			href="https://github.com/quoid/userscripts/blob/{import.meta.env
				.GIT_TAG ?? 'main'}/README.md#usage">README of this version</a
		>.
	</p>
	<button id="change-directory" on:click={changeDirectory}>
		Change Userscripts Directory
	</button>
	<div class="current">CURRENT DIRECTORY:</div>
	<div id="directory">
		<button class="link" on:click={openDirectory}>{directory}</button>
	</div>
	<div class="footer">
		<a
			href="https://github.com/quoid/userscripts/blob/{import.meta.env
				.GIT_TAG ?? 'main'}/README.md">Documentation</a
		>
		|
		<a href="https://github.com/quoid/userscripts/discussions">Discussions</a>
		|
		<a href="https://github.com/quoid/userscripts/issues">Report an Issue</a>
		|
		<a href="https://github.com/quoid/userscripts#privacy-policy"
			>Privacy Policy</a
		>
	</div>
</main>

<style>
	main {
		align-items: center;
		display: flex;
		flex-direction: column;
		height: 100%;
		justify-content: center;
		padding: 16px;
		text-align: center;
		-webkit-touch-callout: none;
		user-select: none;
	}

	a {
		color: var(--color-blue);
	}

	.icon {
		margin-top: 80px;
		height: min(8rem, 256px);
		width: min(8rem, 256px);
	}

	.logo {
		align-items: flex-end;
		display: flex;
		margin: min(1rem, 32px) 0;
	}

	.logo :global(svg) {
		height: min(1.5rem, 32px);
	}

	.footer,
	.version,
	.current {
		color: var(--text-color-disabled);
		font: var(--text-small);
		font-weight: bold;
		letter-spacing: var(--letter-spacing-small);
	}

	button#change-directory {
		background-color: var(--color-blue);
		border: none;
		border-radius: var(--border-radius);
		color: var(--color-bg-secondary);
		font: var(--text-default);
		font-weight: 500;
		letter-spacing: var(--letter-spacing-default);
		margin: 2rem 0;
		padding: 0.5rem 1rem;
	}

	button#change-directory:active {
		background-color: #6296c7;
	}

	#directory {
		color: var(--editor-default);
		font-family: var(--editor-font);
		font-size: 0.875rem;
		font-weight: 400;
		word-break: break-all;
	}

	#directory button {
		color: inherit;
		text-decoration: none;
	}

	.footer {
		margin-top: 80px;
	}
</style>
