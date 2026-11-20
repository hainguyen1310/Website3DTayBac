import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  CLOSE_RATE,
  INTRO_HOLD_SECONDS,
  INTRO_WAITING,
  MODE_BLEND_SECONDS,
  PLAY_RATE,
  SCRUB_RATE,
  advanceLid,
  createBoxRig,
  disposeBoxRig,
  fitSamples,
  missingAnchors,
  playRate,
  poseBoxRig,
  rigGoal,
  sameRigState,
  stepRig,
} from "../src/storefront/three/boxRig.ts";
import type { LidPlayback } from "../src/storefront/three/boxRig.ts";

const DURATION = 2;
const CLOSED = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
const OPEN = new THREE.Quaternion();

/** Hộp thử: nắp xoay 90° quanh X để mở; nút `rise_bagA` (cha của `slot_bagA`) chỉ nhấc lên ở clip `bloom`. */
function buildScene() {
  const root = new THREE.Group();
  root.name = "box";
  const lid = new THREE.Object3D();
  lid.name = "lid";
  lid.add(new THREE.Mesh(new THREE.BoxGeometry(1, 0.1, 1), new THREE.MeshBasicMaterial()));
  const rise = new THREE.Object3D();
  rise.name = "rise_bagA";
  rise.position.set(0, 1, 0);
  const slot = new THREE.Object3D();
  slot.name = "slot_bagA";
  rise.add(slot);
  root.add(lid, rise);
  return { root, lid, rise, slot };
}

function buildClips() {
  const lidTrack = new THREE.QuaternionKeyframeTrack("lid.quaternion", [0, DURATION], [...CLOSED.toArray(), ...OPEN.toArray()]);
  const rest = new THREE.VectorKeyframeTrack("rise_bagA.position", [0, DURATION], [0, 1, 0, 0, 1, 0]);
  const lifted = new THREE.VectorKeyframeTrack("rise_bagA.position", [0, DURATION], [0, 1, 0, 0, 5, 0]);
  return [new THREE.AnimationClip("open", DURATION, [lidTrack, rest]), new THREE.AnimationClip("bloom", DURATION, [lidTrack.clone(), lifted])];
}

function riggedScene() {
  const scene = buildScene();
  const rig = createBoxRig(scene.root, buildClips());
  assert.ok(rig, "a box with an `open` clip should be rigged");
  return { ...scene, rig };
}

const angleOf = (object: THREE.Object3D) => THREE.MathUtils.radToDeg(object.quaternion.angleTo(OPEN));

test("returns null when the model carries no `open` clip", () => {
  const { root } = buildScene();

  assert.equal(createBoxRig(root, []), null);
  assert.equal(createBoxRig(root, [new THREE.AnimationClip("idle", 1, [])]), null);
});

test("collects product anchors by slot id and reads the clip duration", () => {
  const { rig, slot } = riggedScene();

  assert.equal(rig.duration, DURATION);
  assert.deepEqual([...rig.anchors.keys()], ["bagA"]);
  assert.equal(rig.anchors.get("bagA"), slot);
});

test("progress 0 is the closed pose and progress 1 the open pose", () => {
  const { rig, lid } = riggedScene();

  poseBoxRig(rig, { progress: 0, bloom: 0 });
  assert.ok(Math.abs(angleOf(lid) - 90) < 0.01);

  poseBoxRig(rig, { progress: 0.5, bloom: 0 });
  assert.ok(Math.abs(angleOf(lid) - 45) < 0.5);

  poseBoxRig(rig, { progress: 1, bloom: 0 });
  assert.ok(angleOf(lid) < 0.01);
});

test("bloom weight blends the product anchors between the two clips", () => {
  const { rig, rise } = riggedScene();

  poseBoxRig(rig, { progress: 1, bloom: 0 });
  assert.ok(Math.abs(rise.position.y - 1) < 1e-6);

  poseBoxRig(rig, { progress: 1, bloom: 1 });
  assert.ok(Math.abs(rise.position.y - 5) < 1e-6);

  poseBoxRig(rig, { progress: 1, bloom: 0.5 });
  assert.ok(Math.abs(rise.position.y - 3) < 1e-6);
});

test("a box without a `bloom` clip plays `open` for both modes", () => {
  const { root, lid } = buildScene();
  const rig = createBoxRig(root, [buildClips()[0]]);
  assert.ok(rig);

  poseBoxRig(rig, { progress: 0, bloom: 1 });

  assert.ok(Math.abs(angleOf(lid) - 90) < 0.01);
});

test("posing the pose already shown does not evaluate the mixer again", () => {
  const { rig, lid } = riggedScene();
  let updates = 0;
  const update = rig.mixer.update.bind(rig.mixer);
  rig.mixer.update = (delta: number) => {
    updates += 1;
    return update(delta);
  };
  const pose = { progress: 0.5, bloom: 0 };

  poseBoxRig(rig, pose);
  poseBoxRig(rig, { ...pose });
  assert.equal(updates, 1, "an idle frame costs nothing");

  // Người gọi sửa tiếp đối tượng dáng của mình cũng không làm lệch dáng đã ghi nhớ.
  pose.progress = 1;
  poseBoxRig(rig, pose);
  assert.equal(updates, 2);
  assert.ok(angleOf(lid) < 0.01);
});

