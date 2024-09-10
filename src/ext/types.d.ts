declare namespace TypeExtMessages {
	interface XHRProcessedFile {
		data: Array<number>;
		lastModified: number;
		name: string;
		mime: string;
	}

	type XHRProcessedFormData = [string, string | XHRProcessedFile][];

	type XHRProcessedData =
		| {
				data: string;
				type: "Text" | "URLSearchParams";
		  }
		| {
				data: string;
				mime: string;
				type: "Document";
		  }
		| {
				data: Array<number>;
				type: "ArrayBuffer" | "ArrayBufferView";
		  }
		| {
				data: Array<number>;
				mime: string;
				type: "Blob";
		  }
		| {
				data: XHRProcessedFormData;
				type: "FormData";
		  };
}
