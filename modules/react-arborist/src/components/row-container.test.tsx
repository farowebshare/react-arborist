import { createRef } from "react";
import { act, render } from "@testing-library/react";
import { Tree } from "./tree";
import { TreeApi } from "../interfaces/tree-api";
import { actions as dnd } from "../state/dnd-slice";
import { NodeRendererProps } from "../types/renderers";

type Datum = { id: string; name: string; children?: Datum[] };

const data: Datum[] = [
  { id: "a", name: "a", children: [{ id: "a1", name: "a1" }] },
  { id: "b", name: "b", children: [{ id: "b1", name: "b1" }] },
];

/* A drag hovers a new folder many times over its lifetime. Every one of those
   destination changes used to invalidate the whole nodes state, which every row
   consumes, so all of them re-rendered along with their (arbitrarily expensive)
   custom node renderer. */
test("a drop destination change only re-renders the rows it affects", () => {
  const renders: Record<string, number> = {};
  function Node({ node }: NodeRendererProps<Datum>) {
    renders[node.id] = (renders[node.id] ?? 0) + 1;
    return <div>{node.data.name}</div>;
  }

  const ref = createRef<TreeApi<Datum> | undefined>();
  render(
    <Tree<Datum> data={data} ref={ref} openByDefault>
      {Node}
    </Tree>,
  );
  const api = ref.current!;
  expect(Object.keys(renders).sort()).toEqual(["a", "a1", "b", "b1"]);

  let before = { ...renders };
  act(() => {
    api.dispatch(dnd.setDestination("b", null));
  });
  expect(api.willReceiveDrop("b")).toBe(true);
  expect(renders).toEqual({ ...before, b: before.b + 1 });

  // Moving the destination repaints the row that loses the highlight and the
  // one that gains it — and nothing else.
  before = { ...renders };
  act(() => {
    api.dispatch(dnd.setDestination("a", null));
  });
  expect(renders).toEqual({ ...before, a: before.a + 1, b: before.b + 1 });

  // An unchanged destination is not a state change at all.
  before = { ...renders };
  act(() => {
    api.dispatch(dnd.setDestination("a", null));
  });
  expect(renders).toEqual(before);
});
