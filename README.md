# Userscripts for Safari

A simple, open-source, userscript editor for Safari.

![Userscripts for Safari](/etc/screenshot-large.png)

## Installation

With the changes to Safari 12 and  .safariextz-style extensions, the only way to install this extension is through the [Safari Extension Gallery](https://safari-extensions.apple.com) (this link will be updated once the extension is live on the gallery).

## Usage

Using the extension is simple. You can open the editor by clicking on the the toolbar button. Any code you write will be injected into every website you visit.

Here are some usage notes:

- `cmd + s` to save changes to the editor
- hinting is automatic, you can use the shortcut `ctrl + spacebar` to toggle hinting manually
- your code is saved into `localStorage` of the extension, if you clear the `localStorage` of your browser, you will remove your saved code
- you can click the download icon to save your script file locally

## Why?

With the depreciation of `.safariextz` style extension in Safari 12, I wanted a way to quickly and easily create some "quality of life" userscripts. Since it's no longer possible to create and sign, even personal, `.safariextz` extensions, I needed a new way to dynamically create userscripts.

There are other userscripts editors/managers for other browsers, and even good ones for Safari, but I wanted something very simple and *open-source*.

## License 

[GNU General Public License v3.0](/LICENSE)



