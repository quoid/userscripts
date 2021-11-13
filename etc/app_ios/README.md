# static-website-builder

### Requirements:
- [node](https://nodejs.org/en/)
- [gulp](https://gulpjs.com)

### Installation:
1. Have the requirements installed on your local machine
1. Clone this repository locally
1. Navigate to where you cloned this repository
1. Run `npm install`

### Usage:
- `npm run server` starts the dev server
    - **Only edit files with the `src` folder**
    - Navigate to `http://localhost:8888` to view output
    - LiveReload *is* enabled
- `npm run build` builds the website to the `output` folder
    - **Do *not* rely on the server command to build the website**
- `npm run clean` cleans the output folder
    - **The clean task is built into *both* the server and build commands**, you won't need to often run this command

### Features
- autoprefixing for css
- @import enabled for css
- minifying of css content
- inlining and compression of all files (css, js, svgs, etc...)
- easy deployment to Netlify
    - build command = `npm run build`
    - publish directory = `output/`
