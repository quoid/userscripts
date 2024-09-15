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

	type XHRHandlers = [
		"onreadystatechange",
		"onloadstart",
		"onprogress",
		"onabort",
		"onerror",
		"onload",
		"ontimeout",
		"onloadend",
	];

	type XHRHandlersObj = {
		[handler in XHRHandlers[number]]?: (response: XHRResponse) => void;
	};

	interface XHRTransportableDetails {
		binary: boolean;
		data: XHRProcessedData;
		headers: { [x: Lowercase<string>]: string };
		method: string;
		overrideMimeType: string;
		password: string;
		responseType: XMLHttpRequestResponseType;
		timeout: number;
		url: string;
		user: string;
		hasHandlers: { [handler in XHRHandlers[number]]?: boolean };
	}

	interface XHRTransportableResponse {
		contentType: string; // non-standard
		readyState: number;
		response: string | number[];
		responseHeaders: string;
		responseType: XMLHttpRequestResponseType;
		responseURL: string;
		status: number;
		statusText: string;
		timeout: number;
	}

	interface XHRResponse extends Omit<XHRTransportableResponse, "response"> {
		response: any;
		responseText?: string;
		responseXML?: Document;
	}
}
