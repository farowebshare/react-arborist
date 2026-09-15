---
type: fix
---
Dragging an item in a tree can make the drag preview lag noticeably behind the mouse pointer,
the more so the longer and faster the pointer is moved.

The cause was that the library applied *every* `dragover` event to its store, and each of those
updates re-rendered the tree. `dragover` fires far more often than the browser paints, so the
renders piled up and each one showed an increasingly outdated pointer position.

The patch fixes this in two places:

- `state/dnd-slice.ts`: the reducer keeps the previous state object when the cursor or the hover
  destination did not actually change, so an unchanged hover triggers no re-render at all.
- `interfaces/tree-api.ts`: `tree.hover()` reaches the store at most once per animation frame (via
  the added `dnd/animation-frame-throttle.ts`), so dragging quickly across many rows renders once
  per frame instead of once per event.

The hovered target itself is still recorded synchronously, so `canDrop()` and `tree.drop()` keep
seeing the spot the pointer is actually over rather than the one the last painted frame left
behind: a release is evaluated exactly as it was before. The waiting update is discarded when the
drag ends, so a rejected drop cannot paint a cursor after the fact.
