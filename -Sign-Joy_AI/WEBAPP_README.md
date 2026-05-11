# Web App Run Guide

## 1) Setup environment

```powershell
cd "C:\Users\User1\Music\Model t3 mid\Model t3"
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

## 2) Start the web server

```powershell
python web_app.py
```

Open: `http://127.0.0.1:5000`

## 3) Use the app

1. Enter text and click `Process Input`
2. Or click `Start Microphone`, speak, then click `Process Input`
3. Review tokenized units and sequence cards
4. Use `Play Sequence` to play mapped sign clips in order
5. Use `Play Instructor` to stream the 2D full-body MediaPipe landmark view in-browser
6. Use `Play Overlay` to stream the realistic OpenCV full-body + facial-expression overlay
7. Use `Play 3D Gesture` to animate the 3D character from hand + pose + face landmarks

## Notes

- Browser speech input uses Web Speech API (best support in Chrome/Edge).
- Sinhala text is translated in backend via `googletrans`.
- The 3D avatar renderer first tries CDN Three.js, then falls back to the local
  `web/static/vendor/three.min.js` copy. Internet access is optional.
- Full-body landmark view is streamed from Flask (`/api/skeleton/stream`) and includes
  hand, shoulder, elbow, and facial landmark contours without opening `cv2.imshow`.
- Realistic overlay stream (`/api/overlay/stream`) now uses hand + pose + face landmarks
  to drive shoulders/elbows/wrists and facial-expression guides in the instructor figure.
- 3D landmark sequence data (`/api/landmarks/sequence`) now includes hand + pose + face
  payloads and is rendered as a full-body 3D character panel.
- If arithmetic extraction is valid, the UI uses the teaching sequence
  (`num1 -> op -> num2 -> equal -> result`).
- Otherwise, it falls back to token/letter sequence rendering.
