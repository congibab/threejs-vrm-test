import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { VRM, VRMSchema } from '@pixiv/three-vrm'
import { MathUtils, Mesh } from 'three'

window.addEventListener("DOMContentLoaded", () => {
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

  let mixer: THREE.AnimationMixer;
  let mixer2: THREE.AnimationMixer;

  let currentVRM: VRM;

  const loader = new GLTFLoader();
  loader.load(
    './AvatarSample_A.vrm',
    (gltf) => {
      VRM.from(gltf).then((vrm) => {
        console.log(vrm);
        currentVRM = vrm;
        scene.add(vrm.scene);

        vrm.lookAt!.target = camera;
        //const head = vrm.humanoid!.getBoneNode(VRMSchema.HumanoidBoneName.Head);
        //head!.rotation.x = Math.PI / 10

        vrm.humanoid!.getBoneNode(VRMSchema.HumanoidBoneName.LeftUpperArm)!.rotation.x = 0.6;
        vrm.humanoid!.getBoneNode(VRMSchema.HumanoidBoneName.LeftLowerArm)!.rotation.x = 1.0;
        vrm.humanoid!.getBoneNode(VRMSchema.HumanoidBoneName.LeftLowerArm)!.rotation.y = -1.;
        vrm.humanoid!.getBoneNode(VRMSchema.HumanoidBoneName.LeftLowerArm)!.rotation.z = 0.1;
        vrm.humanoid!.getBoneNode(VRMSchema.HumanoidBoneName.LeftHand)!.rotation.y = -0.5;

        vrm.humanoid!.getBoneNode(VRMSchema.HumanoidBoneName.RightUpperArm)!.rotation.x = -0.6;
        vrm.humanoid!.getBoneNode(VRMSchema.HumanoidBoneName.RightLowerArm)!.rotation.x = 1.0;
        vrm.humanoid!.getBoneNode(VRMSchema.HumanoidBoneName.RightLowerArm)!.rotation.y = 1.;
        vrm.humanoid!.getBoneNode(VRMSchema.HumanoidBoneName.RightLowerArm)!.rotation.z = 0.1;
        vrm.humanoid!.getBoneNode(VRMSchema.HumanoidBoneName.RightHand)!.rotation.y = 0.5;

        vrm.blendShapeProxy!.setValue(VRMSchema.BlendShapePresetName.O, 1.0);
        vrm.blendShapeProxy!.update();

        const bones = [
          VRMSchema.HumanoidBoneName.LeftUpperArm
        ].map((boneName) => {
          return vrm.humanoid?.getBoneNode(boneName) as THREE.Bone
        })
        const bones2 = [
          VRMSchema.HumanoidBoneName.RightUpperArm
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

        const clip2 = THREE.AnimationClip.parseAnimation({
          hierarchy: [
            {
              keys: [
                {
                  rot: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0)).toArray(),
                  time: 0
                },
                {
                  rot: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -45 * Math.PI / 180)).toArray(),
                  time: 1000
                },
                {
                  rot: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0)).toArray(),
                  time: 2000
                }
              ]
            }
          ]
        }, bones2);

        clip.tracks.some((track) => {
          track.name = track.name.replace(/^.bones\[([^\]]+)\].(position|quaternion|scale)$/, '$1.$2')
        })

        clip2.tracks.some((track) => {
          track.name = track.name.replace(/^.bones\[([^\]]+)\].(position|quaternion|scale)$/, '$1.$2')
        })
        mixer = new THREE.AnimationMixer(vrm.scene);
        mixer2 = new THREE.AnimationMixer(vrm.scene);

        let action = mixer.clipAction(clip);
        let action2 = mixer2.clipAction(clip2);
        action.play();
        action2.play();
      })
    }
  )

  window.addEventListener('resize', onWindowResize, false);

  function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  const update = () => {
    requestAnimationFrame(update);

    let delta = clock.getDelta();

    if(currentVRM) {
      currentVRM.update(delta);
      
      let index : number = Math.sin(clock.getElapsedTime());
      currentVRM.blendShapeProxy!.setValue(VRMSchema.BlendShapePresetName.Blink, Math.abs(index));
    }

    if (mixer) {
      mixer.update(delta * 1000);
      mixer2.update(delta * 1000);
    }
    controls.update();
    renderer.render(scene, camera);
  };
  update();
})