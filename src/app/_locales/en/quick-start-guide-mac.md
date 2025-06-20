### Welcome to this project, you will need two main steps to make the extension work:

- **Open the app and set a directory**

  - When you first launch the app, a local directory will be set by default.
  - If needed, you can select a new directory to suit your preferences.
  - This directory is used for saving and loading your user scripts.
  - Click the current directory to jump to the default directory or the one you set.

- **Enable the extension in Safari**

  - Enable Userscripts in Safari extensions list.
  - For an optimal experience it's recommended that you "Always Allow" Userscripts for "All Websites", but you could also allow only the sites you want, but please don't forget your settings if your script doesn't work.

### How to you install a user script

- The preferred method is of course to create your own scripts, open the extension page and click on the plus sign in the editor to create a new JS, write code and save it.
- You could also save files that extension with `.user.js` directly to the Userscripts directory.
  - The script file must contain a valid metadata block to match the web pages and be displayed in the extension popup.
- When you visit a `.user.js` URL in Safari, open the extension popup and you will see an installation prompt, or it will pop up automatically if you have enhanced prompts turned on.
  - The URL should ending with `.user.js` in `/PATH` part, not the `?QUERY` or `#HASH` parts, otherwise it will not be considered a valid user script URL by the extension.

### That’s it, start improving your quality of life now!

_Hey, don't forget to read our detailed documentation to learn more._
