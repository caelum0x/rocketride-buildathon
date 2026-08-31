// MIT License
// Copyright (c) 2026 Aparavi Software AG

/** Allow importing .pipe files as JSON modules (see rsbuild rspack rule). */
declare module '*.pipe' {
	const value: Record<string, unknown>;
	export default value;
}
