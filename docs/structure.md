# Project directory structure
For development and build environments please refer to [development guide](dev.md).

## `docs`
Store documents and project description files, etc.

## `etc`
Readme references and project history assets

## `public`
Project Static Asset  
https://vitejs.dev/guide/assets.html#the-public-directory

### `./public/extension-page/jshint.min.js`
CodeMirror 5 `codemirror/addon/lint/javascript-lint.js` depends on `jshint.js`  
https://codemirror.net/5/doc/manual.html#addon_lint  
https://github.com/jshint/jshint/blob/main/dist/jshint.js

## `scripts`
Custom build scripts ref in `package.json`
Used to build the source code in `src` below

## `src`
Project Web App/Ext Source Code  
Build the project from here to xcode resources

## `xcode`
Project Bundled App Source Code  
Build the project from here to extension bundled app

# About
[Userscripts](https://github.com/quoid/userscripts) @ 2018-2023
