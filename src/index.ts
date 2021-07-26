import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { VRM, VRMSchema } from '@pixiv/three-vrm'
import { Bone, Object3D } from 'three'

window.addEventListener("DOMContentLoaded", () => {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 1.1, -2);

  const renderer = new THREE.WebGLRenderer({
    antialias: true
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x7fbfff, 1.0);
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

  const loader = new GLTFLoader();

  let mixer: THREE.AnimationMixer;
  loader.load(
    './AliciaSolid.vrm',

    (gltf) => {
      VRM.from(gltf).then((vrm) => {
        console.log(vrm);
        scene.add(vrm.scene);

        const head = vrm.humanoid!.getBoneNode(VRMSchema.HumanoidBoneName.Head);
        head!.rotation.x = Math.PI / 6

        vrm.humanoid!.getBoneNode(VRMSchema.HumanoidBoneName.LeftUpperArm)!.rotation.x = 0.6;
        vrm.humanoid!.getBoneNode(VRMSchema.HumanoidBoneName.LeftLowerArm)!.rotation.x = 0.8;
        vrm.humanoid!.getBoneNode(VRMSchema.HumanoidBoneName.LeftLowerArm)!.rotation.y = -1.;
        vrm.humanoid!.getBoneNode(VRMSchema.HumanoidBoneName.LeftHand)!.rotation.y = -0.5;
        vrm.humanoid!.getBoneNode(VRMSchema.HumanoidBoneName.RightUpperArm)!.rotation.z = -1.3;

        // vrm.blendShapeProxy!.setValue(VRMSchema.BlendShapePresetName.Joy, 1.0)
        // vrm.blendShapeProxy!.setValue(VRMSchema.BlendShapePresetName.A, 0.95)
        // vrm.blendShapeProxy!.setValue(VRMSchema.BlendShapePresetName.I, 0.85)
        // vrm.blendShapeProxy!.update()

        const bones = [
          VRMSchema.HumanoidBoneName.LeftUpperArm
        ].map((boneName) => {
          return vrm.humanoid?.getBoneNode(boneName) as THREE.Bone
        })

        // AnimationClipの生成
        const clip = THREE.AnimationClip.parseAnimation({
          hierarchy: [
            {
              keys: [
                {
                  rot: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0)).toArray(),
                  time: 0
                },
                {
                  rot: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -45 * Math.PI / 180, 0)).toArray(),
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

        clip.tracks.some((track) => {
          track.name = track.name.replace(/^.bones\[([^\]]+)\].(position|quaternion|scale)$/, '$1.$2')
        })
        mixer = new THREE.AnimationMixer(vrm.scene);

        let action = mixer.clipAction(clip);
        action.play();
      })
    }
  )

  let lastTime = (new Date()).getTime();


  const update = () => {
    requestAnimationFrame(update);

    let time = (new Date()).getTime();
    let dedlta = time - lastTime;

    if (mixer) {
      mixer.update(dedlta);
    }

    lastTime = time;

    controls.update();
    renderer.render(scene, camera);
  };
  update();
})