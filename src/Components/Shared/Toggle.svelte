<script>
    import iconLoader from "../../img/icon-loader.svg";

    export let checked = false;
</script>

<style>
    label {
        --switch-timing: 150ms 75ms;

        cursor: pointer;
        display: block;
        font-size: 1rem;
        height: 1em;
        min-width: 1.75em;
        position: relative;
        user-select: none;
        width: 1.75em;
    }

    input[type=checkbox] {
        display: block;
        position: absolute;
        visibility: hidden;
    }

    span {
        background-color: var(--color-black);
        border-radius: 0.625em;
        display: block;
        height: 100%;
        pointer-events: none;
        transition: background-color 100ms 75ms;
        width: 100%;
    }

    span::before {
        background-color: white;
        border-radius: 50%;
        content: "";
        height: 0.75em;
        left: 0.125em;
        position: absolute;
        top: 0.125em;
        transition: left 175ms ease-in;
        width: 0.75em;
    }

    input:checked + span {
        background-color: var(--color-blue);
    }

    input:checked + span::before {
        left: calc(100% - (0.75em + 0.125em)); /* minus el width + left */
    }

    :global(label svg) {
        display: none;
        height: 1em;
        position: absolute;
        right: 0;
        top: 0;
        width: 1em;
    }

    input:disabled + span {
        opacity: 0;
    }

    :global(input:disabled + span + svg) {
        display: block;
    }
</style>

<!-- prevent toggle label clicks from triggering parent element on:click -->
<label on:click|stopPropagation={() => {}}>
    <input type="checkbox" on:click|stopPropagation bind:checked={checked}>
    <span></span>
    {@html iconLoader}
</label>
