import * as vscode from 'vscode';
import type { WebCeeSimEffect } from './sim/types';
import { coerceHandlerEffects, coerceInitialData, coerceLists } from './sim/validate';

export class WebCeeConfiguration {
  static previewEnabled(): boolean {
    return vscode.workspace.getConfiguration('webcee').get<boolean>('preview.enabled', true);
  }

  static previewAutoRefresh(): boolean {
    return vscode.workspace.getConfiguration('webcee').get<boolean>('preview.autoRefresh', true);
  }

  static previewLivePreview(): boolean {
    return vscode.workspace.getConfiguration('webcee').get<boolean>('preview.livePreview', false);
  }

  static previewRefreshDelay(): number {
    return vscode.workspace.getConfiguration('webcee').get<number>('preview.refreshDelay', 300);
  }

  static diagnosticsEnabled(): boolean {
    return vscode.workspace.getConfiguration('webcee').get<boolean>('diagnostics.enabled', true);
  }

  static simulationPollIntervalMs(): number {
    return vscode.workspace.getConfiguration('webcee').get<number>('simulation.pollIntervalMs', 100);
  }

  static simulationInitialData(): Record<string, string> {
    const raw = vscode.workspace.getConfiguration('webcee').get<unknown>('simulation.initialData', {});
    return coerceInitialData(raw);
  }

  static simulationHandlerEffects(): Record<string, WebCeeSimEffect | WebCeeSimEffect[]> {
    const raw = vscode.workspace.getConfiguration('webcee').get<unknown>('simulation.handlerEffects', {});
    return coerceHandlerEffects(raw);
  }

  static simulationModelUpdateEffects(): Record<string, WebCeeSimEffect | WebCeeSimEffect[]> {
    const raw = vscode.workspace.getConfiguration('webcee').get<unknown>('simulation.modelUpdateEffects', {});
    return coerceHandlerEffects(raw);
  }

  static simulationLists(): Record<string, unknown[]> {
    const raw = vscode.workspace.getConfiguration('webcee').get<unknown>('simulation.lists', {});
    return coerceLists(raw);
  }

  // Aliases used by providers (keep stable API surface)
  static isPreviewEnabled(): boolean {
    return this.previewEnabled();
  }

  static isPreviewAutoRefreshEnabled(): boolean {
    return this.previewAutoRefresh();
  }

  static isLivePreviewEnabled(): boolean {
    return this.previewLivePreview();
  }

  static getPreviewRefreshDelayMs(): number {
    return this.previewRefreshDelay();
  }

  static isDiagnosticsEnabled(): boolean {
    return this.diagnosticsEnabled();
  }
}
