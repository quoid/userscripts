import OSLog
import SwiftUI

private let logger = USLogger(#fileID)
private let logDir = "Library/Caches/\(projectName)/Debug"
private let logFile = "\(bundleIdentifier).log"

func USLogger(_ category: String) -> Logger? {
#if DEBUG // Always enable logger in DEBUG builds
	print("DEBUG: logger enabled")
#else
	guard Preferences.enableLogger else { return nil }
#endif
	let subsystem = Bundle.main.bundleIdentifier!
	return Logger(subsystem: subsystem, category: category)
}

func USLoggerSwitch(_ enable: Bool) {
	Preferences.enableLogger = enable
	if enable {
		USLogStoreToFile() // clean up
	} else {
		USLogStoreToFile(prioritize: true)
	}
	// update app gui
	if bundleIdentifier != extIdentifier {
#if os(macOS) && APP
		if let appDelegate = NSApp.delegate as? AppDelegate {
			// update app menu item state
			appDelegate.enbaleNativeLogger?.state = enable ? .on : .off
			// update app webview state
			if let viewController = appDelegate.window?.contentViewController as? ViewController {
				viewController.updateEnableLoggerState()
			}
		}
#elseif os(iOS) && APP
		if let sceneDelegate = UIApplication.shared.connectedScenes.first?.delegate as? SceneDelegate,
		   let viewController = sceneDelegate.window?.rootViewController as? ViewController {
			// update app webview state
			viewController.updateEnableLoggerState()
		}
#endif
	}
}

// https://forums.swift.org/t/best-way-to-append-text-to-a-text-file/35764
// Swift has no easy way to append to files, use POSIX APIs
private func appendToFile(_ file: URL, content: String) -> Bool {
	guard file.isFileURL else {
		print("Not a file scheme URL")
		return false
	}
	if file.hasDirectoryPath {
		print("Should be a file but is indicated as a directory URL")
		return false
	}
	do {
		let dir = file.deletingLastPathComponent()
		try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true, attributes: nil)
	} catch {
		print("Failed mkdir - \(error)")
		return false
	}
	let fileDescriptor = open(file.path, O_CREAT | O_WRONLY | O_APPEND, S_IRUSR | S_IWUSR)
	if fileDescriptor == -1 {
		perror("Failed open")
		return false
	}
	defer { close(fileDescriptor) }
	guard let textData = content.cString(using: .utf8) else {
		print("Failed cString")
		return false
	}
	let result = write(fileDescriptor, textData, strlen(textData))
	if result == -1 {
		perror("Failed write")
		return false
	}
	return true
}

private func stringFromLogLevel(_ level: OSLogEntryLog.Level) -> String {
	switch level {
	case .undefined:
		return "Undefined"
	case .debug:
		return "Debug"
	case .info:
		return "Info"
	case .notice:
		return "Notice"
	case .error:
		return "Error"
	case .fault:
		return "Fault"
	@unknown default:
		return "Unknown"
	}
}

// The last time written to the log file
private var lastDate: Date = Date().addingTimeInterval(-3600)

private func writeLogStoreToFile() {
	logger?.debug("\(#function, privacy: .public) - USLogStoreToFile start")
	guard let logDirURL: URL = getProjectSharedDirectoryURL(path: logDir) else {
		logger?.error("\(#function, privacy: .public) - Failed get logDirURL")
		return
	}
	let logFileURL: URL = logDirURL.appendingPathComponent(logFile, isDirectory: false)
	// log file size limit
	if let fileSize = try? FileManager.default.attributesOfItem(atPath: logFileURL.path)[.size] as? Int {
#if DEBUG
		print("DEBUG: logFileSize/maxLogFileSize", fileSize, Preferences.maxLogFileSize)
#endif
		if fileSize > Preferences.maxLogFileSize {
			logger?.info("\(#function, privacy: .public) - Logger disabling due to max file size exceeded")
			USLoggerSwitch(false)
		}
	}
#if DEBUG
	print("DEBUG: enableLogger", Preferences.enableLogger)
#endif
	guard Preferences.enableLogger else {
		// clean log files
		logger?.info("\(#function, privacy: .public) - Cleaning log files")
		do {
			try FileManager.default.removeItem(at: logDirURL)
		} catch {
			logger?.error("\(#function, privacy: .public) - \(error)")
		}
		// reset logger prompt
		Preferences.promptLogger = true
		return
	}
	// log array written to the file in one go
	var logs: [String] = []
	do {
		let logStore = try OSLogStore(scope: .currentProcessIdentifier)
		// `position` doesn't work in `getEntries`, always returns all logs
		// instead use `predicate` to filter
//		let position = logStore.position(date: lastDate)
		let nowDate = Date()
		let predicate = NSPredicate(
			format: "date between {%@, %@}",
			lastDate as CVarArg,
			nowDate as CVarArg
		)
		lastDate = nowDate
		let entries = try logStore.getEntries(matching: predicate)
		for entry in entries {
			if let osLogEntry = entry as? OSLogEntryLog {
				lastDate = osLogEntry.date
				// format a single log line
				let log = [
					osLogEntry.date.description,
					stringFromLogLevel(osLogEntry.level),
					osLogEntry.process,
					osLogEntry.subsystem,
					osLogEntry.category,
					osLogEntry.composedMessage
					
				].joined(separator: "\t")
				logs.append(log)
			}
		}
	} catch {
		logger?.error("\(#function, privacy: .public) - Failed get entries: \(error)")
		return
	}
	var content = logs.joined(separator: "\n")
	// separate single write, there may be several duplicates before and after
	content += "\n-------------------------\n"
	guard appendToFile(logFileURL, content: content) else {
		logger?.error("\(#function, privacy: .public) - Failed appendToFile")
		return
	}
}

func USLogStoreToFile(prioritize: Bool = false) {
	// Note qos `.background` doesn't seem to work in extension
	DispatchQueue.global(qos: prioritize ? .userInteractive : .utility).async {
		writeLogStoreToFile()
	}
}

func USLogFilesExportTo(_ directory: URL) throws -> URL {

	struct USLogExportError: Error, CustomStringConvertible {
		enum errType: String {
			case notDirectory = "Not a directory URL"
			case logDirURLNil = "Failed get logDirURL"
			case noLogDir = "Log directory does not exist"
			case noLogFiles = "The log directory is empty"
			case exportFailed = "Export failed"
		}
		let type: errType
		var error: Error? = nil
		var description: String {
			if let error = self.error {
				return "\(error) - \(self.type.rawValue)"
			}
			return self.type.rawValue
		}
	}

	logger?.debug("\(#function, privacy: .public) - USLogFilesExportTo start")
	guard directory.hasDirectoryPath else {
		throw USLogExportError(type: .notDirectory)
	}
	guard let logDirURL: URL = getProjectSharedDirectoryURL(path: logDir) else {
		throw USLogExportError(type: .logDirURLNil)
	}
	guard directoryExists(path: logDirURL.path) else {
		throw USLogExportError(type: .noLogDir)
	}
	guard directoryEmpty(at: logDirURL) == false else {
		throw USLogExportError(type: .noLogFiles)
	}
	let timeInterval = Date().timeIntervalSince1970
	let timestampSrt = String(Int(timeInterval))
	// Use timestamps to ensure no destination folders already exist
	let outdir = "\(projectName)-logs-\(timestampSrt)"
	let dstURL = directory.appendingPathComponent(outdir, isDirectory: true)
	do {
		try FileManager.default.copyItem(at: logDirURL, to: dstURL)
		return dstURL
	} catch {
		throw USLogExportError(type: .logDirURLNil, error: error)
	}

}
