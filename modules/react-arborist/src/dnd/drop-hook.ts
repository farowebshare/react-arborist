import { RefObject } from "react";
import { ConnectDropTarget, useDrop } from "react-dnd";
import { useTreeApi } from "../context";
import { NodeApi } from "../interfaces/node-api";
import { DragItem } from "../types/dnd";
import { computeDrop } from "./compute-drop";
import { useAnimationFrameThrottle } from "./use-animation-frame-throttle";

export type DropResult = {
  parentId: string | null;
  index: number | null;
};

export function useDropHook(
  el: RefObject<HTMLElement | null>,
  node: NodeApi<any>,
): ConnectDropTarget {
  const tree = useTreeApi();
  const { schedule, flush } = useAnimationFrameThrottle();
  const [_, dropRef] = useDrop<DragItem, DropResult | null, void>(
    () => ({
      accept: "NODE",
      canDrop: () => tree.canDrop(),
      hover: (_item, m) => {
        // Read the monitor now, not inside the throttled callback. dnd-core calls the
        // hover callbacks *before* it dispatches its own HOVER action, so the monitor
        // still describes the previous event at this point and has moved on by the time
        // a later frame (or the `flush()` below) runs.
        const offset = m.getClientOffset();
        // `dragover` fires much more often than the browser paints. Measuring the DOM and
        // updating the store for every single event builds up a backlog of renders, which
        // makes the drag preview and the drop cursor lag behind the pointer. Only handle
        // the most recent event of each animation frame instead.
        schedule(() => {
          if (!el.current || !offset) return;
          const { cursor, drop } = computeDrop({
            element: el.current,
            offset: offset,
            indent: tree.indent,
            node: node,
            prevNode: node.prev,
            nextNode: node.next,
          });
          tree.hover(drop, cursor);
        });
      },
      drop: (_, m) => {
        // The backend dispatches a final hover immediately before the drop, in the same
        // task. Apply it now instead of a frame from now, so the drop lands on the target
        // the cursor was showing rather than wherever the last painted frame left it.
        flush();
        if (!m.canDrop()) return null;
        tree.drop();
      },
    }),
    [node, el.current, tree.props],
  );

  return dropRef;
}
