# Userscripts for Safari

A simple, open-source, userscript editor for Safari.

![Userscripts for Safari](/etc/screenshot.png)

## Installation

Install via [Mac App Store](https://itunes.apple.com/us/app/userscripts/id1463298887) or clone the project and build with Xcode.

## Usage

Using the extension is simple. You can open the editor by clicking on the the toolbar button. Any code you write will be injected into every website you visit.

Here are some usage notes:

- `cmd + s` to save changes to the editor
- hinting is automatic, you can use the shortcut `ctrl + spacebar` to toggle hinting manually
- your code is saved into `~/Library/Containers/com.userscripts.macos.Userscripts-Extension/Data/Documents/userscript.js`
    - this file can be edited with any code editor, however if the browser/extension is currently running, those changes won't be reflect in the include editor unless you reload the popover (right click `->` reload) - the changes **will** be injected whether or not you reload
- you can click the download icon to save your script file locally, without needing to navigate to this folder
    - *note*, you will not be able to download the script on a blank tab
- you can toggle script injection on and off by clicking the "power" icon

## Why?

With the depreciation of `.safariextz` style extension in Safari 12, I wanted a way to quickly and easily create some "quality of life" userscripts. Since it's no longer possible to create and sign, even personal, `.safariextz` extensions, I needed a new way to dynamically create userscripts.

There are other userscripts editors/managers for other browsers, and even good ones for Safari, but I wanted something very simple and *open-source*.

## Privacy Policy
Userscripts does not collect any data from its users nor monitor activities or actions you perform within the application and extension. This means everything that you do with the application and extension is private to you and is never shared with the developers or third parties. Since there is no data collection, there is no data retention of any kind.

## License 

[GNU General Public License v3.0](/LICENSE)



