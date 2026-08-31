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
// APP DESCRIPTOR — studypack-ui MF remote entry point (Study Pack)
// =============================================================================

import type { AppDescriptor } from 'shell';
import HomeApp from './HomeApp';

/**
 * AppDescriptor for Study Pack.
 *
 * A one-shot generator: paste lecture material (or upload a .txt/.md/.pdf)
 * and the studypack.pipe pipeline returns an exam-ready study pack in
 * Markdown. Runs without authentication (authenticated: false in manifest).
 */
const HOME_APP: AppDescriptor = {
	id: 'local.studypack',
	name: 'Study Pack',
	branding: {
		appName: 'Study Pack',
	},
	// One-column app (no sidebar) with the status bar on — declared by
	// HomeApp's root AppLayout.
	app: HomeApp,
};

export default HOME_APP;
