import { useSyncExternalStore } from "use-sync-external-store/shim";
import { useTreeApi } from "../context";

/**
 * Re-render a row when it becomes, or stops being, the drop destination.
 * The destination is deliberately kept out of NodesContext, which every visible
 * row consumes: subscribing per row means a hover only repaints the two rows
 * whose highlight moved instead of the whole list.
 */
export function useDestinationUpdates(id: string) {
  const tree = useTreeApi();
  return useSyncExternalStore(
    tree.store.subscribe,
    () => tree.willReceiveDrop(id),
    () => false,
  );
}
