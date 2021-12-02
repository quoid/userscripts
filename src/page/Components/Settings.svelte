<script>
    import {fade, fly} from "svelte/transition";
    import {settings, state} from "../store.js";
    import IconButton from "../../shared/Components/IconButton.svelte";
    import Toggle from "../../shared/Components/Toggle.svelte";
    import iconLoader from "../../shared/img/icon-loader.svg";
    import iconClose from "../../shared/img/icon-close.svg";
    import iconEdit from "../../shared/img/icon-edit.svg";

    // bound to blacklist textarea element, to easily get value when saving
    let blacklist;
    // indicates that a blacklist save has initiated
    let blacklistSaving = false;

    // the saved blacklisted domain patterns
    $: blacklisted = $settings.blacklist.join(", ");

    function saveBlacklist() {
        // get the comma separated values from blacklist input
        const val = blacklist.value.split(",").map(item => item.trim()).filter(n => n);

        // compare blacklist input to saved blacklist
        if ([...val].sort().toString() != [...$settings.blacklist].sort().toString()) {
            settings.updateSingleSetting("blacklist", val);
            // when blacklistSaving, visual indication of saving occurs on element
            // the visual save indication is mostly ux only indicates a setting save was attempted
            // remove visual indication arbitrarily
            blacklistSaving = true;
            setTimeout(() => blacklistSaving = false, 1000);
        }
    }

    // updates the individual setting in the settings store
    function update(name, value) {
        settings.updateSingleSetting(name, value);
    }

    // called when the user clicks the link to the save location
    function openSaveLocation() {
        browser.runtime.sendNativeMessage({name: "OPEN_SAVE_LOCATION"});
    }

    // called when the user clicks the icon next to the save location link
    async function changeSaveLocation() {
        const m = "Changing the save location requires all instances of the extension to be closed and the host application to be opened. This will be automatically attempted.\n\nDo you wish to continue?";
        if (!confirm(m)) return;
        window.open("userscriptsurlscheme://changesavelocation");
        // close all open extension pages
        const url = browser.runtime.getURL("page.html");
        const close = [];
        const tabs =  await browser.tabs.query({});
        tabs.forEach(tab => tab.url === url && close.push(tab.id));
        if (close.length > 0) browser.tabs.remove(close);
    }
