import * as vscode from 'vscode';
import presets from './presets.json';

const presetMap = presets as Record<string, { wordText: string; regionBg: string }>;
const localize = vscode.l10n.t;

let words: { word: string, selections: vscode.Selection[] }[] = [];
let current = 0;
let editor: vscode.TextEditor | undefined = undefined;
let wordDeco: vscode.TextEditorDecorationType | undefined;
let backDeco: vscode.TextEditorDecorationType | undefined;
let orgRegion: vscode.Range | undefined;
let editMode = false;
let prevNotEmpty = false;

// マッチする単語を探す
function StartOrNext() {
	if (!editor || !orgRegion) {
		return [];
	}

	const doc = editor.document;
	const selectedText = doc.getText(orgRegion);

	if (!selectedText) {
		return [];
	}

	// 単語を探す
	const matches = [...selectedText.matchAll(/\b\w+\b/g)];
	const wordMap = new Map<string, number[]>();
	const baseOffset = doc.offsetAt(orgRegion.start);

	for (const match of matches) {
		const word = match[0];
		if (!wordMap.has(word)) {
			wordMap.set(word, []);
		}
		wordMap.get(word)!.push(baseOffset + match.index!);
	}

	const validWords = Array.from(wordMap.entries())
		.filter(([_, positions]) => positions.length > 1);

	words = validWords.map(([word, positions]) => ({
		word,
		selections: positions.map(pos => {
			return new vscode.Selection(
				doc.positionAt(pos + word.length),
				doc.positionAt(pos)
			);
		})
	}));

	// 単語を設定
	current = (current + 1) % words.length;
	editor.selections = words[current].selections;

	// 装飾
	if (words.length > 0 && wordDeco && backDeco) {
		const wordRanges =
			words[current].selections.map(sel =>
				new vscode.Range(sel.start, sel.end)
			);

		editor.setDecorations(wordDeco, wordRanges);
		editor.setDecorations(backDeco, [orgRegion]);
	}
}

// キャンセル
function cancelSyncEdit() {
	words = [];
	current = 0;
	orgRegion = undefined;

	if (editor) {
		editor.selections = [
			new vscode.Selection(
				editor.selection.active,
				editor.selection.active
			)
		];
	}
	editor = undefined;

	if (wordDeco) {
		wordDeco.dispose();
		wordDeco = undefined;
	}
	if (backDeco) {
		backDeco.dispose();
		backDeco = undefined;
	}

	if (editMode) {
		editMode = false;
		vscode.commands.executeCommand('setContext', 'syncEditMode', false);
		vscode.window.showInformationMessage(localize('Exited SyncEdit'));
	}
}

// キャレットが移動した時
vscode.window.onDidChangeTextEditorSelection(event => {
	if (!editor || event.textEditor !== editor || !orgRegion || !editMode || words.length === 0) {
		return;
	}

	const caret = event.selections[0].active;

	// 範囲外ならキャンセル
	if (caret.isBefore(orgRegion.start) || caret.isAfter(orgRegion.end)) {
		cancelSyncEdit();
		return;
	}

	// カーソルが動いたら選択を外す
	const isEmpty = event.selections[0].isEmpty;
	const hasSelection = isEmpty && prevNotEmpty;
	prevNotEmpty = !isEmpty;

	const sel = words[current].selections[0];

	if (sel.end.compareTo(caret) === 0 && hasSelection) {
		const newSelections = words[current].selections.map(sel => {
			const s = sel.start.translate(0, 1);
			return new vscode.Selection(s, s);
		});

		editor.selections = newSelections;

		var s = sel.start;
		editor.revealRange(new vscode.Range(s, s));
	}

	// どの単語の範囲にいるかをチェック
	for (let i = 0; i < words.length; i++) {
		if (i === current) {
			continue;
		}

		if (words[i].selections.some(sel => sel.contains(caret))) {
			current = i;

			editor.selections = words[i].selections;
			const wordRanges = words[i].selections.map(sel =>
				new vscode.Range(sel.start, sel.end)
			);
			editor.setDecorations(wordDeco!, wordRanges);
			editor.setDecorations(backDeco!, [orgRegion]);

			break;
		}
	}
});

export function activate(context: vscode.ExtensionContext) {
	// 開始
	context.subscriptions.push(vscode.commands.registerCommand('sync-edit.start', () => {
		editor = vscode.window.activeTextEditor;
		if (!editor) {
			return;
		}

		// 装飾の初期設定
		const config = vscode.workspace.getConfiguration('syncEdit');
		const preset = config.get<string>('colorPreset', 'custom');

		let wordText = config.get<string>('wordTextColor', '#000000ff');
		let regionBg = config.get<string>('regionBackgroundColor', '#264f78aa');

		if (preset !== 'custom' && presetMap[preset]) {
			wordText = presetMap[preset].wordText;
			regionBg = presetMap[preset].regionBg;
		}

		wordDeco = vscode.window.createTextEditorDecorationType({ color: wordText });
		backDeco = vscode.window.createTextEditorDecorationType({ backgroundColor: regionBg });

		const selection = editor.selection;
		orgRegion = new vscode.Range(selection.start, selection.end);
		current = -1;

		StartOrNext();

		if (words.length !== 0) {
			editMode = true;
			vscode.commands.executeCommand('setContext', 'syncEditMode', true);
			vscode.window.showInformationMessage(localize('Start SyncEdit'));
		}
	}));

	// 次の単語
	context.subscriptions.push(vscode.commands.registerCommand('sync-edit.nextWord', () => {
		if (editor && orgRegion) {
			StartOrNext();
		}
	}));

	// 終了
	context.subscriptions.push(vscode.commands.registerCommand('sync-edit.cancel', () => {
		cancelSyncEdit();
	}));
}
