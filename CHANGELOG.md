# Changelog

## v2.1.0 (TBD)
- allow users to choose the desired save/load location for their userscripts - #32
- refocus editor after saving - #60
- fixed a bug that was causing duplicate entries in the manifest - #62
- regularly purge manifest of stale entries - #57
- open save/load location properly when clicking link in settings modal
- misc styling/code changes

## v2.0.1 (2020-07-27)
- @include/@exclude are now aliases for @match/@exlcude-match
- Display an error when browser is not supported

## v2.0.0 (2020-07-10)
- Complete overhaul/rewrite of the extension
- UI now lives in a page rather than popover
- Enables multiple, domain specific, scripts
- A lot more features of which will not be listed in the changelog

## v1.5.0 (2019-10-14)
- Enable code folding in editor
- Minor styling changes

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
