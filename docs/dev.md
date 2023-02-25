The `root` directory is a typical multi-page app of Vite with Svelte JavaScript project.

The `xcode` directory is the root of the Xcode project where the Safari extension app is built.

# Environment
- [`Node.js`](https://nodejs.dev/en/learn/how-to-install-nodejs/)
- [`pnpm`](https://pnpm.io/installation) (optional)
- [`Xcode`](https://geo.itunes.apple.com/app/xcode/id497799835)

# Dev
- `pnpm install`
- `pnpm dev`

# Build
- `pnpm build`
- `cd ./xcode`
- `xcodebuild` or build with Xcode App

# Xcode

### Configurations
The Xcode project contains two configurations, which have independent `xcconfig` configuration files, and can run on your local at the same time without conflicts.

- `Debug`: No developer account is required, that is `Sign to Run Locally` by default, which will speed up the build during development. This is convenient for developers without an account, and contributors who only need to do simple local debugging.

- `Release`: A developer account is required, which means it can be used for distribution as well as running on real iOS/iPadOS devices. You will need to override your developer account information in `xcconfig` to complete the build.

### xcconfig
All `xcconfig` files are in the `./xcconfig/` directory. Each `.xcconfig` file can be overridden by `.dev.xcconfig` in the same path, they will be ignored by `git`, so you can override any build settings locally.

For example, you can create an `Userscripts-Release.dev.xcconfig` file to override `Userscripts-Release.xcconfig` and fill in your own developer account information there.

# Contribute
[Contributing guide](contributing.md)

# About
[Userscripts](https://github.com/quoid/userscripts) @ 2018-2023