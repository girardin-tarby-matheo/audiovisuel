import type { CatalogItem } from "./types";

function clonePorts<T>(ports: T[] | undefined): T[] {
    return ports ? ports.map((port) => ({ ...(port as Record<string, unknown>) })) as T[] : [];
}

export function createCatalogEditorSnapshot(item: CatalogItem): CatalogItem {
    return {
        ...item,
        portsIn: clonePorts(item.portsIn),
        portsOut: clonePorts(item.portsOut),
    };
}

export function shouldSyncCatalogEditor(current: CatalogItem | null, next: CatalogItem): boolean {
    if (!current) return true;
    if (current.id !== next.id) return true;

    return (
        current.name !== next.name ||
        current.short !== next.short ||
        current.category !== next.category ||
        current.description !== next.description ||
        current.color !== next.color ||
        current.image !== next.image ||
        current.fit !== next.fit ||
        current.background !== next.background ||
        current.isCustom !== next.isCustom ||
        current.needsPower !== next.needsPower ||
        current.deviceType !== next.deviceType ||
        current.visualKey !== next.visualKey ||
        (current.portsIn?.length ?? 0) !== (next.portsIn?.length ?? 0) ||
        (current.portsOut?.length ?? 0) !== (next.portsOut?.length ?? 0)
    );
}
