# Human Avatar Model

Default model:

- `web/static/models/instructor.glb`

The renderer (`gesture3d.js`) automatically loads this file and switches from the procedural avatar to the skinned human model.
You can replace this file with your own instructor GLB (same filename) for higher realism.

Optional browser overrides (set before loading `gesture3d.js`):

```html
<script>
  window.GESTURE3D_AVATAR_MODEL_URL = "/static/models/instructor.glb";
  window.GESTURE3D_AVATAR_MODEL_SCALE = 1.55;
  window.GESTURE3D_AVATAR_MODEL_Y_OFFSET = -1.62;
</script>
```

Notes:
- Use a humanoid rig with named bones for shoulders, upper/lower arms, hands, and finger chains.
- Blendshapes/morph targets for mouth and blink are optional; if present, they are driven from face landmarks.
