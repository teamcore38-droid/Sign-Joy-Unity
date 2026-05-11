(function (global) {
    const R = (deg) => (deg * Math.PI) / 180;
    const clone = (v) => JSON.parse(JSON.stringify(v));

    const blend = (a, b, t) => {
        if (typeof a === "number" && typeof b === "number") return a + ((b - a) * t);
        if (Array.isArray(a) && Array.isArray(b)) return a.map((x, i) => blend(x, b[i], t));
        if (a && b && typeof a === "object" && typeof b === "object") {
            const out = {};
            Object.keys(a).forEach((k) => { out[k] = blend(a[k], b[k], t); });
            return out;
        }
        return clone(b);
    };

    const hand = (thumb, index, middle, ring, pinky) => ({ thumb, index, middle, ring, pinky });

    const SHAPES = {
        relaxed: hand([R(20), R(12), R(8), 0], [R(20), R(20), R(16), R(-5)], [R(24), R(24), R(18), 0], [R(28), R(24), R(18), R(4)], [R(30), R(24), R(18), R(8)]),
        open: hand([R(8), R(6), R(4), 0], [R(4), R(4), R(3), R(-8)], [R(4), R(4), R(3), R(-2)], [R(5), R(5), R(4), R(4)], [R(6), R(5), R(4), R(10)]),
        fist: hand([R(52), R(24), R(14), 0], [R(82), R(92), R(72), R(-2)], [R(86), R(96), R(76), 0], [R(90), R(98), R(76), R(3)], [R(92), R(100), R(78), R(6)]),
        point: hand([R(42), R(18), R(10), 0], [R(6), R(6), R(4), R(-6)], [R(82), R(92), R(72), 0], [R(88), R(96), R(74), R(4)], [R(90), R(98), R(76), R(8)]),
        two: hand([R(36), R(14), R(8), 0], [R(6), R(6), R(4), R(-8)], [R(6), R(6), R(4), R(6)], [R(84), R(94), R(72), R(4)], [R(90), R(98), R(74), R(8)]),
        three: hand([R(14), R(10), R(8), 0], [R(8), R(8), R(6), R(-8)], [R(8), R(8), R(6), R(-1)], [R(8), R(8), R(6), R(7)], [R(84), R(92), R(72), R(10)]),
        four: hand([R(48), R(20), R(12), 0], [R(8), R(8), R(6), R(-11)], [R(8), R(8), R(6), R(-3)], [R(8), R(8), R(6), R(4)], [R(8), R(8), R(6), R(11)]),
        five: hand([R(10), R(6), R(4), 0], [R(6), R(6), R(4), R(-12)], [R(6), R(6), R(4), R(-4)], [R(6), R(6), R(4), R(4)], [R(6), R(6), R(4), R(12)]),
        six: hand([R(10), R(8), R(6), 0], [R(84), R(92), R(72), R(-5)], [R(88), R(96), R(74), 0], [R(90), R(98), R(76), R(4)], [R(10), R(8), R(6), R(10)]),
        seven: hand([R(10), R(8), R(6), 0], [R(86), R(94), R(74), R(-6)], [R(90), R(98), R(76), 0], [R(10), R(8), R(6), R(5)], [R(92), R(100), R(78), R(9)]),
        eight: hand([R(10), R(8), R(6), 0], [R(88), R(96), R(76), R(-7)], [R(10), R(8), R(6), R(-1)], [R(90), R(98), R(78), R(4)], [R(92), R(100), R(80), R(9)]),
        nine: hand([R(12), R(8), R(6), 0], [R(28), R(30), R(22), R(-6)], [R(90), R(98), R(78), 0], [R(92), R(100), R(80), R(4)], [R(92), R(100), R(80), R(9)]),
        ten: hand([R(6), R(4), R(3), 0], [R(84), R(92), R(72), R(-5)], [R(88), R(96), R(74), 0], [R(90), R(98), R(76), R(4)], [R(92), R(100), R(78), R(8)]),
    };

    const NUM_WORD = {
        zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
        six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11,
        twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
        seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
    };

    const BASE = {
        root: { y: 0, yaw: R(-8) },
        torso: { x: R(2) },
        head: { x: R(-1), y: 0, z: 0 },
        arms: {
            left: { shoulder: [R(-18), R(16), R(14)], elbow: R(36), wrist: [R(14), R(0), R(4)], palm: [0, 0, 0] },
            right: { shoulder: [R(-18), R(-16), R(-14)], elbow: R(36), wrist: [R(14), R(0), R(-4)], palm: [0, 0, 0] },
        },
        fingers: { left: clone(SHAPES.relaxed), right: clone(SHAPES.relaxed) },
    };

    const shape = (name) => clone(SHAPES[name] || SHAPES.relaxed);
    const norm = (t) => String(t || "").trim().toLowerCase();
    const numberFromToken = (t) => (/^\d+$/.test(t) ? Number.parseInt(t, 10) : (Object.prototype.hasOwnProperty.call(NUM_WORD, t) ? NUM_WORD[t] : null));

    function numberPose(n) {
        const p = clone(BASE);
        p.arms.right = { shoulder: [R(-64), R(-22), R(-18)], elbow: R(92), wrist: [R(22), R(-6), R(-2)], palm: [R(-6), 0, R(4)] };
        p.fingers.right = shape("point");
        const map = { 0: "fist", 1: "point", 2: "two", 3: "three", 4: "four", 5: "five", 6: "six", 7: "seven", 8: "eight", 9: "nine", 10: "ten" };
        if (Object.prototype.hasOwnProperty.call(map, n)) p.fingers.right = shape(map[n]);
        if (n > 10 && n <= 20) {
            const ones = n % 10;
            p.arms.left = { shoulder: [R(-58), R(20), R(18)], elbow: R(84), wrist: [R(16), R(6), R(6)], palm: [0, 0, R(8)] };
            p.fingers.left = shape("point");
            p.fingers.right = ones === 0 ? shape("fist") : numberPose(ones).fingers.right;
        }
        return p;
    }

    function operatorPose(op) {
        const p = clone(BASE);
        if (op === "add" || op === "plus") {
            p.arms.left = { shoulder: [R(-72), R(24), R(26)], elbow: R(102), wrist: [R(16), 0, R(38)], palm: [R(-16), R(4), R(30)] };
            p.arms.right = { shoulder: [R(-72), R(-24), R(-26)], elbow: R(102), wrist: [R(16), 0, R(-38)], palm: [R(-16), R(-4), R(-30)] };
            p.fingers.left = shape("point");
            p.fingers.right = shape("point");
        } else if (op === "subtract" || op === "minus") {
            p.arms.left = { shoulder: [R(-52), R(16), R(14)], elbow: R(84), wrist: [R(10), R(8), R(10)], palm: [R(8), 0, R(6)] };
            p.arms.right = { shoulder: [R(-56), R(-20), R(-12)], elbow: R(86), wrist: [R(10), R(-12), R(-32)], palm: [R(18), R(8), R(-30)] };
            p.fingers.left = shape("open");
            p.fingers.right = shape("two");
        } else if (op === "multiply") {
            p.arms.left = { shoulder: [R(-68), R(22), R(20)], elbow: R(108), wrist: [R(18), R(4), R(30)], palm: [R(-8), 0, R(16)] };
            p.arms.right = { shoulder: [R(-68), R(-22), R(-20)], elbow: R(108), wrist: [R(18), R(-4), R(-30)], palm: [R(-8), 0, R(-16)] };
            p.fingers.left = shape("point");
            p.fingers.right = shape("point");
        } else if (op === "divide" || op === "division") {
            p.arms.left = { shoulder: [R(-52), R(20), R(16)], elbow: R(88), wrist: [R(14), R(6), R(20)], palm: [R(2), 0, R(16)] };
            p.arms.right = { shoulder: [R(-58), R(-22), R(-12)], elbow: R(95), wrist: [R(26), R(-4), R(-10)], palm: [R(20), 0, R(-8)] };
            p.fingers.left = shape("open");
            p.fingers.right = shape("point");
        } else if (op === "equal") {
            p.arms.left = { shoulder: [R(-58), R(22), R(18)], elbow: R(94), wrist: [R(12), 0, R(14)], palm: [0, 0, R(12)] };
            p.arms.right = { shoulder: [R(-58), R(-22), R(-18)], elbow: R(94), wrist: [R(12), 0, R(-14)], palm: [0, 0, R(-12)] };
            p.fingers.left = shape("two");
            p.fingers.right = shape("two");
        }
        return p;
    }

    function hashPose(token, index) {
        const h = [...token].reduce((acc, ch, i) => acc + (ch.charCodeAt(0) * (i + 11)), 31) + (index * 29);
        const p = clone(BASE);
        p.arms.right = {
            shoulder: [R(-52 - (h % 18)), R(-12 + ((h % 6) - 3)), R(-14 + ((h % 6) - 3) * 2)],
            elbow: R(74 + (h % 26)),
            wrist: [R(12 + (h % 14)), R(-8 + ((h % 6) - 3)), R(-6 + ((h % 6) - 3))],
            palm: [R((h % 14) - 7), R((h % 10) - 5), R((h % 8) - 4)],
        };
        p.fingers.right = shape(["point", "two", "three", "four", "five"][h % 5]);
        return p;
    }

    class SignAvatar3D {
        constructor(canvasEl, fallbackEl) {
            this.canvasEl = canvasEl;
            this.fallbackEl = fallbackEl;
            this.enabled = Boolean(global.THREE && canvasEl);
            this.currentPose = clone(BASE);
            this.targetPose = clone(BASE);
            if (!this.enabled) {
                if (this.fallbackEl) this.fallbackEl.hidden = false;
                return;
            }
            const T = global.THREE;
            this.scene = new T.Scene();
            this.scene.background = new T.Color(0xf7fbff);
            this.camera = new T.PerspectiveCamera(36, 1, 0.1, 100);
            this.camera.position.set(0, 1.65, 5.8);
            this.camera.lookAt(0, 1.45, 0);
            this.renderer = new T.WebGLRenderer({ canvas: canvasEl, antialias: true, alpha: false });
            this.renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, 2));
            if ("outputColorSpace" in this.renderer) this.renderer.outputColorSpace = T.SRGBColorSpace;
            this.j = { root: null, torso: null, head: null, arms: { left: null, right: null } };
            this._initScene(T);
            this._initAvatar(T);
            this._resize();
            this._animate = this._animate.bind(this);
            this._animate();
            global.addEventListener("resize", () => this._resize());
            if (global.ResizeObserver) {
                this.ro = new global.ResizeObserver(() => this._resize());
                this.ro.observe(canvasEl);
            }
        }

        _initScene(T) {
            const hemi = new T.HemisphereLight(0xf6fdff, 0xd7dee8, 1.1); hemi.position.set(0, 5, 0); this.scene.add(hemi);
            const key = new T.DirectionalLight(0xffffff, 0.95); key.position.set(2.5, 5, 3.5); this.scene.add(key);
            const fill = new T.DirectionalLight(0xcde6ff, 0.55); fill.position.set(-2.8, 3.2, 2.2); this.scene.add(fill);
            const floor = new T.Mesh(new T.CircleGeometry(2.2, 42), new T.MeshStandardMaterial({ color: 0xb4cbdd, transparent: true, opacity: 0.36 }));
            floor.rotation.x = -Math.PI / 2; floor.position.y = -1.58; this.scene.add(floor);
        }

        _finger(T, basePos, baseRot, lengths, radius, mat) {
            const b = new T.Group(); b.position.copy(basePos); b.rotation.set(baseRot.x, baseRot.y, baseRot.z); b.userData.base = { x: baseRot.x, y: baseRot.y, z: baseRot.z };
            const s1 = new T.Mesh(new T.CapsuleGeometry(radius, lengths[0], 6, 12), mat); s1.position.y = lengths[0] * 0.5; b.add(s1);
            const m = new T.Group(); m.position.y = lengths[0]; b.add(m);
            const s2 = new T.Mesh(new T.CapsuleGeometry(radius * 0.88, lengths[1], 6, 12), mat); s2.position.y = lengths[1] * 0.5; m.add(s2);
            const t = new T.Group(); t.position.y = lengths[1]; m.add(t);
            const s3 = new T.Mesh(new T.CapsuleGeometry(radius * 0.78, lengths[2], 6, 12), mat); s3.position.y = lengths[2] * 0.5; t.add(s3);
            return { base: b, mid: m, tip: t };
        }

        _hand(T, side, parent, mat) {
            const d = side === "left" ? -1 : 1;
            const palm = new T.Group(); palm.position.set(0, -0.1, 0.05); parent.add(palm);
            const pm = new T.Mesh(new T.BoxGeometry(0.34, 0.12, 0.44), mat); pm.position.set(0, 0, 0.02); palm.add(pm);
            const fingers = {};
            fingers.thumb = this._finger(T, new T.Vector3(d * 0.16, -0.03, -0.04), new T.Euler(R(16), d * R(18), d * R(42)), [0.2, 0.15, 0.11], 0.04, mat); palm.add(fingers.thumb.base);
            [["index", -0.11, -10, [0.24, 0.18, 0.14]], ["middle", -0.04, -3, [0.27, 0.2, 0.15]], ["ring", 0.04, 4, [0.25, 0.19, 0.14]], ["pinky", 0.11, 11, [0.2, 0.16, 0.12]]]
                .forEach(([name, x, spread, lens]) => {
                    const f = this._finger(T, new T.Vector3(x, 0.03, 0.15), new T.Euler(R(4), 0, d * R(spread)), lens, 0.035, mat);
                    fingers[name] = f; palm.add(f.base);
                });
            return { palm, fingers };
        }

        _arm(T, side, parent, mat) {
            const d = side === "left" ? -1 : 1;
            const shoulder = new T.Group(); shoulder.position.set(d * 0.74, 1.34, 0); parent.add(shoulder);
            const up = new T.Mesh(new T.CapsuleGeometry(0.115, 0.72, 8, 16), mat); up.position.set(0, -0.47, 0); shoulder.add(up);
            const elbow = new T.Group(); elbow.position.set(0, -0.95, 0); shoulder.add(elbow);
            const lo = new T.Mesh(new T.CapsuleGeometry(0.1, 0.64, 8, 16), mat); lo.position.set(0, -0.44, 0); elbow.add(lo);
            const wrist = new T.Group(); wrist.position.set(0, -0.89, 0); elbow.add(wrist);
            const handRef = this._hand(T, side, wrist, mat);
            return { shoulder, elbow, wrist, palm: handRef.palm, fingers: handRef.fingers };
        }

        _initAvatar(T) {
            const skin = new T.MeshStandardMaterial({ color: 0xe0b08c, roughness: 0.5, metalness: 0.05 });
            const suit = new T.MeshStandardMaterial({ color: 0x2a6e9b, roughness: 0.45, metalness: 0.08 });
            const dark = new T.MeshStandardMaterial({ color: 0x1d3f57, roughness: 0.5, metalness: 0.08 });
            const root = new T.Group(); root.position.set(0, 0.03, 0); this.scene.add(root); this.j.root = root;
            const pelvis = new T.Mesh(new T.BoxGeometry(0.96, 0.42, 0.45), dark); pelvis.position.set(0, -0.97, 0); root.add(pelvis);
            const torsoPivot = new T.Group(); torsoPivot.position.set(0, -0.23, 0); root.add(torsoPivot); this.j.torso = torsoPivot;
            const torso = new T.Mesh(new T.BoxGeometry(1.12, 1.72, 0.56), suit); torso.position.set(0, 0.67, 0); torsoPivot.add(torso);
            const neck = new T.Mesh(new T.CylinderGeometry(0.16, 0.16, 0.2, 16), skin); neck.position.set(0, 1.58, 0.02); torsoPivot.add(neck);
            const headPivot = new T.Group(); headPivot.position.set(0, 1.82, 0.04); torsoPivot.add(headPivot); this.j.head = headPivot;
            const head = new T.Mesh(new T.SphereGeometry(0.34, 24, 24), skin); headPivot.add(head);
            const plate = new T.Mesh(new T.BoxGeometry(1.48, 0.22, 0.6), dark); plate.position.set(0, 1.38, 0); torsoPivot.add(plate);
            this.j.arms.left = this._arm(T, "left", torsoPivot, skin);
            this.j.arms.right = this._arm(T, "right", torsoPivot, skin);
        }

        _resize() {
            if (!this.enabled) return;
            const w = this.canvasEl.clientWidth || 800;
            const h = this.canvasEl.clientHeight || 380;
            this.renderer.setSize(w, h, false);
            this.camera.aspect = w / h;
            this.camera.updateProjectionMatrix();
        }

        _apply(pose) {
            this.j.root.position.y = pose.root.y;
            this.j.root.rotation.y = pose.root.yaw;
            this.j.torso.rotation.x = pose.torso.x;
            this.j.head.rotation.set(pose.head.x, pose.head.y, pose.head.z);
            ["left", "right"].forEach((side) => {
                const arm = this.j.arms[side];
                const ap = pose.arms[side];
                const fp = pose.fingers[side];
                arm.shoulder.rotation.set(ap.shoulder[0], ap.shoulder[1], ap.shoulder[2]);
                arm.elbow.rotation.x = ap.elbow;
                arm.wrist.rotation.set(ap.wrist[0], ap.wrist[1], ap.wrist[2]);
                arm.palm.rotation.set(ap.palm[0], ap.palm[1], ap.palm[2]);
                ["thumb", "index", "middle", "ring", "pinky"].forEach((name) => {
                    const j = arm.fingers[name];
                    const v = fp[name];
                    const rest = j.base.userData.base;
                    j.base.rotation.x = rest.x + v[0];
                    j.base.rotation.y = rest.y;
                    j.base.rotation.z = rest.z + (v[3] || 0);
                    j.mid.rotation.x = v[1];
                    j.tip.rotation.x = v[2];
                });
            });
        }

        _animate() {
            this.currentPose = blend(this.currentPose, this.targetPose, 0.18);
            this._apply(this.currentPose);
            this.renderer.render(this.scene, this.camera);
            global.requestAnimationFrame(() => this._animate());
        }

        setTargetPose(pose) { if (this.enabled) this.targetPose = clone(pose); }
        snapPose(pose) { if (!this.enabled) return; this.currentPose = clone(pose); this.targetPose = clone(pose); this._apply(this.currentPose); }
    }

    function poseForToken(token, index) {
        const t = norm(token);
        const n = numberFromToken(t);
        if (n !== null) return numberPose(n);
        if (["add", "plus", "subtract", "minus", "multiply", "divide", "division", "equal"].includes(t)) return operatorPose(t);
        return hashPose(t, index);
    }

    global.SignAvatar3D = SignAvatar3D;
    global.SignAvatarPose = {
        basePose: () => clone(BASE),
        poseForToken,
    };
}(window));
