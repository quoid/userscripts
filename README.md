# Userscripts Safari

An open-source userscript editor for Safari.

![Userscripts Safari](/etc/screenshot.png)

## Installation

Install via [Mac App Store](https://itunes.apple.com/us/app/userscripts/id1463298887) or clone the project and build with Xcode.

## Usage

**Requires Safari 13+**

**UI Overview**

![Userscripts Safari](/etc/ui01.png)

1. **Extension button** - click this button to open the extension interface
1. **Filter bar** - use this input to filter items in the sidebar, by *name*
1. **Sort button** - changes the order of the items in the sidebar by name or modified time
1. **Sidebar buttons** - *described left to right*
    - The `settings` button (represented by a [cog](https://wikipedia.org/wiki/Gear)) displays the settings modal (discussed below)
    - The `plus` button allows users to add new items
        - `New CSS` is a "userscript" that expects [CSS](https://www.w3schools.com/css/) code
        - `New Javascript` is a prototypical userscript that expects [Javascript](https://www.w3schools.com/js/DEFAULT.asp) code
        - `New Remote` allows the user to add a remote hosted userscript (or style) by inputting the web address (*ex:* `https://www.k21p.com/example.user.js`)
1. **Item toggle** - this toggle enables or disables an item
1. **Item** - this is the userscript (or style), clicking on it will load it's contents into the editor - *you can hide descriptions in the settings area!*
1. **Editor buttons (top)** - *described left to right*
    - **Update button** - this button allows you to update userscripts that meet the following conditions
        - metadata contains `@version` tag
        - metadata contains `@updateURL` tag
    - **Download button** - click this button to download a copy of your userscript
        - *Note:* every userscript that is displayed in the interface is already present on your local machine, at your save location - the download button offers a quick way to retrieve a copy of that file, without needing to click the settings button, and then the save location link within the settings modal
    - **Trash button** - moves the currently loaded userscript to the trash bin - it will subsequently be removed from the interface and save location
1. **Editor buttons (bottom)**
    - `Discard` - while editing, reverts any unsaved changes you've made to a userscript
    - `Save` - while editing, saves all changes you've made to a userscript
        - `Command + S` is the keyboard shortcut for the action


![Userscripts Safari](/etc/ui02.png)

#### Settings

- **Auto Hint** - automatically shows completion hints while editing
- **Hide Descriptions** - hides the item descriptions in the sidebar
- **Show Invisibles** - toggles the display of invisible characters in the editor
- **Javascript Linter** - toggles basic Javascript linting within the editor
- **Tab Size** - the number of spaces a tab is equal to while editing, obviously defaults to `4` because using `2` spaces is absolute insanity
- **Log Activity** - shows some extra messages in the browser console when certain events take place
- **Save Location** - where your file are currently located and being saved to (click the blue text to open location)
- **Change Save Location (cogs icon)** - this button, located directly to the right of the save location, is a shortcut for opening the host app, which will allow you to change the save location
- **Global Blacklist** - all domain patterns listed here will be *globally* ignored for script injection

## Userscript Metadata

## FAQs

## Support Development
Currently, there are a few you can support the development of this extension. The first way is simple; if you enjoy using the extension, consider [leaving a positive review on the App Store](https://apps.apple.com/us/app/userscripts/id1463298887). Seeing the reviews motivates me to continue working on the development.

Secondly, you can [sign up to be a beta tester](https://forms.gle/QB46uYQHVyCxULue9). Since this extension values your privacy, and **does not collect any data from users**, it's hard for me to gauge how the extension is being used. By signing up to be a beta tester it not only allows you to test upcoming versions, but also give me the opportunity to elicit feedback from real users.

Last, any issue marked "help wanted" is actively seeking assistance. Please respond to those issues with feedback, guidance or offers of coding assistance. Outside of those issues, it is fair to assume outstanding issues are already being worked on and new features are being actively developed.

## Privacy Policy
Userscripts does not collect any data from its users nor monitor activities or actions you perform within the application and extension. This means everything that you do with the application and extension is private to you and is never shared with the developers or third parties. Since there is no data collection, there is no data retention of any kind.

## License

Licensed under the [GNU General Public License v3.0](/LICENSE) license for all open source applications. A commercial license is required for all other applications.



