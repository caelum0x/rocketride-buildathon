// MIT License
//
// Copyright (c) 2026 Aparavi Software AG
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

// =============================================================================
// RUN RECEIPT DESK — drives receiptdesk.pipe from inside the Studio app
// =============================================================================
//
// Every RocketRide symbol used here was read from ground truth:
//   - RocketRideClient, PIPELINE_RESULT, UPLOAD_RESULT (types) and the
//     client.use / client.send / client.sendFiles methods:
//       engine/docs/agents/ROCKETRIDE_typescript_API.md  (API Reference)
//   - Real Studio-app usage of client.use({ pipeline, useExisting, name,
//     pipelineTraceLevel }) then routing results back into the UI:
//       engine/apps/aparavi-ui/src/AparaviApp.tsx  (client.use → { token })
//   - client.sendFiles(files, token) for webhook/document pipelines:
//       engine/apps/dropper-ui/src/hooks/useFileProcessing.ts
//   - Defensive result extraction via result_types (the "answers" lane):
//       engine/apps/chat-ui/src/utils/pipelineUtils.ts (extractTextFromResult)
//       engine/docs/agents/ROCKETRIDE_COMMON_MISTAKES.md (Mistake 6)
//
// receiptdesk.pipe uses a `webhook` source, so we invoke with send()/sendFiles()
// (NOT chat()), exactly as the SDK reference prescribes for webhook sources.
// =============================================================================

import type { PIPELINE_RESULT, RocketRideClient, UPLOAD_RESULT } from 'rocketride';
// Pipeline definition, co-located in src/ exactly like engine/apps/aparavi-ui
// (src/aparavi.pipe) — the proven Studio pattern that keeps the bundler inside
// the app root. This is a verbatim copy of the canonical /receiptdesk/receiptdesk.pipe
// (the source of truth); keep the two in sync if that file changes. The rspack
// `{ test: /\.pipe$/, type: 'json' }` rule (rsbuild.config.mts) loads it as JSON.
import pipeline from '../receiptdesk.pipe';

/** Input the UI collects — pasted receipt text and/or a single uploaded file. */
export interface ReceiptInput {
	text?: string;
	file?: File;
}

/** Human-readable name shown for the running task in the shell status/monitor. */
const TASK_NAME = 'Receipt Desk';

/**
 * Pull the expense-sheet Markdown out of a pipeline result.
 *
 * receiptdesk.pipe ends in `response_answers` with DEFAULT lane naming, so the
 * answer lands under the `answers` key — but we discover the key via
 * `result_types` first (per ROCKETRIDE_COMMON_MISTAKES Mistake 6), then fall
 * back to the literal `answers` key, so a customised lane name still works.
 *
 * @param result - PIPELINE_RESULT from send()/sendFiles(), or undefined.
 * @returns The expense sheet Markdown string.
 * @throws Error when no answer lane / value is present.
 */
const extractReceiptDesk = (result: PIPELINE_RESULT | undefined): string => {
	if (!result) {
		throw new Error('The pipeline returned no result. Please try again.');
	}

	/** Coerce a single answer value (string, {answer}, or array) to text. */
	const toText = (value: unknown): string | null => {
		if (Array.isArray(value)) {
			const first = value.find((v) => typeof v === 'string' && v.trim());
			if (typeof first === 'string') return first;
			// Answer objects arrive as { answer: string } — dig one level in.
			const obj = value.find(
				(v) => v && typeof v === 'object' && typeof (v as Record<string, unknown>).answer === 'string',
			) as Record<string, unknown> | undefined;
			return obj ? (obj.answer as string) : null;
		}
		if (typeof value === 'string' && value.trim()) return value;
		if (value && typeof value === 'object' && typeof (value as Record<string, unknown>).answer === 'string') {
			return (value as Record<string, unknown>).answer as string;
		}
		return null;
	};

	// 1) Discover the answers key from result_types, whatever it is named.
	const resultTypes = result.result_types ?? {};
	for (const [key, laneType] of Object.entries(resultTypes)) {
		if (laneType === 'answers' || laneType === 'text') {
			const text = toText(result[key]);
			if (text) return text.trim();
		}
	}

	// 2) Fall back to the default `answers` key (receiptdesk.pipe uses defaults).
	const fallback = toText((result as Record<string, unknown>).answers);
	if (fallback) return fallback.trim();

	throw new Error('No expense sheet was found in the pipeline response.');
};

/**
 * Run receiptdesk.pipe end to end and return the expense sheet as Markdown.
 *
 * Flow (webhook source → parse → ocr → question → prompt → llm → response_answers):
 *   1. `client.use()` starts / reuses the pipeline and yields a task token.
 *   2. A file is uploaded with `sendFiles()`; pasted text is delivered with
 *      `send()` — both are the correct calls for a `webhook` source.
 *   3. The answer is extracted defensively from the PIPELINE_RESULT.
 *
 * @param client - The shared RocketRideClient from useShellConnection().
 * @param input - Pasted receipt text and/or an uploaded file.
 * @returns The generated expense sheet in GitHub-flavored Markdown.
 * @throws Error with a user-friendly message on any failure.
 */
export const runReceiptDesk = async (client: RocketRideClient, input: ReceiptInput): Promise<string> => {
	const text = input.text?.trim();
	const file = input.file;

	if (!file && !text) {
		throw new Error('Paste some receipt text or choose a file first.');
	}

	// Start (or reuse) the pipeline instance and get a task token.
	const started = await client.use({
		pipeline,
		useExisting: true,
		name: TASK_NAME,
		pipelineTraceLevel: 'full',
	});
	const token = started.token;
	if (!token) {
		throw new Error('Could not start the Receipt Desk pipeline.');
	}

	// A file goes through the document path (parse/ocr extract the receipt from a
	// photo/scan/.pdf/.txt/.md); otherwise the pasted text is sent straight to
	// the webhook source.
	if (file) {
		const uploads: UPLOAD_RESULT[] = await client.sendFiles(
			[{ file, objinfo: { name: file.name, size: file.size }, mimetype: file.type || 'application/octet-stream' }],
			token,
		);
		const failed = uploads.find((u) => u.action === 'error');
		if (failed) {
			throw new Error(failed.error || 'The file could not be processed.');
		}
		const completed = uploads.find((u) => u.result);
		return extractReceiptDesk(completed?.result);
	}

	const result = await client.send(token, text as string);
	return extractReceiptDesk(result);
};
