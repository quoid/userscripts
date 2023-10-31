# Welcome to Userscripts contributing guide

Thank you for investing your time in contributing to this open source project!

We hope this guide will helps you understand how to contribute to this project.

For development and build environments please refer to [development guide](dev.md).

**Note: Portions of this guide are outdated. Some processes are still being tweaked and optimized, we will update them in due course.**

# Branches

### `main`: default branch

- corresponding to development channel
- all development work around this branch
- protected branches not accept commits
- all work will be done in sub-branches
- all sub-branches will be merged via PRs

### `beta`: latest test version

- generated from the master branch
- corresponding to TestFlight channel
- only accept version number commits
- hotfixes and PRs are not accepted
- never merge back into master branch

### `release`: latest public version

- generated from the beta branch
- generate GitHub Releases and Tags
- corresponding to App Store channel
- accept hotfixes and version commits
- always merge back into master branch

# Commits

### Please use semantic commit messages

Format: `<type>(<scope>): <subject>`

`<scope>` is optional

### Example

```
feat: add hat wobble
^--^  ^------------^
|     |
|     +-> Summary in present tense.
|
+-------> Type: chore, docs, feat, fix, refactor, style, or test.
```

More Examples:

- `feat`: (new feature for the user, not a new feature for build script)
- `fix`: (bug fix for the user, not a fix to a build script)
- `docs`: (changes to the documentation)
- `style`: (formatting, missing semi colons, etc; no production code change)
- `refactor`: (refactoring production code, eg. renaming a variable)
- `test`: (adding missing tests, refactoring tests; no production code change)
- `chore`: (updating grunt tasks etc; no production code change)

[References](https://gist.github.com/joshbuchea/6f47e86d2510bce28f8e7f42ae84c716)

# Pull requests

Almost all features and fixes will be merged into the master branch via pull requests (PRs).

We will improve the guidelines for creating PRs in the future, like create [`pull request template`](https://docs.github.com/communities/using-templates-to-encourage-useful-issues-and-pull-requests/creating-a-pull-request-template-for-your-repository).

# Workflow

If you are not a member of the project, first you need to fork the master branch of the repository.

### General development

- create a new branch from the master branch
- suggested branch naming format like:
  - `issue/333`
  - `feat/...`
  - `fix/...`
- complete your commits in this new branch
- create a pull request from this new branch
- wait for other maintainers to review your changes
- pull request will be merged into master branch

### Generate beta version

- All completed features and fixes get into beta as soon as possible so that they get the maximum testing cycle time.
- Beta releases use build numbers incremented, version numbers always use the next major release.
- Bugs found and reported during testing are still fixed around the master branch and will be introduced in the rolling beta build.

### Generate public version

- When the series of betas has stabilized, we can produce a public release.
- If necessary, we can delay merging PRs of new features into the master branch, give priority to fixing bugs found in the beta version, and ensure the stability of the public version as much as possible.
- Despite various tests, we may still find bugs through user feedback in the public version, and we will fix those minor bugs through hotfixes.

# About

[Userscripts](https://github.com/quoid/userscripts) @ 2018-2023
