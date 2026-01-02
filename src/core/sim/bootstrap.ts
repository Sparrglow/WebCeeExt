import type { WebCeeSimBootstrap } from './types';

function safeJsonForInlineScript(value: unknown): string {
  // Prevent closing the surrounding <script> tag
  return JSON.stringify(value).replace(/<\//g, '<\\/');
}

export function buildSimBootstrapScript(bootstrap: WebCeeSimBootstrap): string {
  const json = safeJsonForInlineScript(bootstrap);
  return `<script>window.__WEBCEE_SIM_BOOTSTRAP__ = ${json};</script>`;
}
