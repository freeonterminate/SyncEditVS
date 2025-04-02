import * as vscode from 'vscode';
import presets from './presets.json';

const presetMap = presets as Record<string, { wordText: string; regionBg: string }>;

let repeatedWordSelections: { word: string, selections: vscode.Selection[] }[] = [];
let currentWordIndex = 0;
let activeEditor: vscode.TextEditor | undefined = undefined;
let syncEditWordDecoration: vscode.TextEditorDecorationType | undefined;
let syncEditRegionDecoration: vscode.TextEditorDecorationType | undefined;
let originalRegionRange: vscode.Range | undefined;

function extractRepeatedWords(document: vscode.TextDocument, range: vscode.Range, editor: vscode.TextEditor) {
	const selectedText = document.getText(range);
	if (!selectedText) {
		return [];
	}

	const wordPattern = /\b\w+\b/g;
	const wordMatches = [...selectedText.matchAll(wordPattern)];

	const wordMap = new Map<string, number[]>();
	const baseOffset = document.offsetAt(range.start);

	for (const match of wordMatches) {
		const word = match[0];
		const offset = match.index!;
		if (!wordMap.has(word)) {
			wordMap.set(word, []);
		}
		wordMap.get(word)!.push(baseOffset + offset);
	}

	const repeatedWords = Array.from(wordMap.entries())
		.filter(([_, positions]) => positions.length > 1);

	const result = repeatedWords.map(([word, positions]) => ({
		word,
		selections: positions.map(offset => {
			const start = document.positionAt(offset);
			const end = document.positionAt(offset + word.length);
			return new vscode.Selection(end, start);
		})
	}));

	// 装飾更新もここでやってしまう
	const config = vscode.workspace.getConfiguration('syncEdit');
	const preset = config.get<string>('colorPreset', 'custom');

	let wordText = config.get<string>('wordTextColor', '#000000ff');
	let regionBg = config.get<string>('regionBackgroundColor', '#264f78aa');

	if (preset !== 'custom' && presetMap[preset]) {
		wordText = presetMap[preset].wordText;
		regionBg = presetMap[preset].regionBg;
	}

	if (syncEditWordDecoration) {
		syncEditWordDecoration.dispose();
	}
	syncEditWordDecoration = vscode.window.createTextEditorDecorationType({ color: wordText });

	if (syncEditRegionDecoration) {
		syncEditRegionDecoration.dispose();
	}
	syncEditRegionDecoration = vscode.window.createTextEditorDecorationType({ backgroundColor: regionBg });

	if (result.length > 0) {
		const wordRanges = result[currentWordIndex].selections.map(sel =>
			new vscode.Range(sel.start, sel.end));
		editor.setDecorations(syncEditWordDecoration, wordRanges);
		editor.setDecorations(syncEditRegionDecoration, [range]);
	}

	return result;
}

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(vscode.commands.registerCommand('sync-edit.start', () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			return;
		}

		const document = editor.document;
		const selection = editor.selection;
		originalRegionRange = new vscode.Range(selection.start, selection.end);

		const result = extractRepeatedWords(document, originalRegionRange, editor);
		if (result.length === 0) {
			return;
		}

		repeatedWordSelections = result;
		currentWordIndex = 0;
		activeEditor = editor;
		editor.selections = repeatedWordSelections[currentWordIndex].selections;

		vscode.commands.executeCommand('setContext', 'syncEditMode', true);
	}));

	context.subscriptions.push(vscode.commands.registerCommand('sync-edit.nextWord', () => {
		if (!activeEditor || !originalRegionRange) {
			return;
		}

		const result = extractRepeatedWords(activeEditor.document, originalRegionRange, activeEditor);
		if (result.length === 0) {
			return;
		}

		repeatedWordSelections = result;
		currentWordIndex = (currentWordIndex + 1) % repeatedWordSelections.length;
		activeEditor.selections = repeatedWordSelections[currentWordIndex].selections;
	}));

	function cancelSyncEdit() {
		repeatedWordSelections = [];
		currentWordIndex = 0;
		originalRegionRange = undefined;

		if (activeEditor) {
			activeEditor.selections = [new vscode.Selection(activeEditor.selection.active, activeEditor.selection.active)];
		}
		activeEditor = undefined;

		if (syncEditWordDecoration) {
			syncEditWordDecoration.dispose();
			syncEditWordDecoration = undefined;
		}
		if (syncEditRegionDecoration) {
			syncEditRegionDecoration.dispose();
			syncEditRegionDecoration = undefined;
		}

		vscode.commands.executeCommand('setContext', 'syncEditMode', false);
	}

	context.subscriptions.push(vscode.commands.registerCommand('sync-edit.cancel', () => {
		cancelSyncEdit();
	}));

	vscode.window.onDidChangeTextEditorSelection(event => {
		if (!activeEditor || event.textEditor !== activeEditor || repeatedWordSelections.length === 0) {
			return;
		}

		const isSingleCursor = event.selections.length === 1;
		const movedOutside = event.selections.some(sel =>
			sel.active.isBefore(originalRegionRange!.start) ||
			sel.active.isAfter(originalRegionRange!.end)
		);

		if (isSingleCursor || movedOutside) {
			cancelSyncEdit();
		}
	});
}