test("reports the slots a box model cannot seat", () => {
  const { rig } = riggedScene();

  assert.deepEqual(missingAnchors(rig, ["bagA"]), []);
  assert.deepEqual(missingAnchors(rig, ["bagA", "jar", "jar"]), ["jar"]);
  assert.deepEqual(missingAnchors(null, ["bagA", "bottle"]), ["bagA", "bottle"], "a box without animation seats nothing");
  assert.deepEqual(missingAnchors(null, []), []);
});

test("the goal follows the opening value and the selected mode", () => {
  assert.deepEqual(rigGoal(0.25, "hinge"), { progress: 0.25, bloom: 0 });
  assert.deepEqual(rigGoal(0.25, "bloom"), { progress: 0.25, bloom: 1 });
  assert.deepEqual(rigGoal(-1, "hinge"), { progress: 0, bloom: 0 });
  assert.deepEqual(rigGoal(7, "bloom"), { progress: 1, bloom: 1 });
});

test("progress advances at clip speed and lands exactly on the goal", () => {
  const goal = { progress: 1, bloom: 0 };

  const step = stepRig({ progress: 0, bloom: 0 }, goal, 0.5, DURATION, 1);
  assert.ok(Math.abs(step.progress - 0.25) < 1e-9);

  const arrived = stepRig({ progress: 0.9, bloom: 0 }, goal, 0.5, DURATION, 1);
  assert.equal(arrived.progress, 1);
  assert.ok(sameRigState(arrived, goal));
});

test("closing moves backwards and never overshoots the goal", () => {
  const goal = { progress: 0, bloom: 0 };

  const step = stepRig({ progress: 1, bloom: 0 }, goal, 0.5, DURATION, 2);
  assert.ok(Math.abs(step.progress - 0.5) < 1e-9);

  assert.equal(stepRig({ progress: 0.1, bloom: 0 }, goal, 0.5, DURATION, 2).progress, 0);
});

test("switching mode cross-fades the clips over a fixed time", () => {
  const start = { progress: 1, bloom: 0 };
  const goal = { progress: 1, bloom: 1 };

  const half = stepRig(start, goal, MODE_BLEND_SECONDS / 2, DURATION, 1);
  assert.ok(Math.abs(half.bloom - 0.5) < 1e-9);

  const done = stepRig(half, goal, MODE_BLEND_SECONDS, DURATION, 1);
  assert.equal(done.bloom, 1);
});

test("an infinite rate jumps straight to the goal for reduced motion", () => {
  const goal = { progress: 0.8, bloom: 1 };

  assert.deepEqual(stepRig({ progress: 0, bloom: 0 }, goal, 0, DURATION, Infinity), goal);
});

test("a button press plays at clip speed, a slider drag follows the finger", () => {
  assert.equal(playRate(0, 1), PLAY_RATE);
  assert.equal(playRate(1, 0), CLOSE_RATE);
  assert.equal(playRate(0.4, 0.43), SCRUB_RATE);
  assert.equal(playRate(0.43, 0.4), SCRUB_RATE);
  assert.ok(CLOSE_RATE > PLAY_RATE && SCRUB_RATE > CLOSE_RATE);
});

test("the open/close button plays at authored speed wherever the slider was left", () => {
  // Nút đổi nhãn tại mức mở 50%: dưới 50% bấm là mở hết, từ 50% bấm là đóng hết.
  assert.equal(playRate(0.49, 1), PLAY_RATE);
  assert.equal(playRate(0, 1), PLAY_RATE);
  assert.equal(playRate(0.5, 0), CLOSE_RATE);
  assert.equal(playRate(1, 0), CLOSE_RATE);
});

test("without an intro the first pose is the goal itself", () => {
  const goal = { progress: 1, bloom: 0 };

  assert.deepEqual(advanceLid({ shown: null, intro: null }, goal, 0, DURATION, PLAY_RATE), { shown: goal, intro: null });
});

test("a box already at its goal is left untouched", () => {
  const playback: LidPlayback = { shown: { progress: 1, bloom: 0 }, intro: null };

  assert.equal(advanceLid(playback, { progress: 1, bloom: 0 }, 0.016, DURATION, PLAY_RATE), playback, "an idle frame allocates nothing");
});

test("an intro keeps the box shut while the stage is still loading", () => {
  const goal = { progress: 1, bloom: 1 };
  let playback: LidPlayback = { shown: null, intro: INTRO_WAITING };

  for (let frame = 0; frame < 30; frame += 1) playback = advanceLid(playback, goal, 0.1, DURATION, PLAY_RATE);

  assert.deepEqual(playback.shown, { progress: 0, bloom: 1 }, "shut, already in the mode it will open with");
  assert.equal(playback.intro, INTRO_WAITING, "loading time does not eat into the rest");
});

