<script>
    export let color = "currentColor";
    export let disabled = false;
    export let icon;
    export let title = undefined;
</script>

<style>
    button {
        align-items: center;
        background-color: transparent;
        color: inherit;
        cursor: pointer;
        display: flex;
        height: 1.5rem;
        justify-content: center;
        opacity: 0.75;
        overflow: visible;
        width: 1.5rem;
    }

    button:hover {
        opacity: 1;
    }

    button:disabled {
        opacity: var(--opacity-disabled);
        pointer-events: none;
    }

    button :global(svg) {
        fill: var(--svg-fill);
        height: auto;
        pointer-events: none; /* prevent svg from triggering click events */
        width: 66.7%;
    }

</style>

<button on:click {disabled} style="--svg-fill: {color};" {title}>
    {@html icon}
</button>
