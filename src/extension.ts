import * as vscode from 'vscode';
import presets from './presets.json';

const presetMap = presets as Record<string, { wordText: string; regionBg: string }>;

let repeatedWordSelections: { word: string, selections: vscode.Selection[] }[] = [];
let currentWordIndex = 0;
let activeEditor: vscode.TextEditor | undefined = undefined;
let syncEditWordDecoration: vscode.TextEditorDecorationType | undefined;
let syncEditRegionDecoration: vscode.TextEditorDecorationType | undefined;
let originalRegionRange: vscode.Range | undefined;

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(vscode.commands.registerCommand('sync-edit.start', () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) { return; }

		const document = editor.document;
		const selection = editor.selection;
		originalRegionRange = new vscode.Range(selection.start, selection.end);

		const selectedText = document.getText(selection);
		if (!selectedText) {
			vscode.window.showInformationMessage('範囲が選択されていません。');
			return;
		}

		const wordPattern = /\b\w+\b/g;
		const wordMatches = [...selectedText.matchAll(wordPattern)];

		const wordMap = new Map<string, number[]>();
		const baseOffset = document.offsetAt(selection.start);

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

		if (repeatedWords.length === 0) {
			vscode.window.showInformationMessage('選択範囲内に複数回出現する単語が見つかりませんでした。');
			return;
		}

		repeatedWordSelections = repeatedWords.map(([word, positions]) => ({
			word,
			selections: positions.map(offset => {
				const start = document.positionAt(offset);
				const end = document.positionAt(offset + word.length);
				// ✅ 色が効き、かつカーソルが先頭に来る
				return new vscode.Selection(end, start);
			})
		}));

		currentWordIndex = 0;
		activeEditor = editor;
		editor.selections = repeatedWordSelections[currentWordIndex].selections;

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
		syncEditWordDecoration = vscode.window.createTextEditorDecorationType({
			color: wordText
		});

		const wordRanges = repeatedWordSelections[currentWordIndex].selections.map(sel => {
			return new vscode.Range(sel.start, sel.end);
		});
		editor.setDecorations(syncEditWordDecoration, wordRanges);

		if (syncEditRegionDecoration) {
			syncEditRegionDecoration.dispose();
		}
		syncEditRegionDecoration = vscode.window.createTextEditorDecorationType({
			backgroundColor: regionBg
		});
		editor.setDecorations(syncEditRegionDecoration, [originalRegionRange]);

		vscode.commands.executeCommand('setContext', 'syncEditMode', true);
		vscode.window.showInformationMessage(`SyncEdit: "${repeatedWordSelections[currentWordIndex].word}" を選択中（${repeatedWordSelections.length}語）`);
	}));

	context.subscriptions.push(vscode.commands.registerCommand('sync-edit.nextWord', () => {
		if (!activeEditor || repeatedWordSelections.length === 0) {
			return;
		}

		currentWordIndex = (currentWordIndex + 1) % repeatedWordSelections.length;
		activeEditor.selections = repeatedWordSelections[currentWordIndex].selections;

		const wordRanges = repeatedWordSelections[currentWordIndex].selections.map(sel => {
			return new vscode.Range(sel.start, sel.end);
		});
		activeEditor.setDecorations(syncEditWordDecoration!, wordRanges);

		vscode.window.showInformationMessage(`SyncEdit: "${repeatedWordSelections[currentWordIndex].word}" に切り替え`);
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
		vscode.window.showInformationMessage('SyncEdit を終了しました。');
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
			!originalRegionRange?.contains(sel.active)
		);

		if (isSingleCursor || movedOutside) {
			cancelSyncEdit();
		}
	});
}
