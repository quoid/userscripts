<script>
    import Logo from "./assets/logo.png";
</script>

<main>
    <div>
        <a href="https://github.com/quoid/userscripts" target="_blank" rel="noreferrer">
            <img src={Logo} class="logo" alt="Logo" />
        </a>
    </div>
    <h1>Userscripts dev</h1>

    <p>
        <a href="/entry-app-webview.html" target="_blank" rel="noreferrer">native-app</a>,
        <a href="/entry-ext-action-popup.html" target="_blank" rel="noreferrer">action-popup</a>,
        <a href="/entry-ext-extension-page.html" target="_blank" rel="noreferrer">extension-page</a>
    </p>

    <p class="read-the-docs">
        This is the development preview environment
    </p>
</main>

<style>
    .logo {
        height: 6em;
        padding: 1.5em;
        will-change: filter;
    }

    .logo:hover {
        filter: drop-shadow(0 0 2em #646cffaa);
    }

    .read-the-docs {
        color: #888;
    }
</style>
