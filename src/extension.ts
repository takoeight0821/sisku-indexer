import path = require('path');
import * as vscode from 'vscode';
import { MarkedString, Uri } from 'vscode';
import { MarkupContent } from 'vscode-languageclient';
import { DocumentSymbol, Hover, TextDocumentIdentifier } from 'vscode-languageserver-types';

export function activate(context: vscode.ExtensionContext) {

	console.log('Congratulations, your extension "sisku-indexer" is now active!');

	let disposable = vscode.commands.registerCommand('sisku-indexer.helloWorld', () => {
		console.log(vscode.workspace.workspaceFolders);
		vscode.window.showInformationMessage('Hello World from sisku-indexer!');
	});

	context.subscriptions.push(disposable);

	context.subscriptions.push(vscode.commands.registerCommand('sisku-indexer.indexCurrentFile', async () => {
		const uri = vscode.window.activeTextEditor?.document.uri;
		if (uri === undefined) {
			vscode.window.showWarningMessage('No active document');
			return;
		} else {
			const hovercraftFileUri = documentToHovercraftUri(uri);
			vscode.workspace.fs.createDirectory(Uri.file(path.dirname(hovercraftFileUri.fsPath)));

			const info = await buildInfo(uri);

			vscode.workspace.fs.writeFile(hovercraftFileUri,
				Buffer.from(JSON.stringify(info)));

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
	const toplevelSymbols: DocumentSymbol[] = await vscode.commands.executeCommand('vscode.executeDocumentSymbolProvider', uri);
	// flatten document symbols recursively.
	const symbols = flatSymbols(toplevelSymbols);

	let infos: [DocumentSymbol, Hover[]][] = [];
	for (const symbol of symbols) {
		// Use 'selectionRange' instead of 'range' to get the hover for the symbol name.
		// This is important for symbols like functions, where the 'range' is the entire function body or something (including keywords like 'function', 'fn', 'func').
		let hovers: Hover[] = await vscode.commands.executeCommand('vscode.executeHoverProvider', uri, symbol.selectionRange.start);
		hovers = hovers.map(valueOfHover);
		infos.push([symbol, hovers]);
	}
	return infos;
}

/**
 * Flattens a tree of DocumentSymbols into a flat array.
 * @param toplevelSymbols A tree of DocumentSymbols.
 * @returns A flat array of DocumentSymbols.
 */
function flatSymbols(toplevelSymbols: DocumentSymbol[]): DocumentSymbol[] {
	let symbols: DocumentSymbol[] = [];
	for (const symbol of toplevelSymbols) {
		symbols.push(symbol);
		if (symbol.children !== undefined) {
			symbols = symbols.concat(flatSymbols(symbol.children));
		}
	}
	return symbols;
}

function documentToHovercraftUri(uri: Uri): Uri {
	const workspaceFolders = vscode.workspace.workspaceFolders;
	if (workspaceFolders === undefined) {
		throw new Error('No workspace folders');
	}

	const workspaceFolder = workspaceFolders.find((folder) => uri.fsPath.startsWith(folder.uri.fsPath));
	if (workspaceFolder === undefined) {
		throw new Error('No workspace folder for ' + uri.fsPath);
	}

	const hovercraftFolder = workspaceFolder.uri.with({ path: workspaceFolder.uri.path + '/.hovercraft' });

	const relativePath = path.relative(workspaceFolder.uri.fsPath, uri.fsPath);
	return hovercraftFolder.with({ path: hovercraftFolder.path + '/' + relativePath + '.json' });
}

/**
 * @param {Hover} hover
 * @returns {string} A string constructed from the hover.contents.
 */
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

/**
 * Values typed as Hover includes some getters and not have a toJSON method.
 * So we need to extract the values from the getters and create a new object for JSON.stringify.
 * @param {Hover} hover
 * @returns {Hover}
 */
function valueOfHover(hover: Hover): Hover {
	let contents: Hover['contents'] = '';

	if (typeof hover.contents === 'string') {
		contents = hover.contents;
	} else if ('value' in hover.contents && typeof hover.contents.value === 'string') {
		contents = { value: hover.contents.value } as MarkupContent | MarkedString;
	} else if (Array.isArray(hover.contents)) {
		contents = hover.contents.map((content) => {
			if (typeof content === 'string') {
				return content;
			} else {
				return { value: content.value };
			}
		}) as MarkedString[];
	} else {
		throw new Error('Unknown hover contents type: ' + hover.contents);
	}

	return {
		contents: contents,
		range: hover.range,
	};
}

// This method is called when your extension is deactivated
export function deactivate() {
}

