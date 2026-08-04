import { useDrop } from "react-dnd";
import { useTreeApi } from "../context";
import { DragItem } from "../types/dnd";
import { computeDrop } from "./compute-drop";
import { DropResult } from "./drop-hook";
import { useAnimationFrameThrottle } from "./use-animation-frame-throttle";

export function useOuterDrop() {
  const tree = useTreeApi();
  const { schedule, flush } = useAnimationFrameThrottle();

  // In case we drop an item at the bottom of the list
  const [, drop] = useDrop<DragItem, DropResult | null, { isOver: boolean }>(
    () => ({
      accept: "NODE",
      canDrop: (_item, m) => {
        if (!m.isOver({ shallow: true })) return false;
        return tree.canDrop();
      },
      hover: (_item, m) => {
        if (!m.isOver({ shallow: true })) return;
        const offset = m.getClientOffset();
        const element = tree.listEl.current;
        // See the comments in `useDropHook` about bailing out before scheduling and about
        // coalescing the `dragover` events.
        if (!element || !offset) return;
        schedule(() => {
          const { cursor, drop } = computeDrop({
            element: element,
            offset: offset,
            indent: tree.indent,
            node: null,
            prevNode: tree.visibleNodes[tree.visibleNodes.length - 1],
            nextNode: null,
          });
          tree.hover(drop, cursor);
        });
      },
      drop: (_item, m) => {
        if (!m.isOver({ shallow: true })) return null;
        // See the comment in `useDropHook` about flushing.
        flush();
        if (!m.canDrop()) return null;
        tree.drop();
      },
    }),
    [tree],
  );

  drop(tree.listEl);
}
