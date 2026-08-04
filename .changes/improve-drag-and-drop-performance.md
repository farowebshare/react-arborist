---
type: feature
---
Dragging an item in a tree can make the drag preview lag noticeably behind the mouse pointer,
the more so the longer and faster the pointer is moved.

The cause was that the library handles *every* `dragover` event, and each one measures the DOM,
updates the tree store and re-renders every visible row. `dragover` fires far more often than the
browser paints, so the renders piled up and each one showed an increasingly outdated pointer
position.

The patch fixes this in three places:

- `dnd/drop-hook.ts` / `dnd/outer-drop-hook.ts`: the `hover` handling is coalesced into at most one
  update per animation frame (via the added `dnd/use-animation-frame-throttle.ts`), so only the most
  recent event of each frame is processed.
- `state/dnd-slice.ts`: the reducer keeps the previous state object when the cursor or the hover
  destination did not actually change, so no re-render is triggered at all.
- `components/row-container.tsx`: the rendered row/node elements are memoized. The container
  re-renders on every tree state change, but the (expensive) row and node components now only
  re-render when the state of that specific row changed.

Deferring the `hover` handling needs two precautions, both of which cost a drop that lands one row
off (or on the wrong parent) when they are missing:

- **The pending update has to be flushed when the drop happens.** `react-dnd`'s HTML5 backend
  dispatches a final `hover` and the `drop` in the same task, so without a flush the drop is
  evaluated against the state of the previous frame. The throttle therefore exposes a `flush()`
  that both drop hooks call before `canDrop()` / `tree.drop()`.
- **The `react-dnd` monitor has to be read synchronously in the `hover` callback.** The monitor is
  live, mutable state, and `dnd-core` invokes the target callbacks *before* it dispatches its own
  `HOVER` action, so a callback always sees the offset of the *previous* event. Reading
  `getClientOffset()` inside the deferred callback instead returns the current one, which is a whole
  row off at drop time. The offset is read up front and captured; only the DOM measurement and the
  store update (the expensive parts) are deferred.
