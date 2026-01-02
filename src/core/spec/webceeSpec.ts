export const WEBCEE_COMPONENT_CALLS = [
  'wce_container',
  'wce_row',
  'wce_col',
  'wce_card',
  'wce_panel',
  'wce_text',
  'wce_button',
  'wce_input',
  'wce_slider',
  'wce_progress'
] as const;

export const WEBCEE_PROPERTY_CALLS = ['wce_css', 'wce_bind', 'wce_on_click'] as const;

export type WebCeePropertyCall = (typeof WEBCEE_PROPERTY_CALLS)[number];

// Sets are used by analyzer/diagnostics for fast membership checks.
const KNOWN_COMPONENTS = new Set<string>(WEBCEE_COMPONENT_CALLS);
const PROPERTY_CALLS = new Set<string>(WEBCEE_PROPERTY_CALLS);

export const WEBCEE_KNOWN_CALLS = {
  KNOWN_COMPONENTS,
  PROPERTY_CALLS
};
