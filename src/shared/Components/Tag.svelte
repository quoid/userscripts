<script>
    export let type = undefined;
</script>

<div class="script__tag {`script__tag--${type}`}"></div>

<style>
    .script__tag {
        background-color: transparent;
        border: 1px solid var(--color-red);
        border-radius: var(--border-radius);
        color: var(--color-red);
        font-size: 0.563rem;
        font-weight: 500;
        letter-spacing: 0.022rem;
        line-height: 0.75rem;
        margin-right: 0.5rem;
        max-height: 1rem;
        min-width: 2rem;
        padding: 0.063rem 0.25rem;
        text-align: center;
        text-transform: uppercase;
    }

    .script__tag::before {
        content: "???";
    }

    .script__tag--css {
        border-color: var(--color-green);
        color: var(--color-green);
    }

    .script__tag--css::before {
        content: "css";
    }

    .script__tag--js {
        border-color: var(--color-yellow);
        color: var(--color-yellow);
    }

    .script__tag--js::before {
        content: "js";
    }
</style>
