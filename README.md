# Userscripts Safari

An open-source userscript editor for Safari

![Userscripts Safari](/etc/screenshot.png)

## Table of Contents

- [Installation](#installation)
- [Usage](#usage)
- [UI Overview](#ui-overview)
  - [Browser Page](#browser-page)
  - [Settings Modal](#settings-modal)
  - [Popover](#popover)
- [Metadata](#metadata)
- [API](#api)
- [Scripts Directory / Save Location](#scripts-directory)
- [Getting Help](#getting-help)
- [FAQs](#faqs)
- [Contributing](#contributing)
- [Support](#support)
- [Privacy Policy](#privacy-policy)
- [License](#license)

## Installation

Userscripts is available for iOS (+ipadOS) and macOS. For all versions, installation is done through [Apple's App Store](https://itunes.apple.com/us/app/userscripts/id1463298887). On macOS, versions prior to `4.x` were made available to download and install directly from the repository, but due to [changes in the way Apple allows developers to distribute apps built with the WebExtension API](https://github.com/quoid/userscripts/issues/154), that is no longer an option.

To run Userscripts on iOS you should be on iOS 15.1 or higher.

To run Userscripts on macOS you should running macOS 12 or higher, along with Safari 14.1 or higher.

**[App Store Link](https://itunes.apple.com/us/app/userscripts/id1463298887)**

**[Development Progress](https://github.com/quoid/userscripts/projects/3)**

## Usage

It's recommend to read this documentation and, if you have time, watch the following video overviews to familiarize yourself with the app and extension.

Once the app is downloaded and installed the following steps should be taken:

**iOS**

- Go to `Settings > Safari > Extensions > Userscripts`
- Turn Userscripts `on`
- For optimal experience it's recommended that you allow Userscripts for `All Websites`
- Once the above is complete **open the containing app**
- Click the "Set Userscripts Directory" button and select the directory, _within the Files.app_, where your userscripts are located and where you wish newly installed userscripts to be placed
  - **Tip:** for optimal cross platform experience it's a good idea to use an iCloud folder for syncing between macOS and iOS
  - **Note:** syncing between macOS and iOS is not immediate, it is sometimes necessary to open Files.app in order to applying changes made in macOS to be reflected in iOS - that includes userscript deletions, additions and edits
- Once the directory is set you can close the containing app and open Safari.app
- It **may be necessary** to apply further permissions and it's to `Always Allow` Userscripts for `All Websites`

**macOS**

After installing Userscripts on macOS, you **do not** need to select a userscripts directory if you do not plan on syncing your userscripts between multiple devices. Instead you can choose to use the default directory, which is located at `~/User/Library/Containers/Userscripts/Data/Documents/scripts` - again, this is default (and automatic) behavior. You only need to select a new location if you want to store your userscripts elsewhere, which is especially useful if you are using an external code editor such as Sublime Text or VSCode.

[**Here's a short clip showing how to easily create/add a userscript in Safari using this extension on macOS**](https://youtu.be/x1r3-L7pdYQ?t=14)

## UI Overview

### Browser Page:

![Userscripts Safari Main Application Window](/etc/ui01.png)

1. **Extension button** - click this button to open the extension interface
1. **Filter bar** - use this input to filter items in the sidebar, by _name_
1. **Sort button** - changes the order of the items in the sidebar by name or modified time
1. **Sidebar buttons** - _described left to right_
   - The `settings` button (represented by a [cog](https://wikipedia.org/wiki/Gear)) displays the settings modal (discussed below)
   - The `plus` button allows users to add new items
     - `New CSS` is a "userscript" that expects [CSS](https://www.w3schools.com/css/) code
     - `New Javascript` is a prototypical userscript that expects [Javascript](https://www.w3schools.com/js/DEFAULT.asp) code
     - `New Remote` allows the user to add a remote hosted userscript (or style) by inputting the web address (_ex:_ `https://www.k21p.com/example.user.js`)
1. **Item toggle** - this toggle enables or disables an item
1. **Item** - this is the userscript (or style), clicking on it will load it's contents into the editor - _you can hide descriptions in the settings area!_
1. **Editor buttons (top)** - _described left to right_
   - **Update button** - this button allows you to update userscripts that meet the following conditions
     - metadata contains `@version` tag
     - metadata contains `@updateURL` tag
   - **Download button** - click this button to download a copy of your userscript
     - _Note:_ every userscript that is displayed in the interface is already present on your local machine, at your save location - the download button offers a quick way to retrieve a copy of that file, without needing to click the settings button, and then the save location link within the settings modal
   - **Trash button** - moves the currently loaded userscript to the trash bin - it will subsequently be removed from the interface and save location
1. **Editor buttons (bottom)**
   - `Discard` - while editing, reverts any unsaved changes you've made to a userscript
   - `Save` - while editing, saves all changes you've made to a userscript
     - `Command + S` is the keyboard shortcut for the action

### Settings Modal:

![Userscripts Safari Settings Window](/etc/settings.png)

- **Auto Close Brackets** - toggles on/off auto closing of brackets in the editor
  - this affects the following characters: `() [] {} "" ''`
- **Auto Hint** - automatically shows completion hints while editing
- **Hide Descriptions** - hides the item descriptions in the sidebar
- **Show Invisibles** - toggles the display of invisible characters in the editor
- **Javascript Linter** - toggles basic Javascript linting within the editor
- **Tab Size** - the number of spaces a tab is equal to while editing, obviously defaults to `4` because using `2` spaces is absolute insanity
- **Enable Injection** - toggle on/off script injection for the pages you visit (this is the on/off switch)
- **Show Toolbar Count** - displays a badge on the toolbar icon with a number that represents how many enabled scripts match the url for the page you are on
- **Save Location** - where your file are currently located and being saved to (click the blue text to open location)
- **Change Save Location (cogs icon)** - this button, located directly to the right of the save location, is a shortcut for opening the host app, which will allow you to change the save location
- **Global Blacklist** - this input accepts a comma separated list of [`@match` patterns](https://developer.chrome.com/docs/extensions/mv3/match_patterns/), a page url that matches against a pattern in this list will be ignored for script injection

### Popup:

<!-- ![Userscripts Popup](/etc/popover.png)-->

<img src="/etc/popover.png" width="50%" height="50%">

10. **Open Page Link** - _macOS only_, opens the extension browser page
11. **Enable Injection toggle** - turns on/off page script injection (on/off switch)
12. **Refresh View** - refreshes the popup view
13. **Available Updates View** - the extension periodically checks all userscripts in your save location for updates and when an update is found, it is shown in this view
14. **Folder Button** - on **macOS** this button opens your save location directory in Finder, on **iOS** this button displays the "all scripts view" where you can see every script that found in your save location directory, the "all scripts view" allows you to toggle individual userscript scripts on/off regardless of the current page being displayed in the browser
15. **Install Prompt** - when a userscript is displayed in the browser, this alert displays, giving the user the option to install the userscript into their save location directory, tapping the prompt will take them through the installation steps
16. **Matched Userscripts List** - this list shows the currently matched userscripts relative to the current page being displayed in the browser, all userscripts that match to the domain will be showed, whether they are active or not. Users can click/tap the userscript to the toggle them on/off. If a userscript is active for the domain through a subframe a **sub** tag will be show next the to the file type indicator

## Metadata

Userscripts Safari currently supports the following userscript metadata:

- `@name` - This will be the name that displays in the sidebar and be used as the filename - you can _not_ use the same name for multiple files of the same type
- `@description`- Use this to describe what your userscript does - this will be displayed in the sidebar - there is a setting to hide descriptions
- `@icon` - This doesn't have a function with this userscript manager, but the **first value** provided in the metadata will be accessible in the `GM_/GM.info` object
- `@match` - Domain match patterns - you can use several instances of this field if you'd like multiple domain matches - view [this article for more information on constructing patterns](https://developer.chrome.com/extensions/match_patterns)
  - **Note:** this extension only supports `http/s`
- `@exclude-match` - Domain patterns where you do _not_ want the script to run
- `@include` - Used to match against urls for injection, globs and regular expressions are allowed, [read more here](https://wiki.greasespot.net/Include_and_exclude_rules)
- `@exclude` - Functions in a similar way as `@include` but rather than injecting, a match against this key's value will prevent injection
- `@inject-into` - allows the user to choose which context to inject the script into
  - allows the user to choose which context to inject the script into
  - values: `auto` (default), `content`, `page`
    - `GM` apis are only available when using `content`
  - works like [violentmonkey](https://violentmonkey.github.io/api/metadata-block/#inject-into)
- `@run-at`
  - allows the user to choose the injection timing
  - document-start, document-end (default), document-idle
  - works like [violentmonkey](https://violentmonkey.github.io/api/metadata-block/#run-at)
  - **JS Only**
- `@weight`
  - allows the user to further adjust script injection timing
  - can be used to ensure one script injects before another
  - ONLY accepts integers (floats, strings and everything else will be ignored)
  - min value = 1, max value = 999, higher numbers (“heavier”) execute earlier
- `@require`
  - allows users to include remote resources in their scripts
  - the value must be a valid url, currently no local file support
  - must require a resource of the same file type (JS for JS, CSS for CSS)
  - when a resource is required, it is downloaded and saved locally
  - the resources is downloaded once at save and never checked for updates or parsed in anyway
    - if you want to update the require resources, and the url does not change, you must remove the resources, save, then re-input it
  - **require remote resources at your own risk, the extension never validates remote resource code in any way and be aware that using remote resources from untrusted sources can jeopardize your personal security**
- `@version`
  - used to determine the current version of a userscript
  - when paired with `@updateURL`, this will allow the user to update a userscript from a remote source, if the version on their machine is `<` version at the update URL
  - `@version` does nothing by itself, it needs to be paired with` @updateURL` for remote updating to function properly
- `@updateURL`
  - the remote url to check version against
  - if the version of the file located at the update URL is `>` the version on the local machine, the file will be updated
  - `@updateURL` does nothing by itself, it needs to be paired with `@version` for remote updating to function properly
- `@downloadURL`
  - optional download location for a remotely updateable file (\*i.e. a file that has both `@version` and `@updateURL`)
  - when paired with `@version` and `@updateURL`, if the local version is `<` the version of the file that `@updateURL` points to, the extension will attempt to update the file's code with the contents of the file located at the `@downloadURL`
  - `@downloadURL` does nothing by itself, it needs `@version` and `@updateURL` to present in order to function properly
- `@noframes`
  - this key takes no value
  - prevents code from being injected into nested frames
- `@grant`
  - Imperative controls which special [`APIs`](#api) (if any) your script uses, one on each `@grant` line, only those API methods will be provided.
  - If no `@grant` values are provided, `none` will be assumed.
  - If you specify `none` and something else, `none` takes precedence.

**All userscripts need at least 1 `@match` or `@include` to run!**

## API

Userscripts currently supports the following api methods. All methods are asynchronous unless otherwise noted. Users must `@grant` these methods in order to use them in a userscript. When using API methods, it's only possible to inject into the content script scope due to security concerns.

For API type definitions, please refer to: [`types.d.ts`](https://github.com/userscriptsup/testscripts/blob/363b322208a6733c7e5f4b9d9705957889af6837/userscripts/types.d.ts)

- `GM.addStyle(css)`
  - `css: String`
  - returns a [`Promise`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise), resolved if succeeds, rejected with error message if fails
- `GM.setValue(key, value)`
  - `key: String`
  - `value: Any` - any can be JSON-serialized
  - returns a [`Promise`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise), resolved if succeeds, rejected with error message if fails
- `GM.getValue(key, defaultValue)`
  - `key: String`
  - `defaultValue: Any` - optional
  - returns a [`Promise`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise), resolved with the `value` that was set or `defaultValue` provided or `undefined` if succeeds, rejected with error message if fails
- `GM.deleteValue(key)`
  - `key: String`
  - returns a [`Promise`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise), resolved if succeeds, rejected with error message if fails
- `GM.listValues()`
  - returns a [`Promise`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise), resolved with an array of the key names of **presently set** values if succeeds, rejected with error message if fails
- `GM.getTab()`
  - returns a [`Promise`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise), resolved with `Any` data that is persistent as long as this tab is open if succeeds, rejected with error message if fails
- `GM.saveTab(tabObj)`
  - `tabObj: Any` - any can be JSON-serialized
  - returns a [`Promise`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise), resolved if succeeds, rejected with error message if fails
- `GM.openInTab(url, openInBackground)`
  - `url: String`
  - `openInBackground: Bool` - optional, `false` by default
  - returns a [`Promise`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise), resolved with [tab data](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/Tab) for the tab just opened if succeeds, rejected with error message if fails
- `GM.closeTab(tabId)`
  - `tabId: Int` - optional, the `caller tab` by default
  - returns a [`Promise`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise), resolved if succeeds, rejected with error message if fails
- `GM.setClipboard(data, type)`
  - `data: String`
  - `type: String` - optional, `text/plain` by default
  - [read more here](https://developer.mozilla.org/en-US/docs/Web/API/ClipboardEvent/clipboardData)
  - returns a [`Promise`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise), resolved with a `Bool` value indicating succeeds or fails, rejected with error message if fails
- `GM.info` && `GM_info`
  - is available without needing to add it to `@grant`
  - an object containing information about the running userscript
    - `scriptHandler: String` - returns `Userscripts`
    - `version: String` - the version of Userscripts app
    - `scriptMetaStr: String` - the metablock for the currently running script
    - `script: Object` - contains data about the currently running script
      - `description: String`
      - `exclude-match: [String]`
      - `excludes: [String]`
      - `grant: [String]`
      - `includes: [String]`
      - `inject-into: String`
      - `matches: [String]`
      - `name: String`
      - `namespace: String`
      - `noframes: Bool`
      - `require: [String]`
      - `resources: [String]` - _currently not implemented_
      - `run-at: String`
      - `version: String` - _the userscript version value_
- `GM.xmlHttpRequest(details)`
  - `details: Object`
  - the `details` object accepts the following properties
    - `url: String` - required
    - `method: String` - optional, `GET` by default
    - `user: String` - optional
    - `password: String` - optional
    - `headers: Object` - optional
    - `overrideMimeTyp: String` - optional
    - `timeout: Int` - optional
    - `binary: Bool` - optional (Deprecated, use binary data objects such as `Blob`, `ArrayBuffer`, `TypedArray`, etc. instead.)
    - `data: String | Blob | ArrayBuffer | TypedArray | DataView | FormData | URLSearchParams` - optional
    - `responseType: String` - optional
    - refer to [`XMLHttpRequests`](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest)
  - event handlers:
    - `onabort: Function` - optional
    - `onerror: Function` - optional
    - `onload: Function` - optional
    - `onloadend: Function` - optional
    - `onloadstart: Function` - optional
    - `onprogress: Function` - optional
    - `onreadystatechange: Function` - optional
    - `ontimeout: Function` - optional
    - the response object passed to the event handlers has the following properties:
      - `readyState`
      - `response`
      - `responseHeaders`
      - `responseType`
      - `responseURL`
      - `status`
      - `statusText`
      - `timeout`
      - `responseText` (when `responseType` is `text`)
  - returns a custom [`Promise`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) contains an additional property `abort`, resolved with the response object.
    - usage:
      - `const xhr = GM.xmlHttpRequest({...});`
      - `xhr.abort();` to abort the request
      - `const response = await xhr;`
    - or just:
      - `const response = await GM.xmlHttpRequest({...});`
- `GM_xmlhttpRequest(details)`
  - Basically the same as `GM.xmlHttpRequest(details)`, except:
  - returns an object with a single property, `abort`, which is a `Function`
    - usage: `const foo = GM.xmlHttpRequest({...});` ... `foo.abort();` to abort the request

## Scripts Directory

This is the directory where the app/extension will read from and write to. This directory is changed by opening the **containing app** and clicking the respective "change location" button.

**Script Directory Notes**

- Close all instances of the extension UI (browser app and/or popup) before changing the scripts directory
- After files are added, removed or edited, you will need to open the popup at least 1 time to see those changes reflected in your browsing experience
- **On macOS**, after a directory outside of the default is selected, if you rename or move that selected directory, the extension will continue to read/write to that directory - the only way to remove the “link” is by trashing the folder or selecting a new save location

## Getting Help

If you encounter a problem while using this app/extension or are in need of some assistance, please open an issue here in the repository. When doing so, please provide as much detail as possible. This includes listing system specs and what website and script you are trying to execute. _Please follow the issue template!_

## FAQs

**"Refused to execute a script" error(s), what should I do!?**

> You are seeing this error because of the website's [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP). Currently there is no way to allow extension content scripts to bypass CSPs in Safari.
>
> Automatically, the extension will attempt to circumvent strict CSPs, but if you are still experiencing issues, trying setting the userscript metadata key/val `// @inject-into auto` or `// @inject-into content`.
>
> You can read more about this in [this issue](https://github.com/quoid/userscripts/issues/106#issuecomment-797320450).

**Do I need to use the extension's editor to create new userscripts or to edit existing?**

> You can use your own editor to update and manage your files. As long as you are saving the files to the save location, and they are properly formatted, they should be injected. However, you **must open the extension popup** beforehand. That means, if you create a new or edit an existing userscript with an external editor and save it to the save location, before injection will occur properly, the extension popup must be opened and the popup must load completely.

**What are the keyboard shortcuts?**

> Whilst using the included editor, clicking `⌘ + s` will save the file. While working the editor, clicking `⌘ + f` will bring up the search bar and `esc` will hide it.

**When I use `@require`, where are the required files stored?**

> All required files are saved _as Javascript files_ in the extension container folder in macOS 11.x. That folder is located in the default save location, at: `~/Library/Containers/Userscripts/Data/Documents/require/`.
>
> If you move files from the require folder or manually edit the `manifest.json` file, you will likely break app/extension functionality.

## Contributing

Code level contributions are welcome. _I prefer to collaborate directly with contributors rather than receiving spontaneous pull requests_. If you feel you can improve the project in some way, please reach out to me by email or by opening an issue with your improvement/feature request.

Further, any issue marked "help wanted" is actively seeking assistance. Please respond to those issues with feedback, guidance or offers of coding assistance.

Notes:

- use [semantic commit messages](https://gist.github.com/joshbuchea/6f47e86d2510bce28f8e7f42ae84c716)
- under most circumstances, you should fork the most current version of the `develop` branch for your contributions

**Please ensure your contributions align with the project's license before committing anything.**

## Support

The quickest and easiest way to support the project is by [leaving a positive review on the App Store](https://apps.apple.com/us/app/userscripts/id1463298887) if you enjoy the extension and want to see future improvements. Seeing these reviews let me know I am doing something right, or wrong, and motivates me to continue working on the project.

The second best way to help out is to sign up to beta test new versions of the app. Since this extension values your privacy, and **does not collect any data from users**, it is difficult to gauge how the extension is being used. By signing up to be a beta tester it not only allows you to test upcoming features, but also gives me the opportunity to elicit direct feedback from real users.

**[iOS Beta Sign Up Form](https://forms.gle/QB46uYQHVyCxULue9)**

**[macOS Beta Sign Up Form](https://forms.gle/cUDtKg1ip4Vc9Xhc7)**

## Privacy Policy

Userscripts does not collect any data from its users nor monitor activities or actions you perform within the application and extension. This means everything that you do with the application and extension is private to you and is never shared with the developers or third parties. Since there is no data collection, there is no data retention of any kind.

## License

Copyright (c) 2018-2023 Justin Wasack

Licensed under the [GNU General Public License v3.0](/LICENSE) license for all open source applications. A commercial license is required for all other applications.
