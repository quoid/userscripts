# Project directory structure
For development and build environments please refer to [development guide](dev.md).

## `docs`
Store documents and project description files, etc.

## `etc`
Readme references and project history assets

## `public`
Project Static Asset
https://vitejs.dev/guide/assets.html#the-public-directory

### `./public/page/jshint.min.js`
CodeMirror 5 `codemirror/addon/lint/javascript-lint.js` depends on `jshint.js`
https://codemirror.net/5/doc/manual.html#addon_lint
https://github.com/jshint/jshint/blob/main/dist/jshint.js

## `src`
Project Web App Source Code
Build the project from here to extension resources

## `xcode`
Project Native App Source Code
Build the project from here to extension bundle app

# About
[Userscripts](https://github.com/quoid/userscripts) @ 2018-2023