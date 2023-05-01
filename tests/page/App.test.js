import {afterEach, beforeAll, describe, expect, test} from "vitest";
import {cleanup, render} from "@testing-library/svelte";
import {browser} from "../../src/shared/dev.js";
import App from "../../src/page/App.svelte";

describe("App", () => {
	beforeAll(() => {
		global.browser = browser;
	});

	afterEach(() => cleanup());

	test("mounts", () => {
		const {container} = render(App);
		expect(container).toBeTruthy();
	});
});
