<script>
    import {fade} from "svelte/transition";
    import iconLoader from "../../img/icon-loader.svg";
</script>

<style>
    div {
        align-items: center;
        background-color: inherit;
        display: flex;
        height: 100%;
        justify-content: center;
        left: 0;
        position: absolute;
        top: 0;
        width: 100%;
        z-index: 90;
    }

    div :global(svg) {
        height: 2rem;
        width: 2rem;
    }
</style>

<div out:fade="{{duration: 125}}">
    {@html iconLoader}
</div>
