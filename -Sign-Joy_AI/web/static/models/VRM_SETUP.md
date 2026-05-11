Place a VRM avatar at:

`web/static/models/avatar.vrm`

Or set a custom URL before the app scripts load:

```html
<script>
window.VRM_HAND_AVATAR_URL = "/static/models/your-avatar.vrm";
</script>
```

Notes:

- The new VRM viewer uses `@pixiv/three-vrm` and expects standard humanoid hand bones.
- The retargeting code rotates the wrist, fingers, and upper-arm chain from MediaPipe landmark directions.
- It does not place the mesh directly onto the landmark points.
