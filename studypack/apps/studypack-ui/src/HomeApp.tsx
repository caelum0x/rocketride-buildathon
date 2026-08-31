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
// STUDY PACK — paste lecture material, get an exam-ready study pack
// =============================================================================
//
// Every `shell` symbol used here was read from ground truth:
//   - AppLayout, ShellAppProps ........ engine/packages/shell/contract/versions/v1.d.ts
//   - useShellConnection() → { client, isConnected } (RocketRideClient) ....... same file
//   - MarkdownRenderer ({ content }) ...................................... same file
//   - Real Studio-app usage of AppLayout + useShellConnection for a pipeline
//     app ........................ engine/apps/aparavi-ui/src/AparaviApp.tsx
// The pipeline call itself lives in ./lib/runStudyPack.ts (cited there).
// =============================================================================

import React, { useCallback, useRef, useState, type CSSProperties } from 'react';
import { AppLayout, MarkdownRenderer, useShellConnection } from 'shell';
import type { ShellAppProps } from 'shell';
import { runStudyPack } from './lib/runStudyPack';

// =============================================================================
// CONSTANTS
// =============================================================================

/** File types the parse component can turn into study material. */
const ACCEPTED_FILE_TYPES = '.txt,.md,.pdf';

/**
 * A short real lecture excerpt so a first-time user can try the app in one
 * click without hunting for material. Kept inline (no bundler path) on purpose.
 */
const SAMPLE_LECTURE = `Lecture 7 — Information Diffusion in Networks

Information, behaviours, and infections spread across a network in three broad model families.

1. Epidemic models. In SI a node is Susceptible or Infected and stays infected forever. SIR adds a Recovered state (infected nodes recover and can't be reinfected). SIS lets infected nodes become Susceptible again, so infection circulates indefinitely. SIRS sits between: recovered nodes lose immunity after a delay. Key parameters are the infection rate beta and recovery rate gamma; the ratio R0 = beta/gamma decides whether an outbreak grows (R0 > 1) or dies out.

2. Cascade models. Independent Cascade (IC): a newly active node gets one chance to activate each neighbour with an edge probability (sender-driven). Linear Threshold (LT): each node activates when the summed weight of its active neighbours crosses a random threshold (receiver-driven).

3. Influence maximisation. Choose k seed nodes to maximise expected final spread. The spread function is monotone and submodular, so greedy selection (repeatedly add the node with the largest marginal gain) gives a (1 - 1/e) ≈ 63% approximation of the optimum.`;

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

	/** The lecture-text textarea. */
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

	/** Header row above the rendered study pack (title + actions). */
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

	/** Result card holding the rendered Markdown study pack. */
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
 * Study Pack — a one-shot generator. Paste lecture text or upload a document,
 * run studypack.pipe, and render the returned Markdown study pack.
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
	const [studyPack, setStudyPack] = useState<string | null>(null);

	// File input ref so we can clear the native control on reset.
	const fileInputRef = useRef<HTMLInputElement>(null);

	// Transient "Copied!" confirmation on the copy button.
	const [copied, setCopied] = useState(false);

	const canSubmit = !!client && isConnected && !loading && (text.trim().length > 0 || !!file);

	/** Run the pipeline and render the study pack (or an error). */
	const handleGenerate = useCallback(async () => {
		if (!client || !isConnected) {
			setError('Not connected to RocketRide yet. Please wait a moment and try again.');
			return;
		}
		setLoading(true);
		setError(null);
		setStudyPack(null);
		try {
			const markdown = await runStudyPack(client, { text, file: file ?? undefined });
			setStudyPack(markdown);
		} catch (err: unknown) {
			setError(err instanceof Error ? err.message : 'Something went wrong generating your study pack.');
		} finally {
			setLoading(false);
		}
	}, [client, isConnected, text, file]);

	/** Track the chosen file (single file only). */
	const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		setFile(e.target.files && e.target.files[0] ? e.target.files[0] : null);
	}, []);

	/** One-click try: drop the sample lecture into the textarea. */
	const handleLoadSample = useCallback(() => {
		setText(SAMPLE_LECTURE);
		setFile(null);
		if (fileInputRef.current) fileInputRef.current.value = '';
		setError(null);
	}, []);

	/** Copy the generated study pack to the clipboard. */
	const handleCopy = useCallback(async () => {
		if (!studyPack) return;
		try {
			await navigator.clipboard.writeText(studyPack);
			setCopied(true);
			window.setTimeout(() => setCopied(false), 1500);
		} catch {
			setError('Could not copy to the clipboard.');
		}
	}, [studyPack]);

	/** Download the study pack as a Markdown file. */
	const handleDownload = useCallback(() => {
		if (!studyPack) return;
		const blob = new Blob([studyPack], { type: 'text/markdown' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'study-pack.md';
		a.click();
		URL.revokeObjectURL(url);
	}, [studyPack]);

	return (
		// One-column app (no sidebar) with the status bar on.
		<AppLayout showStatus>
			<div style={styles.container}>
				<div style={styles.inner}>
					{/* Header */}
					<div>
						<h1 style={styles.title}>Study Pack</h1>
						<p style={styles.subtitle}>
							Paste lecture notes, a transcript, or slide text — or upload a .txt, .md, or .pdf —
							and get an exam-ready study pack: summary, key concepts, detailed notes, practice
							questions, and an answer key.
						</p>
					</div>

					{/* Input card */}
					<div style={styles.card}>
						<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
							<label style={styles.label} htmlFor="studypack-text">Lecture material</label>
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
							id="studypack-text"
							style={styles.textarea}
							placeholder="Paste your lecture transcript, notes, or slide text here..."
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
									aria-label="Upload a .txt, .md, or .pdf file"
								/>
								{file && <span style={styles.fileHint}>{file.name}</span>}
							</div>

							<button
								type="button"
								style={{ ...styles.button, ...(canSubmit ? {} : styles.buttonDisabled) }}
								onClick={handleGenerate}
								disabled={!canSubmit}
							>
								{loading ? 'Generating…' : 'Generate study pack'}
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
							<span>Building your study pack — this can take a little while…</span>
						</div>
					)}

					{/* Result */}
					{studyPack && !loading && (
						<div style={styles.result}>
							<div style={styles.resultHeader}>
								<h2 style={styles.resultTitle}>Your study pack</h2>
								<div style={styles.resultActions}>
									<button
										type="button"
										style={{ ...styles.secondaryButton, ...(canSubmit ? {} : styles.buttonDisabled) }}
										onClick={handleGenerate}
										disabled={!canSubmit}
										title="Generate a fresh study pack from the same material"
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
							<MarkdownRenderer content={studyPack} />
						</div>
					)}
				</div>
			</div>
		</AppLayout>
	);
};

export default HomeApp;
