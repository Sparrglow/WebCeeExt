export interface WebCeeSimEffectSet {
  type: 'set';
  key: string;
  val: string | number | boolean | null;
}

export interface WebCeeSimEffectSetTemplate {
  type: 'setTemplate';
  key: string;
  template: string;
}

export interface WebCeeSimEffectInc {
  type: 'inc';
  key: string;
  by?: number;
}

export interface WebCeeSimEffectToggle {
  type: 'toggle';
  key: string;
}

export type WebCeeSimEffect = WebCeeSimEffectSet | WebCeeSimEffectInc | WebCeeSimEffectToggle;

export interface WebCeeSimBootstrap {
  pollIntervalMs?: number;
  initialData?: Record<string, string>;
  // handler name -> effect(s)
  handlerEffects?: Record<string, WebCeeSimEffect | WebCeeSimEffect[]>;
  // model update hook: key -> effect(s)
  modelUpdateEffects?: Record<string, WebCeeSimEffect | WebCeeSimEffect[]>;
  // list name -> json array
  lists?: Record<string, unknown[]>;
  onTriggerLog?: boolean;
  onModelUpdateLog?: boolean;
}
