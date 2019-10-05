# Changelog

## Unreleased
- Enable code folding in editor

## v1.4.0 (2019-08-28)
- A lot of code cleanup and refactoring
- Improved the popover loading experience
- Javascript is now saved to a .js file, rather than .json

## v1.3.0 (2019-07-24)
- Refactored WKWebView implementation to better support Catalina
- View styling changes to prevent initial "white flash" before WKWebView loads
- Minor CSS style updates

## v1.2.0 (2019-07-02)
- Fixed an issue that prevented script injection on websites with strict CSP
- Disabled 3D touch within the editor, which was causing cursor issues
- Styling updates

## v1.1.0 (2019-06-13)
- Added the ability for users to toggle the extension on/off
- Updated the popover dimensions
- Tabs are now transformed into spaces within the editor
- Created a workaround so that the mouse cursor changes appropriately when hovering certain elements
- Fixed a bug that allowed users to overwrite a saved script when no changes occurred
- Fixed a bug that was showing a undefined "Last edited" date on first launch of the extension

## v1.0.3 (2019-05-13)

Initial release using [Safari App Extensions](https://developer.apple.com/documentation/safariservices/safari_app_extensions) format

## v1.0.0 (2018-12-01)

Initial release using [Safari Extension JS](https://developer.apple.com/documentation/safariextensions) - depreciated as of 2019-01-01