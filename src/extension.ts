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
			const info = await buildInfo(uri);
			for (const [symbol, hovers] of info) {
				console.log('Symbol: ' + symbol.name);
				for (const hover of hovers) {
					console.log(renderHover(hover));
				}
			}
			vscode.window.showWarningMessage('Index Current File');
		}
	}));
}

async function buildInfo(uri: vscode.Uri): Promise<[DocumentSymbol, Hover[]][]> {
	// TODO: flatten document symbols recursively.
	let symbols: DocumentSymbol[] = await vscode.commands.executeCommand('vscode.executeDocumentSymbolProvider', uri);
	if ('children' in symbols[0]) {
		const children = symbols[0].children;
		if (children !== undefined) {
			symbols = symbols.concat(children);
		}
	}

	let infos: [DocumentSymbol, Hover[]][] = [];
	for (const symbol of symbols) {
		// Use selectionRange instead of range to get the hover for the symbol name.
		// This is important for symbols like functions, where the range is the entire function body or something.
		const hovers: Hover[] = await vscode.commands.executeCommand('vscode.executeHoverProvider', uri, symbol.selectionRange.start);
		infos.push([symbol, hovers]);
	}
	return infos;
}

function renderHover(hover: Hover): string {
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
	return '';
}

// This method is called when your extension is deactivated
export function deactivate() {
}
