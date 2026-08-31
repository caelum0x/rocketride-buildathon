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
// RECEIPT DESK — upload receipt photos or paste receipt text, get an expense sheet
// =============================================================================
//
// Every `shell` symbol used here was read from ground truth:
//   - AppLayout, ShellAppProps ........ engine/packages/shell/contract/versions/v1.d.ts
//   - useShellConnection() → { client, isConnected } (RocketRideClient) ....... same file
//   - MarkdownRenderer ({ content }) ...................................... same file
//   - Real Studio-app usage of AppLayout + useShellConnection for a pipeline
//     app ........................ engine/apps/aparavi-ui/src/AparaviApp.tsx
// The pipeline call itself lives in ./lib/runReceiptDesk.ts (cited there).
// =============================================================================

import React, { useCallback, useRef, useState, type CSSProperties } from 'react';
import { AppLayout, MarkdownRenderer, useShellConnection } from 'shell';
import type { ShellAppProps } from 'shell';
import { runReceiptDesk } from './lib/runReceiptDesk';

// =============================================================================
// CONSTANTS
// =============================================================================

/** File types the parse/ocr components can turn into an expense sheet. */
const ACCEPTED_FILE_TYPES = '.txt,.md,.pdf,.png,.jpg,.jpeg';

/**
 * A few short real-world receipts so a first-time user can try the app in one
 * click without hunting for material. Kept inline (no bundler path) on purpose.
 */
const SAMPLE_RECEIPTS = `Blue Bottle Coffee
543 Howard St, San Francisco, CA
2026-08-14  09:12
------------------------------
1x Cappuccino          4.75
1x Almond Croissant    5.25
------------------------------
Subtotal              10.00
Tax                    0.88
Total             USD 10.88
Visa ****1234

===

UBER
Trip 2026-08-14
Pickup: SFO Terminal 2
Dropoff: 543 Howard St
Distance 13.2 mi
Fare              41.60
Booking Fee        2.50
Total         USD 44.10

===

STAPLES #2231
2026-08-15  16:47
Printer Paper A4 x2    18.98
Ballpoint Pens 12pk     6.49
USB-C Cable            14.99
Subtotal               40.46
Tax                     3.54
TOTAL              USD 44.00
Mastercard ****9902`;

// =============================================================================
// STYLES
// =============================================================================