</script>
<style>
    .settings {
        align-items: center;
        backdrop-filter: blur(3px);
        -webkit-backdrop-filter: blur(3px);
        background-color: rgba(0, 0, 0, 0.45);
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

    .modal {
        background-color: var(--color-bg-secondary);
        border-radius: var(--border-radius);
        box-shadow: var(--box-shadow);
        max-height: 90%;
        overflow-y: auto;
        width: 32rem;
    }

    .modal__title {
        align-items: center;
        border-bottom: 1px solid var(--color-black);
        color: var(--text-color-primary);
        display: flex;
        font: var(--text-default);
        font-weight: 500;
        letter-spacing: var(--letter-spacing-default);
        padding: 1rem 1rem calc(1rem - 1px) 1rem;
    }

    .modal__title div {
        flex-grow: 1;
    }

    .modal__row {
        align-items: center;
        border-bottom: 1px solid var(--color-black);
        display: flex;
        padding: 1rem 1rem 1rem 0;
        margin-left: 1rem;
    }

    .modal__row:last-child {
        padding: 1rem;
        margin-left: 0;
    }

    .modal__row--wrap {
        flex-wrap: wrap;
    }

    .modal__row div {
        flex-grow: 1;
    }

    .modal__row div.red {
        color: var(--color-red);
    }

    .saveLocation > div:nth-child(1) {
        flex-grow: 0;
    }

    .saveLocation > div:nth-child(2) {
        color: var(--color-blue);
        cursor: pointer;
        font-weight: normal;
        margin-left: auto;
        max-width: 65%;
        padding-right: 0.5rem;
        text-align: right;
        text-decoration: underline;
    }

    .blacklist {
        align-items: center;
        display: flex;
    }

    .blacklist:disabled {
        opacity: var(--opacity-disabled);
    }

    .blacklist :global(svg) {
        height: 0.75rem;
        margin-left: 0.5rem;
        width: 0.75rem;
    }

    textarea {
        background-color: var(--color-black);
        border: none;
        border-radius: var(--border-radius);
        color: inherit;
        font: var(--text-small);
        font-family: var(--editor-font);
        margin-top: 0.5rem;
        min-height: 4rem;
        opacity: 0.75;
        padding: 0.5rem;
        width: 100%;
    }

    textarea:focus {
        opacity: 1;
    }

    p {
        padding: 1rem;
    }
</style>

<div
    class="settings"
    on:click|self={() => {state.remove("settings")}}
    in:fade={{duration: 150}}
    out:fade={{duration: 150, delay: 75}}
>
    <div
        class="modal"
        in:fly={{y: 50, duration: 150, delay: 75}}
        out:fly={{y: 50, duration: 150, delay: 0}}
    >
        <div class="modal__section">
            <div class="modal__title">
                <div>Editor Settings</div>
                <IconButton icon={iconClose} on:click={() => state.remove("settings")}/>
            </div>
            <div class="modal__row">
                <div>Auto Close Brackets</div>
                <Toggle
                    checked={$settings.autoCloseBrackets}
                    on:click={() => update("autoCloseBrackets", !$settings.autoCloseBrackets)}
                />
            </div>
            <div class="modal__row">
                <div>Auto Hint</div>
                <Toggle
                    checked={$settings.autoHint}
                    on:click={() => update("autoHint", !$settings.autoHint)}
                />
            </div>
            <div class="modal__row">
                <div>Hide Descriptions</div>
                <Toggle
                    checked={!$settings.descriptions}
                    on:click={() => update("descriptions", !$settings.descriptions)}
                />
            </div>
            <div class="modal__row">
                <div>Javascript Linter</div>
                <Toggle
                    checked={$settings.lint}
                    on:click={() => update("lint", !$settings.lint)}
                />
            </div>
            <div class="modal__row">
                <div>Show Invisibles</div>
                <Toggle
                    checked={$settings.showInvisibles}
                    on:click={() => update("showInvisibles", !$settings.showInvisibles)}
                />
            </div>
            <div class="modal__row">
                <div>Tab Size</div>
                <select
                    bind:value="{$settings.tabSize}"
                    on:blur={() => update("tabSize", $settings.tabSize)}
                >
                    <option value="2">2</option>
                    <option value="4">4</option>
                </select>
            </div>
        </div>
        <div class="modal__section">
            <div class="modal__title">
                <div>General Settings</div>
            </div>
            <div class="modal__row">
                <div class:red={!$settings.active}>Enable Injection</div>
                <Toggle
                    checked={$settings.active}
                    on:click={() => update("active", !$settings.active)}
                />
            </div>
            <div class="modal__row">
                <div>Show Toolbar Count</div>
                <Toggle
                    checked={$settings.showCount}
                    on:click={() => update("showCount", !$settings.showCount)}
                />
            </div>
            <div class="modal__row saveLocation">
                <div>Save Location</div>
                <div
                    class="truncate"
                    on:click={openSaveLocation}
                >{$settings.saveLocation}</div>
                <IconButton
                    icon={iconEdit}
                    on:click={changeSaveLocation}
                    title={"Change save location"}
                />
            </div>
            <div class="modal__row modal__row--wrap">
                <div class="blacklist">
                    <span>Global Blacklist</span>
                    { #if blacklistSaving}{@html iconLoader}{/if}
                </div>
                <textarea
                    placeholder="Comma separated domain patterns"
                    spellcheck="false"
                    bind:this={blacklist}
                    value={blacklisted}
                    on:blur={saveBlacklist}
                    disabled={$state.includes("blacklist-saving") || blacklistSaving}
                ></textarea>
            </div>
        </div>
        <div class="modal__section">
            <div class="modal__title">Information</div>
            <p>Userscripts Safari Version {$settings.version}<br><br>You can review the documentation, report bugs and get more information about this extension by visiting <a href="https://github.com/quoid/userscripts">the code repository.</a><br><br>If you enjoy using this extension, please consider <a href="https://apps.apple.com/us/app/userscripts/id1463298887">leaving a review</a> on the App Store or <a href="https://github.com/quoid/userscripts#support-development">supporting the project</a>.
        </div>
    </div>
</div>