test("once the stage is ready the intro rests a beat, then opens at the authored speed", () => {
  const goal = { progress: 1, bloom: 0 };
  const dt = 0.05;
  let playback: LidPlayback = { shown: null, intro: INTRO_HOLD_SECONDS };
  let rested = 0;

  while (playback.intro !== null) {
    playback = advanceLid(playback, goal, dt, DURATION, PLAY_RATE);
    rested += dt;
    assert.equal(playback.shown?.progress, 0, "the box stays shut for the whole rest");
  }
  assert.ok(Math.abs(rested - INTRO_HOLD_SECONDS) <= dt + 1e-9);

  playback = advanceLid(playback, goal, 0.5, DURATION, PLAY_RATE);
  assert.ok(Math.abs(playback.shown!.progress - 0.25) < 1e-9, "half a second of a two-second clip");

  for (let frame = 0; frame < 4; frame += 1) playback = advanceLid(playback, goal, 0.5, DURATION, PLAY_RATE);
  assert.deepEqual(playback, { shown: goal, intro: null });
});

test("reduced motion skips the intro and shows the goal at once", () => {
  const goal = { progress: 1, bloom: 0 };

  assert.deepEqual(advanceLid({ shown: null, intro: INTRO_WAITING }, goal, 0, DURATION, Infinity), { shown: goal, intro: null });
  assert.deepEqual(advanceLid({ shown: { progress: 0, bloom: 0 }, intro: INTRO_HOLD_SECONDS }, goal, 0.016, DURATION, Infinity), { shown: goal, intro: null });
});

test("when the visitor takes over during the rest the box carries on from the shut pose", () => {
  const resting = advanceLid({ shown: null, intro: INTRO_HOLD_SECONDS }, { progress: 1, bloom: 0 }, 0.1, DURATION, PLAY_RATE);

  // Khách kéo thanh trượt tới 60%: trang báo khách đã tự điều khiển, khung 3D bỏ màn chào (intro = null)
  // và đuổi theo tay từ dáng đóng.
  const next = advanceLid({ shown: resting.shown, intro: null }, { progress: 0.6, bloom: 0 }, 0.1, DURATION, SCRUB_RATE);

  assert.equal(next.intro, null);
  assert.ok(Math.abs(next.shown!.progress - 0.2) < 1e-9, "no jump: 0.1 s at four times a two-second clip");
});

test("the page changing its own goal never ends the intro early", () => {
  const shut = { progress: 0, bloom: 0 };
  const open = { progress: 1, bloom: 0 };
  // Khách từng đóng hộp rồi quay lại bằng "Gói món này vào hộp quà": trang gắn khung với mức mở 0…
  let playback = advanceLid({ shown: null, intro: INTRO_WAITING }, shut, 0, DURATION, PLAY_RATE);
  // …sân khấu sẵn sàng (mô hình đã nằm sẵn trong bộ nhớ), rồi trang mới tự đặt lại mức mở 100%.
  playback = advanceLid({ shown: playback.shown, intro: INTRO_HOLD_SECONDS }, open, 0.05, DURATION, PLAY_RATE);
  assert.equal(playback.shown?.progress, 0, "still shut: the rest is not skipped");
  assert.ok(playback.intro !== null && playback.intro < INTRO_HOLD_SECONDS);

  let frames = 1;
  while (playback.intro !== null && frames < 100) {
    playback = advanceLid(playback, open, 0.05, DURATION, PLAY_RATE);
    frames += 1;
  }
  assert.ok(frames >= INTRO_HOLD_SECONDS / 0.05 && frames < 100, "it rested, then moved on");
  assert.equal(playback.shown?.progress, 0);

  playback = advanceLid(playback, open, 0.5, DURATION, PLAY_RATE);
  assert.ok(Math.abs(playback.shown!.progress - 0.25) < 1e-9, "then opens at the authored speed");
});

test("an intro towards a shut box simply ends", () => {
  const goal = { progress: 0, bloom: 0 };
  let playback: LidPlayback = { shown: null, intro: INTRO_HOLD_SECONDS };

  for (let frame = 0; frame < 20; frame += 1) playback = advanceLid(playback, goal, 0.1, DURATION, PLAY_RATE);

  assert.deepEqual(playback, { shown: goal, intro: null });
});

test("camera fit samples cover closed, open and the moving poses of the allowed modes", () => {
  const hinge = fitSamples(["hinge"]);
  assert.ok(hinge.every((sample) => sample.bloom === 0));
  assert.ok(hinge.some((sample) => sample.progress === 0) && hinge.some((sample) => sample.progress === 1));
  assert.ok(hinge.length >= 5, "a swinging lid is tallest mid-way, so fit needs in-between poses");

  const both = fitSamples(["hinge", "bloom"]);
  assert.equal(both.length, hinge.length * 2);
  assert.ok(both.some((sample) => sample.bloom === 1 && sample.progress === 1));
});

test("disposing a rig releases its actions", () => {
  const { rig } = riggedScene();
  poseBoxRig(rig, { progress: 0.3, bloom: 0.5 });

  disposeBoxRig(rig);

  assert.equal(rig.mixer.stats.actions.inUse, 0);
});
