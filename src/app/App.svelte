<script>
    import icon from "./img/icon.png";
    import logo from "./img/logo.svg?raw";

    let version = "v0.0.0";
    let build = "(0)";
    let directory = "init";

    window.APP = {
        printVersion: (v, b) => {
            version = v;
            build = b;
        },
        printDirectory: d => {
            directory = d;
        }
    };

    function changeDirectory() {
        window.webkit?.messageHandlers.controller.postMessage("CHANGE_DIRECTORY");
    }
</script>

<main>
    <img class="icon" src={icon} alt="Userscripts App Icon" draggable="false">
    <div class="logo">
        {@html logo}
    <span>
        <span>{version}</span>
        <span>{build}</span>
    </span>
    </div>
    <p>You can turn on the Userscripts iOS Safari extension in Settings.
        <a href="https://github.com/quoid/userscripts#userscripts-safari">Read the docs.</a>
    </p>
    <button id="set_directory" on:click={changeDirectory}>
        Change Userscripts Directory
    </button>
    <div class="current">CURRENT DIRECTORY:</div>
    <div id="directory">{directory}</div>
</main>

<style>
    main {
        align-items: center;
        display: flex;
        flex-direction: column;
        height: 100%;
        justify-content: center;
        padding: 0 1rem;
        text-align: center;
        -webkit-touch-callout: none;
        user-select: none;
    }

    a {
        color: var(--color-blue);
    }

    .icon {
        height: 8.0rem;
        width: 8.0rem;
    }

    .logo {
        align-items: flex-end;
        display: flex;
        margin: 1rem 0;
    }

    .logo :global(svg) {
        height: 1.5rem;
    }

    .logo > span {
        text-align: left;
        min-width: 3.5rem;
        margin-left: 0.5rem;
    }

    .logo span,
    .current {
        color: var(--text-color-disabled);
        font: var(--text-small);
        font-weight: bold;
        letter-spacing: var(--letter-spacing-small);
    }

    button {
        background-color: var(--color-blue);
        border: none;
        border-radius: var(--border-radius);
        color: var(--color-bg-secondary);
        font: var(--text-default);
        font-weight: 500;
        letter-spacing: var(--letter-spacing-default);
        margin: 2rem 0 1rem;
        padding: 0.5rem 1rem;
    }

    button:active {
        background-color: #6296c7;
    }

    #directory {
        color: var(--editor-default);
        font-family: var(--editor-font);
        font-size: 0.875rem;
        font-weight: 400;
        word-break: break-all;
        min-height: 7rem;
        max-height: 10rem;
    }
</style>
