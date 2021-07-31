import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { BVHLoader } from 'three/examples/jsm/loaders/BVHLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { GLTFNode, VRM, VRMSchema, VRMSpringBone } from '@pixiv/three-vrm'
import { Bone, MathUtils, Mesh } from 'three'

const faceExpressions = require('../lib/jeelizFaceExpressions.module.js')
const neuralNetworkModel = require('../lib/jeelizFaceExpressionsNNC.json')

window.addEventListener("DOMContentLoaded", () => {

  //============================================
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 1.1, -2);

  const renderer = new THREE.WebGLRenderer({
    antialias: true
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 1.0);
  document.body.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.85, 0);
  controls.screenSpacePanning = true;
  controls.update();

  const light = new THREE.DirectionalLight(0xffffff);
  light.position.set(-1, 1, -1).normalize();
  scene.add(light);

  const gridHelper = new THREE.GridHelper(50, 50);
  scene.add(gridHelper);

  const axesHelper = new THREE.AxesHelper(5);
  scene.add(axesHelper);

  const clock = new THREE.Clock();
  //==================================

  const texture_loader = new THREE.CubeTextureLoader();
  texture_loader.setPath('./asset/skybox/');

  const textureCube = texture_loader.load([
    'right.jpg',
    'left.jpg',
    'top.jpg',
    'bottom.jpg',
    'front.jpg',
    'back.jpg'
  ]);

  scene.background = textureCube;

  //==================================
  const BVHloader = new BVHLoader();
  BVHloader.load("./pirouette.bvh", function (result) {

    const skeletonHelper = new THREE.SkeletonHelper(result.skeleton.bones[0]);
    console.log(result.skeleton); // allow animation mixer to bind to THREE.SkeletonHelper directly
    console.log(result.clip); // allow animation mixer to bind to THREE.SkeletonHelper directly
    //mixer = new THREE.AnimationMixer(skeletonHelper);
    //mixer.clipAction(result.clip).setEffectiveWeight(1.0).play();
  });

  //==================================
  let mixer: THREE.AnimationMixer;

  let currentVRM: VRM;
  let head: THREE.Object3D | null;
  let neck: THREE.Object3D | null;
  let spine: THREE.Object3D | null;

  const loader = new GLTFLoader();
  loader.load(
    './AvatarSample_A.vrm',
    (gltf) => {
      VRM.from(gltf).then((vrm) => {
        console.log(vrm);
        currentVRM = vrm;
        scene.add(vrm.scene);

        vrm.lookAt!.target = camera;
        head = vrm.humanoid!.getBoneNode(VRMSchema.HumanoidBoneName.Head);
        neck = vrm.humanoid!.getBoneNode(VRMSchema.HumanoidBoneName.Neck);
        spine = vrm.humanoid!.getBoneNode(VRMSchema.HumanoidBoneName.Spine);

        vrm.humanoid!.getBoneNode(VRMSchema.HumanoidBoneName.LeftUpperArm)!.rotation.x = 0.6;
        vrm.humanoid!.getBoneNode(VRMSchema.HumanoidBoneName.LeftLowerArm)!.rotation.x = 1.0;
        vrm.humanoid!.getBoneNode(VRMSchema.HumanoidBoneName.LeftLowerArm)!.rotation.y = -1.;
        vrm.humanoid!.getBoneNode(VRMSchema.HumanoidBoneName.LeftLowerArm)!.rotation.z = 0.1;
        vrm.humanoid!.getBoneNode(VRMSchema.HumanoidBoneName.LeftHand)!.rotation.y = -0.5;

        //vrm.blendShapeProxy!.setValue(VRMSchema.BlendShapePresetName.O, 1.0);
        //vrm.blendShapeProxy!.update();
        vrm.springBoneManager?.colliderGroups
        const bones = [
          VRMSchema.HumanoidBoneName.LeftUpperArm
        ].map((boneName) => {
          return vrm.humanoid?.getBoneNode(boneName) as THREE.Bone
        })

        const clip = THREE.AnimationClip.parseAnimation({
          hierarchy: [
            {
              keys: [
                {
                  rot: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0)).toArray(),
                  time: 0
                },
                {
                  rot: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 45 * Math.PI / 180)).toArray(),
                  time: 1000
                },
                {
                  rot: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0)).toArray(),
                  time: 2000
                }
              ]
            }
          ]
        }, bones);

        console.log(clip);

        clip.tracks.some((track) => {
          track.name = track.name.replace(/^.bones\[([^\]]+)\].(position|quaternion|scale)$/, '$1.$2')
        })

        mixer = new THREE.AnimationMixer(vrm.scene);

        let action = mixer.clipAction(clip);
        action.play();
      })
    }
  )

  const jeelizCanvas: HTMLCanvasElement = document.createElement('canvas');
  jeelizCanvas.id = "jeelizCanvas";
  document.body.appendChild(jeelizCanvas).style.display = 'none';
  faceExpressions.init({
    canvasId: "jeelizCanvas",
    NNC: neuralNetworkModel,

    callbackReady: (errCode: any) => {
      if (errCode) {
        console.log('ERROR CODE =', errCode);
        return;
      }
      faceExpressions.switch_displayVideo(true);
      console.log("Jeeliz is Ready");
    }
  });

  window.addEventListener('resize', onWindowResize, false);

  function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  const update = () => {
    requestAnimationFrame(update);

    let delta = clock.getDelta();

    if (currentVRM) {
      currentVRM.update(delta);

      if (faceExpressions.ready) {

        const faceRotation = faceExpressions.get_rotationStabilized();
        const faceExpression = faceExpressions.get_morphTargetInfluencesStabilized();

        head!.rotation.x = faceRotation[0] * 0.7 * -1;
        head!.rotation.y = -faceRotation[1] * 0.7;
        head!.rotation.z = -faceRotation[2] * 0.7 * -1;

        neck!.rotation.x = faceRotation[0] * 0.2;
        neck!.rotation.y = -faceRotation[1] * 0.2;
        neck!.rotation.z = -faceRotation[2] * 0.2;

        spine!.rotation.x = faceRotation[0] * 0.1 * -1;
        spine!.rotation.y = -faceRotation[1] * 0.1;
        spine!.rotation.z = -faceRotation[2] * 0.1 * -1;

        currentVRM.blendShapeProxy!.setValue(VRMSchema.BlendShapePresetName.A, faceExpression[6]);
        currentVRM.blendShapeProxy!.setValue(VRMSchema.BlendShapePresetName.U, faceExpression[7]);
        currentVRM.blendShapeProxy!.setValue(VRMSchema.BlendShapePresetName.I, faceExpression[10]);

        currentVRM.blendShapeProxy!.setValue(VRMSchema.BlendShapePresetName.BlinkL, faceExpression[8]);
        currentVRM.blendShapeProxy!.setValue(VRMSchema.BlendShapePresetName.BlinkR, faceExpression[9]);
        console.log(faceExpression[9]);

        currentVRM.blendShapeProxy!.update();

      }

      //let index: number = Math.sin(clock.getElapsedTime());
      //currentVRM.blendShapeProxy!.setValue(VRMSchema.BlendShapePresetName.Blink, Math.abs(index));
    }

    if (mixer) {
      mixer.update(delta * 1000);
    }
    controls.update();
    renderer.render(scene, camera);
  };
  update();
})