const styles = {
	/** Outer container — full height, scrollable. */
	container: {
		height: '100%',
		overflow: 'auto',
		backgroundColor: 'var(--rr-bg-default)',
		fontFamily: 'var(--rr-font-family)',
		color: 'var(--rr-text-primary)',
	} as CSSProperties,

	/** Centered column that holds the whole app. */
	inner: {
		maxWidth: 860,
		margin: '0 auto',
		padding: '40px 24px 80px',
		display: 'flex',
		flexDirection: 'column' as const,
		gap: 24,
	} as CSSProperties,

	/** Page title. */
	title: {
		margin: 0,
		fontSize: 28,
		fontWeight: 800,
		letterSpacing: -0.5,
	} as CSSProperties,

	/** Subtitle under the title. */
	subtitle: {
		margin: 0,
		fontSize: 15,
		color: 'var(--rr-text-secondary)',
		lineHeight: 1.5,
	} as CSSProperties,

	/** Input card wrapping the textarea + controls. */
	card: {
		display: 'flex',
		flexDirection: 'column' as const,
		gap: 16,
		padding: 20,
		borderRadius: 12,
		border: '1px solid var(--rr-border)',
		backgroundColor: 'var(--rr-bg-paper)',
	} as CSSProperties,

	/** Field label. */
	label: {
		fontSize: 13,
		fontWeight: 600,
		color: 'var(--rr-text-secondary)',
	} as CSSProperties,

	/** The receipt-text textarea. */
	textarea: {
		width: '100%',
		minHeight: 200,
		resize: 'vertical' as const,
		boxSizing: 'border-box' as const,
		padding: 12,
		borderRadius: 8,
		border: '1px solid var(--rr-border)',
		backgroundColor: 'var(--rr-bg-default)',
		color: 'var(--rr-text-primary)',
		fontFamily: 'var(--rr-font-family)',
		fontSize: 14,
		lineHeight: 1.5,
	} as CSSProperties,

	/** Row holding the file picker and the submit button. */
	controls: {
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 16,
		flexWrap: 'wrap' as const,
	} as CSSProperties,

	/** Selected-file hint next to the picker. */
	fileHint: {
		fontSize: 13,
		color: 'var(--rr-text-secondary)',
		overflow: 'hidden',
		textOverflow: 'ellipsis',
		whiteSpace: 'nowrap' as const,
		maxWidth: 320,
	} as CSSProperties,

	/** Primary generate button. */
	button: {
		padding: '9px 22px',
		borderRadius: 6,
		border: 'none',
		backgroundColor: 'var(--rr-brand)',
		color: '#fff',
		fontSize: 14,
		fontWeight: 600,
		cursor: 'pointer',
	} as CSSProperties,

	/** Disabled state of the primary button. */
	buttonDisabled: {
		opacity: 0.5,
		cursor: 'not-allowed',
	} as CSSProperties,

	/** Secondary (outline) button — used for "load sample", copy, download. */
	secondaryButton: {
		padding: '7px 14px',
		borderRadius: 6,
		border: '1px solid var(--rr-border)',
		backgroundColor: 'transparent',
		color: 'var(--rr-text-primary)',
		fontSize: 13,
		fontWeight: 600,
		cursor: 'pointer',
	} as CSSProperties,

	/** Header row above the rendered expense sheet (title + actions). */
	resultHeader: {
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 12,
		marginBottom: 16,
		flexWrap: 'wrap' as const,
	} as CSSProperties,

	/** Small heading over the result. */
	resultTitle: {
		margin: 0,
		fontSize: 14,
		fontWeight: 700,
		color: 'var(--rr-text-secondary)',
		textTransform: 'uppercase' as const,
		letterSpacing: 0.5,
	} as CSSProperties,

	/** Copy / download action group. */
	resultActions: {
		display: 'flex',
		gap: 8,
	} as CSSProperties,

	/** Error banner. */
	error: {
		padding: '12px 16px',
		borderRadius: 8,
		border: '1px solid var(--rr-danger, #dc2626)',
		backgroundColor: 'var(--rr-bg-paper)',
		color: 'var(--rr-danger, #dc2626)',
		fontSize: 14,
	} as CSSProperties,

	/** Loading row. */
	loading: {
		display: 'flex',
		alignItems: 'center',
		gap: 10,
		fontSize: 14,
		color: 'var(--rr-text-secondary)',
	} as CSSProperties,

	/** Result card holding the rendered Markdown expense sheet. */
	result: {
		padding: 24,
		borderRadius: 12,
		border: '1px solid var(--rr-border)',
		backgroundColor: 'var(--rr-bg-paper)',
	} as CSSProperties,
};

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Receipt Desk — a one-shot generator. Paste receipt text or upload a receipt
 * photo/scan, run receiptdesk.pipe, and render the returned Markdown expense sheet.
 *
 * @param props.isConnected - Whether the shell WebSocket is connected.
 */
