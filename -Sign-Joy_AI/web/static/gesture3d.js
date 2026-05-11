(function (global) {
    const HAND_CONNECTIONS = [
        [0, 1], [1, 2], [2, 3], [3, 4],
        [0, 5], [5, 6], [6, 7], [7, 8],
        [5, 9], [9, 10], [10, 11], [11, 12],
        [9, 13], [13, 14], [14, 15], [15, 16],
        [13, 17], [17, 18], [18, 19], [19, 20],
        [0, 17],
    ];
    const HAND_FINGER_GROUPS = {
        thumb: [0, 1, 2, 3, 4],
        index: [0, 5, 6, 7, 8],
        middle: [0, 9, 10, 11, 12],
        ring: [0, 13, 14, 15, 16],
        pinky: [0, 17, 18, 19, 20],
    };
    const HAND_FINGER_COLORS = {
        thumb: 0xffc58d,
        index: 0xffb069,
        middle: 0xff9967,
        ring: 0xf78d67,
        pinky: 0xf17767,
    };
    const CARTOON_FINGER_ORDER = ["thumb", "index", "middle", "ring", "pinky"];
    const CARTOON_FINGER_CONFIG = {
        thumb: {
            baseIndex: 1,
            tipIndex: 4,
            baseX: -0.34,
            baseY: 0.02,
            baseZ: 0.05,
            length: 0.58,
            sideLean: -0.56,
            spreadResponse: 0.42,
            curlBias: 0.08,
            curlScale: 1.15,
            thickness: 1.18,
        },
        index: {
            baseIndex: 5,
            tipIndex: 8,
            baseX: 0.32,
            baseY: 0.15,
            baseZ: 0.015,
            length: 0.90,
            sideLean: 0.10,
            spreadResponse: 0.20,
            curlBias: -0.04,
            curlScale: 1.0,
            thickness: 1.0,
        },
        middle: {
            baseIndex: 9,
            tipIndex: 12,
            baseX: 0.10,
            baseY: 0.18,
            baseZ: 0.01,
            length: 1.0,
            sideLean: 0.03,
            spreadResponse: 0.10,
            curlBias: -0.02,
            curlScale: 0.92,
            thickness: 1.0,
        },
        ring: {
            baseIndex: 13,
            tipIndex: 16,
            baseX: -0.12,
            baseY: 0.17,
            baseZ: 0.012,
            length: 0.88,
            sideLean: -0.02,
            spreadResponse: 0.15,
            curlBias: 0.02,
            curlScale: 0.95,
            thickness: 0.98,
        },
        pinky: {
            baseIndex: 17,
            tipIndex: 20,
            baseX: -0.32,
            baseY: 0.14,
            baseZ: 0.01,
            length: 0.72,
            sideLean: -0.10,
            spreadResponse: 0.18,
            curlBias: 0.06,
            curlScale: 1.02,
            thickness: 0.94,
        },
    };

    const TOKEN_HANDSHAPE_PRESETS = {
        "0": {
            thumb: { curl: 0.86, spread: -0.08, extend: 0.18 },
            index: { curl: 0.94, spread: 0.02, extend: 0.14 },
            middle: { curl: 0.95, spread: 0.00, extend: 0.14 },
            ring: { curl: 0.95, spread: -0.02, extend: 0.14 },
            pinky: { curl: 0.92, spread: -0.04, extend: 0.16 },
        },
        "1": {
            thumb: { curl: 0.52, spread: 0.10, extend: 0.42 },
            index: { curl: 0.04, spread: 0.18, extend: 1.0 },
            middle: { curl: 0.92, spread: 0.02, extend: 0.14 },
            ring: { curl: 0.96, spread: -0.02, extend: 0.12 },
            pinky: { curl: 0.96, spread: -0.04, extend: 0.12 },
        },
        "2": {
            thumb: { curl: 0.44, spread: 0.12, extend: 0.46 },
            index: { curl: 0.05, spread: 0.20, extend: 1.0 },
            middle: { curl: 0.05, spread: 0.06, extend: 1.0 },
            ring: { curl: 0.90, spread: -0.02, extend: 0.14 },
            pinky: { curl: 0.92, spread: -0.05, extend: 0.12 },
        },
        "3": {
            thumb: { curl: 0.05, spread: 0.18, extend: 0.96 },
            index: { curl: 0.04, spread: 0.20, extend: 1.0 },
            middle: { curl: 0.04, spread: 0.08, extend: 1.0 },
            ring: { curl: 0.92, spread: -0.04, extend: 0.16 },
            pinky: { curl: 0.94, spread: -0.07, extend: 0.14 },
        },
        "4": {
            thumb: { curl: 0.84, spread: -0.06, extend: 0.18 },
            index: { curl: 0.05, spread: 0.16, extend: 1.0 },
            middle: { curl: 0.05, spread: 0.06, extend: 1.0 },
            ring: { curl: 0.05, spread: -0.04, extend: 1.0 },
            pinky: { curl: 0.05, spread: -0.12, extend: 1.0 },
        },
        "5": {
            thumb: { curl: 0.14, spread: 0.05, extend: 0.78 },
            index: { curl: 0.04, spread: 0.24, extend: 1.0 },
            middle: { curl: 0.04, spread: 0.08, extend: 1.0 },
            ring: { curl: 0.04, spread: -0.08, extend: 1.0 },
            pinky: { curl: 0.04, spread: -0.22, extend: 1.0 },
        },
        add: {
            thumb: { curl: 0.24, spread: 0.10, extend: 0.62 },
            index: { curl: 0.16, spread: 0.14, extend: 0.82 },
            middle: { curl: 0.18, spread: 0.04, extend: 0.82 },
            ring: { curl: 0.20, spread: -0.04, extend: 0.76 },
            pinky: { curl: 0.24, spread: -0.10, extend: 0.70 },
        },
        equal: {
            thumb: { curl: 0.12, spread: 0.02, extend: 0.48 },
            index: { curl: 0.12, spread: 0.02, extend: 0.74 },
            middle: { curl: 0.12, spread: 0.00, extend: 0.74 },
            ring: { curl: 0.12, spread: -0.02, extend: 0.74 },
            pinky: { curl: 0.12, spread: -0.02, extend: 0.74 },
        },
    };

    function normalizeHandshapeToken(token) {
        if (token === null || token === undefined) return "";
        let normalized = String(token).trim().toLowerCase();
        normalized = normalized.replace(/^["'“”‘’]+|["'“”‘’]+$/g, "");
        normalized = normalized.replace(/\s+/g, " ");
        if (normalized === "+" || normalized === "plus") return "add";
        if (normalized === "=" || normalized === "equals") return "equal";
        return normalized;
    }

    function getTokenHandshapePreset(token, side = null) {
        const normalized = normalizeHandshapeToken(token);
        const preset = TOKEN_HANDSHAPE_PRESETS[normalized];
        if (!preset) return null;
        return {
            token: normalized,
            side,
            thumb: { ...preset.thumb },
            index: { ...preset.index },
            middle: { ...preset.middle },
            ring: { ...preset.ring },
            pinky: { ...preset.pinky },
        };
    }

    function smoothPoints(previous, current, alpha) {
        if (!previous || previous.length !== current.length) return current;
        return current.map((pt, idx) => previous[idx].clone().lerp(pt, alpha));
    }

    class GestureCharacter3D {
        constructor(canvasEl, fallbackEl, options = {}) {
            this.canvasEl = canvasEl;
            this.fallbackEl = fallbackEl;
            this.enabled = Boolean(global.THREE && canvasEl);
            this.options = options || {};
            this.renderMode = typeof this.options.mode === "string" ? this.options.mode : "default";
            this.cartoonMode = this.renderMode === "cartoon";
            // readableHands is the sign-language readability layer: it slightly enlarges and
            // separates the cartoon hand shapes so finger contact and palm orientation read clearly.
            this.readableHands = this.cartoonMode ? this.options.readableHands !== false : false;
            // Solid hand style keeps the default cartoon signer readable; skeleton remains an
            // opt-in fallback for debugging or legacy visual comparison.
            this.handStyle = this.cartoonMode
                ? (typeof this.options.handStyle === "string" ? this.options.handStyle : "solid")
                : "skeleton";
            this.tokenHandshapes = Boolean(this.options.tokenHandshapes && this.cartoonMode);
            const requestedTokenStrength = Number(this.options.tokenHandshapeStrength);
            this.tokenHandshapeStrength = this.tokenHandshapes && Number.isFinite(requestedTokenStrength)
                ? Math.max(0, Math.min(1, requestedTokenStrength))
                : (this.tokenHandshapes ? 0.75 : 0);
            this.debugHands = Boolean(this.options.debugHands && this.cartoonMode);
            this.handTrails = Boolean(this.options.handTrails && this.cartoonMode);
            this.handsOnly = Boolean(this.options.handsOnly && this.cartoonMode);
            this.activeToken = null;
            this.activeTokenPreset = null;
            const requestedSmoothing = Number(this.options.smoothing);
            this.motionSmoothing = Number.isFinite(requestedSmoothing)
                ? Math.max(0.35, Math.min(0.55, requestedSmoothing))
                : (this.cartoonMode ? 0.46 : 0.78);
            this.handSmoothing = {
                body: this.cartoonMode ? 0.45 : 0.78,
                wrist: this.cartoonMode ? 0.35 : 0.72,
                fingers: this.cartoonMode ? 0.28 : 0.68,
                orientation: this.cartoonMode ? 0.3 : 0.6,
            };
            // Main 3D gesture puppeteering keeps a small history so the next frame can be
            // smoothed before token-aware finger shaping is applied.
            this.previousFrame = null;
            this.smoothingFactor = 0.35;

            if (!this.enabled) {
                if (this.fallbackEl) this.fallbackEl.hidden = false;
                return;
            }

            this.T = global.THREE;
            this.scene = new this.T.Scene();
            this.scene.background = new this.T.Color(this.cartoonMode ? 0xeef5fb : 0x0a1322);

            this.camera = new this.T.PerspectiveCamera(36, 1, 0.1, 100);
            this.defaultCameraTarget = new this.T.Vector3(0, 1.34, -0.1);
            this.defaultCameraDistance = 7.2;
            this.defaultCameraLift = 0.08;
            this.cameraLookTarget = this.defaultCameraTarget.clone();
            this._setCameraFromTarget(this.defaultCameraTarget, this.defaultCameraDistance, this.defaultCameraLift);

            this.renderer = new this.T.WebGLRenderer({
                canvas: this.canvasEl,
                antialias: true,
                alpha: false,
            });
            this.renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, 2));
            if ("outputColorSpace" in this.renderer) this.renderer.outputColorSpace = this.T.SRGBColorSpace;
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = this.T.PCFSoftShadowMap;

            this.baseUp = new this.T.Vector3(0, 1, 0);
            this.modelYaw = Math.PI;
            this.avatarConfig = {
                enabled: Boolean(global.GESTURE3D_ENABLE_CUSTOM_AVATAR),
                modelUrl: global.GESTURE3D_AVATAR_MODEL_URL || "/static/models/instructor.glb",
                modelScale: Number.isFinite(global.GESTURE3D_AVATAR_MODEL_SCALE)
                    ? Number(global.GESTURE3D_AVATAR_MODEL_SCALE)
                    : 1.55,
                modelYOffset: Number.isFinite(global.GESTURE3D_AVATAR_MODEL_Y_OFFSET)
                    ? Number(global.GESTURE3D_AVATAR_MODEL_Y_OFFSET)
                    : -1.62,
            };
            this.shoulders = {
                left: new this.T.Vector3(-0.82, 1.55, -0.74),
                right: new this.T.Vector3(0.82, 1.55, -0.74),
            };
            this.sideState = {
                left: {
                    points: null,
                    shoulder: null,
                    elbow: null,
                    wrist: null,
                    handFrame: null,
                    cartoonHandState: null,
                    trail: [],
                    lastLandmarks: null,
                    missingFrames: 0,
                },
                right: {
                    points: null,
                    shoulder: null,
                    elbow: null,
                    wrist: null,
                    handFrame: null,
                    cartoonHandState: null,
                    trail: [],
                    lastLandmarks: null,
                    missingFrames: 0,
                },
            };
            this.activeSide = null;
            this.limbLengths = {
                upperArm: 0.72,
                foreArm: 0.68,
            };
            this.faceState = {
                headPos: null,
                yaw: 0,
                roll: 0,
                mouth: 0,
            };
            this.stability = {
                bothActiveHold: 0,
                contactHold: 0,
            };
            this.humanRig = {
                ready: false,
                loading: false,
                failed: false,
                root: null,
                model: null,
                skeleton: null,
                bones: {},
                armLengths: {
                    left: { upper: 0.72, lower: 0.68 },
                    right: { upper: 0.72, lower: 0.68 },
                },
                fingerChains: {
                    left: {},
                    right: {},
                },
                restQuats: {},
                restPos: {},
                morphTargets: [],
            };
            this._gltfLoaderClass = null;

            this._initScene();
            this.character = this._buildCharacter();
            this._applyHandsOnlyMode();
            this.humanGuide = this._buildHumanGuide();
            if (this.avatarConfig.enabled && this.avatarConfig.modelUrl) {
                this._prepareGLTFLoader().then(() => this._initHumanAvatar()).catch(() => {
                    this.humanRig.failed = true;
                });
            }
            this._resize();
            this.resetPose();

            this._animate = this._animate.bind(this);
            this._animate();

            global.addEventListener("resize", () => this._resize());
            if (global.ResizeObserver) {
                this.resizeObserver = new global.ResizeObserver(() => this._resize());
                this.resizeObserver.observe(this.canvasEl);
            }

            if (this.fallbackEl) this.fallbackEl.hidden = true;
        }

        _initScene() {
            const hemi = this.cartoonMode
                ? new this.T.HemisphereLight(0xffffff, 0xbcd6ea, 1.45)
                : new this.T.HemisphereLight(0xeaf4ff, 0x1a2433, 1.1);
            this.scene.add(hemi);

            const key = new this.T.DirectionalLight(0xffffff, this.cartoonMode ? 1.22 : 1.0);
            key.position.set(3.5, 5.2, 3.2);
            key.castShadow = true;
            key.shadow.mapSize.set(1024, 1024);
            this.scene.add(key);

            const fill = new this.T.DirectionalLight(this.cartoonMode ? 0xffd7b8 : 0x95b8ff, this.cartoonMode ? 0.65 : 0.5);
            fill.position.set(-3.3, 3.0, 2.2);
            this.scene.add(fill);

            const rim = new this.T.DirectionalLight(this.cartoonMode ? 0x8fcbff : 0x78c0ff, this.cartoonMode ? 0.52 : 0.45);
            rim.position.set(0, 2.8, -4.2);
            this.scene.add(rim);

            const floor = new this.T.Mesh(
                new this.T.CircleGeometry(2.4, 48),
                new this.T.MeshStandardMaterial({
                    color: this.cartoonMode ? 0xdfeaf4 : 0x1a2b45,
                    transparent: true,
                    opacity: this.cartoonMode ? 0.14 : 0.32,
                }),
            );
            floor.rotation.x = -Math.PI / 2;
            floor.position.y = -1.6;
            floor.receiveShadow = true;
            this.scene.add(floor);
        }

        _makeMaterial(color, options = {}, toon = false) {
            if (toon && this.cartoonMode) {
                return new this.T.MeshToonMaterial({
                    color,
                    flatShading: true,
                    transparent: Boolean(options.transparent),
                    opacity: Number.isFinite(options.opacity) ? options.opacity : 1,
                    depthTest: options.depthTest !== undefined ? options.depthTest : true,
                    depthWrite: options.depthWrite !== undefined ? options.depthWrite : true,
                    side: options.side,
                    emissive: options.emissive,
                    emissiveIntensity: options.emissiveIntensity,
                });
            }
            return new this.T.MeshStandardMaterial({
                color,
                roughness: options.roughness !== undefined ? options.roughness : 0.55,
                metalness: options.metalness !== undefined ? options.metalness : 0.03,
                transparent: Boolean(options.transparent),
                opacity: Number.isFinite(options.opacity) ? options.opacity : 1,
                depthTest: options.depthTest !== undefined ? options.depthTest : true,
                depthWrite: options.depthWrite !== undefined ? options.depthWrite : true,
                side: options.side,
                emissive: options.emissive,
                emissiveIntensity: options.emissiveIntensity,
            });
        }

        _buildCharacter() {
            const rig = new this.T.Group();
            rig.rotation.y = this.modelYaw;
            this.scene.add(rig);

            const root = new this.T.Group();
            root.position.y = 0.05;
            rig.add(root);

            // The same landmark retargeting drives both modes. Cartoon mode just swaps in fuller
            // proportions, toon materials, and clearer hands so this stays easy to replace later
            // with a real GLB/VRM avatar.
            const cartoon = this.cartoonMode;
            const torsoTone = cartoon ? 0xd79b6b : 0xd7a17b;
            const torsoHighlight = cartoon ? 0xf0c18d : 0xedbf98;
            const torsoShadow = cartoon ? 0xa86f48 : 0xbf845f;
            const torsoMat = this._makeMaterial(torsoTone, {
                roughness: cartoon ? 0.34 : 0.74,
                metalness: cartoon ? 0.0 : 0.02,
            }, cartoon);
            const torsoShadeMat = this._makeMaterial(torsoShadow, {
                roughness: cartoon ? 0.26 : 0.82,
                metalness: 0.01,
                transparent: true,
                opacity: cartoon ? 0.28 : 0.22,
            }, cartoon);
            const torsoProfile = [
                [0.08, 1.0],
                [0.14, 0.9],
                [0.25, 0.78],
                [0.36, 0.6],
                [0.48, 0.3],
                [0.53, 0.06],
                [0.49, -0.18],
                [0.41, -0.48],
                [0.3, -0.8],
                [0.22, -1.02],
            ].map((pt) => new this.T.Vector2(pt[0], pt[1]));
            const torsoShell = new this.T.Mesh(
                new this.T.LatheGeometry(torsoProfile, 32),
                torsoMat,
            );
            torsoShell.position.set(0, cartoon ? 0.2 : 0.18, -0.02);
            torsoShell.scale.set(cartoon ? 1.08 : 1.0, cartoon ? 1.06 : 1.0, cartoon ? 0.9 : 0.82);
            torsoShell.renderOrder = 2;
            root.add(torsoShell);

            const torsoFrontShadow = new this.T.Mesh(
                new this.T.SphereGeometry(0.34, 24, 18),
                torsoShadeMat,
            );
            torsoFrontShadow.scale.set(1.18, 1.4, 0.44);
            torsoFrontShadow.position.set(0, -0.18, 0.26);
            torsoShell.add(torsoFrontShadow);

            const torsoFrontHighlight = new this.T.Mesh(
                new this.T.SphereGeometry(0.24, 18, 16),
                new this.T.MeshStandardMaterial({
                    color: torsoHighlight,
                    roughness: 0.68,
                    metalness: 0.01,
                    transparent: true,
                    opacity: 0.16,
                }),
            );
            torsoFrontHighlight.scale.set(1.34, 0.62, 0.28);
            torsoFrontHighlight.position.set(0, 0.22, 0.22);
            torsoShell.add(torsoFrontHighlight);

            const chest = new this.T.Mesh(new this.T.SphereGeometry(cartoon ? 0.49 : 0.44, 30, 24), torsoMat);
            chest.scale.set(cartoon ? 1.32 : 1.24, cartoon ? 1.16 : 1.08, cartoon ? 0.8 : 0.72);
            chest.position.set(0, cartoon ? 0.62 : 0.58, -0.02);
            chest.renderOrder = 2;
            chest.visible = true;
            root.add(chest);

            const chestContour = new this.T.Mesh(
                new this.T.SphereGeometry(0.4, 24, 20),
                torsoShadeMat,
            );
            chestContour.scale.set(0.9, 0.72, 0.56);
            chestContour.position.set(0, -0.06, 0.2);
            chest.add(chestContour);

            const upperChestHighlight = new this.T.Mesh(
                new this.T.SphereGeometry(0.28, 18, 16),
                new this.T.MeshStandardMaterial({
                    color: torsoHighlight,
                    roughness: 0.66,
                    metalness: 0.01,
                    transparent: true,
                    opacity: 0.18,
                }),
            );
            upperChestHighlight.scale.set(1.18, 0.62, 0.34);
            upperChestHighlight.position.set(0, 0.14, 0.22);
            chest.add(upperChestHighlight);

            const waist = new this.T.Mesh(new this.T.SphereGeometry(cartoon ? 0.38 : 0.34, 28, 22), torsoMat);
            waist.scale.set(cartoon ? 1.08 : 1.02, cartoon ? 1.2 : 1.22, cartoon ? 0.66 : 0.6);
            waist.position.set(0, cartoon ? -0.08 : -0.12, -0.04);
            waist.renderOrder = 1;
            waist.visible = cartoon;
            root.add(waist);

            const torsoBridge = new this.T.Mesh(
                new this.T.CylinderGeometry(0.16, 0.2, 1, 18),
                torsoMat,
            );
            torsoBridge.renderOrder = 2;
            torsoBridge.visible = false;
            root.add(torsoBridge);

            const neck = new this.T.Mesh(
                new this.T.CylinderGeometry(cartoon ? 0.14 : 0.13, cartoon ? 0.15 : 0.14, cartoon ? 0.3 : 0.24, 16),
                this._makeMaterial(0xc88f69, { roughness: cartoon ? 0.3 : 0.72, metalness: 0.02 }, cartoon),
            );
            neck.position.set(0, cartoon ? 1.52 : 1.46, 0.04);
            neck.renderOrder = 3;
            root.add(neck);

            const head = new this.T.Mesh(
                new this.T.SphereGeometry(cartoon ? 0.46 : 0.38, 24, 24),
                this._makeMaterial(0xf0c5a3, { roughness: cartoon ? 0.32 : 0.54, metalness: 0.03 }, cartoon),
            );
            head.scale.set(cartoon ? 1.08 : 0.94, cartoon ? 1.14 : 1.06, cartoon ? 1.0 : 0.9);
            head.position.set(0, cartoon ? 2.0 : 1.94, 0.06);
            head.renderOrder = 4;
            root.add(head);

            const jaw = new this.T.Mesh(
                new this.T.SphereGeometry(cartoon ? 0.24 : 0.2, 18, 16),
                this._makeMaterial(0xe6b994, { roughness: cartoon ? 0.32 : 0.58, metalness: 0.02 }, cartoon),
            );
            jaw.scale.set(cartoon ? 1.16 : 1.08, cartoon ? 0.8 : 0.72, cartoon ? 0.96 : 0.88);
            jaw.position.set(0, cartoon ? -0.21 : -0.18, -0.04);
            head.add(jaw);

            const nose = new this.T.Mesh(
                new this.T.SphereGeometry(cartoon ? 0.045 : 0.038, 12, 12),
                this._makeMaterial(0xd9a983, { roughness: cartoon ? 0.38 : 0.62, metalness: 0.02 }, cartoon),
            );
            nose.scale.set(cartoon ? 0.82 : 0.7, cartoon ? 1.24 : 1.18, cartoon ? 0.68 : 0.62);
            nose.position.set(0, -0.02, cartoon ? -0.36 : -0.34);
            head.add(nose);

            const faceMat = this._makeMaterial(0x1b2d48, { roughness: 0.16, metalness: 0.08 }, cartoon);
            const eyeLeft = new this.T.Mesh(new this.T.SphereGeometry(0.03, 12, 12), faceMat);
            const eyeRight = new this.T.Mesh(new this.T.SphereGeometry(0.03, 12, 12), faceMat);
            eyeLeft.position.set(-0.11, 0.08, cartoon ? -0.35 : -0.33);
            eyeRight.position.set(0.11, 0.08, cartoon ? -0.35 : -0.33);
            head.add(eyeLeft);
            head.add(eyeRight);

            const mouth = new this.T.Mesh(
                new this.T.TorusGeometry(0.08, 0.012, 8, 24, Math.PI),
                this._makeMaterial(0x224267, { roughness: 0.18, metalness: 0.06 }, cartoon),
            );
            mouth.position.set(0, -0.08, cartoon ? -0.38 : -0.35);
            mouth.rotation.z = Math.PI;
            head.add(mouth);

            const earMat = this._makeMaterial(0xe6ba97, { roughness: 0.32, metalness: 0.03 }, cartoon);
            const earLeft = new this.T.Mesh(new this.T.SphereGeometry(cartoon ? 0.08 : 0.07, 14, 14), earMat);
            const earRight = new this.T.Mesh(new this.T.SphereGeometry(cartoon ? 0.08 : 0.07, 14, 14), earMat);
            earLeft.scale.set(0.65, 1.05, 0.55);
            earRight.scale.set(0.65, 1.05, 0.55);
            earLeft.position.set(-0.36, 0.02, -0.04);
            earRight.position.set(0.36, 0.02, -0.04);
            head.add(earLeft);
            head.add(earRight);

            const browMat = this._makeMaterial(0x1f3553, { roughness: 0.18, metalness: 0.05 }, cartoon);
            const browLeft = new this.T.Mesh(new this.T.TorusGeometry(0.055, 0.008, 8, 20, Math.PI * 0.65), browMat);
            const browRight = new this.T.Mesh(new this.T.TorusGeometry(0.055, 0.008, 8, 20, Math.PI * 0.65), browMat);
            browLeft.position.set(-0.11, 0.16, cartoon ? -0.35 : -0.33);
            browRight.position.set(0.11, 0.16, cartoon ? -0.35 : -0.33);
            browLeft.rotation.z = Math.PI * 0.95;
            browRight.rotation.z = Math.PI * 1.05;
            head.add(browLeft);
            head.add(browRight);

            if (cartoon) {
                const hairMat = this._makeMaterial(0x2c1d18, { roughness: 0.18, metalness: 0.02 }, true);
                const hair = new this.T.Mesh(
                    new this.T.SphereGeometry(0.46, 20, 18),
                    hairMat,
                );
                hair.scale.set(1.02, 0.72, 0.95);
                hair.position.set(0, 0.2, 0.0);
                hair.renderOrder = 5;
                head.add(hair);

                const fringe = new this.T.Mesh(
                    new this.T.CylinderGeometry(0.16, 0.22, 0.22, 14),
                    hairMat,
                );
                fringe.position.set(-0.02, 0.36, -0.12);
                fringe.rotation.z = 0.12;
                fringe.scale.set(1.08, 1.0, 0.74);
                fringe.renderOrder = 6;
                head.add(fringe);

                const faceMarker = new this.T.Mesh(
                    new this.T.ConeGeometry(0.04, 0.12, 8),
                    this._makeMaterial(0xffcf9f, { roughness: 0.25, metalness: 0.02 }, true),
                );
                faceMarker.position.set(0.0, 0.02, -0.43);
                faceMarker.rotation.x = Math.PI;
                faceMarker.renderOrder = 7;
                head.add(faceMarker);
            }

            const shoulderMat = this._makeMaterial(0xcf9770, { roughness: cartoon ? 0.3 : 0.68, metalness: 0.03 }, cartoon);
            const leftShoulder = new this.T.Mesh(new this.T.SphereGeometry(cartoon ? 0.2 : 0.16, 18, 18), shoulderMat);
            const rightShoulder = new this.T.Mesh(new this.T.SphereGeometry(cartoon ? 0.2 : 0.16, 18, 18), shoulderMat);
            leftShoulder.position.copy(this.shoulders.left);
            rightShoulder.position.copy(this.shoulders.right);
            leftShoulder.scale.set(cartoon ? 1.32 : 1.2, 1.0, cartoon ? 1.16 : 1.08);
            rightShoulder.scale.set(cartoon ? 1.32 : 1.2, 1.0, cartoon ? 1.16 : 1.08);
            leftShoulder.renderOrder = 6;
            rightShoulder.renderOrder = 6;
            root.add(leftShoulder);
            root.add(rightShoulder);

            const leftClavicle = new this.T.Mesh(
                new this.T.CylinderGeometry(cartoon ? 0.11 : 0.09, cartoon ? 0.13 : 0.11, 1, 14),
                torsoMat,
            );
            const rightClavicle = new this.T.Mesh(
                new this.T.CylinderGeometry(cartoon ? 0.11 : 0.09, cartoon ? 0.13 : 0.11, 1, 14),
                torsoMat,
            );
            leftClavicle.renderOrder = 5;
            rightClavicle.renderOrder = 5;
            root.add(leftClavicle);
            root.add(rightClavicle);

            return {
                rig,
                root,
                torsoShell,
                chest,
                waist,
                torsoBridge,
                neck,
                shoulderCaps: {
                    left: leftShoulder,
                    right: rightShoulder,
                },
                clavicles: {
                    left: leftClavicle,
                    right: rightClavicle,
                },
                head,
                eyeLeft,
                eyeRight,
                browLeft,
                browRight,
                mouth,
                baseHeadPos: head.position.clone(),
                baseHeadRot: head.rotation.clone(),
                baseTorsoShellPos: torsoShell.position.clone(),
                baseTorsoShellScale: torsoShell.scale.clone(),
                baseChestPos: chest.position.clone(),
                baseChestScale: chest.scale.clone(),
                baseWaistPos: waist.position.clone(),
                baseWaistScale: waist.scale.clone(),
                baseNeckPos: neck.position.clone(),
                baseMouthScale: mouth.scale.clone(),
                sides: {
                    left: this._buildSide("left", root),
                    right: this._buildSide("right", root),
                },
            };
        }

        _buildHumanGuide() {
            const group = new this.T.Group();
            group.name = "HumanGestureGuide";
            this.scene.add(group);

            const left = this._buildSide("left", group);
            const right = this._buildSide("right", group);
            const tune = (sideObj, side) => {
                const armTone = side === "left" ? 0xe6b29c : 0xf1c3ad;
                const glowTone = side === "left" ? 0x6fd7ff : 0x9fd0ff;
                [sideObj.upperArm, sideObj.foreArm].forEach((mesh) => {
                    if (!mesh || !mesh.material) return;
                    mesh.material.color.setHex(armTone);
                    mesh.material.transparent = true;
                    mesh.material.opacity = 0.96;
                    mesh.material.depthTest = false;
                    mesh.material.depthWrite = false;
                    mesh.renderOrder = 44;
                });
                [sideObj.shoulderJoint, sideObj.elbowJoint, sideObj.wristJoint].forEach((mesh) => {
                    if (!mesh || !mesh.material) return;
                    mesh.material.color.setHex(0xffeadc);
                    mesh.material.transparent = true;
                    mesh.material.opacity = 0.98;
                    mesh.material.depthTest = false;
                    mesh.material.depthWrite = false;
                    mesh.renderOrder = 45;
                });
                sideObj.joints.forEach((mesh) => {
                    if (!mesh || !mesh.material) return;
                    mesh.material.color.setHex(glowTone);
                    mesh.material.opacity = 1.0;
                    mesh.material.depthTest = false;
                    mesh.material.depthWrite = false;
                    mesh.renderOrder = 47;
                });
                sideObj.segments.forEach((mesh) => {
                    if (!mesh || !mesh.material) return;
                    mesh.material.color.setHex(glowTone);
                    mesh.material.opacity = 0.98;
                    mesh.material.depthTest = false;
                    mesh.material.depthWrite = false;
                    mesh.renderOrder = 46;
                });
            };

            tune(left, "left");
            tune(right, "right");
            this._hideGuideSide(left);
            this._hideGuideSide(right);

            return {
                group,
                sides: { left, right },
            };
        }

        _buildSide(side, parent) {
            const cartoon = this.cartoonMode;
            const solidHands = cartoon && this.readableHands && this.handStyle !== "skeleton";
            const sideColor = side === "left" ? 0x66d5ff : 0xa2b8ff;
            const handTone = cartoon
                ? (side === "left" ? 0xe0a06f : 0xe7b27d)
                : sideColor;
            const handShadowTone = cartoon
                ? (side === "left" ? 0x8f5f3d : 0x966446)
                : sideColor;
            const armColorA = cartoon ? (side === "left" ? 0xffb48a : 0xf7c29f) : (side === "left" ? 0x6f95cc : 0x7f9dd5);
            const armColorB = cartoon ? (side === "left" ? 0xffcead : 0xffd8bd) : (side === "left" ? 0x9ec2ee : 0xafc8f5);
            const jointColor = cartoon ? 0xf4d7bf : (side === "left" ? 0xccefff : 0xd9e5ff);

            const armMatA = this._makeMaterial(armColorA, {
                roughness: cartoon ? 0.24 : 0.32,
                metalness: 0.04,
                transparent: true,
                opacity: cartoon ? 0.96 : 0.88,
                depthWrite: false,
            }, cartoon);
            const armMatB = this._makeMaterial(armColorB, {
                roughness: cartoon ? 0.24 : 0.3,
                metalness: 0.04,
                transparent: true,
                opacity: cartoon ? 0.98 : 0.9,
                depthWrite: false,
            }, cartoon);
            const armJointMat = this._makeMaterial(jointColor, {
                roughness: cartoon ? 0.18 : 0.26,
                metalness: 0.05,
                transparent: true,
                opacity: cartoon ? 0.98 : 0.92,
                depthWrite: false,
            }, cartoon);
            const handJointMat = this._makeMaterial(handTone, {
                roughness: cartoon ? 0.16 : 0.22,
                metalness: 0.03,
                transparent: false,
                opacity: 1.0,
                depthTest: false,
                depthWrite: false,
                emissive: new this.T.Color(side === "left" ? 0x7a4a2c : 0x7f5a36),
                emissiveIntensity: cartoon ? 0.08 : 0.22,
            }, cartoon);
            const shadowHandMat = this._makeMaterial(handShadowTone, {
                roughness: cartoon ? 0.18 : 0.22,
                metalness: 0.02,
                transparent: true,
                opacity: cartoon ? 0.44 : 1.0,
                depthTest: false,
                depthWrite: false,
                emissive: new this.T.Color(side === "left" ? 0x5f3b26 : 0x68412c),
                emissiveIntensity: cartoon ? 0.06 : 0.2,
            }, cartoon);
            const readableHandMat = this._makeMaterial(handTone, {
                roughness: cartoon ? 0.18 : 0.2,
                metalness: 0.02,
                transparent: false,
                opacity: 1.0,
                depthTest: false,
                depthWrite: false,
                emissive: new this.T.Color(side === "left" ? 0xb96b41 : 0xbd7747),
                emissiveIntensity: cartoon ? 0.16 : 0.22,
            }, cartoon);
            const fingertipMat = this._makeMaterial(cartoon ? (side === "left" ? 0xf3c79d : 0xf2cca6) : sideColor, {
                roughness: cartoon ? 0.14 : 0.18,
                metalness: 0.02,
                transparent: false,
                opacity: 1.0,
                depthTest: false,
                depthWrite: false,
                emissive: new this.T.Color(side === "left" ? 0xd58a5a : 0xda945e),
                emissiveIntensity: cartoon ? 0.12 : 0.18,
            }, cartoon);
            const palmMat = this._makeMaterial(handTone, {
                roughness: cartoon ? 0.18 : 0.2,
                metalness: 0.02,
                transparent: false,
                opacity: 1.0,
                depthTest: false,
                depthWrite: false,
                emissive: new this.T.Color(side === "left" ? 0xc37c4b : 0xc98a55),
                emissiveIntensity: cartoon ? 0.14 : 0.22,
            }, cartoon);
            const handRoot = new this.T.Group();
            parent.add(handRoot);

            const upperArm = new this.T.Mesh(
                new this.T.CylinderGeometry(cartoon ? 0.108 : 0.074, cartoon ? 0.094 : 0.064, 1, cartoon ? 16 : 12),
                armMatA,
            );
            const foreArm = new this.T.Mesh(
                new this.T.CylinderGeometry(cartoon ? 0.09 : 0.056, cartoon ? 0.072 : 0.05, 1, cartoon ? 16 : 12),
                armMatB,
            );
            upperArm.renderOrder = 8;
            foreArm.renderOrder = 9;
            parent.add(upperArm);
            parent.add(foreArm);

            const shoulderJoint = new this.T.Mesh(new this.T.SphereGeometry(cartoon ? 0.074 : 0.056, 12, 12), armJointMat);
            const elbowJoint = new this.T.Mesh(new this.T.SphereGeometry(cartoon ? 0.064 : 0.05, 12, 12), armJointMat);
            const wristJoint = new this.T.Mesh(new this.T.SphereGeometry(cartoon ? 0.056 : 0.044, 12, 12), armJointMat);
            shoulderJoint.renderOrder = 10;
            elbowJoint.renderOrder = 10;
            wristJoint.renderOrder = 11;
            parent.add(shoulderJoint);
            parent.add(elbowJoint);
            parent.add(wristJoint);

            const palm = new this.T.Mesh(
                cartoon && this.T.CapsuleGeometry
                    ? new this.T.CapsuleGeometry(cartoon ? 0.11 : 0.06, cartoon ? 0.24 : 0.1, 4, 10)
                    : new this.T.SphereGeometry(cartoon ? 0.118 : 0.08, 16, 16),
                palmMat,
            );
            palm.visible = true;
            palm.renderOrder = 38;
            handRoot.add(palm);

            const palmShadow = new this.T.Mesh(
                cartoon && this.T.CapsuleGeometry
                    ? new this.T.CapsuleGeometry(cartoon ? 0.13 : 0.07, cartoon ? 0.28 : 0.12, 4, 10)
                    : new this.T.SphereGeometry(cartoon ? 0.13 : 0.09, 16, 16),
                shadowHandMat,
            );
            palmShadow.visible = true;
            palmShadow.renderOrder = 31;
            palmShadow.scale.set(1.18, 1.06, 1.1);
            handRoot.add(palmShadow);

            const shadowSegments = [];
            for (let i = 0; i < HAND_CONNECTIONS.length; i += 1) {
                const seg = new this.T.Mesh(
                    cartoon && this.T.CapsuleGeometry
                        ? new this.T.CapsuleGeometry(cartoon ? 0.024 : 0.016, 1, 2, 8)
                        : new this.T.CylinderGeometry(cartoon ? 0.034 : 0.022, cartoon ? 0.024 : 0.018, 1, 10),
                    shadowHandMat,
                );
                seg.visible = false;
                seg.renderOrder = cartoon ? 32 : 31;
                parent.add(seg);
                shadowSegments.push(seg);
            }

            const fingerBones = [];
            const fingerBonePairs = [
                [1, 2], [2, 3], [3, 4],
                [5, 6], [6, 7], [7, 8],
                [9, 10], [10, 11], [11, 12],
                [13, 14], [14, 15], [15, 16],
                [17, 18], [18, 19], [19, 20],
            ];
            fingerBonePairs.forEach((pair) => {
                const seg = new this.T.Mesh(
                    cartoon && this.T.CapsuleGeometry
                        ? new this.T.CapsuleGeometry(cartoon ? 0.03 : 0.014, 1, 2, 8)
                        : new this.T.CylinderGeometry(cartoon ? 0.036 : 0.018, cartoon ? 0.026 : 0.014, 1, 10),
                    palmMat,
                );
                seg.visible = false;
                seg.renderOrder = cartoon ? 40 : 32;
                parent.add(seg);
                fingerBones.push({
                    mesh: seg,
                    start: pair[0],
                    end: pair[1],
                });
            });

            const fingerTips = [];
            [4, 8, 12, 16, 20].forEach((idx) => {
                const tip = new this.T.Mesh(
                    new this.T.SphereGeometry(cartoon ? 0.052 : 0.03, 10, 10),
                    fingertipMat,
                );
                tip.visible = false;
                tip.renderOrder = cartoon ? 45 : 33;
                parent.add(tip);
                fingerTips.push({
                    mesh: tip,
                    index: idx,
                });
            });

            const trailNodes = [];
            if (this.handTrails) {
                for (let i = 0; i < 10; i += 1) {
                    const trailNode = new this.T.Mesh(
                        new this.T.SphereGeometry(cartoon ? 0.03 : 0.022, 8, 8),
                        new this.T.MeshBasicMaterial({
                            color: side === "left" ? 0x7fd8ff : 0xa8c8ff,
                            transparent: true,
                            opacity: 0,
                            depthTest: false,
                            depthWrite: false,
                        }),
                    );
                    trailNode.visible = false;
                    trailNode.renderOrder = 19;
                    parent.add(trailNode);
                    trailNodes.push(trailNode);
                }
            }

            const joints = [];
            for (let i = 0; i < 21; i += 1) {
                const sphere = new this.T.Mesh(
                    new this.T.SphereGeometry(cartoon ? 0.022 : 0.044, 10, 10),
                    handJointMat,
                );
                sphere.visible = false;
                sphere.renderOrder = cartoon ? 43 : 32;
                parent.add(sphere);
                joints.push(sphere);
            }

            const debugLandmarks = [];
            const debugCleanLandmarks = [];
            const debugLinks = [];
            if (this.debugHands) {
                for (let i = 0; i < 21; i += 1) {
                    const rawColor = side === "left" ? 0xff6666 : 0x6fb2ff;
                    const cleanColor = i === 0
                        ? 0xb2ff7a
                        : (i <= 4 ? 0xc8ff84 : i <= 8 ? 0xf0ff6f : i <= 12 ? 0xdcff7e : i <= 16 ? 0xffe87a : 0xffd56b);
                    const rawSphere = new this.T.Mesh(
                        new this.T.SphereGeometry(0.014, 8, 8),
                        new this.T.MeshBasicMaterial({
                            color: rawColor,
                            transparent: true,
                            opacity: 0.95,
                            depthTest: false,
                            depthWrite: false,
                        }),
                    );
                    rawSphere.visible = true;
                    rawSphere.renderOrder = 79;
                    handRoot.add(rawSphere);
                    debugLandmarks.push(rawSphere);

                    const cleanSphere = new this.T.Mesh(
                        new this.T.SphereGeometry(0.02, 8, 8),
                        new this.T.MeshBasicMaterial({
                            color: cleanColor,
                            transparent: true,
                            opacity: 0.95,
                            depthTest: false,
                            depthWrite: false,
                        }),
                    );
                    cleanSphere.visible = true;
                    cleanSphere.renderOrder = 80;
                    handRoot.add(cleanSphere);
                    debugCleanLandmarks.push(cleanSphere);
                }

                for (let i = 0; i < 5; i += 1) {
                    const link = new this.T.Mesh(
                        new this.T.CylinderGeometry(0.004, 0.004, 1, 6),
                        new this.T.MeshBasicMaterial({
                            color: side === "left" ? 0xb8ff82 : 0xffef7e,
                            transparent: true,
                            opacity: 0.5,
                            depthTest: false,
                            depthWrite: false,
                        }),
                    );
                    link.visible = false;
                    link.renderOrder = 81;
                    handRoot.add(link);
                    debugLinks.push(link);
                }
            }

            return {
                handRoot,
                upperArm,
                foreArm,
                shoulderJoint,
                elbowJoint,
                wristJoint,
                palm,
                palmShadow,
                joints,
                segments: shadowSegments,
                fingerBones,
                fingerTips,
                trailNodes,
                debugLandmarks,
                debugCleanLandmarks,
                debugLinks,
            };
        }

        _resize() {
            if (!this.enabled) return;
            const w = this.canvasEl.clientWidth || 860;
            const h = this.canvasEl.clientHeight || 380;
            this.renderer.setSize(w, h, false);
            this.camera.aspect = w / h;
            this.camera.updateProjectionMatrix();
            if (this.humanRig && this.humanRig.ready) {
                this._fitCameraToHumanUpperBody({ smooth: false });
            } else {
                this._setCameraFromTarget(this.defaultCameraTarget, this.defaultCameraDistance, this.defaultCameraLift);
            }
        }

        _setCameraFromTarget(target, distance, lift = 0.08) {
            if (!target || !Number.isFinite(distance)) return;
            this.camera.position.set(target.x, target.y + lift, target.z + distance);
            this.cameraLookTarget.copy(target);
            this.camera.lookAt(this.cameraLookTarget);
        }

        _fitCameraToHumanUpperBody(options = {}) {
            const modelObject = options.object || (this.humanRig ? this.humanRig.model : null);
            if (!modelObject) {
                this._setCameraFromTarget(this.defaultCameraTarget, this.defaultCameraDistance, this.defaultCameraLift);
                return;
            }

            const smooth = options.smooth !== false;
            const worldRoot = (this.humanRig && this.humanRig.root) ? this.humanRig.root : modelObject;
            worldRoot.updateWorldMatrix(true, true);
            const box = new this.T.Box3().setFromObject(modelObject);
            if (box.isEmpty()) {
                this._setCameraFromTarget(this.defaultCameraTarget, this.defaultCameraDistance, this.defaultCameraLift);
                return;
            }

            const size = box.getSize(new this.T.Vector3());
            const center = box.getCenter(new this.T.Vector3());

            // Focus near chest/head area while framing shoulders, elbows, wrists, and hands.
            const target = center.clone();
            target.y += size.y * 0.14;

            const verticalFov = this.T.MathUtils.degToRad(this.camera.fov);
            const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * this.camera.aspect);

            const upperBodyHeight = Math.max(size.y * 0.68, 1.2);
            const upperBodyWidth = Math.max(size.x * 0.78, 0.95);
            const distByHeight = (upperBodyHeight * 0.5) / Math.max(Math.tan(verticalFov / 2), 1e-4);
            const distByWidth = (upperBodyWidth * 0.5) / Math.max(Math.tan(horizontalFov / 2), 1e-4);

            // Keep the Box3-based framing requested, but ensure enough margin to avoid cropping.
            const boxDistance = Math.max(size.z * 2.5, size.y * 1.2, this.defaultCameraDistance);
            const finalDistance = Math.max(boxDistance, distByHeight * 1.38, distByWidth * 1.35);

            const desiredPosition = new this.T.Vector3(
                center.x,
                center.y + (size.y * 0.5),
                center.z + finalDistance,
            );

            if (smooth) {
                this.camera.position.lerp(desiredPosition, 0.18);
                this.cameraLookTarget.lerp(target, 0.22);
            } else {
                this.camera.position.copy(desiredPosition);
                this.cameraLookTarget.copy(target);
            }
            this.camera.lookAt(this.cameraLookTarget);
        }

        _setCylinder(mesh, start, end) {
            const direction = end.clone().sub(start);
            const length = direction.length();
            if (length < 1e-4) {
                mesh.visible = false;
                return;
            }
            mesh.visible = true;
            mesh.position.copy(start).add(end).multiplyScalar(0.5);
            mesh.scale.set(1, length, 1);
            mesh.quaternion.setFromUnitVectors(this.baseUp, direction.normalize());
        }

        _hideGuideSide(sideObj) {
            if (!sideObj) return;
            sideObj.upperArm.visible = false;
            sideObj.foreArm.visible = false;
            sideObj.shoulderJoint.visible = false;
            sideObj.elbowJoint.visible = false;
            sideObj.wristJoint.visible = false;
            if (sideObj.palm) sideObj.palm.visible = false;
            if (sideObj.palmShadow) sideObj.palmShadow.visible = false;
            sideObj.joints.forEach((joint) => { joint.visible = false; });
            sideObj.segments.forEach((segment) => { segment.visible = false; });
            if (Array.isArray(sideObj.fingerBones)) sideObj.fingerBones.forEach((bone) => { if (bone?.mesh) bone.mesh.visible = false; });
            if (Array.isArray(sideObj.fingerTips)) sideObj.fingerTips.forEach((tip) => { if (tip?.mesh) tip.mesh.visible = false; });
            if (Array.isArray(sideObj.trailNodes)) sideObj.trailNodes.forEach((node) => { if (node) node.visible = false; });
            if (Array.isArray(sideObj.debugCleanLandmarks)) sideObj.debugCleanLandmarks.forEach((pt) => { if (pt) pt.visible = false; });
            if (Array.isArray(sideObj.debugLinks)) sideObj.debugLinks.forEach((link) => { if (link) link.visible = false; });
        }

        _applyHandsOnlyMode() {
            if (!this.handsOnly || !this.character) return;
            const transparentParts = [
                this.character.torsoShell,
                this.character.chest,
                this.character.waist,
                this.character.torsoBridge,
                this.character.neck,
                this.character.head,
                this.character.eyeLeft,
                this.character.eyeRight,
                this.character.browLeft,
                this.character.browRight,
                this.character.mouth,
                this.character.shoulderCaps && this.character.shoulderCaps.left,
                this.character.shoulderCaps && this.character.shoulderCaps.right,
                this.character.clavicles && this.character.clavicles.left,
                this.character.clavicles && this.character.clavicles.right,
            ];
            transparentParts.forEach((part) => {
                if (!part || !part.material) return;
                part.visible = false;
                part.material.transparent = true;
                part.material.opacity = 0.04;
                part.material.depthWrite = false;
            });
            if (this.character.sides) {
                Object.values(this.character.sides).forEach((sideObj) => {
                    if (!sideObj) return;
                    if (sideObj.upperArm) sideObj.upperArm.visible = false;
                    if (sideObj.foreArm) sideObj.foreArm.visible = false;
                    if (sideObj.shoulderJoint) sideObj.shoulderJoint.visible = false;
                    if (sideObj.elbowJoint) sideObj.elbowJoint.visible = false;
                    if (sideObj.wristJoint) sideObj.wristJoint.visible = false;
                });
            }
        }

        setActiveToken(token) {
            const normalized = normalizeHandshapeToken(token);
            const nextToken = normalized || null;
            const previousToken = this.activeToken || null;
            this.activeToken = nextToken;
            this.activeTokenPreset = this.tokenHandshapes && nextToken
                ? getTokenHandshapePreset(nextToken)
                : null;
            if (this.sideState) {
                Object.values(this.sideState).forEach((state) => {
                    if (!state) return;
                    state.cartoonHandState = null;
                });
            }
            if (this.debugHands && previousToken !== nextToken) {
                // Token logs only fire when the active clip changes so debug mode stays readable.
                console.log(`[GestureCharacter3D] active token: ${nextToken || "-"}`);
            }
        }

        _mapHandLandmarks(landmarks) {
            return landmarks.map((lm) => this._mapBodyPoint(lm));
        }

        _handPointRole(index) {
            // MediaPipe hand indices: 0 = wrist, 1-4 thumb, 5-8 index, 9-12 middle, 13-16 ring, 17-20 pinky.
            if (index === 0) return "wrist";
            if ([5, 9, 13, 17].includes(index)) return "mcp";
            if ([4, 8, 12, 16, 20].includes(index)) return "tip";
            if (index === 1 || index === 2 || index === 3) return "thumb";
            return "finger";
        }

        _handConnectionStrength(index) {
            const connection = HAND_CONNECTIONS[index];
            if (!connection) return 0.9;
            if (connection[0] === 0 && connection[1] === 17) return 0.7;
            if (connection[0] === 0) return 0.92;
            if (connection[0] === 1 || connection[0] === 5 || connection[0] === 9 || connection[0] === 13 || connection[0] === 17) {
                return 0.96;
            }
            return 0.88;
        }

        _smoothHandPoints(previous, current) {
            if (!previous || previous.length !== current.length) return current;
            // Separate smoothing keeps the palm/wrist steadier while letting fingertips stay
            // more responsive, which helps signs read clearly without turning into a blur.
            const bodyAlpha = this.handSmoothing.body;
            const wristAlpha = this.handSmoothing.wrist;
            const fingerAlpha = this.handSmoothing.fingers;
            return current.map((pt, idx) => {
                const role = this._handPointRole(idx);
                let alpha = fingerAlpha;
                if (role === "wrist") alpha = wristAlpha;
                else if (role === "mcp") alpha = bodyAlpha;
                else if (role === "tip") alpha = Math.min(0.5, fingerAlpha + 0.08);
                return previous[idx].clone().lerp(pt, alpha);
            });
        }

        _smoothLandmarks(current, previous, factor = 0.35) {
            if (!current) return current;
            if (!previous) return Array.isArray(current) ? current.map((item) => this._smoothLandmarks(item, null, factor)) : current;

            if (Array.isArray(current)) {
                if (
                    current.length >= 3
                    && typeof current[0] === "number"
                    && typeof current[1] === "number"
                    && typeof current[2] === "number"
                ) {
                    if (!Array.isArray(previous) || previous.length < 3) {
                        return current.slice();
                    }
                    return [
                        previous[0] + ((current[0] - previous[0]) * factor),
                        previous[1] + ((current[1] - previous[1]) * factor),
                        previous[2] + ((current[2] - previous[2]) * factor),
                    ];
                }

                const prevArray = Array.isArray(previous) ? previous : null;
                return current.map((item, idx) => this._smoothLandmarks(item, prevArray ? prevArray[idx] : null, factor));
            }

            if (typeof current === "object") {
                const prevObject = previous && typeof previous === "object" ? previous : null;
                const result = {};
                Object.keys(current).forEach((key) => {
                    result[key] = this._smoothLandmarks(current[key], prevObject ? prevObject[key] : null, factor);
                });
                return result;
            }

            return current;
        }

        _applyTokenCorrections(frame, token) {
            const normalizedToken = normalizeHandshapeToken(token);
            if (!normalizedToken || !frame || !frame.hands) return;

            if (Array.isArray(frame.hands.left) && frame.hands.left.length === 21) {
                frame.hands.left = this._applyFingerPreset(frame.hands.left, normalizedToken, "left");
            }
            if (Array.isArray(frame.hands.right) && frame.hands.right.length === 21) {
                frame.hands.right = this._applyFingerPreset(frame.hands.right, normalizedToken, "right");
            }
        }

        _pointLike(point) {
            if (!point) return null;
            if (Array.isArray(point) && point.length >= 3) {
                return { x: point[0], y: point[1], z: point[2] };
            }
            if (typeof point === "object") {
                const x = Number(point.x);
                const y = Number(point.y);
                const z = Number(point.z);
                if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)) {
                    return { x, y, z };
                }
            }
            return null;
        }

        _writePointLike(target, value) {
            if (!target || !value) return target;
            if (Array.isArray(target)) {
                target[0] = value.x;
                target[1] = value.y;
                target[2] = value.z;
                return target;
            }
            if (typeof target === "object") {
                target.x = value.x;
                target.y = value.y;
                target.z = value.z;
            }
            return target;
        }

        _applyFingerPreset(hand, token, side) {
            if (!Array.isArray(hand) || hand.length !== 21) return hand;

            const presets = {
                "4": {
                    thumb: "closed",
                    index: "open",
                    middle: "open",
                    ring: "open",
                    pinky: "open",
                },
                "5": {
                    thumb: "open",
                    index: "open",
                    middle: "open",
                    ring: "open",
                    pinky: "open",
                },
                "9": {
                    thumb: "touch_index",
                    index: "touch_thumb",
                    middle: "open",
                    ring: "open",
                    pinky: "open",
                },
                add: {
                    wrist: "forward",
                    fingers: "relaxed",
                },
                equal: {
                    wrist: "horizontal",
                    fingers: "flat",
                },
            };

            const preset = presets[token];
            if (!preset) return hand;

            const fingerMap = {
                thumb: [1, 2, 3, 4],
                index: [5, 6, 7, 8],
                middle: [9, 10, 11, 12],
                ring: [13, 14, 15, 16],
                pinky: [17, 18, 19, 20],
            };

            const blended = hand.map((pt) => (Array.isArray(pt) ? pt.slice(0, 3) : pt));

            if (preset.fingers === "flat") {
                Object.keys(fingerMap).forEach((fingerName) => {
                    this._straightenFinger(blended, fingerMap[fingerName], 0.42);
                });
                return blended;
            }

            if (preset.fingers === "relaxed") {
                Object.keys(fingerMap).forEach((fingerName) => {
                    this._straightenFinger(blended, fingerMap[fingerName], fingerName === "thumb" ? 0.22 : 0.18);
                });
                return blended;
            }

            Object.keys(fingerMap).forEach((fingerName) => {
                const state = preset[fingerName];
                if (!state) return;
                const ids = fingerMap[fingerName];
                if (state === "open") {
                    this._straightenFinger(blended, ids, 0.55);
                } else if (state === "closed") {
                    this._curlFinger(blended, ids, fingerName === "thumb" ? 0.42 : 0.52);
                } else if (state === "touch_index" && fingerName === "thumb") {
                    this._curlFinger(blended, ids, 0.38);
                    this._nudgeFingerTowardFinger(blended, ids, fingerMap.index, 0.18);
                } else if (state === "touch_thumb" && fingerName === "index") {
                    this._nudgeFingerTowardFinger(blended, ids, fingerMap.thumb, 0.16);
                }
            });

            return blended;
        }

        _nudgeFingerTowardFinger(hand, sourceIds, targetIds, weight = 0.2) {
            const sourceTip = this._pointLike(hand[sourceIds[sourceIds.length - 1]]);
            const targetBase = this._pointLike(hand[targetIds[0]]);
            if (!sourceTip || !targetBase) return;
            const push = {
                x: targetBase.x + ((sourceTip.x - targetBase.x) * weight),
                y: targetBase.y + ((sourceTip.y - targetBase.y) * weight),
                z: targetBase.z + ((sourceTip.z - targetBase.z) * weight),
            };
            const tipIndex = sourceIds[sourceIds.length - 1];
            hand[tipIndex] = this._writePointLike(hand[tipIndex], push);
        }

        _straightenFinger(hand, ids, weight = 0.35) {
            const base = this._pointLike(hand[ids[0]]);
            const tip = this._pointLike(hand[ids[ids.length - 1]]);
            if (!base || !tip) return;

            const dx = tip.x - base.x;
            const dy = tip.y - base.y;
            const dz = tip.z - base.z;

            ids.forEach((id, index) => {
                const t = index / Math.max(ids.length - 1, 1);
                const target = {
                    x: base.x + (dx * t),
                    y: base.y + (dy * t),
                    z: base.z + (dz * t),
                };
                const point = this._pointLike(hand[id]);
                if (!point) return;
                const blended = {
                    x: point.x + ((target.x - point.x) * weight),
                    y: point.y + ((target.y - point.y) * weight),
                    z: point.z + ((target.z - point.z) * weight),
                };
                hand[id] = this._writePointLike(hand[id], blended);
            });
        }

        _curlFinger(hand, ids, weight = 0.35) {
            const base = this._pointLike(hand[ids[0]]);
            if (!base) return;

            ids.forEach((id, index) => {
                const point = this._pointLike(hand[id]);
                if (!point) return;
                const curlAmount = 0.015 * index;
                const target = {
                    x: point.x + ((base.x - point.x) * weight * 0.45),
                    y: point.y + (curlAmount * weight),
                    z: point.z + (curlAmount * weight),
                };
                hand[id] = this._writePointLike(hand[id], target);
            });
        }

        _estimateHandFrame(side, points, cache) {
            if (!Array.isArray(points) || points.length < 21) return null;
            const wrist = points[0];
            const indexMcp = points[5];
            const middleMcp = points[9];
            const pinkyMcp = points[17];
            const middleTip = points[12];
            if (!wrist || !indexMcp || !middleMcp || !pinkyMcp) return null;

            // Approximate a palm frame from wrist, index MCP, middle MCP, and pinky MCP.
            // The palm width comes from index->pinky, while wrist->middle gives the palm
            // forward/up direction. This is cheap enough to run every frame and stable enough
            // to keep the cartoon hand facing the viewer without needing a full hand rig.
            const widthVec = indexMcp.clone().sub(pinkyMcp);
            const widthLen = widthVec.length();
            if (widthLen < 1e-4) return null;
            const xAxis = widthVec.clone().normalize();

            const palmVec = middleMcp.clone().sub(wrist);
            let yAxis = palmVec.clone().sub(xAxis.clone().multiplyScalar(palmVec.dot(xAxis)));
            if (yAxis.lengthSq() < 1e-6) {
                yAxis = new this.T.Vector3(0, 1, 0);
                yAxis.sub(xAxis.clone().multiplyScalar(yAxis.dot(xAxis)));
            }
            yAxis.normalize();

            let zAxis = new this.T.Vector3().crossVectors(xAxis, yAxis);
            if (zAxis.lengthSq() < 1e-6) {
                zAxis = new this.T.Vector3(0, 0, 1);
            } else {
                zAxis.normalize();
            }

            const palmCenter = wrist.clone()
                .add(indexMcp)
                .add(middleMcp)
                .add(pinkyMcp)
                .multiplyScalar(0.25);
            const towardCamera = this.camera.position.clone().sub(palmCenter).normalize();
            if (zAxis.dot(towardCamera) < 0) {
                zAxis.multiplyScalar(-1);
            }
            yAxis = new this.T.Vector3().crossVectors(zAxis, xAxis).normalize();

            const lengthLen = Math.max(wrist.distanceTo(middleMcp), wrist.distanceTo(middleTip || middleMcp));
            const thumbReach = wrist.distanceTo(points[4] || middleMcp);
            const readableBoost = this.readableHands ? 1.34 : 1.0;
            const rawScale = Math.max(widthLen * 1.55, lengthLen * 1.35, thumbReach * 1.15) * readableBoost;
            const scale = Math.max(0.18, Math.min(0.58, rawScale));

            const matrix = new this.T.Matrix4().makeBasis(xAxis, yAxis, zAxis);
            const quaternion = new this.T.Quaternion().setFromRotationMatrix(matrix);

            const cached = cache.handFrame || {};
            const scaleAlpha = this.cartoonMode ? 0.34 : 0.52;
            const orientationAlpha = this.handSmoothing.orientation;
            const centerAlpha = this.cartoonMode ? 0.42 : 0.5;

            const finalCenter = cached.center ? cached.center.clone().lerp(palmCenter, centerAlpha) : palmCenter.clone();
            const finalScale = Number.isFinite(cached.scale)
                ? (cached.scale + ((scale - cached.scale) * scaleAlpha))
                : scale;
            const finalQuaternion = cached.quaternion
                ? cached.quaternion.clone().slerp(quaternion, orientationAlpha)
                : quaternion.clone();

            cache.handFrame = {
                center: finalCenter,
                quaternion: finalQuaternion,
                xAxis,
                yAxis,
                zAxis,
                scale: finalScale,
                thumbReach,
            };
            return cache.handFrame;
        }

        buildCartoonHandPose(points, side, previousHandState = {}) {
            if (!this.readableHands || !this.cartoonMode || !Array.isArray(points) || points.length < 21) {
                return null;
            }

            const prev = previousHandState || {};
            const prevFrame = prev.handFrame || prev.frame || null;
            const rawPoints = points.map((pt) => pt.clone());
            // Raw MediaPipe landmarks are noisy, so this path rebuilds a clean cartoon hand
            // from palm-local parameters instead of rendering the source points directly.
            const frame = this._estimateHandFrame(side, rawPoints, { handFrame: prevFrame });
            if (!frame || !frame.center || !frame.quaternion) {
                if (prev.cleanPoints && (prev.missingFrames || 0) < 8) {
                    return {
                        ...prev,
                        missingFrames: (prev.missingFrames || 0) + 1,
                        reused: true,
                    };
                }
                return null;
            }

            const inverse = frame.quaternion.clone().invert();
            const toLocal = (pt) => pt.clone().sub(frame.center).applyQuaternion(inverse);
            const toWorld = (pt) => frame.center.clone()
                .add(frame.xAxis.clone().multiplyScalar(pt.x))
                .add(frame.yAxis.clone().multiplyScalar(pt.y))
                .add(frame.zAxis.clone().multiplyScalar(pt.z));
            const localRaw = rawPoints.map((pt) => toLocal(pt));
            const smoothScalar = (previous, current, alpha) => (Number.isFinite(previous)
                ? previous + ((current - previous) * alpha)
                : current);
            const clamp01 = (value) => Math.max(0, Math.min(1, value));
            const clampSigned = (value) => Math.max(-1.3, Math.min(1.3, value));

            const rawWidth = Math.max(
                Math.abs(localRaw[5].x - localRaw[17].x),
                Math.abs(localRaw[5].x - localRaw[9].x) + Math.abs(localRaw[9].x - localRaw[17].x),
            );
            const rawLength = Math.max(
                rawPoints[0].distanceTo(rawPoints[9]),
                rawPoints[0].distanceTo(rawPoints[12]),
                rawPoints[0].distanceTo(rawPoints[8]),
                rawPoints[0].distanceTo(rawPoints[20]),
            );

            const palmWidth = smoothScalar(prev.palmWidth, Math.max(0.22, Math.min(0.68, rawWidth * 1.1)), 0.35);
            const palmLength = smoothScalar(prev.palmLength, Math.max(0.34, Math.min(0.96, rawLength * 1.16)), 0.35);
            const palmDepth = smoothScalar(prev.palmDepth, Math.max(0.06, Math.min(0.2, palmWidth * 0.22)), 0.35);
            const wristLocal = prev.wristLocal
                ? prev.wristLocal.clone().lerp(localRaw[0], 0.28)
                : localRaw[0].clone();

            const preset = this.tokenHandshapes
                ? (this.activeTokenPreset || getTokenHandshapePreset(this.activeToken, side))
                : null;
            const tokenWeight = preset ? this.tokenHandshapeStrength : 0;

            const fingerGroups = {
                thumb: [1, 2, 3, 4],
                index: [5, 6, 7, 8],
                middle: [9, 10, 11, 12],
                ring: [13, 14, 15, 16],
                pinky: [17, 18, 19, 20],
            };

            const resultLocal = new Array(21);
            resultLocal[0] = wristLocal.clone();
            const fingerStates = {};
            const rawFingerStates = {};
            const cleanedFingerLocal = {};
            const lerpValue = (a, b, t) => (Number.isFinite(a) ? a + ((b - a) * t) : b);

            CARTOON_FINGER_ORDER.forEach((fingerName) => {
                const cfg = CARTOON_FINGER_CONFIG[fingerName];
                const indices = fingerGroups[fingerName];
                const rawBase = localRaw[indices[0]];
                const rawMid1 = localRaw[indices[1]];
                const rawMid2 = localRaw[indices[2]];
                const rawTip = localRaw[indices[3]];

                const segmentSum = rawBase.distanceTo(rawMid1) + rawMid1.distanceTo(rawMid2) + rawMid2.distanceTo(rawTip);
                const baseToTip = rawBase.distanceTo(rawTip);
                const curlRaw = 1 - clamp01(baseToTip / Math.max(segmentSum, 1e-4));
                const spreadRaw = fingerName === "thumb"
                    ? clampSigned((rawTip.x - rawBase.x) / Math.max(palmWidth * 0.45, 1e-4))
                    : clampSigned(rawBase.x / Math.max(palmWidth * 0.52, 1e-4));
                const extendRaw = clamp01(baseToTip / Math.max(palmLength * cfg.length, 1e-4));

                const presetFinger = preset ? preset[fingerName] : null;
                const targetCurl = presetFinger ? lerpValue(curlRaw, presetFinger.curl, tokenWeight) : curlRaw;
                const targetSpread = presetFinger ? lerpValue(spreadRaw, presetFinger.spread, tokenWeight) : spreadRaw;
                const targetExtend = presetFinger ? lerpValue(extendRaw, presetFinger.extend, tokenWeight) : extendRaw;

                const prevFinger = prev.fingerStates && prev.fingerStates[fingerName] ? prev.fingerStates[fingerName] : null;
                const curl = lerpValue(prevFinger ? prevFinger.curl : null, clamp01(targetCurl), 0.3);
                const spread = lerpValue(prevFinger ? prevFinger.spread : null, clampSigned(targetSpread), 0.25);
                const extend = lerpValue(prevFinger ? prevFinger.extend : null, clamp01(targetExtend), 0.25);

                rawFingerStates[fingerName] = {
                    curl: curlRaw,
                    spread: spreadRaw,
                    extend: extendRaw,
                };
                fingerStates[fingerName] = { curl, spread, extend };

                const baseX = (cfg.baseX * palmWidth) + (spread * palmWidth * 0.16);
                const baseY = cfg.baseY * palmLength;
                const baseZ = cfg.baseZ * palmDepth;
                const fingerBase = new this.T.Vector3(baseX, baseY, baseZ);
                const reach = palmLength * cfg.length * (0.58 + (extend * 0.48));
                const curlAmount = clamp01(curl);
                const spreadLean = Math.max(-0.72, Math.min(0.72, cfg.sideLean + (spread * cfg.spreadResponse)));
                const openAmount = 1 - curlAmount;
                const fingerSide = fingerName === "thumb" ? -1 : (cfg.baseX >= 0 ? 1 : -1);

                let dir1;
                let dir2;
                let dir3;
                let len1;
                let len2;
                let len3;
                if (fingerName === "thumb") {
                    // The thumb is kept shorter and angled away from the palm so it reads as a
                    // distinct sign-hand shape instead of collapsing into the fingers.
                    dir1 = new this.T.Vector3(
                        (spreadLean * 1.05) - (fingerSide * openAmount * 0.08),
                        0.72 - (curlAmount * 0.16),
                        -0.10 - (curlAmount * 0.16),
                    ).normalize();
                    dir2 = new this.T.Vector3(
                        (spreadLean * 0.82) - (fingerSide * openAmount * 0.04),
                        0.60 - (curlAmount * 0.36),
                        -0.18 - (curlAmount * 0.30),
                    ).normalize();
                    dir3 = new this.T.Vector3(
                        (spreadLean * 0.60) - (fingerSide * openAmount * 0.02),
                        0.54 - (curlAmount * 0.54),
                        -0.26 - (curlAmount * 0.44),
                    ).normalize();
                    len1 = reach * 0.28;
                    len2 = reach * 0.32;
                    len3 = reach * 0.40;
                } else {
                    // Non-thumb fingers follow a smoother three-segment curve so the hand reads
                    // as a recognizable sign hand instead of a bundle of straight rods.
                    dir1 = new this.T.Vector3(
                        spreadLean * 0.88,
                        1 - (curlAmount * 0.10),
                        -0.06 - (curlAmount * 0.14),
                    ).normalize();
                    dir2 = new this.T.Vector3(
                        spreadLean * 0.64,
                        0.88 - (curlAmount * 0.30),
                        -0.14 - (curlAmount * 0.28),
                    ).normalize();
                    dir3 = new this.T.Vector3(
                        spreadLean * 0.42,
                        0.68 - (curlAmount * 0.48),
                        -0.18 - (curlAmount * 0.44),
                    ).normalize();
                    len1 = reach * 0.34;
                    len2 = reach * 0.32;
                    len3 = reach * 0.34;
                }

                const mid1 = fingerBase.clone().addScaledVector(dir1, len1);
                const mid2 = mid1.clone().addScaledVector(dir2, len2);
                const tip = mid2.clone().addScaledVector(dir3, len3);
                const fingerArc = palmWidth * (openAmount * 0.05 + curlAmount * 0.03);
                mid1.x += fingerSide * fingerArc * 0.45;
                mid2.x += fingerSide * fingerArc * 0.72;
                tip.x += fingerSide * fingerArc;
                const lift = (1 - curlAmount) * palmLength * (fingerName === "thumb" ? 0.04 : 0.06);
                mid1.y += lift * (fingerName === "thumb" ? 0.35 : 0.46);
                mid2.y += lift * (fingerName === "thumb" ? 0.16 : 0.20);
                tip.y += lift * (fingerName === "thumb" ? 0.03 : 0.04);
                mid1.z -= curlAmount * palmDepth * (fingerName === "thumb" ? 0.18 : 0.14);
                mid2.z -= curlAmount * palmDepth * (fingerName === "thumb" ? 0.26 : 0.22);
                tip.z -= curlAmount * palmDepth * (fingerName === "thumb" ? 0.32 : 0.28);

                cleanedFingerLocal[fingerName] = {
                    base: fingerBase.clone(),
                    mid1: mid1.clone(),
                    mid2: mid2.clone(),
                    tip: tip.clone(),
                    curl,
                    spread,
                    extend,
                    rawTip: rawTip.clone(),
                };

                resultLocal[indices[0]] = fingerBase.clone();
                resultLocal[indices[1]] = mid1.clone();
                resultLocal[indices[2]] = mid2.clone();
                resultLocal[indices[3]] = tip.clone();
            });

            const pushFinger = (fingerName, delta) => {
                const finger = cleanedFingerLocal[fingerName];
                if (!finger || !Number.isFinite(delta) || Math.abs(delta) < 1e-5) return;
                const offset = new this.T.Vector3(delta, 0, 0);
                finger.base.add(offset);
                finger.mid1.add(offset);
                finger.mid2.add(offset);
                finger.tip.add(offset);
                const indices = fingerGroups[fingerName];
                resultLocal[indices[0]] = finger.base.clone();
                resultLocal[indices[1]] = finger.mid1.clone();
                resultLocal[indices[2]] = finger.mid2.clone();
                resultLocal[indices[3]] = finger.tip.clone();
            };

            [["index", "middle"], ["middle", "ring"], ["ring", "pinky"]].forEach(([leftName, rightName]) => {
                const leftFinger = cleanedFingerLocal[leftName];
                const rightFinger = cleanedFingerLocal[rightName];
                if (!leftFinger || !rightFinger) return;
                const minGap = palmWidth * Math.max(0.08, 0.11 - (Math.max(leftFinger.curl, rightFinger.curl) * 0.03));
                const gap = rightFinger.tip.x - leftFinger.tip.x;
                if (gap < minGap) {
                    const push = (minGap - gap) * 0.5;
                    pushFinger(leftName, -push);
                    pushFinger(rightName, push);
                }
            });

            const cleanLocalPoints = resultLocal.map((pt) => (pt ? pt.clone() : null));
            const cleanWorldPoints = cleanLocalPoints.map((pt) => (pt ? toWorld(pt) : null));
            const smoothedCleanPoints = prev.cleanPoints ? smoothPoints(prev.cleanPoints, cleanWorldPoints, 0.2) : cleanWorldPoints;
            const cleanedWorldPoints = smoothedCleanPoints.map((pt) => pt.clone());

            return {
                handFrame: {
                    center: frame.center.clone(),
                    quaternion: frame.quaternion.clone(),
                    xAxis: frame.xAxis.clone(),
                    yAxis: frame.yAxis.clone(),
                    zAxis: frame.zAxis.clone(),
                    scale: frame.scale,
                    width: palmWidth,
                    length: palmLength,
                    depth: palmDepth,
                },
                frame: {
                    center: frame.center.clone(),
                    quaternion: frame.quaternion.clone(),
                    xAxis: frame.xAxis.clone(),
                    yAxis: frame.yAxis.clone(),
                    zAxis: frame.zAxis.clone(),
                    scale: frame.scale,
                },
                palmCenter: frame.center.clone(),
                palmRotation: frame.quaternion.clone(),
                palmWidth,
                palmLength,
                palmDepth,
                fingers: cleanedFingerLocal,
                fingerStates,
                rawFingerStates,
                rawPoints,
                rawLocalPoints: localRaw.map((pt) => pt.clone()),
                cleanPoints: cleanedWorldPoints,
                cleanLocalPoints,
                wristLocal: wristLocal.clone(),
                missingFrames: 0,
                token: this.activeToken || null,
                tokenPreset: preset ? { ...preset } : null,
            };
        }

        _stylizeReadableHandPoints(points, handFrame, side, cache) {
            if (!this.readableHands || !handFrame || !Array.isArray(points) || points.length < 21) {
                return points;
            }
            const pose = this.buildCartoonHandPose(points, side, cache || {});
            if (!pose || !Array.isArray(pose.cleanPoints)) {
                return points;
            }
            if (cache) {
                cache.cartoonHandState = pose;
                cache.readableHandPoints = pose.cleanPoints.map((pt) => pt.clone());
            }
            return pose.cleanPoints;
        }

        _updateHandTrails(sideObj, side, handFrame) {
            if (!this.handTrails || !sideObj || !Array.isArray(sideObj.trailNodes) || !handFrame) {
                if (sideObj && Array.isArray(sideObj.trailNodes)) {
                    sideObj.trailNodes.forEach((node) => { if (node) node.visible = false; });
                }
                return;
            }

            const cache = this.sideState[side];
            const trail = Array.isArray(cache.trail) ? cache.trail : (cache.trail = []);
            trail.unshift(handFrame.center.clone());
            while (trail.length > 10) trail.pop();

            sideObj.trailNodes.forEach((node, idx) => {
                if (!node) return;
                const point = trail[idx];
                if (!point) {
                    node.visible = false;
                    return;
                }
                node.visible = true;
                node.position.copy(point);
                const alpha = 1 - (idx / Math.max(trail.length - 1, 1));
                node.material.opacity = 0.12 * alpha;
                node.scale.setScalar(0.24 + (0.18 * alpha));
            });
        }

        _mapBodyPoint(point) {
            if (!Array.isArray(point) || point.length < 3) return null;
            return new this.T.Vector3(
                (0.5 - point[0]) * 3.2,
                ((0.62 - point[1]) * 2.7) + 0.95,
                (point[2] * 2.2) - 0.95,
            );
        }

        _mapPoseJoint(pose, key) {
            if (!pose || !pose[key]) return null;
            return this._mapBodyPoint(pose[key]);
        }

        _applyAlignmentToPoint(point, alignment) {
            if (!point || !alignment) return point;
            const local = point.clone().sub(alignment.poseCenter);
            local.applyQuaternion(alignment.rotation);
            local.multiplyScalar(alignment.scale);
            return alignment.rigCenter.clone().add(local);
        }

        _applyAlignmentToPoints(points, alignment) {
            if (!Array.isArray(points) || !alignment) return points;
            return points.map((pt) => this._applyAlignmentToPoint(pt, alignment));
        }

        _computeHumanFrameAlignment(pose) {
            if (!this.humanRig || !this.humanRig.ready || !pose) return null;
            const bones = this.humanRig.bones || {};
            const poseLeft = this._mapPoseJoint(pose, "left_shoulder");
            const poseRight = this._mapPoseJoint(pose, "right_shoulder");
            const poseNose = this._mapPoseJoint(pose, "nose");
            const rigLeft = this._getBoneWorldPosition(bones.leftShoulder || bones.leftUpperArm);
            const rigRight = this._getBoneWorldPosition(bones.rightShoulder || bones.rightUpperArm);
            const rigHead = this._getBoneWorldPosition(bones.head || bones.neck);
            if (!poseLeft || !poseRight || !rigLeft || !rigRight) return null;

            const poseAxis = poseRight.clone().sub(poseLeft);
            const rigAxis = rigRight.clone().sub(rigLeft);
            const poseSpan = poseAxis.length();
            const rigSpan = rigAxis.length();
            if (poseSpan < 1e-4 || rigSpan < 1e-4) return null;

            const poseCenter = poseLeft.clone().add(poseRight).multiplyScalar(0.5);
            const rigCenter = rigLeft.clone().add(rigRight).multiplyScalar(0.5);

            const buildBasis = (xAxisInput, upInput) => {
                const xAxis = xAxisInput.clone().normalize();
                let yAxis = (upInput && upInput.lengthSq() > 1e-8)
                    ? upInput.clone()
                    : new this.T.Vector3(0, 1, 0);
                yAxis.sub(xAxis.clone().multiplyScalar(yAxis.dot(xAxis)));
                if (yAxis.lengthSq() < 1e-8) {
                    yAxis = new this.T.Vector3(0, 1, 0);
                    yAxis.sub(xAxis.clone().multiplyScalar(yAxis.dot(xAxis)));
                }
                if (yAxis.lengthSq() < 1e-8) {
                    yAxis = new this.T.Vector3(0, 0, 1);
                    yAxis.sub(xAxis.clone().multiplyScalar(yAxis.dot(xAxis)));
                }
                yAxis.normalize();
                const zAxis = new this.T.Vector3().crossVectors(xAxis, yAxis).normalize();
                const orthoY = new this.T.Vector3().crossVectors(zAxis, xAxis).normalize();
                return { x: xAxis, y: orthoY, z: zAxis };
            };

            const poseUp = poseNose
                ? poseNose.clone().sub(poseCenter)
                : new this.T.Vector3(0, 1, 0);
            const rigUp = rigHead
                ? rigHead.clone().sub(rigCenter)
                : new this.T.Vector3(0, 1, 0);

            const poseBasis = buildBasis(poseAxis, poseUp);
            const rigBasis = buildBasis(rigAxis, rigUp);
            const poseMatrix = new this.T.Matrix4().makeBasis(poseBasis.x, poseBasis.y, poseBasis.z);
            const rigMatrix = new this.T.Matrix4().makeBasis(rigBasis.x, rigBasis.y, rigBasis.z);
            const poseQuat = new this.T.Quaternion().setFromRotationMatrix(poseMatrix);
            const rigQuat = new this.T.Quaternion().setFromRotationMatrix(rigMatrix);
            const rotation = rigQuat.multiply(poseQuat.invert());

            const scale = rigSpan / poseSpan;
            return { poseCenter, rigCenter, rotation, scale };
        }

        async _prepareGLTFLoader() {
            if (this._gltfLoaderClass) return this._gltfLoaderClass;
            if (this.T.GLTFLoader) {
                this._gltfLoaderClass = this.T.GLTFLoader;
                return this._gltfLoaderClass;
            }

            const loaderCandidates = [
                global.GESTURE3D_GLTF_LOADER_URL || "/static/vendor/GLTFLoader.module.js",
                "https://unpkg.com/three@0.160.0/examples/jsm/loaders/GLTFLoader.js?module",
            ];

            for (const moduleUrl of loaderCandidates) {
                try {
                    const mod = await import(moduleUrl);
                    if (mod && mod.GLTFLoader) {
                        this._gltfLoaderClass = mod.GLTFLoader;
                        return this._gltfLoaderClass;
                    }
                } catch (_error) {
                    // Try the next candidate.
                }
            }

            return null;
        }

        _normalizeBoneName(name) {
            return String(name || "")
                .toLowerCase()
                .replace(/[^a-z0-9]/g, "");
        }

        _findBestBone(bones, hints) {
            if (!Array.isArray(bones) || !bones.length || !Array.isArray(hints) || !hints.length) return null;
            const normHints = hints.map((hint) => this._normalizeBoneName(hint)).filter(Boolean);
            let best = null;
            let bestScore = -Infinity;
            for (const bone of bones) {
                const normName = this._normalizeBoneName(bone.name);
                if (!normName) continue;
                let score = -Infinity;
                for (const hint of normHints) {
                    if (!hint) continue;
                    if (normName === hint) {
                        score = Math.max(score, 300);
                    } else if (normName.startsWith(hint)) {
                        score = Math.max(score, 240 - (normName.length - hint.length));
                    } else if (normName.includes(hint)) {
                        score = Math.max(score, 180 - Math.abs(normName.length - hint.length));
                    }
                }
                if (score > bestScore) {
                    bestScore = score;
                    best = bone;
                }
            }
            return bestScore > -Infinity ? best : null;
        }

        _extractBoneOrder(name) {
            const norm = this._normalizeBoneName(name);
            const tailDigits = norm.match(/(\d+)$/);
            if (tailDigits) return Number(tailDigits[1]);
            if (norm.includes("metacarpal")) return 0;
            if (norm.includes("proximal")) return 1;
            if (norm.includes("intermediate")) return 2;
            if (norm.includes("distal")) return 3;
            if (norm.includes("tip")) return 4;
            return 8;
        }

        _sortBonesBySuffix(bones) {
            return bones.slice().sort((a, b) => {
                const orderDiff = this._extractBoneOrder(a.name) - this._extractBoneOrder(b.name);
                if (orderDiff !== 0) return orderDiff;
                return this._normalizeBoneName(a.name).localeCompare(this._normalizeBoneName(b.name));
            });
        }

        _collectFingerChain(bones, side, finger) {
            const sideTokens = side === "left"
                ? ["left", "mixamorigleft", "l"]
                : ["right", "mixamorigright", "r"];
            const fingerTokens = {
                thumb: ["thumb"],
                index: ["index", "fore"],
                middle: ["middle", "mid"],
                ring: ["ring"],
                pinky: ["pinky", "little"],
            }[finger] || [finger];

            const filtered = bones.filter((bone) => {
                const n = this._normalizeBoneName(bone.name);
                if (!n) return false;
                if (n.includes("twist") || n.includes("helper") || n.includes("target") || n.includes("ik")) return false;
                if (n.includes("end")) return false;
                const sideOk = sideTokens.some((token) => n.includes(token));
                if (!sideOk) return false;
                const fingerOk = fingerTokens.some((token) => n.includes(token));
                if (!fingerOk) return false;
                return true;
            });

            return this._sortBonesBySuffix(filtered).slice(0, 4);
        }

        _trackMorphTargets(mesh) {
            if (!mesh || !mesh.morphTargetDictionary || !Array.isArray(mesh.morphTargetInfluences)) return;
            const dict = mesh.morphTargetDictionary;
            const findKey = (candidates) => Object.keys(dict).find((key) => {
                const norm = this._normalizeBoneName(key);
                return candidates.some((token) => norm.includes(token));
            });

            const mouthOpenKey = findKey(["jawopen", "mouthopen", "openmouth", "aa"]);
            const smileKey = findKey(["smile", "mouthsmile", "happy"]);
            const blinkLeftKey = findKey(["blinkleft", "lefteyeclose", "eyecloseleft"]);
            const blinkRightKey = findKey(["blinkright", "righteyeclose", "eyecloseright"]);

            const tracked = {
                mesh,
                indices: {
                    mouthOpen: mouthOpenKey ? dict[mouthOpenKey] : -1,
                    smile: smileKey ? dict[smileKey] : -1,
                    blinkLeft: blinkLeftKey ? dict[blinkLeftKey] : -1,
                    blinkRight: blinkRightKey ? dict[blinkRightKey] : -1,
                },
            };
            this.humanRig.morphTargets.push(tracked);
        }

        _cacheHumanRigRestPose() {
            const allBones = new Set();
            Object.values(this.humanRig.bones).forEach((bone) => {
                if (bone) allBones.add(bone);
            });
            ["left", "right"].forEach((side) => {
                const chainGroups = this.humanRig.fingerChains[side] || {};
                Object.values(chainGroups).forEach((chain) => {
                    (chain || []).forEach((bone) => {
                        if (bone) allBones.add(bone);
                    });
                });
            });

            allBones.forEach((bone) => {
                this.humanRig.restQuats[bone.uuid] = bone.quaternion.clone();
                this.humanRig.restPos[bone.uuid] = bone.position.clone();
            });
        }

        _alignHumanRigToTargets(rigRoot, mappedBones) {
            const left = mappedBones.leftShoulder || mappedBones.leftUpperArm;
            const right = mappedBones.rightShoulder || mappedBones.rightUpperArm;
            if (!rigRoot || !left || !right) return;

            rigRoot.updateMatrixWorld(true);
            let leftPos = this._getBoneWorldPosition(left);
            let rightPos = this._getBoneWorldPosition(right);
            if (!leftPos || !rightPos) return;

            const measuredWidth = leftPos.distanceTo(rightPos);
            const targetWidth = this.shoulders.left.distanceTo(this.shoulders.right);
            if (measuredWidth > 1e-4 && targetWidth > 1e-4) {
                const scaleFactor = targetWidth / measuredWidth;
                rigRoot.scale.multiplyScalar(scaleFactor);
                rigRoot.updateMatrixWorld(true);
                leftPos = this._getBoneWorldPosition(left);
                rightPos = this._getBoneWorldPosition(right);
            }

            const shoulderMid = leftPos.clone().add(rightPos).multiplyScalar(0.5);
            const targetMid = this.shoulders.left
                .clone()
                .add(this.shoulders.right)
                .multiplyScalar(0.5)
                .add(new this.T.Vector3(0, 0.04, 0));
            const offset = targetMid.sub(shoulderMid);
            rigRoot.position.add(offset);
            rigRoot.updateMatrixWorld(true);
        }

        _measureHumanArmLengths() {
            const measure = (side) => {
                const isLeft = side === "left";
                const upperBone = isLeft ? this.humanRig.bones.leftUpperArm : this.humanRig.bones.rightUpperArm;
                const lowerBone = isLeft ? this.humanRig.bones.leftLowerArm : this.humanRig.bones.rightLowerArm;
                const handBone = isLeft ? this.humanRig.bones.leftHand : this.humanRig.bones.rightHand;
                const upperPos = this._getBoneWorldPosition(upperBone);
                const lowerPos = this._getBoneWorldPosition(lowerBone);
                const handPos = this._getBoneWorldPosition(handBone);
                const upperLength = (upperPos && lowerPos) ? upperPos.distanceTo(lowerPos) : this.limbLengths.upperArm;
                const lowerLength = (lowerPos && handPos) ? lowerPos.distanceTo(handPos) : this.limbLengths.foreArm;
                return {
                    upper: Math.max(0.25, Math.min(2.1, upperLength)),
                    lower: Math.max(0.22, Math.min(2.0, lowerLength)),
                };
            };
            this.humanRig.armLengths.left = measure("left");
            this.humanRig.armLengths.right = measure("right");
        }

        _solveArmIKWithLengths(shoulder, wristTarget, side, upperLength, lowerLength) {
            const L1 = Math.max(0.15, upperLength || this.limbLengths.upperArm);
            const L2 = Math.max(0.15, lowerLength || this.limbLengths.foreArm);
            const targetVec = wristTarget.clone().sub(shoulder);
            let distance = targetVec.length();
            let direction = targetVec;

            if (distance < 1e-4) {
                direction = new this.T.Vector3(side === "left" ? -1 : 1, -0.55, 0.18);
                distance = direction.length();
            }
            direction.normalize();

            const maxReach = (L1 + L2) - 0.01;
            const minReach = Math.abs(L1 - L2) + 0.04;
            const d = Math.max(minReach, Math.min(maxReach, distance));
            const wrist = shoulder.clone().addScaledVector(direction, d);

            const a = ((L1 * L1) - (L2 * L2) + (d * d)) / (2 * d);
            const hSq = Math.max((L1 * L1) - (a * a), 1e-6);
            const h = Math.sqrt(hSq);
            const mid = shoulder.clone().addScaledVector(direction, a);

            const sideSign = side === "left" ? -1 : 1;
            let bendAxis = new this.T.Vector3(sideSign * 0.9, -0.08, 0.78);
            bendAxis.sub(direction.clone().multiplyScalar(bendAxis.dot(direction)));
            if (bendAxis.lengthSq() < 1e-6) {
                bendAxis = new this.T.Vector3(sideSign, 0.1, 0.8);
                bendAxis.sub(direction.clone().multiplyScalar(bendAxis.dot(direction)));
            }
            bendAxis.normalize();

            const elbow = mid.clone().addScaledVector(bendAxis, h);
            return { elbow, wrist };
        }

        _getBoneWorldPosition(bone) {
            if (!bone) return null;
            const pos = new this.T.Vector3();
            bone.getWorldPosition(pos);
            return pos;
        }

        _blendBoneToRest(bone, amount = 0.2) {
            if (!bone) return;
            const restQ = this.humanRig.restQuats[bone.uuid];
            const restP = this.humanRig.restPos[bone.uuid];
            if (restQ) bone.quaternion.slerp(restQ, amount);
            if (restP) bone.position.lerp(restP, amount * 0.35);
        }

        _aimBoneAt(bone, childBone, targetWorld, strength = 0.45) {
            if (!bone || !targetWorld) return;
            const bonePos = new this.T.Vector3();
            bone.getWorldPosition(bonePos);

            let fromDir = null;
            if (childBone) {
                const childPos = new this.T.Vector3();
                childBone.getWorldPosition(childPos);
                const dir = childPos.sub(bonePos);
                if (dir.lengthSq() > 1e-8) fromDir = dir.normalize();
            }
            if (!fromDir) {
                const worldQ = new this.T.Quaternion();
                bone.getWorldQuaternion(worldQ);
                fromDir = new this.T.Vector3(0, 1, 0).applyQuaternion(worldQ).normalize();
            }

            const toDir = targetWorld.clone().sub(bonePos);
            if (toDir.lengthSq() < 1e-8) return;
            toDir.normalize();

            const delta = new this.T.Quaternion().setFromUnitVectors(fromDir, toDir);
            const currentWorldQ = new this.T.Quaternion();
            bone.getWorldQuaternion(currentWorldQ);
            const desiredWorldQ = delta.multiply(currentWorldQ);

            const parentWorldQ = new this.T.Quaternion();
            if (bone.parent) bone.parent.getWorldQuaternion(parentWorldQ);
            const desiredLocalQ = parentWorldQ.invert().multiply(desiredWorldQ);
            bone.quaternion.slerp(desiredLocalQ, Math.max(0.12, Math.min(0.85, strength)));
        }

        _slerpBoneToWorldQuaternion(bone, worldQuat, strength = 0.4) {
            if (!bone || !worldQuat) return;
            const parentWorldQ = new this.T.Quaternion();
            if (bone.parent) bone.parent.getWorldQuaternion(parentWorldQ);
            const desiredLocalQ = parentWorldQ.invert().multiply(worldQuat.clone());
            bone.quaternion.slerp(desiredLocalQ, Math.max(0.1, Math.min(0.9, strength)));
        }

        _orientHumanHandBoneFromLandmarks(side, handBone, handPoints, strength = 0.5) {
            if (!handBone || !handPoints || handPoints.length < 18) return;
            const wrist = handPoints[0];
            const indexMcp = handPoints[5];
            const pinkyMcp = handPoints[17];
            const middleMcp = handPoints[9];
            if (!wrist || !indexMcp || !pinkyMcp || !middleMcp) return;

            const fingerDir = middleMcp.clone().sub(wrist);
            const acrossPalm = indexMcp.clone().sub(pinkyMcp);
            if (fingerDir.lengthSq() < 1e-8 || acrossPalm.lengthSq() < 1e-8) return;

            const yAxis = fingerDir.normalize();
            const xAxis = acrossPalm.normalize();
            let zAxis = new this.T.Vector3().crossVectors(xAxis, yAxis);
            if (zAxis.lengthSq() < 1e-8) return;
            zAxis.normalize();

            // Keep palm orientation stable between left/right hands.
            if (side === "right") zAxis.multiplyScalar(-1);

            const orthoX = new this.T.Vector3().crossVectors(yAxis, zAxis).normalize();
            const orthoZ = new this.T.Vector3().crossVectors(orthoX, yAxis).normalize();
            const basis = new this.T.Matrix4().makeBasis(orthoX, yAxis, orthoZ);
            const worldQuat = new this.T.Quaternion().setFromRotationMatrix(basis);
            this._slerpBoneToWorldQuaternion(handBone, worldQuat, strength);
        }

        _getHumanTorsoAnchor() {
            if (!this.humanRig || !this.humanRig.bones) return null;
            const bones = this.humanRig.bones;
            const chest = this._getBoneWorldPosition(bones.chest || bones.spine || bones.hips);
            if (chest) return chest;

            const left = this._getBoneWorldPosition(bones.leftShoulder || bones.leftUpperArm);
            const right = this._getBoneWorldPosition(bones.rightShoulder || bones.rightUpperArm);
            if (left && right) {
                return left.clone().add(right).multiplyScalar(0.5).add(new this.T.Vector3(0, -0.16, 0));
            }
            return null;
        }

        _getHumanSideAxis() {
            if (!this.humanRig || !this.humanRig.bones) return new this.T.Vector3(1, 0, 0);
            const bones = this.humanRig.bones;
            const left = this._getBoneWorldPosition(bones.leftShoulder || bones.leftUpperArm);
            const right = this._getBoneWorldPosition(bones.rightShoulder || bones.rightUpperArm);
            if (left && right) {
                const axis = right.clone().sub(left);
                if (axis.lengthSq() > 1e-8) return axis.normalize();
            }
            return new this.T.Vector3(1, 0, 0);
        }

        _getHumanShoulderWidth() {
            if (!this.humanRig || !this.humanRig.bones) return 1.4;
            const bones = this.humanRig.bones;
            const left = this._getBoneWorldPosition(bones.leftShoulder || bones.leftUpperArm);
            const right = this._getBoneWorldPosition(bones.rightShoulder || bones.rightUpperArm);
            if (!left || !right) return 1.4;
            const span = left.distanceTo(right);
            return Math.max(0.6, Math.min(2.4, span));
        }

        _enforceForwardPlane(point, torsoAnchor, toCamera, minForward) {
            if (!point || !torsoAnchor || !toCamera) return point;
            const out = point.clone();
            const forward = out.clone().sub(torsoAnchor).dot(toCamera);
            if (forward < minForward) {
                out.addScaledVector(toCamera, minForward - forward);
            }
            return out;
        }

        _clampPointToHandVisibleZone(side, point, torsoAnchor, toCamera, sideAxis, minForward, minLateral) {
            if (!point || !torsoAnchor || !toCamera) return point;
            const out = point.clone();
            const rel = out.clone().sub(torsoAnchor);
            const forward = rel.dot(toCamera);
            if (forward < minForward) out.addScaledVector(toCamera, minForward - forward);

            if (sideAxis) {
                const sign = side === "left" ? -1 : 1;
                const lateralRel = out.clone().sub(torsoAnchor);
                const lateral = lateralRel.dot(sideAxis) * sign;
                if (lateral < minLateral) out.addScaledVector(sideAxis, sign * (minLateral - lateral));
            }

            return out;
        }

        _applyHumanGuideArm(side, handLandmarks, pose = null, frameAlignment = null) {
            if (!this.humanGuide || !this.humanGuide.sides) return;
            const sideObj = this.humanGuide.sides[side];
            const rawPoseShoulder = this._mapPoseJoint(pose, `${side}_shoulder`);
            const rawPoseElbow = this._mapPoseJoint(pose, `${side}_elbow`);
            const rawPoseWrist = this._mapPoseJoint(pose, `${side}_wrist`);
            const rawHandPoints = Array.isArray(handLandmarks) && handLandmarks.length === 21
                ? this._mapHandLandmarks(handLandmarks)
                : null;

            const poseShoulder = this._applyAlignmentToPoint(rawPoseShoulder, frameAlignment);
            const poseElbow = this._applyAlignmentToPoint(rawPoseElbow, frameAlignment);
            const poseWrist = this._applyAlignmentToPoint(rawPoseWrist, frameAlignment);
            let handPoints = rawHandPoints ? this._applyAlignmentToPoints(rawHandPoints, frameAlignment) : null;

            const shoulder = poseShoulder || this._getBoneWorldPosition(
                side === "left"
                    ? (this.humanRig.bones.leftShoulder || this.humanRig.bones.leftUpperArm)
                    : (this.humanRig.bones.rightShoulder || this.humanRig.bones.rightUpperArm),
            );
            if (!shoulder) {
                this._hideGuideSide(sideObj);
                return;
            }

            let wristTarget = null;
            if (handPoints && handPoints[0]) wristTarget = handPoints[0].clone();
            else if (poseWrist) wristTarget = poseWrist.clone();
            else wristTarget = shoulder.clone().add(new this.T.Vector3(side === "left" ? -0.32 : 0.32, -0.62, 0.14));

            const torsoAnchor = this._getHumanTorsoAnchor();
            const sideAxis = this._getHumanSideAxis();
            const shoulderWidth = this._getHumanShoulderWidth();
            let toCamera = null;
            const wristForwardMin = 0.18 + (shoulderWidth * 0.08);
            const palmForwardMin = wristForwardMin + 0.08;
            if (torsoAnchor) {
                toCamera = this.camera.position.clone().sub(torsoAnchor);
                if (toCamera.lengthSq() > 1e-8) {
                    toCamera.normalize();
                    wristTarget = this._clampPointToHandVisibleZone(
                        side,
                        wristTarget,
                        torsoAnchor,
                        toCamera,
                        sideAxis,
                        wristForwardMin,
                        0.08,
                    );
                } else {
                    toCamera = null;
                }
            }

            const armLengths = this.humanRig.armLengths[side] || {
                upper: this.limbLengths.upperArm,
                lower: this.limbLengths.foreArm,
            };
            let elbow = null;
            let wrist = null;
            if (poseElbow && wristTarget) {
                const upperDir = poseElbow.clone().sub(shoulder);
                const lowerSeed = poseWrist || wristTarget;
                const lowerDir = lowerSeed.clone().sub(poseElbow);
                if (upperDir.lengthSq() > 1e-8 && lowerDir.lengthSq() > 1e-8) {
                    upperDir.normalize();
                    lowerDir.normalize();
                    elbow = shoulder.clone().addScaledVector(upperDir, armLengths.upper);
                    wrist = elbow.clone().addScaledVector(lowerDir, armLengths.lower);
                }
            }
            if (!elbow || !wrist) {
                const solved = this._solveArmIKWithLengths(
                    shoulder,
                    wristTarget,
                    side,
                    armLengths.upper,
                    armLengths.lower,
                );
                elbow = solved.elbow;
                wrist = solved.wrist;
            }

            if (torsoAnchor && toCamera) {
                wrist = this._clampPointToHandVisibleZone(
                    side,
                    wrist,
                    torsoAnchor,
                    toCamera,
                    sideAxis,
                    wristForwardMin,
                    0.08,
                );
            }

            if (handPoints && handPoints[0]) {
                const wristOffset = wrist.clone().sub(handPoints[0]);
                handPoints = handPoints.map((pt) => pt.clone().add(wristOffset));
                if (torsoAnchor && toCamera) {
                    const palmIndices = [0, 5, 9, 13, 17];
                    const palmCenter = new this.T.Vector3();
                    let count = 0;
                    palmIndices.forEach((idx) => {
                        if (handPoints[idx]) {
                            palmCenter.add(handPoints[idx]);
                            count += 1;
                        }
                    });
                    if (count > 0) {
                        palmCenter.multiplyScalar(1 / count);
                        const palmForward = palmCenter.clone().sub(torsoAnchor).dot(toCamera);
                        if (palmForward < palmForwardMin) {
                            const push = toCamera.clone().multiplyScalar(palmForwardMin - palmForward);
                            handPoints = handPoints.map((pt) => pt.clone().add(push));
                            wrist = wrist.clone().add(push);
                            const solved = this._solveArmIKWithLengths(
                                shoulder,
                                wrist,
                                side,
                                armLengths.upper,
                                armLengths.lower,
                            );
                            elbow = solved.elbow;
                        }
                    }
                }
            } else {
                handPoints = this._defaultOpenHand(side, wrist);
            }

            this._setCylinder(sideObj.upperArm, shoulder, elbow);
            this._setCylinder(sideObj.foreArm, elbow, wrist);
            sideObj.shoulderJoint.visible = true;
            sideObj.elbowJoint.visible = true;
            sideObj.wristJoint.visible = true;
            sideObj.shoulderJoint.position.copy(shoulder);
            sideObj.elbowJoint.position.copy(elbow);
            sideObj.wristJoint.position.copy(wrist);
            this._applyHandPoints(sideObj, handPoints);
        }

        _applyFingerChain(chain, landmarkIndices, handPoints, strength = 0.58) {
            if (!Array.isArray(chain) || !chain.length || !Array.isArray(landmarkIndices) || !handPoints) return;
            for (let i = 0; i < chain.length; i += 1) {
                const bone = chain[i];
                const child = i + 1 < chain.length ? chain[i + 1] : null;
                const lmIndex = landmarkIndices[Math.min(i + 1, landmarkIndices.length - 1)];
                const target = handPoints[lmIndex];
                if (!target) continue;
                this._aimBoneAt(bone, child, target, strength - (i * 0.08));
            }
        }

        _applyHumanArm(side, handLandmarks, pose = null, frameAlignment = null) {
            if (!this.humanRig.ready) return;
            const isLeft = side === "left";
            const bones = this.humanRig.bones;
            const shoulderBone = isLeft ? bones.leftShoulder : bones.rightShoulder;
            const upperBone = isLeft ? bones.leftUpperArm : bones.rightUpperArm;
            const lowerBone = isLeft ? bones.leftLowerArm : bones.rightLowerArm;
            const handBone = isLeft ? bones.leftHand : bones.rightHand;
            const chains = this.humanRig.fingerChains[side] || {};
            const sideCache = this.sideState[side];
            const hasHandData = Array.isArray(handLandmarks) && handLandmarks.length === 21;

            const rawPoseShoulder = this._mapPoseJoint(pose, `${side}_shoulder`);
            const rawPoseElbow = this._mapPoseJoint(pose, `${side}_elbow`);
            const rawPoseWrist = this._mapPoseJoint(pose, `${side}_wrist`);
            const rawHandPoints = hasHandData ? this._mapHandLandmarks(handLandmarks) : null;
            const poseShoulder = this._applyAlignmentToPoint(rawPoseShoulder, frameAlignment);
            const poseElbow = this._applyAlignmentToPoint(rawPoseElbow, frameAlignment);
            const poseWrist = this._applyAlignmentToPoint(rawPoseWrist, frameAlignment);
            const handPoints = rawHandPoints ? this._applyAlignmentToPoints(rawHandPoints, frameAlignment) : null;

            const shoulderWorld = this._getBoneWorldPosition(shoulderBone || upperBone);
            let shoulderTarget = poseShoulder || shoulderWorld;
            if (shoulderWorld && poseShoulder) {
                shoulderTarget = shoulderWorld.clone().lerp(poseShoulder, 0.9);
            }
            if (sideCache.shoulder && shoulderTarget) shoulderTarget = sideCache.shoulder.clone().lerp(shoulderTarget, 0.14);
            if (shoulderTarget) sideCache.shoulder = shoulderTarget.clone();

            if (!hasHandData || !handPoints || !handPoints[0]) {
                [shoulderBone, upperBone, lowerBone, handBone].forEach((bone) => this._blendBoneToRest(bone, 0.22));
                Object.values(chains).forEach((chain) => (chain || []).forEach((bone) => this._blendBoneToRest(bone, 0.26)));
                return;
            }

            let wristTargetRaw = handPoints[0].clone();
            if (poseWrist) {
                wristTargetRaw.lerp(poseWrist, 0.18);
            }

            if (!wristTargetRaw || !shoulderTarget) {
                [shoulderBone, upperBone, lowerBone, handBone].forEach((bone) => this._blendBoneToRest(bone, 0.22));
                Object.values(chains).forEach((chain) => (chain || []).forEach((bone) => this._blendBoneToRest(bone, 0.26)));
                return;
            }

            const torsoAnchor = this._getHumanTorsoAnchor();
            const sideAxis = this._getHumanSideAxis();
            const shoulderWidth = this._getHumanShoulderWidth();
            let toCamera = null;
            const wristForwardMin = 0.06 + (shoulderWidth * 0.04);
            const palmForwardMin = wristForwardMin + 0.04;
            if (torsoAnchor) {
                toCamera = this.camera.position.clone().sub(torsoAnchor);
                if (toCamera.lengthSq() > 1e-8) {
                    toCamera.normalize();
                    wristTargetRaw = this._clampPointToHandVisibleZone(
                        side,
                        wristTargetRaw,
                        torsoAnchor,
                        toCamera,
                        sideAxis,
                        wristForwardMin,
                        0.02,
                    );
                    wristTargetRaw = this._enforceForwardPlane(
                        wristTargetRaw,
                        torsoAnchor,
                        toCamera,
                        wristForwardMin,
                    );
                } else {
                    toCamera = null;
                }
            }

            const armLengths = this.humanRig.armLengths[side] || {
                upper: this.limbLengths.upperArm,
                lower: this.limbLengths.foreArm,
            };
            let elbowTarget = null;
            let wristSolved = null;
            const hasPoseChain = Boolean(poseShoulder && poseElbow && (poseWrist || wristTargetRaw));
            if (hasPoseChain) {
                const upperDir = poseElbow.clone().sub(poseShoulder);
                const lowerFrom = poseWrist || wristTargetRaw;
                const lowerDir = lowerFrom.clone().sub(poseElbow);
                if (upperDir.lengthSq() > 1e-8 && lowerDir.lengthSq() > 1e-8) {
                    upperDir.normalize();
                    lowerDir.normalize();
                    elbowTarget = shoulderTarget.clone().addScaledVector(upperDir, armLengths.upper);
                    wristSolved = elbowTarget.clone().addScaledVector(lowerDir, armLengths.lower);
                }
            }
            if (!elbowTarget || !wristSolved) {
                const solved = this._solveArmIKWithLengths(
                    shoulderTarget,
                    wristTargetRaw,
                    side,
                    armLengths.upper,
                    armLengths.lower,
                );
                elbowTarget = solved.elbow;
                wristSolved = solved.wrist;
                if (poseElbow) {
                    elbowTarget = elbowTarget.clone().lerp(poseElbow, 0.88);
                }
            }

            elbowTarget = sideCache.elbow ? sideCache.elbow.clone().lerp(elbowTarget, 0.16) : elbowTarget;
            wristSolved = sideCache.wrist ? sideCache.wrist.clone().lerp(wristSolved, 0.16) : wristSolved;
            if (torsoAnchor && toCamera) {
                wristSolved = this._clampPointToHandVisibleZone(
                    side,
                    wristSolved,
                    torsoAnchor,
                    toCamera,
                    sideAxis,
                    wristForwardMin,
                    0.02,
                );
            }

            let shiftedHandPoints = handPoints;
            if (handPoints && handPoints[0]) {
                const wristOffset = wristSolved.clone().sub(handPoints[0]);
                shiftedHandPoints = handPoints.map((pt) => pt.clone().add(wristOffset));
            }

            if (torsoAnchor && toCamera && shiftedHandPoints && shiftedHandPoints.length) {
                const palmIndices = [0, 5, 9, 13, 17];
                const palmCenter = new this.T.Vector3();
                let count = 0;
                palmIndices.forEach((idx) => {
                    if (shiftedHandPoints[idx]) {
                        palmCenter.add(shiftedHandPoints[idx]);
                        count += 1;
                    }
                });

                if (count > 0) {
                    palmCenter.multiplyScalar(1 / count);
                    const palmForward = palmCenter.clone().sub(torsoAnchor).dot(toCamera);
                    if (palmForward < palmForwardMin) {
                        const push = toCamera.clone().multiplyScalar(palmForwardMin - palmForward);
                        shiftedHandPoints = shiftedHandPoints.map((pt) => pt.clone().add(push));
                        wristSolved = wristSolved.clone().add(push);
                        // Re-solve elbow from the new wrist so limb length stays constant.
                        const solvedAfterPush = this._solveArmIKWithLengths(
                            shoulderTarget,
                            wristSolved,
                            side,
                            armLengths.upper,
                            armLengths.lower,
                        );
                        elbowTarget = elbowTarget.clone().lerp(solvedAfterPush.elbow, 0.72);
                    }
                }
            }

            sideCache.elbow = elbowTarget.clone();
            sideCache.wrist = wristSolved.clone();

            if (shoulderBone && upperBone && elbowTarget) this._aimBoneAt(shoulderBone, upperBone, elbowTarget, 0.34);
            if (upperBone && elbowTarget) this._aimBoneAt(upperBone, lowerBone || handBone, elbowTarget, 0.88);
            if (lowerBone && wristSolved) this._aimBoneAt(lowerBone, handBone, wristSolved, 0.9);

            this._blendBoneToRest(handBone, 0.22);
            Object.values(chains).forEach((chain) => (chain || []).forEach((bone) => this._blendBoneToRest(bone, 0.28)));
        }

        _applyHumanFace(face, frameAlignment = null) {
            if (!this.humanRig.ready) return;
            const head = this.humanRig.bones.head;
            const neck = this.humanRig.bones.neck;
            if (!head) return;

            if (!face || !face.anchors) {
                this._blendBoneToRest(head, 0.24);
                this._blendBoneToRest(neck, 0.2);
                this.humanRig.morphTargets.forEach((item) => {
                    const influences = item.mesh.morphTargetInfluences;
                    Object.values(item.indices).forEach((idx) => {
                        if (Number.isInteger(idx) && idx >= 0) influences[idx] *= 0.7;
                    });
                });
                return;
            }

            const nose = this._applyAlignmentToPoint(this._mapBodyPoint(face.anchors.nose), frameAlignment);
            const leftEye = this._applyAlignmentToPoint(this._mapBodyPoint(face.anchors.left_eye), frameAlignment);
            const rightEye = this._applyAlignmentToPoint(this._mapBodyPoint(face.anchors.right_eye), frameAlignment);
            const chin = this._applyAlignmentToPoint(this._mapBodyPoint(face.anchors.chin), frameAlignment);
            const mouthLeft = this._applyAlignmentToPoint(this._mapBodyPoint(face.anchors.mouth_left), frameAlignment);
            const mouthRight = this._applyAlignmentToPoint(this._mapBodyPoint(face.anchors.mouth_right), frameAlignment);

            let yaw = 0;
            let roll = 0;
            let pitch = 0;
            if (leftEye && rightEye) {
                const eyeLine = rightEye.clone().sub(leftEye);
                yaw = Math.max(-0.62, Math.min(0.62, eyeLine.x * 0.62));
                roll = Math.max(-0.35, Math.min(0.35, eyeLine.y * 1.15));
            }
            if (nose && chin) {
                pitch = Math.max(-0.32, Math.min(0.36, (chin.y - nose.y - 0.18) * 0.75));
            }

            const headRest = this.humanRig.restQuats[head.uuid] || head.quaternion.clone();
            const neckRest = neck ? (this.humanRig.restQuats[neck.uuid] || neck.quaternion.clone()) : null;
            const headDelta = new this.T.Quaternion().setFromEuler(new this.T.Euler(pitch, yaw, roll, "XYZ"));
            const neckDelta = new this.T.Quaternion().setFromEuler(new this.T.Euler(pitch * 0.35, yaw * 0.4, roll * 0.28, "XYZ"));
            head.quaternion.slerp(headRest.clone().multiply(headDelta), 0.3);
            if (neck && neckRest) neck.quaternion.slerp(neckRest.clone().multiply(neckDelta), 0.24);

            const mouthOpen = typeof face.mouth_open === "number"
                ? Math.max(0, Math.min(face.mouth_open * 15.0, 1.0))
                : 0;
            const smile = mouthLeft && mouthRight
                ? Math.max(0, Math.min((mouthLeft.distanceTo(mouthRight) - 0.14) * 4.5, 1.0))
                : 0;
            const blink = Math.max(0.1, 0.55 - (mouthOpen * 0.2));
            this.humanRig.morphTargets.forEach((item) => {
                const influences = item.mesh.morphTargetInfluences;
                const setMorph = (idx, value) => {
                    if (!Number.isInteger(idx) || idx < 0) return;
                    influences[idx] += (value - influences[idx]) * 0.28;
                };
                setMorph(item.indices.mouthOpen, mouthOpen);
                setMorph(item.indices.smile, smile);
                setMorph(item.indices.blinkLeft, blink);
                setMorph(item.indices.blinkRight, blink);
            });
        }

        _applyHumanRigFrame(leftData, rightData, pose, face) {
            if (!this.humanRig.ready) return false;
            const frameAlignment = this._computeHumanFrameAlignment(pose);
            this._applyHumanGuideArm("left", leftData, pose, frameAlignment);
            this._applyHumanGuideArm("right", rightData, pose, frameAlignment);
            this._applyHumanArm("left", leftData, pose, frameAlignment);
            this._applyHumanArm("right", rightData, pose, frameAlignment);
            this._applyHumanFace(face, frameAlignment);
            this._fitCameraToHumanUpperBody({ smooth: true });
            return true;
        }

        _resetHumanRigPose() {
            if (!this.humanRig.ready) return;
            Object.values(this.humanRig.bones).forEach((bone) => {
                if (!bone) return;
                const restQ = this.humanRig.restQuats[bone.uuid];
                const restP = this.humanRig.restPos[bone.uuid];
                if (restQ) bone.quaternion.copy(restQ);
                if (restP) bone.position.copy(restP);
            });
            ["left", "right"].forEach((side) => {
                const chainGroups = this.humanRig.fingerChains[side] || {};
                Object.values(chainGroups).forEach((chain) => {
                    (chain || []).forEach((bone) => {
                        const restQ = this.humanRig.restQuats[bone.uuid];
                        const restP = this.humanRig.restPos[bone.uuid];
                        if (restQ) bone.quaternion.copy(restQ);
                        if (restP) bone.position.copy(restP);
                    });
                });
            });
            this.humanRig.morphTargets.forEach((item) => {
                const influences = item.mesh.morphTargetInfluences;
                Object.values(item.indices).forEach((idx) => {
                    if (Number.isInteger(idx) && idx >= 0) influences[idx] = 0;
                });
            });
            if (this.humanGuide && this.humanGuide.sides) {
                this._hideGuideSide(this.humanGuide.sides.left);
                this._hideGuideSide(this.humanGuide.sides.right);
            }
            this._fitCameraToHumanUpperBody({ smooth: false });
        }

        _initHumanAvatar() {
            const LoaderClass = this._gltfLoaderClass;
            if (
                !this.avatarConfig.enabled
                || !LoaderClass
                || !this.avatarConfig.modelUrl
                || this.humanRig.loading
                || this.humanRig.ready
            ) return;

            this.humanRig.loading = true;
            const loader = new LoaderClass();
            loader.load(
                this.avatarConfig.modelUrl,
                (gltf) => {
                    const model = gltf && (gltf.scene || (Array.isArray(gltf.scenes) ? gltf.scenes[0] : null));
                    if (!model) {
                        this.humanRig.loading = false;
                        this.humanRig.failed = true;
                        console.warn("3D avatar model loaded with no scene graph.");
                        return;
                    }

                    const rigRoot = new this.T.Group();
                    rigRoot.name = "HumanInstructorRig";
                    rigRoot.position.set(0, this.avatarConfig.modelYOffset, -0.18);
                    rigRoot.scale.setScalar(this.avatarConfig.modelScale);
                    rigRoot.rotation.y = 0;
                    rigRoot.add(model);
                    this.scene.add(rigRoot);

                    const skinnedMeshes = [];
                    model.traverse((obj) => {
                        if (obj.isSkinnedMesh) skinnedMeshes.push(obj);
                        if (obj.isMesh) {
                            obj.castShadow = true;
                            obj.receiveShadow = true;
                            const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
                            mats.forEach((mat) => {
                                if (!mat) return;
                                if ("metalness" in mat) mat.metalness = Math.min(Number(mat.metalness) || 0, 0.08);
                                if ("roughness" in mat) mat.roughness = Math.max(0.42, Math.min(Number(mat.roughness) || 0.64, 0.92));
                                if ("envMapIntensity" in mat) mat.envMapIntensity = 0.75;
                            });
                            this._trackMorphTargets(obj);
                        }
                    });

                    let primarySkinned = null;
                    for (const mesh of skinnedMeshes) {
                        if (!mesh.skeleton || !Array.isArray(mesh.skeleton.bones)) continue;
                        if (!primarySkinned || mesh.skeleton.bones.length > primarySkinned.skeleton.bones.length) {
                            primarySkinned = mesh;
                        }
                    }

                    if (!primarySkinned || !primarySkinned.skeleton || !primarySkinned.skeleton.bones.length) {
                        this.scene.remove(rigRoot);
                        this.humanRig.loading = false;
                        this.humanRig.failed = true;
                        console.warn("3D avatar model has no skinned skeleton. Falling back to procedural avatar.");
                        return;
                    }

                    const bones = primarySkinned.skeleton.bones;
                    const mappedBones = {
                        hips: this._findBestBone(bones, ["mixamorighips", "hips", "pelvis"]),
                        spine: this._findBestBone(bones, ["mixamorigspine", "spine", "spine1", "spine01"]),
                        chest: this._findBestBone(bones, ["mixamorigspine2", "chest", "upperchest", "spine2", "spine03"]),
                        neck: this._findBestBone(bones, ["mixamorigneck", "neck", "neck1"]),
                        head: this._findBestBone(bones, ["mixamorighead", "head"]),
                        leftShoulder: this._findBestBone(bones, ["mixamorigleftshoulder", "leftshoulder", "shoulderl"]),
                        rightShoulder: this._findBestBone(bones, ["mixamorigrightshoulder", "rightshoulder", "shoulderr"]),
                        leftUpperArm: this._findBestBone(bones, ["mixamorigleftarm", "leftarm", "leftupperarm", "upperarml"]),
                        rightUpperArm: this._findBestBone(bones, ["mixamorigrightarm", "rightarm", "rightupperarm", "upperarmr"]),
                        leftLowerArm: this._findBestBone(bones, ["mixamorigleftforearm", "leftforearm", "leftlowerarm", "lowerarml"]),
                        rightLowerArm: this._findBestBone(bones, ["mixamorigrightforearm", "rightforearm", "rightlowerarm", "lowerarmr"]),
                        leftHand: this._findBestBone(bones, ["mixamoriglefthand", "lefthand", "handl"]),
                        rightHand: this._findBestBone(bones, ["mixamorigrighthand", "righthand", "handr"]),
                    };

                    if (!mappedBones.leftShoulder && mappedBones.leftUpperArm && mappedBones.leftUpperArm.parent) {
                        mappedBones.leftShoulder = mappedBones.leftUpperArm.parent;
                    }
                    if (!mappedBones.rightShoulder && mappedBones.rightUpperArm && mappedBones.rightUpperArm.parent) {
                        mappedBones.rightShoulder = mappedBones.rightUpperArm.parent;
                    }
                    const missingCritical = [
                        "leftUpperArm",
                        "rightUpperArm",
                        "leftLowerArm",
                        "rightLowerArm",
                        "leftHand",
                        "rightHand",
                        "head",
                    ].filter((key) => !mappedBones[key]);
                    if (missingCritical.length) {
                        this.scene.remove(rigRoot);
                        this.humanRig.loading = false;
                        this.humanRig.failed = true;
                        console.warn(`3D avatar missing critical rig bones: ${missingCritical.join(", ")}. Falling back to procedural avatar.`);
                        return;
                    }

                    this.humanRig.root = rigRoot;
                    this.humanRig.model = model;
                    this.humanRig.skeleton = primarySkinned.skeleton;
                    this.humanRig.bones = mappedBones;
                    this.humanRig.fingerChains.left = {
                        thumb: this._collectFingerChain(bones, "left", "thumb"),
                        index: this._collectFingerChain(bones, "left", "index"),
                        middle: this._collectFingerChain(bones, "left", "middle"),
                        ring: this._collectFingerChain(bones, "left", "ring"),
                        pinky: this._collectFingerChain(bones, "left", "pinky"),
                    };
                    this.humanRig.fingerChains.right = {
                        thumb: this._collectFingerChain(bones, "right", "thumb"),
                        index: this._collectFingerChain(bones, "right", "index"),
                        middle: this._collectFingerChain(bones, "right", "middle"),
                        ring: this._collectFingerChain(bones, "right", "ring"),
                        pinky: this._collectFingerChain(bones, "right", "pinky"),
                    };
                    const leftFingerBoneCount = Object.values(this.humanRig.fingerChains.left).reduce(
                        (sum, chain) => sum + (Array.isArray(chain) ? chain.length : 0),
                        0,
                    );
                    const rightFingerBoneCount = Object.values(this.humanRig.fingerChains.right).reduce(
                        (sum, chain) => sum + (Array.isArray(chain) ? chain.length : 0),
                        0,
                    );
                    if (leftFingerBoneCount < 8 || rightFingerBoneCount < 8) {
                        console.warn(
                            `3D avatar finger rig may be incomplete (left: ${leftFingerBoneCount}, right: ${rightFingerBoneCount} bones matched). Hand signs may look inaccurate.`,
                        );
                    }
                    this._alignHumanRigToTargets(rigRoot, mappedBones);
                    this._measureHumanArmLengths();
                    this._fitCameraToHumanUpperBody({ smooth: false, object: model });
                    this._cacheHumanRigRestPose();
                    this.humanRig.ready = true;
                    this.humanRig.loading = false;
                    this.humanRig.failed = false;
                    if (this.character && this.character.rig) this.character.rig.visible = false;
                },
                undefined,
                (err) => {
                    this.humanRig.loading = false;
                    this.humanRig.failed = true;
                    const reason = err && err.message ? err.message : String(err || "Unknown error");
                    console.warn(`Could not load 3D avatar model from ${this.avatarConfig.modelUrl}: ${reason}`);
                },
            );
        }

        _computeElbow(shoulder, wrist, side) {
            const toWrist = wrist.clone().sub(shoulder);
            const length = Math.max(toWrist.length(), 1e-4);
            const mid = shoulder.clone().addScaledVector(toWrist, 0.5);

            let perp = new this.T.Vector3(-toWrist.y, toWrist.x, 0);
            if (perp.lengthSq() < 1e-6) {
                perp = new this.T.Vector3(side === "left" ? -1 : 1, 0, 0);
            }
            perp.normalize();

            const bend = Math.min(Math.max(length * 0.32, 0.26), 0.84);
            const elbow = mid.addScaledVector(perp, side === "left" ? -bend : bend);
            elbow.z = (shoulder.z * 0.65) + (wrist.z * 0.35) + (side === "left" ? -0.12 : 0.12);
            return elbow;
        }

        _solveArmIK(shoulder, wristTarget, side) {
            const L1 = this.limbLengths.upperArm;
            const L2 = this.limbLengths.foreArm;
            const targetVec = wristTarget.clone().sub(shoulder);
            let distance = targetVec.length();
            let direction = targetVec;

            if (distance < 1e-4) {
                direction = new this.T.Vector3(side === "left" ? -1 : 1, -0.55, -0.16);
                distance = direction.length();
            }
            direction.normalize();

            const maxReach = (L1 + L2) - 0.01;
            const minReach = Math.abs(L1 - L2) + 0.05;
            const d = Math.max(minReach, Math.min(maxReach, distance));
            const wrist = shoulder.clone().addScaledVector(direction, d);

            const a = ((L1 * L1) - (L2 * L2) + (d * d)) / (2 * d);
            const hSq = Math.max((L1 * L1) - (a * a), 1e-6);
            const h = Math.sqrt(hSq);
            const mid = shoulder.clone().addScaledVector(direction, a);

            const sideSign = side === "left" ? -1 : 1;
            let bendAxis = new this.T.Vector3(sideSign, -0.12, 0.7);
            bendAxis.sub(direction.clone().multiplyScalar(bendAxis.dot(direction)));
            if (bendAxis.lengthSq() < 1e-6) {
                bendAxis = new this.T.Vector3(sideSign, 0, 1);
                bendAxis.sub(direction.clone().multiplyScalar(bendAxis.dot(direction)));
            }
            bendAxis.normalize();

            const elbow = mid.clone().addScaledVector(bendAxis, h);
            return { elbow, wrist };
        }

        _constrainLimbPoint(side, shoulder, point, minLateral = 0.18, maxLateral = 1.45, allowCross = false) {
            const sign = side === "left" ? -1 : 1;
            const constrained = point.clone();
            const torsoCenterX = this.character.chest.position.x;
            let lateral = (constrained.x - shoulder.x) * sign;
            lateral = Math.max(minLateral, Math.min(maxLateral, lateral));
            constrained.x = shoulder.x + (lateral * sign);
            if (!allowCross) {
                if (side === "left") {
                    constrained.x = Math.min(constrained.x, torsoCenterX - 0.1);
                } else {
                    constrained.x = Math.max(constrained.x, torsoCenterX + 0.1);
                }
            }
            constrained.z = Math.max(shoulder.z - 0.28, Math.min(shoulder.z + 0.24, constrained.z));
            return constrained;
        }

        _defaultOpenHand(side, wrist) {
            const sign = side === "left" ? -1 : 1;
            const offsets = [
                [0, 0, 0],
                [0.08 * sign, -0.02, -0.06],
                [0.15 * sign, -0.05, -0.08],
                [0.22 * sign, -0.08, -0.1],
                [0.29 * sign, -0.11, -0.12],
                [0.04 * sign, -0.08, -0.05],
                [0.05 * sign, -0.2, -0.08],
                [0.06 * sign, -0.33, -0.1],
                [0.07 * sign, -0.46, -0.12],
                [0, -0.08, -0.05],
                [0, -0.22, -0.08],
                [0, -0.36, -0.1],
                [0, -0.5, -0.12],
                [-0.04 * sign, -0.08, -0.05],
                [-0.05 * sign, -0.2, -0.08],
                [-0.06 * sign, -0.33, -0.1],
                [-0.07 * sign, -0.46, -0.12],
                [-0.08 * sign, -0.07, -0.05],
                [-0.11 * sign, -0.17, -0.08],
                [-0.14 * sign, -0.27, -0.1],
                [-0.17 * sign, -0.37, -0.12],
            ];
            return offsets.map((offset) => wrist.clone().add(new this.T.Vector3(offset[0], offset[1], offset[2])));
        }

        _defaultMittenHand(side, wrist) {
            const sign = side === "left" ? -1 : 1;
            const offsets = [
                [0, 0, 0],
                [0.04 * sign, -0.01, -0.02],
                [0.08 * sign, -0.03, -0.03],
                [0.12 * sign, -0.05, -0.04],
                [0.16 * sign, -0.07, -0.05],
                [0.03 * sign, -0.06, -0.02],
                [0.04 * sign, -0.12, -0.03],
                [0.05 * sign, -0.2, -0.04],
                [0.06 * sign, -0.28, -0.05],
                [0, -0.05, -0.02],
                [0, -0.13, -0.03],
                [0, -0.21, -0.04],
                [0, -0.29, -0.05],
                [-0.03 * sign, -0.06, -0.02],
                [-0.04 * sign, -0.12, -0.03],
                [-0.05 * sign, -0.2, -0.04],
                [-0.06 * sign, -0.28, -0.05],
                [-0.04 * sign, -0.04, -0.02],
                [-0.06 * sign, -0.09, -0.03],
                [-0.08 * sign, -0.14, -0.04],
                [-0.1 * sign, -0.19, -0.05],
            ];
            return offsets.map((offset) => wrist.clone().add(new this.T.Vector3(offset[0], offset[1], offset[2])));
        }

        _defaultRestWrist(side, shoulder) {
            return shoulder.clone().add(new this.T.Vector3(
                side === "left" ? -0.42 : 0.42,
                -0.84,
                -0.18,
            ));
        }

        _isNearRest(side, wrist, shoulder) {
            const rest = this._defaultRestWrist(side, shoulder);
            return wrist.distanceTo(rest) < 0.26;
        }

        _pointDistance(a, b) {
            if (!Array.isArray(a) || !Array.isArray(b)) return Infinity;
            const dx = a[0] - b[0];
            const dy = a[1] - b[1];
            const dz = a[2] - b[2];
            return Math.sqrt((dx * dx) + (dy * dy) + (dz * dz));
        }

        _stableHandInput(side, landmarks) {
            const cache = this.sideState[side];
            if (Array.isArray(landmarks) && landmarks.length === 21) {
                cache.lastLandmarks = landmarks.map((pt) => [pt[0], pt[1], pt[2]]);
                cache.missingFrames = 0;
                return landmarks;
            }

            // Keep the last stable hand pose for a few frames so brief landmark dropouts do not
            // snap the cartoon hand back to rest. A later GLB/VRM avatar can replace this cache.
            const missingLimit = this.cartoonMode ? 10 : 6;
            if (cache.lastLandmarks && cache.missingFrames < missingLimit) {
                cache.missingFrames += 1;
                return cache.lastLandmarks;
            }

            cache.lastLandmarks = null;
            cache.missingFrames = 0;
            return null;
        }

        _buildTouchContext(leftData, rightData) {
            if (!leftData || !rightData) return null;
            const leftPts = this._mapHandLandmarks(leftData);
            const rightPts = this._mapHandLandmarks(rightData);
            const candidatePairs = [
                [8, 8], [4, 4], [12, 12], [16, 16], [20, 20],
                [8, 12], [12, 8],
                [0, 0], [5, 17], [17, 5],
            ];

            let best = null;
            for (const pair of candidatePairs) {
                const leftPt = leftPts[pair[0]];
                const rightPt = rightPts[pair[1]];
                const distance = leftPt.distanceTo(rightPt);
                if (!best || distance < best.distance) {
                    best = {
                        leftIndex: pair[0],
                        rightIndex: pair[1],
                        leftPoint: leftPt.clone(),
                        rightPoint: rightPt.clone(),
                        distance,
                    };
                }
            }
            if (!best) return null;

            return {
                leftIndex: best.leftIndex,
                rightIndex: best.rightIndex,
                center: best.leftPoint.clone().add(best.rightPoint).multiplyScalar(0.5),
                distance: best.distance,
            };
        }

        _handActivityScore(side, landmarks, pose = null) {
            if (!landmarks || landmarks.length !== 21) return -Infinity;
            const shoulder = this.character.shoulderCaps[side].position;
            const points = this._mapHandLandmarks(landmarks);
            const wrist = points[0];
            const reach = wrist.distanceTo(shoulder);
            const fingerSpread = (
                points[8].distanceTo(wrist)
                + points[12].distanceTo(wrist)
                + points[16].distanceTo(wrist)
                + points[20].distanceTo(wrist)
            ) * 0.25;
            const poseWrist = this._mapPoseJoint(pose, `${side}_wrist`);
            const poseHint = poseWrist ? wrist.distanceTo(poseWrist) : 0;
            return (reach * 0.7) + (fingerSpread * 0.45) + (poseHint * 0.12);
        }

        _applyHandPoints(sideObj, points, handFrame = null) {
            const cartoon = this.cartoonMode;
            const readable = cartoon && this.readableHands;
            const solidReadable = readable && this.handStyle !== "skeleton";
            const frame = handFrame || null;
            const sideName = sideObj === this.character.sides.left ? "left" : "right";
            const cache = this.sideState[sideName];
            const cartoonPose = solidReadable ? this.buildCartoonHandPose(points, sideName, cache.cartoonHandState || {}) : null;
            if (cartoonPose && Array.isArray(cartoonPose.cleanPoints)) {
                cache.cartoonHandState = cartoonPose;
            }
            const activeFrame = solidReadable
                ? (cartoonPose?.handFrame || cartoonPose?.frame || frame)
                : frame;
            const palmCenter = activeFrame ? activeFrame.center.clone() : null;
            const palmLift = activeFrame ? activeFrame.zAxis.clone().multiplyScalar(solidReadable ? 0.06 : readable ? 0.042 : 0.035) : null;
            const palmScale = activeFrame ? (activeFrame.width || activeFrame.scale || 1.0) : 1.0;
            const localInverse = activeFrame ? activeFrame.quaternion.clone().invert() : null;
            const fallbackHand = activeFrame && activeFrame.center
                ? this._defaultMittenHand(sideName, activeFrame.center.clone())
                : this._defaultMittenHand(sideName, points[0] ? points[0].clone() : new this.T.Vector3());
            const renderedPoints = solidReadable
                ? (cartoonPose?.cleanPoints || cache.cartoonHandState?.cleanPoints || fallbackHand)
                : points;
            const rawDebugPoints = cartoonPose?.rawPoints || points;
            const cleanDebugPoints = solidReadable
                ? (cartoonPose?.cleanPoints || cache.cartoonHandState?.cleanPoints || fallbackHand)
                : renderedPoints;

            const hideHandLayer = () => {
                if (sideObj.handRoot) sideObj.handRoot.visible = false;
                if (sideObj.palm) sideObj.palm.visible = false;
                if (sideObj.palmShadow) sideObj.palmShadow.visible = false;
                if (Array.isArray(sideObj.joints)) sideObj.joints.forEach((joint) => { joint.visible = false; });
                if (Array.isArray(sideObj.segments)) sideObj.segments.forEach((segment) => { segment.visible = false; });
                if (Array.isArray(sideObj.fingerBones)) sideObj.fingerBones.forEach((bone) => { if (bone?.mesh) bone.mesh.visible = false; });
                if (Array.isArray(sideObj.fingerTips)) sideObj.fingerTips.forEach((tip) => { if (tip?.mesh) tip.mesh.visible = false; });
                if (Array.isArray(sideObj.trailNodes)) sideObj.trailNodes.forEach((node) => { if (node) node.visible = false; });
                if (Array.isArray(sideObj.debugLinks)) sideObj.debugLinks.forEach((link) => { if (link) link.visible = false; });
                if (Array.isArray(sideObj.debugCleanLandmarks)) sideObj.debugCleanLandmarks.forEach((pt) => { if (pt) pt.visible = false; });
            };

            if (!points || points.length < 21) {
                hideHandLayer();
                if (this.debugHands && Array.isArray(sideObj.debugLandmarks)) {
                    sideObj.debugLandmarks.forEach((pt) => {
                        if (pt) pt.visible = false;
                    });
                }
                return;
            }

            if (sideObj.handRoot) {
                sideObj.handRoot.visible = Boolean(frame || this.debugHands || this.handTrails);
                if (activeFrame) {
                    sideObj.handRoot.position.copy(palmCenter);
                    sideObj.handRoot.quaternion.copy(activeFrame.quaternion);
                }
            }

            if (sideObj.palm && palmCenter) {
                sideObj.palm.visible = true;
                sideObj.palm.position.set(0, 0, solidReadable ? 0.034 : readable ? 0.028 : 0.02);
                sideObj.palm.quaternion.identity();
                sideObj.palm.scale.set(
                    palmScale * (solidReadable ? 1.7 : readable ? 1.38 : 1.28),
                    palmScale * (solidReadable ? 1.08 : readable ? 0.84 : 0.92),
                    palmScale * (solidReadable ? 1.16 : readable ? 1.02 : 1.08),
                );
                sideObj.palm.renderOrder = 39;
            } else if (sideObj.palm) {
                sideObj.palm.visible = false;
            }

            if (sideObj.palmShadow && palmCenter) {
                sideObj.palmShadow.visible = true;
                sideObj.palmShadow.position.set(0, 0, solidReadable ? -0.06 : readable ? -0.035 : -0.028);
                sideObj.palmShadow.quaternion.identity();
                sideObj.palmShadow.scale.set(
                    palmScale * (solidReadable ? 1.88 : readable ? 1.55 : 1.42),
                    palmScale * (solidReadable ? 1.16 : readable ? 1.06 : 1.02),
                    palmScale * (solidReadable ? 1.28 : readable ? 1.18 : 1.12),
                );
                sideObj.palmShadow.renderOrder = 31;
            } else if (sideObj.palmShadow) {
                sideObj.palmShadow.visible = false;
            }

            const fingerBoost = readable
                ? Math.max(1.12, Math.min(1.62, palmScale / 0.16))
                : Math.max(0.85, Math.min(1.18, (palmScale / 0.25)));
            const fingerLift = palmLift || new this.T.Vector3();
            // Keep the readable hand layer slightly in front of the torso so sign shapes do not
            // dissolve into the chest silhouette.
            const debugRawColor = sideName === "left" ? 0xff6666 : 0x6fb2ff;
            const debugCleanColor = sideName === "left" ? 0xcaff7e : 0xffef76;
            renderedPoints.forEach((pt, idx) => {
                const point = pt.clone().add(fingerLift);
                if (!sideObj.joints[idx]) return;
                const role = this._handPointRole(idx);
                const jointVisible = solidReadable
                    ? this.debugHands
                    : (readable ? (role === "wrist" || role === "mcp" || this.debugHands) : true);
                sideObj.joints[idx].visible = jointVisible;
                sideObj.joints[idx].position.copy(point);
                if (cartoon) {
                    const scale = role === "wrist"
                        ? (solidReadable ? 0.2 : readable ? 0.58 : 0.92)
                        : role === "mcp"
                            ? (solidReadable ? 0.16 : readable ? 0.44 : 0.78)
                            : role === "tip"
                                ? (solidReadable ? 0.12 : readable ? 0.28 : 1.34)
                                : (solidReadable ? 0.08 : readable ? 0.18 : 0.72);
                    sideObj.joints[idx].scale.setScalar(scale * fingerBoost);
                    sideObj.joints[idx].renderOrder = role === "tip" ? 46 : 44;
                }
            });

            HAND_CONNECTIONS.forEach((conn, idx) => {
                const start = renderedPoints[conn[0]].clone().add(fingerLift);
                const end = renderedPoints[conn[1]].clone().add(fingerLift);
                if (solidReadable) {
                    if (sideObj.segments[idx]) sideObj.segments[idx].visible = false;
                } else {
                    this._setCylinder(sideObj.segments[idx], start, end);
                }
                if (cartoon && !solidReadable) {
                    const role = idx < 4 ? "thumb" : idx < 8 ? "index" : idx < 12 ? "middle" : idx < 16 ? "ring" : idx < 20 ? "pinky" : "palm";
                    const connectionStrength = this._handConnectionStrength(idx);
                    const thickness = (role === "thumb" ? 0.92 : role === "index" || role === "middle" ? 0.8 : role === "ring" || role === "pinky" ? 0.76 : 0.74) * connectionStrength;
                    sideObj.segments[idx].scale.x = thickness * fingerBoost;
                    sideObj.segments[idx].scale.z = thickness * fingerBoost;
                    sideObj.segments[idx].renderOrder = role === "thumb" ? 45 : 43;
                    sideObj.segments[idx].material.depthTest = false;
                    sideObj.segments[idx].material.depthWrite = false;
                    sideObj.segments[idx].visible = true;
                }
            });

            if (this.debugHands && Array.isArray(sideObj.debugLandmarks)) {
                // Debug mode shows the noisy raw landmarks and the cleaned cartoon joints side by side.
                rawDebugPoints.forEach((pt, idx) => {
                    if (!sideObj.debugLandmarks[idx]) return;
                    const rawPoint = localInverse ? pt.clone().add(fingerLift).sub(palmCenter).applyQuaternion(localInverse) : pt.clone().add(fingerLift);
                    sideObj.debugLandmarks[idx].visible = true;
                    sideObj.debugLandmarks[idx].position.copy(rawPoint);
                    if (sideObj.debugLandmarks[idx].material && sideObj.debugLandmarks[idx].material.color) {
                        sideObj.debugLandmarks[idx].material.color.setHex(debugRawColor);
                    }
                });
            }

            if (this.debugHands && Array.isArray(sideObj.debugCleanLandmarks)) {
                cleanDebugPoints.forEach((pt, idx) => {
                    if (!sideObj.debugCleanLandmarks[idx]) return;
                    const cleanPoint = localInverse ? pt.clone().add(fingerLift).sub(palmCenter).applyQuaternion(localInverse) : pt.clone().add(fingerLift);
                    sideObj.debugCleanLandmarks[idx].visible = true;
                    sideObj.debugCleanLandmarks[idx].position.copy(cleanPoint);
                    if (sideObj.debugCleanLandmarks[idx].material && sideObj.debugCleanLandmarks[idx].material.color) {
                        sideObj.debugCleanLandmarks[idx].material.color.setHex(debugCleanColor);
                    }
                });
            }

            if (this.debugHands && Array.isArray(sideObj.debugLinks)) {
                const tipPairs = [
                    [4, 0], [8, 1], [12, 2], [16, 3], [20, 4],
                ];
                tipPairs.forEach(([rawIndex, linkIndex]) => {
                    const link = sideObj.debugLinks[linkIndex];
                    const rawPoint = rawDebugPoints[rawIndex];
                    const cleanPoint = cleanDebugPoints[rawIndex];
                    if (!link || !rawPoint || !cleanPoint) return;
                    const rawLocal = localInverse ? rawPoint.clone().add(fingerLift).sub(palmCenter).applyQuaternion(localInverse) : rawPoint.clone().add(fingerLift);
                    const cleanLocal = localInverse ? cleanPoint.clone().add(fingerLift).sub(palmCenter).applyQuaternion(localInverse) : cleanPoint.clone().add(fingerLift);
                    this._setCylinder(link, rawLocal, cleanLocal);
                    link.visible = true;
                });
            } else if (Array.isArray(sideObj.debugLinks)) {
                sideObj.debugLinks.forEach((link) => { if (link) link.visible = false; });
            }

            if (cartoon && Array.isArray(sideObj.fingerBones)) {
                sideObj.fingerBones.forEach((bone) => {
                    if (!bone || !bone.mesh) return;
                    const start = renderedPoints[bone.start].clone().add(fingerLift);
                    const end = renderedPoints[bone.end].clone().add(fingerLift);
                    this._setCylinder(bone.mesh, start, end);
                    const boneRole = bone.start === 1 ? "thumb" : bone.start === 5 ? "index" : bone.start === 9 ? "middle" : bone.start === 13 ? "ring" : bone.start === 17 ? "pinky" : "finger";
                    const boneThickness = boneRole === "thumb"
                        ? (solidReadable ? 1.2 : 0.9)
                        : boneRole === "index" || boneRole === "middle"
                            ? (solidReadable ? 1.08 : 0.82)
                            : (solidReadable ? 1.0 : 0.78);
                    bone.mesh.scale.x = boneThickness * fingerBoost;
                    bone.mesh.scale.z = boneThickness * fingerBoost;
                    bone.mesh.renderOrder = 40;
                    bone.mesh.material.depthTest = false;
                    bone.mesh.material.depthWrite = false;
                    bone.mesh.visible = true;
                });
            }

            if (cartoon && Array.isArray(sideObj.fingerTips)) {
                sideObj.fingerTips.forEach((tip) => {
                    if (!tip || !tip.mesh || typeof tip.index !== "number") return;
                    const tipPoint = renderedPoints[tip.index];
                    if (!tipPoint) {
                        tip.mesh.visible = false;
                        return;
                    }
                    tip.mesh.visible = true;
                    tip.mesh.position.copy(tipPoint).add(fingerLift);
                    tip.mesh.scale.setScalar((solidReadable ? 1.5 : readable ? 1.18 : 1.0) * fingerBoost);
                });
            }

            if (this.handTrails) {
                this._updateHandTrails(sideObj, sideName, frame);
            } else if (Array.isArray(sideObj.trailNodes)) {
                sideObj.trailNodes.forEach((node) => { if (node) node.visible = false; });
            }
        }

        _activeShoulder(side) {
            const tracked = this.sideState[side] && this.sideState[side].shoulder;
            if (tracked) return tracked.clone();
            return this.shoulders[side].clone();
        }

        _activeShoulderMid() {
            if (this.character && this.character.shoulderCaps) {
                const leftCap = this.character.shoulderCaps.left.position.clone();
                const rightCap = this.character.shoulderCaps.right.position.clone();
                return leftCap.add(rightCap).multiplyScalar(0.5);
            }
            const left = this._activeShoulder("left");
            const right = this._activeShoulder("right");
            return left.add(right).multiplyScalar(0.5);
        }

        _updateBodyRig() {
            const headPos = this.character.head.position.clone();
            const baseTorsoShellPos = this.character.baseTorsoShellPos.clone();
            const baseTorsoShellScale = this.character.baseTorsoShellScale.clone();
            const baseChest = this.character.baseChestPos.clone();
            const baseWaist = this.character.baseWaistPos.clone();
            const baseChestScale = this.character.baseChestScale.clone();
            const baseWaistScale = this.character.baseWaistScale.clone();
            const baseHead = this.character.baseHeadPos.clone();
            const cartoon = this.cartoonMode;
            // Body retargeting keeps a stable torso/head scale so the avatar stays centered
            // instead of breathing or zooming wildly from noisy landmark updates.
            const bodyScaleBoost = cartoon ? 1.08 : 1.0;

            const xOffset = Math.max(-0.16, Math.min(0.16, (headPos.x - baseHead.x) * 0.55));
            const yOffset = Math.max(-0.08, Math.min(0.08, (headPos.y - baseHead.y) * 0.12));

            const chestTarget = baseChest.clone().add(new this.T.Vector3(xOffset, yOffset, 0));
            const waistTarget = baseWaist.clone().add(new this.T.Vector3(xOffset * 0.72, yOffset * 0.45, 0));

            this.character.chest.position.lerp(chestTarget, 0.22);
            this.character.waist.position.lerp(waistTarget, 0.2);

            this.character.chest.rotation.x *= 0.75;
            this.character.chest.rotation.y *= 0.7;
            this.character.chest.rotation.z *= 0.7;
            this.character.waist.rotation.x *= 0.78;
            this.character.waist.rotation.y *= 0.74;
            this.character.waist.rotation.z *= 0.74;

            this.character.chest.scale.x += (baseChestScale.x - this.character.chest.scale.x) * 0.24;
            this.character.chest.scale.y += (baseChestScale.y - this.character.chest.scale.y) * 0.24;
            this.character.chest.scale.z += (baseChestScale.z - this.character.chest.scale.z) * 0.24;
            this.character.waist.scale.x += (baseWaistScale.x - this.character.waist.scale.x) * 0.24;
            this.character.waist.scale.y += (baseWaistScale.y - this.character.waist.scale.y) * 0.24;
            this.character.waist.scale.z += (baseWaistScale.z - this.character.waist.scale.z) * 0.24;

            const torsoShellTarget = baseTorsoShellPos.clone().add(new this.T.Vector3(xOffset * 0.88, yOffset * 0.9, 0));
            torsoShellTarget.y += cartoon ? 0.04 : 0;
            this.character.torsoShell.position.lerp(torsoShellTarget, 0.22);
            this.character.torsoShell.rotation.x *= 0.76;
            this.character.torsoShell.rotation.y *= 0.72;
            this.character.torsoShell.rotation.z *= 0.72;
            this.character.torsoShell.scale.x += ((baseTorsoShellScale.x * bodyScaleBoost) - this.character.torsoShell.scale.x) * 0.24;
            this.character.torsoShell.scale.y += ((baseTorsoShellScale.y * bodyScaleBoost) - this.character.torsoShell.scale.y) * 0.24;
            this.character.torsoShell.scale.z += ((baseTorsoShellScale.z * bodyScaleBoost) - this.character.torsoShell.scale.z) * 0.24;

            const shoulderY = this.character.chest.position.y + 0.54;
            const shoulderZ = this.shoulders.left.z;
            const shoulderHalfSpan = cartoon ? 0.74 : 0.62;
            const leftShoulderTarget = new this.T.Vector3(
                this.character.chest.position.x - shoulderHalfSpan,
                shoulderY,
                shoulderZ,
            );
            const rightShoulderTarget = new this.T.Vector3(
                this.character.chest.position.x + shoulderHalfSpan,
                shoulderY,
                shoulderZ,
            );

            this.character.shoulderCaps.left.position.lerp(leftShoulderTarget, 0.42);
            this.character.shoulderCaps.right.position.lerp(rightShoulderTarget, 0.42);

            const upperChestAnchor = this.character.chest.position.clone().add(new this.T.Vector3(0, 0.2, 0.04));
            const lowerChestAnchor = this.character.chest.position.clone().add(new this.T.Vector3(0, -0.34, 0.01));
            const upperWaistAnchor = this.character.waist.position.clone().add(new this.T.Vector3(0, 0.28, 0.02));
            const leftClavicleEnd = this.character.shoulderCaps.left.position.clone().add(new this.T.Vector3(0.03, -0.02, 0.01));
            const rightClavicleEnd = this.character.shoulderCaps.right.position.clone().add(new this.T.Vector3(-0.03, -0.02, 0.01));
            this._setCylinder(this.character.torsoBridge, lowerChestAnchor, upperWaistAnchor);
            this._setCylinder(
                this.character.clavicles.left,
                upperChestAnchor.clone().add(new this.T.Vector3(-0.18, 0.04, 0.04)),
                leftClavicleEnd,
            );
            this._setCylinder(
                this.character.clavicles.right,
                upperChestAnchor.clone().add(new this.T.Vector3(0.18, 0.04, 0.04)),
                rightClavicleEnd,
            );

            const shoulderMid = this.character.shoulderCaps.left.position
                .clone()
                .add(this.character.shoulderCaps.right.position)
                .multiplyScalar(0.5);
            const neckBase = shoulderMid.clone().add(new this.T.Vector3(0, -0.04, 0.02));
            const neckTop = this.character.head.position.clone().add(new this.T.Vector3(0, cartoon ? -0.36 : -0.31, 0.02));
            neckTop.z = Math.min(neckTop.z, baseHead.z + 0.06);
            this._setCylinder(this.character.neck, neckBase, neckTop);
        }

        _applyRestSide(side, shoulderOverride = null) {
            const sideObj = this.character.sides[side];
            const shoulder = shoulderOverride ? shoulderOverride.clone() : this.shoulders[side].clone();
            const wrist = shoulder.clone().add(new this.T.Vector3(side === "left" ? -0.52 : 0.52, -0.82, -0.22));
            const elbow = this._computeElbow(shoulder, wrist, side);

            this._setCylinder(sideObj.upperArm, shoulder, elbow);
            this._setCylinder(sideObj.foreArm, elbow, wrist);

            sideObj.shoulderJoint.position.copy(shoulder);
            sideObj.elbowJoint.position.copy(elbow);
            sideObj.wristJoint.position.copy(wrist);

            sideObj.joints.forEach((joint) => { joint.visible = false; });
            sideObj.segments.forEach((segment) => { segment.visible = false; });
            return { shoulder, elbow, wrist };
        }

        _applyHand(side, landmarks, pose = null, isActive = true, allowCross = false, touchContext = null) {
            const sideObj = this.character.sides[side];
            const cache = this.sideState[side];
            const shoulderKey = `${side}_shoulder`;
            const elbowKey = `${side}_elbow`;
            const wristKey = `${side}_wrist`;

            const shoulderPose = this._mapPoseJoint(pose, shoulderKey);
            const elbowPose = this._mapPoseJoint(pose, elbowKey);
            const wristPose = this._mapPoseJoint(pose, wristKey);

            const torsoShoulderAnchor = this.character.shoulderCaps[side].position.clone();
            const shoulderTarget = torsoShoulderAnchor.clone();
            if (shoulderPose) {
                shoulderTarget.lerp(shoulderPose, this.cartoonMode ? 0.14 : 0.18);
                const minX = torsoShoulderAnchor.x - 0.2;
                const maxX = torsoShoulderAnchor.x + 0.2;
                const minY = torsoShoulderAnchor.y - 0.18;
                const maxY = torsoShoulderAnchor.y + 0.2;
                shoulderTarget.x = Math.max(minX, Math.min(maxX, shoulderTarget.x));
                shoulderTarget.y = Math.max(minY, Math.min(maxY, shoulderTarget.y));
                shoulderTarget.z = torsoShoulderAnchor.z;
            }
            const shoulder = cache.shoulder
                ? cache.shoulder.clone().lerp(shoulderTarget, shoulderPose ? (this.cartoonMode ? 0.26 : 0.34) : (this.cartoonMode ? 0.18 : 0.22))
                : shoulderTarget.clone();
            cache.shoulder = shoulder.clone();

            if (!isActive || !landmarks || landmarks.length !== 21) {
                cache.points = null;
                let wristTarget;
                if (!isActive) {
                    wristTarget = this._defaultRestWrist(side, shoulder);
                } else {
                    wristTarget = wristPose
                        ? wristPose.clone()
                        : shoulder.clone().add(new this.T.Vector3(side === "left" ? -0.52 : 0.52, -0.82, -0.22));
                }

                wristTarget = this._constrainLimbPoint(side, shoulder, wristTarget, 0.36, 1.22, false);
                const solved = this._solveArmIK(shoulder, wristTarget, side);
                let wrist = solved.wrist;
                let elbow = solved.elbow;
                if (elbowPose && isActive) {
                    elbow = elbow.clone().lerp(this._constrainLimbPoint(side, shoulder, elbowPose, 0.2, 0.9, false), 0.28);
                }

                wrist = cache.wrist ? cache.wrist.clone().lerp(wrist, 0.46) : wrist;
                elbow = cache.elbow ? cache.elbow.clone().lerp(elbow, this.cartoonMode ? 0.36 : 0.46) : elbow;
                cache.wrist = wrist.clone();
                cache.elbow = elbow.clone();

                this._setCylinder(sideObj.upperArm, shoulder, elbow);
                this._setCylinder(sideObj.foreArm, elbow, wrist);
                sideObj.shoulderJoint.position.copy(shoulder);
                sideObj.elbowJoint.position.copy(elbow);
                sideObj.wristJoint.position.copy(wrist);
                const restPoints = this.cartoonMode ? this._defaultMittenHand(side, wrist) : this._defaultOpenHand(side, wrist);
                const restFrame = this._estimateHandFrame(side, restPoints, cache);
                this._applyHandPoints(sideObj, restPoints, restFrame);
                return;
            }

            const rawPoints = this._mapHandLandmarks(landmarks);
            // Separate smoothing keeps the wrist and palm steadier than the fingers while still
            // letting the hand shapes move quickly enough for readable signs.
            let points = this._smoothHandPoints(cache.points, rawPoints);
            const handWrist = points[0].clone();
            // Blend the pose wrist with the hand wrist so the forearm follows the sign shape
            // without cutting through the torso or overreacting to isolated hand jitter.
            const blendedWrist = wristPose
                ? handWrist.clone().lerp(wristPose, this.cartoonMode ? 0.4 : 0.55)
                : handWrist.clone();
            let elbow = elbowPose ? elbowPose.clone() : this._computeElbow(shoulder, blendedWrist, side);
            if (cache.elbow) elbow = cache.elbow.clone().lerp(elbow, this.cartoonMode ? 0.26 : 0.34);
            const wrist = cache.wrist ? cache.wrist.clone().lerp(blendedWrist, this.cartoonMode ? 0.35 : 0.48) : blendedWrist.clone();
            cache.elbow = elbow.clone();
            cache.wrist = wrist.clone();
            cache.points = points.map((pt) => pt.clone());
            const handFrame = this._estimateHandFrame(side, points, cache);

            this._setCylinder(sideObj.upperArm, shoulder, elbow);
            this._setCylinder(sideObj.foreArm, elbow, wrist);
            sideObj.shoulderJoint.position.copy(shoulder);
            sideObj.elbowJoint.position.copy(elbow);
            sideObj.wristJoint.position.copy(wrist);
            this._applyHandPoints(sideObj, points, handFrame);
        }

        _applyFace(face) {
            const head = this.character.head;
            const mouth = this.character.mouth;
            const targetBasePos = this.character.baseHeadPos.clone();
            const targetBaseRot = this.character.baseHeadRot.clone();
            const targetMouthScale = this.character.baseMouthScale.clone();
            const leftBrow = this.character.browLeft;
            const rightBrow = this.character.browRight;
            const leftEye = this.character.eyeLeft;
            const rightEye = this.character.eyeRight;
            const shoulderMid = this._activeShoulderMid();

            if (!face || !face.anchors) {
                const headFallback = shoulderMid.clone().add(new this.T.Vector3(0, this.cartoonMode ? 0.5 : 0.42, 0));
                headFallback.z = targetBasePos.z;
                head.position.lerp(headFallback, this.cartoonMode ? 0.14 : 0.18);
                head.rotation.x = head.rotation.x + ((targetBaseRot.x - head.rotation.x) * (this.cartoonMode ? 0.1 : 0.12));
                head.rotation.y = head.rotation.y + ((targetBaseRot.y - head.rotation.y) * (this.cartoonMode ? 0.1 : 0.12));
                head.rotation.z = head.rotation.z + ((targetBaseRot.z - head.rotation.z) * (this.cartoonMode ? 0.1 : 0.12));
                mouth.scale.lerp(targetMouthScale, 0.2);
                leftBrow.rotation.z += ((Math.PI * 0.95) - leftBrow.rotation.z) * 0.22;
                rightBrow.rotation.z += ((Math.PI * 1.05) - rightBrow.rotation.z) * 0.22;
                leftEye.scale.y += (1 - leftEye.scale.y) * 0.2;
                rightEye.scale.y += (1 - rightEye.scale.y) * 0.2;
                this.faceState.mouth = 0;
                return;
            }

            const nose = this._mapBodyPoint(face.anchors.nose);
            const leftEyeAnchor = this._mapBodyPoint(face.anchors.left_eye);
            const rightEyeAnchor = this._mapBodyPoint(face.anchors.right_eye);
            const mouthLeft = this._mapBodyPoint(face.anchors.mouth_left);
            const mouthRight = this._mapBodyPoint(face.anchors.mouth_right);
            const chin = this._mapBodyPoint(face.anchors.chin);

            if (nose) {
                const headTarget = nose.clone().add(new this.T.Vector3(0, 0.24, -0.02));
                const anchoredTarget = shoulderMid.clone().lerp(headTarget, 0.86);
                anchoredTarget.x = Math.max(shoulderMid.x - 0.22, Math.min(shoulderMid.x + 0.22, anchoredTarget.x));
                anchoredTarget.y = Math.max(shoulderMid.y + 0.34, anchoredTarget.y);
                anchoredTarget.y = Math.min(shoulderMid.y + 1.05, anchoredTarget.y);
                anchoredTarget.z = targetBasePos.z;
                head.position.lerp(anchoredTarget, this.cartoonMode ? 0.3 : 0.38);
            } else {
                const headFallback = shoulderMid.clone().add(new this.T.Vector3(0, 0.42, 0));
                headFallback.z = targetBasePos.z;
                head.position.lerp(headFallback, this.cartoonMode ? 0.12 : 0.16);
            }

            if (leftEyeAnchor && rightEyeAnchor) {
                const eyeLine = rightEyeAnchor.clone().sub(leftEyeAnchor);
                const yawTarget = Math.max(-0.45, Math.min(0.45, eyeLine.x * 0.56));
                const rollTarget = Math.max(-0.3, Math.min(0.3, eyeLine.y * 1.05));
                this.faceState.yaw = (this.faceState.yaw * 0.56) + (yawTarget * 0.44);
                this.faceState.roll = (this.faceState.roll * 0.56) + (rollTarget * 0.44);
            } else {
                this.faceState.yaw *= 0.78;
                this.faceState.roll *= 0.78;
            }

            let pitchTarget = targetBaseRot.x;
            if (chin && nose) {
                const faceLength = Math.max(0.001, nose.distanceTo(chin));
                pitchTarget = Math.max(-0.28, Math.min(0.36, (chin.y - nose.y - (faceLength * 0.68)) * 0.72));
            }
            head.rotation.x = head.rotation.x + ((pitchTarget - head.rotation.x) * (this.cartoonMode ? 0.2 : 0.26));
            head.rotation.y = head.rotation.y + ((this.faceState.yaw - head.rotation.y) * (this.cartoonMode ? 0.34 : 0.44));
            head.rotation.z = head.rotation.z + ((this.faceState.roll - head.rotation.z) * (this.cartoonMode ? 0.34 : 0.44));

            const mouthOpenRaw = typeof face.mouth_open === "number"
                ? Math.max(0, Math.min(face.mouth_open * 30.0, 1.2))
                : 0;
            this.faceState.mouth = (this.faceState.mouth * 0.58) + (mouthOpenRaw * 0.42);
            const mouthSpan = (mouthLeft && mouthRight) ? mouthLeft.distanceTo(mouthRight) : 0.18;
            const smileBias = Math.max(-0.42, Math.min(0.42, (mouthSpan - 0.19) * 3.8));
            targetMouthScale.y = 1 + this.faceState.mouth;
            targetMouthScale.x = 1 + (smileBias * 0.12);
            mouth.scale.lerp(targetMouthScale, this.cartoonMode ? 0.34 : 0.42);

            const browLift = this.faceState.mouth * 0.16;
            leftBrow.rotation.z += (((Math.PI * 0.95) - browLift) - leftBrow.rotation.z) * 0.24;
            rightBrow.rotation.z += (((Math.PI * 1.05) + browLift) - rightBrow.rotation.z) * 0.24;
            const blink = Math.max(0.36, 1 - (this.faceState.mouth * 0.22));
            leftEye.scale.y += (blink - leftEye.scale.y) * 0.22;
            rightEye.scale.y += (blink - rightEye.scale.y) * 0.22;
        }

        setFrame(frame) {
            if (!this.enabled) return;
            const workingFrame = frame ? JSON.parse(JSON.stringify(frame)) : null;
            if (!workingFrame) return;
            const token = workingFrame.token || null;

            if (workingFrame.hands && typeof workingFrame.hands === "object") {
                if (Array.isArray(workingFrame.hands.left)) {
                    workingFrame.hands.left = this._smoothLandmarks(
                        workingFrame.hands.left,
                        this.previousFrame?.hands?.left,
                        this.smoothingFactor,
                    );
                }
                if (Array.isArray(workingFrame.hands.right)) {
                    workingFrame.hands.right = this._smoothLandmarks(
                        workingFrame.hands.right,
                        this.previousFrame?.hands?.right,
                        this.smoothingFactor,
                    );
                }
            }
            if (workingFrame.pose && typeof workingFrame.pose === "object") {
                workingFrame.pose = this._smoothLandmarks(
                    workingFrame.pose,
                    this.previousFrame?.pose,
                    this.smoothingFactor,
                );
            }

            this._applyTokenCorrections(workingFrame, token);
            this.previousFrame = JSON.parse(JSON.stringify(workingFrame));

            const hands = workingFrame.hands ? workingFrame.hands : {};
            const pose = workingFrame.pose ? workingFrame.pose : {};
            const face = workingFrame.face ? workingFrame.face : null;
            const leftValid = Array.isArray(hands.left) && hands.left.length === 21;
            const rightValid = Array.isArray(hands.right) && hands.right.length === 21;
            const leftRaw = leftValid ? hands.left : null;
            const rightRaw = rightValid ? hands.right : null;
            if (this.humanRig.ready) {
                // Human rig retargeting lives here. A future GLB/VRM avatar can replace the
                // procedural cartoon path below without changing the frame format.
                this._applyHumanRigFrame(leftRaw, rightRaw, pose, face);
                return;
            }
            // Procedural cartoon retargeting: landmarks are smoothed, then mapped into stable
            // shoulders, elbows, wrists, palms, fingers, and head motion for the avatar stage.
            const leftData = this._stableHandInput("left", leftRaw);
            const rightData = this._stableHandInput("right", rightRaw);
            this.activeSide = null;
            this.stability.bothActiveHold = 0;
            this.stability.contactHold = 0;
            this._applyHand("left", leftData, pose, Boolean(leftData), false, null);
            this._applyHand("right", rightData, pose, Boolean(rightData), false, null);
            this._updateBodyRig();
            this._applyFace(face);
            this._updateBodyRig();
        }

        resetPose() {
            if (!this.enabled) return;
            if (this.humanRig.ready) {
                this._resetHumanRigPose();
            }
            this.sideState.left.points = null;
            this.sideState.left.shoulder = null;
            this.sideState.left.elbow = null;
            this.sideState.left.wrist = null;
            this.sideState.left.handFrame = null;
            this.sideState.left.cartoonHandState = null;
            this.sideState.left.lastLandmarks = null;
            this.sideState.left.missingFrames = 0;
            this.sideState.right.points = null;
            this.sideState.right.shoulder = null;
            this.sideState.right.elbow = null;
            this.sideState.right.wrist = null;
            this.sideState.right.handFrame = null;
            this.sideState.right.cartoonHandState = null;
            this.sideState.right.lastLandmarks = null;
            this.sideState.right.missingFrames = 0;
            this.previousFrame = null;
            this.activeSide = null;
            this.stability.bothActiveHold = 0;
            this.stability.contactHold = 0;
            const leftRest = this._applyRestSide("left");
            const rightRest = this._applyRestSide("right");
            const leftRestHand = this.cartoonMode ? this._defaultMittenHand("left", leftRest.wrist) : this._defaultOpenHand("left", leftRest.wrist);
            const rightRestHand = this.cartoonMode ? this._defaultMittenHand("right", rightRest.wrist) : this._defaultOpenHand("right", rightRest.wrist);
            this._applyHandPoints(this.character.sides.left, leftRestHand);
            this._applyHandPoints(this.character.sides.right, rightRestHand);
            this._updateBodyRig();
            this._applyFace(null);
            this._updateBodyRig();
        }

        _animate() {
            if (!this.enabled) return;
            this.renderer.render(this.scene, this.camera);
            global.requestAnimationFrame(() => this._animate());
        }
    }

    global.GestureCharacter3D = GestureCharacter3D;
}(window));
