const directory = document.querySelector("#directory");
const button = document.querySelector("#set_directory");
const setDirectory = () => webkit.messageHandlers.controller.postMessage("SET_READ_LOCATION");
function printDirectory(location) {
    directory.innerText = location;
}
button.addEventListener("click", setDirectory);