const HomeApp: React.FC<ShellAppProps> = () => {
	// The shared RocketRideClient + live connection state (provider-less hook).
	const { client, isConnected } = useShellConnection();

	// Form + async state.
	const [text, setText] = useState('');
	const [file, setFile] = useState<File | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [expenseSheet, setExpenseSheet] = useState<string | null>(null);

	// File input ref so we can clear the native control on reset.
	const fileInputRef = useRef<HTMLInputElement>(null);

	// Transient "Copied!" confirmation on the copy button.
	const [copied, setCopied] = useState(false);

	const canSubmit = !!client && isConnected && !loading && (text.trim().length > 0 || !!file);

	/** Run the pipeline and render the expense sheet (or an error). */
	const handleGenerate = useCallback(async () => {
		if (!client || !isConnected) {
			setError('Not connected to RocketRide yet. Please wait a moment and try again.');
			return;
		}
		setLoading(true);
		setError(null);
		setExpenseSheet(null);
		try {
			const markdown = await runReceiptDesk(client, { text, file: file ?? undefined });
			setExpenseSheet(markdown);
		} catch (err: unknown) {
			setError(err instanceof Error ? err.message : 'Something went wrong generating your expense sheet.');
		} finally {
			setLoading(false);
		}
	}, [client, isConnected, text, file]);

	/** Track the chosen file (single file only). */
	const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		setFile(e.target.files && e.target.files[0] ? e.target.files[0] : null);
	}, []);

	/** One-click try: drop the sample receipts into the textarea. */
	const handleLoadSample = useCallback(() => {
		setText(SAMPLE_RECEIPTS);
		setFile(null);
		if (fileInputRef.current) fileInputRef.current.value = '';
		setError(null);
	}, []);

	/** Copy the generated expense sheet to the clipboard. */
	const handleCopy = useCallback(async () => {
		if (!expenseSheet) return;
		try {
			await navigator.clipboard.writeText(expenseSheet);
			setCopied(true);
			window.setTimeout(() => setCopied(false), 1500);
		} catch {
			setError('Could not copy to the clipboard.');
		}
	}, [expenseSheet]);

	/** Download the expense sheet as a Markdown file. */
	const handleDownload = useCallback(() => {
		if (!expenseSheet) return;
		const blob = new Blob([expenseSheet], { type: 'text/markdown' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'expenses.md';
		a.click();
		URL.revokeObjectURL(url);
	}, [expenseSheet]);

	return (
		// One-column app (no sidebar) with the status bar on.
		<AppLayout showStatus>
			<div style={styles.container}>
				<div style={styles.inner}>
					{/* Header */}
					<div>
						<h1 style={styles.title}>Receipt Desk</h1>
						<p style={styles.subtitle}>
							Upload receipt photos (.png, .jpg) or a .pdf/.txt/.md — or paste receipt text —
							and get a categorized expense sheet: an itemized expenses table (date, merchant,
							category, amount) plus summary totals per category and a grand total.
						</p>
					</div>

					{/* Input card */}
					<div style={styles.card}>
						<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
							<label style={styles.label} htmlFor="receiptdesk-text">Receipts</label>
							<button
								type="button"
								style={styles.secondaryButton}
								onClick={handleLoadSample}
								disabled={loading}
							>
								Load sample
							</button>
						</div>
						<textarea
							id="receiptdesk-text"
							style={styles.textarea}
							placeholder="Paste your receipt text here — one or more receipts..."
							value={text}
							onChange={(e) => setText(e.target.value)}
							disabled={loading}
						/>

						<div style={styles.controls}>
							<div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
								<input
									ref={fileInputRef}
									type="file"
									accept={ACCEPTED_FILE_TYPES}
									onChange={handleFileChange}
									disabled={loading}
									aria-label="Upload a receipt photo or a .txt, .md, or .pdf file"
								/>
								{file && <span style={styles.fileHint}>{file.name}</span>}
							</div>

							<button
								type="button"
								style={{ ...styles.button, ...(canSubmit ? {} : styles.buttonDisabled) }}
								onClick={handleGenerate}
								disabled={!canSubmit}
							>
								{loading ? 'Generating…' : 'Generate expense sheet'}
							</button>
						</div>

						{!isConnected && (
							<span style={styles.fileHint}>Connecting to RocketRide…</span>
						)}
					</div>

					{/* Error state */}
					{error && <div style={styles.error} role="alert">{error}</div>}

					{/* Loading state */}
					{loading && (
						<div style={styles.loading}>
							<span>Building your expense sheet — this can take a little while…</span>
						</div>
					)}

					{/* Result */}
					{expenseSheet && !loading && (
						<div style={styles.result}>
							<div style={styles.resultHeader}>
								<h2 style={styles.resultTitle}>Your expense sheet</h2>
								<div style={styles.resultActions}>
									<button
										type="button"
										style={{ ...styles.secondaryButton, ...(canSubmit ? {} : styles.buttonDisabled) }}
										onClick={handleGenerate}
										disabled={!canSubmit}
										title="Generate a fresh expense sheet from the same receipts"
									>
										Regenerate
									</button>
									<button type="button" style={styles.secondaryButton} onClick={handleCopy}>
										{copied ? 'Copied!' : 'Copy'}
									</button>
									<button type="button" style={styles.secondaryButton} onClick={handleDownload}>
										Download .md
									</button>
								</div>
							</div>
							<MarkdownRenderer content={expenseSheet} />
						</div>
					)}
				</div>
			</div>
		</AppLayout>
	);
};

export default HomeApp;
