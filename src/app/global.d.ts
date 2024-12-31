// https://www.typescriptlang.org/docs/handbook/declaration-files/introduction.html

/// <reference types="svelte" />
/// <reference types="vite/client" />

declare global {
	interface Window {
		webapp: {
			updateDirectory: (directory: string) => void;
			updateExtStatus: (extStatus: ExtensionStatus) => void;
			switchLogger: (enableLogger: boolean, promptLogger: boolean) => void;
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

export {};
