// https://www.typescriptlang.org/docs/handbook/declaration-files/introduction.html

/// <reference types="svelte" />
/// <reference types="vite/client" />

declare global {
	interface Window {
		webapp: {
			updateDirectory: (directory: string) => void;
		};
		webkit: {
			messageHandlers: {
				controller: {
					postMessage: <T extends MessageBody>(
						message: T,
					) => Promise<MessageReply<T>>;
				};
			};
		};
	}
}

type MessageBody = "INIT" | "CHANGE_DIRECTORY" | "OPEN_DIRECTORY";

type MessageReply<T> = T extends "INIT"
	? { build: string; version: string; directory: string }
	: void;

export {};
