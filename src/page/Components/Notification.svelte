<script>
    // inspired by https://github.com/zerodevx/svelte-toast
    import {fade, fly} from "svelte/transition";
    import IconButton from "../../shared/Components/IconButton.svelte";
    import iconClose from "../../shared/img/icon-close.svg";
    import iconError from "../../shared/img/icon-error.svg";
    import iconInfo from "../../shared/img/icon-info.svg";
    import iconWarn from "../../shared/img/icon-warn.svg";

    export let item;

    const icon = item.type === "error" ? iconError : item.type === "info" ? iconInfo : iconWarn;
</script>
<style>
    li {
        align-items: center;
        background-color: var(--color-black);
        border: 1px solid black;
        border-radius: var(--border-radius);
        box-shadow: var(--box-shadow);
        color: var(--text-color-secondary);
        display: flex;
        font: var(--text-medium);
        margin-bottom: 0.5rem;
        padding: 0.5rem 1rem;
    }

    div {
        align-items: center;
        display: flex;
        flex-shrink: 0;
        height: 1.5rem;
        justify-content: center;
        width: 1.5rem;
    }

    .error div {
        color: var(--color-red);
    }

    .info div {
        color: var(--color-blue);
    }

    .warn div {
        color: var(--color-yellow);
    }

    :global(div svg) {
        fill: currentColor;
        height: auto;
        pointer-events: none;
        width: 66.7%;
    }

    li:last-child {
        margin-bottom: 0;
    }

    span {
        flex-grow: 1;
        margin: 0 1rem 0 0.25rem;
    }

    li :global(button) {
        flex-shrink: 0;
        width: 1rem;
    }
</style>

<li
    class:error={item.type === "error"}
    class:info={item.type === "info"}
    class:warn={item.type === "warn"}
    in:fly={{y: 24, duration: 150}}
    out:fade={{duration: 150}}
>
    <div>{@html icon}</div>
    <span>{item.message}</span>
    <IconButton icon={iconClose} on:click/>
</li>
