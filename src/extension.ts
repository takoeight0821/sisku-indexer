import * as vscode from 'vscode';
import { DocumentSymbol, Hover, TextDocumentIdentifier } from 'vscode-languageserver-types';

export function activate(context: vscode.ExtensionContext) {

	console.log('Congratulations, your extension "sisku-indexer" is now active!');

	let disposable = vscode.commands.registerCommand('sisku-indexer.helloWorld', () => {
		vscode.window.showInformationMessage('Hello World from sisku-indexer!');
	});

	context.subscriptions.push(disposable);

	context.subscriptions.push(vscode.commands.registerCommand('sisku-indexer.indexCurrentFile', async () => {
		const uri = vscode.window.activeTextEditor?.document.uri;
		if (uri === undefined) {
			vscode.window.showWarningMessage('No active document');
			return;
		} else {
			const symbols: DocumentSymbol[] = await vscode.commands.executeCommand('vscode.executeDocumentSymbolProvider', uri);
			const contents = await Promise.all(symbols.flatMap((symbol) => requestHoverFromSymbol(uri, symbol))).then((hovers) => hovers.join("\n"));
			console.log(contents);
			vscode.window.showWarningMessage('Index Current File');
		}
	}));
}

async function requestHoverFromSymbol(uri: vscode.Uri, symbol: DocumentSymbol): Promise<string[]> {
	// Use selectionRange instead of range to get the hover for the symbol name.
	// This is important for symbols like functions, where the range is the entire function body or something.
	let hovers: Hover[] = await vscode.commands.executeCommand('vscode.executeHoverProvider', uri, symbol.selectionRange.start);
	return hovers.map((hover) => {
		if (typeof hover.contents === 'string') {
			// If hover is MarkedString and is a string.
			return hover.contents;
		} else if ('value' in hover.contents && typeof hover.contents.value === 'string') {
			// If hover is MarkedString object or MarkupContent object.
			return hover.contents.value;
		} else if (Array.isArray(hover.contents)) {
			// If hover is MarkedString[].
			return hover.contents.map((content) => {
				if (typeof content === 'string') {
					return content;
				} else {
					return content.value;
				}
			}).join("\n");
		}
	}).filter((content): content is string => !!content /* Filter out undefined values */);
}

// This method is called when your extension is deactivated
export function deactivate() {
}
