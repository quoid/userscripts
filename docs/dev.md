# Environment

The `root` directory is a typical multi-page app of Vite with Svelte JavaScript project.

The `xcode` directory is the root of the Xcode project where the Safari extension app is built.

For other directory structure instructions, please refer to [structure.md](structure.md).

### Recommended code editor

[Visual Studio Code](https://github.com/Microsoft/vscode) with extensions: [/.vscode/extensions.json](../.vscode/extensions.json)

# Template

The project is currently based on [`template-svelte`](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-svelte) from [`create-vite`](https://github.com/vitejs/vite/tree/main/packages/create-vite).

Additional reference templates are from [`create-svelte`](https://github.com/sveltejs/kit/tree/master/packages/create-svelte).

Reviewing the template will help you understand the composition of the project.

# Requirement

- [`Node.js`](https://nodejs.org/)
- [`Xcode`](https://geo.itunes.apple.com/app/id497799835)
- `Developer Team ID` (i.e. Apple Account, see [Xcode section](#xcode))

# Dev

- `npm install` [^1]
- `npm run dev` [^1]

# Build

> [!NOTE]
> Before building the app with Xcode make sure you create the `.dev.xcconfig` files [below](#xcconfig) and fill in your `Developer Team ID`.
> Otherwise `App groups` related functions will not work properly.

- `npm run build:mac` [^1][^2]
- `cd ./xcode`
- `xcodebuild -scheme Mac` [^1][^2][^3] or build with `Xcode` App

[^1]: These commands can also be executed directly through the vscode tasks. Please refer to: [/.vscode/tasks.json](../.vscode/tasks.json)

[^2]: Select the corresponding target and platform to build. Please refer to: [/package.json](../package.json) and [xcode-schemes](../xcode/Userscripts.xcodeproj/xcshareddata/xcschemes/)

[^3]: Local setup may be required. Please refer to: [Building from the Command Line with Xcode FAQ](https://developer.apple.com/library/archive/technotes/tn2339/_index.html)

# Xcode

Please note that a developer account is required, which can be a free Apple Account that has agreed to the Apple Developer Agreement. This is required to obtain a `Team ID` and use the `App groups` capability.

### Configurations

The Xcode project contains several configurations, which have independent `xcconfig` configuration files, and can run on your local at the same time without conflicts.

- `Vite`: for vite real-time development.

- `Debug`: for development and debugging.

- `Release`: for building and distributing.

### xcconfig

All `xcconfig` files are in the [`/xcode/xcconfig/`](../xcode/xcconfig) directory. Each `.xcconfig` file can be overridden by `.dev.xcconfig` in the same path, they will be ignored by `git`, so you can override any build settings locally.

For example, you can create an `Userscripts-Debug.dev.xcconfig` file to override [`Userscripts-Debug.xcconfig`](../xcode/xcconfig/Userscripts-Debug.xcconfig) and fill in your own developer account `Team ID` there:

`Userscripts-Debug.dev.xcconfig`

```
DEVELOPMENT_TEAM = XXXXXXXXXX
```

Note that all existing `.xcconfig` files already include `.dev.xcconfig` files of the same name, so they will be applied automatically once you create them. You only need to fill in the setting items that need to be overridden or added.

# Contribute

[Contributing guide](contributing.md)

# About

[Userscripts](https://github.com/quoid/userscripts) @ 2018-2024
