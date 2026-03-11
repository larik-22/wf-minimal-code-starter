// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
/**
 * FinsweetService: A singleton wrapper around the Finsweet Attributes library.
 *
 * Responsibilities:
 * 1. Safely await any Finsweet attribute (`waitForAttribute`).
 * 2. Provide a single source of truth for the `list` attribute instances (`whenListReady`, `getListInstances`).
 * 3. Register lifecycle hooks for `filter`, `beforeRender`, `render`, `afterRender` phases.
 * 4. Offer utilities such as `clearFilters()` for quick insight into the active filters.
 *
 * TODO:
 * - Add more utitlities for safe list manipulation
 * - Better type safety
 * - Add support for other finsweet solutions (load, rangeslider, etc)
 *
 * This class purposefully avoids any framework-specific code and keeps its public API minimal yet
 * extensible for future requirements.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

declare global {
  interface Window {
    FinsweetAttributes?: any;
  }
}

function ensureFinsweetGlobal(): any {
  if (typeof window === "undefined") {
    throw new Error("FinsweetService can only run in a browser environment.");
  }
  window.FinsweetAttributes ||= [];
  return window.FinsweetAttributes;
}

export class FinsweetService {
  // Map<attributeKey, promise>
  private attributePromises = new Map<string, Promise<any>>();

  // Holds `list` API once ready
  private listInstances: any | undefined;

  // Eagerly-constructed promise that resolves when `list` is available
  private listReadyPromise: Promise<any>;

  constructor() {
    // Pre-warm the list promise so every import gets the same reference
    this.listReadyPromise = this.waitForAttribute("list").then((api) => {
      this.listInstances = api;
      return api;
    });
  }

  public waitForAttribute<T = any>(key: string): Promise<T> {
    if (this.attributePromises.has(key)) {
      return this.attributePromises.get(key) as Promise<T>;
    }

    // If already loaded (script executed before us) resolve synchronously
    const maybeLoaded = this.resolveImmediatelyIfLoaded(key);
    if (maybeLoaded) {
      const p = maybeLoaded as Promise<T>;
      this.attributePromises.set(key, p);
      return p;
    }

    // Otherwise queue callback until attribute initialises
    const promise: Promise<T> = new Promise((resolve) => {
      const global = ensureFinsweetGlobal();
      (global as any).push([
        key,
        (api: T) => {
          resolve(api);
        },
      ]);
    });

    this.attributePromises.set(key, promise);
    return promise;
  }

  public async restartAttribute<T = any>(key: string): Promise<T> {
    const global = ensureFinsweetGlobal();
    if (global && typeof global === "object" && "modules" in global) {
      const controls = global.modules?.[key];
      if (controls) {
        controls.restart();
        return controls.loading as Promise<T>;
      }
    }
    // Fallback: just wait for first load
    return this.waitForAttribute<T>(key);
  }

  public whenListReady<T = any>(): Promise<T> {
    return this.listReadyPromise as Promise<T>;
  }

  public getListInstances<T = any>(): T | undefined {
    return this.listInstances as T | undefined;
  }

  private registerHook(
    phase: "filter" | "sort" | "beforeRender" | "render" | "afterRender",
    callback: (listInstance: any, items: any[]) => void
  ): void {
    this.registerHookInternal(phase, (list, items) => {
      callback(list, items);
      return items;
    });
  }

  /**
   * Register a hook that can return modified items (for filter, sort, beforeRender phases).
   * Callback return value is passed to the next lifecycle phase.
   */
  private registerHookMutable(
    phase: "filter" | "sort" | "beforeRender",
    callback: (listInstance: any, items: any[]) => any[] | void
  ): void {
    this.registerHookInternal(phase, (list, items) => {
      const result = callback(list, items);
      return result !== undefined ? result : items;
    });
  }

  private registerHookInternal(
    phase: string,
    callback: (listInstance: any, items: any[]) => any[]
  ): void {
    this.whenListReady<any>().then((listsApi) => {
      const instances: any[] = Array.isArray(listsApi)
        ? listsApi
        : listsApi && typeof listsApi === "object"
          ? Object.values(listsApi)
          : [];

      instances.forEach((list) => {
        if (list && typeof list.addHook === "function") {
          list.addHook(phase, (items: any[]) => callback(list, items));
        }
      });
    });
  }

  public onFilter(cb: (list: any, items: any[]) => void): void {
    this.registerHook("filter", cb);
  }

  public onSort(cb: (list: any, items: any[]) => any[] | void): void {
    this.registerHookMutable("sort", cb);
  }

  public onBeforeRender(cb: (list: any, items: any[]) => any[] | void): void {
    this.registerHookMutable("beforeRender", cb);
  }

  public onRender(cb: (list: any, items: any[]) => void): void {
    this.registerHook("render", cb);
  }

  public onAfterRender(cb: (list: any, items: any[]) => void): void {
    this.registerHook("afterRender", cb);
  }

  /**
   * Get the list instance by attribute
   * @param attribute - The attribute to get the list instance for (e.g. 'data-products-list')
   * @returns The finsweet list instance
   */
  public async getListByAttribute(attribute: string): Promise<any | undefined> {
    const listsApi = await this.whenListReady();

    // Normalise to an array irrespective of the structure we receive.
    const listArray: any[] = Array.isArray(listsApi)
      ? listsApi
      : listsApi && typeof listsApi === "object"
        ? Object.values(listsApi)
        : [];

    const targetList = listArray.find((list) =>
      list?.listElement?.attributes.getNamedItem(attribute)
    ) as any;

    if (!targetList) return undefined;

    // -------------------------------------------------------------------
    // Ensure the instance has finished all asynchronous loading tasks.
    // -------------------------------------------------------------------
    // length before loaders
    const loaders: Promise<void>[] = [];

    if (targetList.loadingSearchParamsData)
      loaders.push(targetList.loadingSearchParamsData);
    if (targetList.loadingPaginationElements)
      loaders.push(targetList.loadingPaginationElements);
    if (targetList.loadingPaginatedItems)
      loaders.push(targetList.loadingPaginatedItems);

    // Wait for every promise (ignore undefined values) to resolve.
    if (loaders.length) {
      try {
        await Promise.all(loaders);
      } catch (err) {
        console.warn("[FinsweetService] Target list loaders rejected", err);
      }
    }

    return targetList;
  }

  /**
   * Clears all filter conditions except the specified condition for the provided
   * list instance. If the specified condition is missing, all conditions are
   * removed. This keeps the source-of-truth inside Finsweet in sync when the
   * dataset (mode) changes.
   */
  public clearFiltersExceptFor(
    listInstance: any,
    exceptFor: string[] = []
  ): void {
    if (!listInstance) return;

    const filtersGroup = listInstance?.filters?.value?.groups?.[0];
    if (!filtersGroup) return;

    const typeCondition = filtersGroup.conditions.find((c: any) =>
      exceptFor?.includes(c.fieldKey)
    );

    if (typeCondition) {
      const plainTypeCondition = JSON.parse(JSON.stringify(typeCondition));
      filtersGroup.conditions.splice(
        0,
        filtersGroup.conditions.length,
        plainTypeCondition
      );
    } else {
      console.warn(
        `[FinsweetService] No condition found. Clearing all filters.`
      );
      filtersGroup.conditions.splice(0, filtersGroup.conditions.length);
    }
  }

  /**
   * Clears filters by removing specific conditions or all conditions if none specified
   * @param listInstance – the list instance to clear filters for
   * @param specificConditionKeys – the condition keys to remove (if empty, removes all)
   */
  public clearFilters(
    listInstance: any,
    specificConditionKeys: string[] = []
  ): void {
    if (!listInstance) return;

    const filtersGroup = listInstance?.filters?.value?.groups?.[0];
    if (!filtersGroup) return;

    if (specificConditionKeys.length === 0) {
      // Remove all conditions
      filtersGroup.conditions.splice(0, filtersGroup.conditions.length);
    } else {
      // clear without causing Uncaught (in promise) DataCloneError: Failed to execute 'postMessage' on 'Worker': #<Object> could not be cloned.
      // IMPORTANT, this is a vue ref so DataCloneERROR can happen, we can't use .filter
      for (const condition of filtersGroup.conditions) {
        if (specificConditionKeys.includes(condition.fieldKey)) {
          filtersGroup.conditions.splice(
            filtersGroup.conditions.indexOf(condition),
            1
          );
        }
      }
    }
  }

  private resolveImmediatelyIfLoaded(key: string): any | undefined {
    const global = ensureFinsweetGlobal();
    if (global && typeof global === "object" && "modules" in global) {
      const controls = global.modules?.[key];
      if (controls) {
        const maybePromise = controls.loading;
        return maybePromise && typeof maybePromise.then === "function"
          ? maybePromise
          : Promise.resolve(maybePromise);
      }
    }
    return undefined;
  }
}

import type { Feature } from "../../types/feature";

const finsweetService = new FinsweetService();

const finsweetFeature: Feature = {
  name: "finsweet",
  global: true,
  init() {
    // Warm up the service so it's ready for use on any page (including agenda)
    finsweetService.whenListReady().catch(() => {
      // Finsweet list may not exist on all pages; that's ok
    });
  },
};

export default finsweetFeature;
export { finsweetService };
