const directory = document.querySelector("#directory");
const button = document.querySelector("#set_directory");
const version = document.querySelector("#version");
const build = document.querySelector("#build");
const setDirectory = () => webkit.messageHandlers.controller.postMessage("SET_READ_LOCATION");
function printDirectory(location) {
    directory.innerText = location;
}
function printVersion(v, b) {
    version.innerText = v;
    build.innerText = b;
}
button.addEventListener("click", setDirectory);
