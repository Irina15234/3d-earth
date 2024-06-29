import './style.css'
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';

const EARTH_RADIUS = 6378;

export const defineMap = (id: string) => {
    const container = document.getElementById(id);
    if (!container) return;
    if (container.childNodes.length) return;

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    const scene = new THREE.Scene();
    scene.rotateX(-Math.PI / 2);
    const camera = new THREE.PerspectiveCamera(75, containerWidth / containerHeight, 1, 62000);
    camera.position.set(2000 + EARTH_RADIUS, 2000 + EARTH_RADIUS, 2000 + EARTH_RADIUS);
    camera.lookAt(0, 0, 0);
    const renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setSize(containerWidth, containerHeight);
    const controls = new OrbitControls(camera, renderer.domElement);
    camera.rotateZ(-Math.PI / 2);

    definePlanet(renderer, scene);
    defineSun(scene);

    container.appendChild(renderer.domElement);
    renderer.render(scene, camera);

    const animate = () => {
        requestAnimationFrame(animate);

        controls.update();

        renderer.render(scene, camera);
    }

    animate();
};

const definePlanet = (renderer: THREE.WebGLRenderer, scene: THREE.Scene) => {
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace;

    const earthGroup = new THREE.Group();
    earthGroup.rotation.y = Math.PI;
    earthGroup.rotation.x = Math.PI / 2;
    scene.add(earthGroup);

    const detail = 12;
    const loader = new THREE.TextureLoader();
    const geometry = new THREE.IcosahedronGeometry(EARTH_RADIUS, detail);
    const material = new THREE.MeshPhongMaterial({
        map: loader.load("../src/assets/8k_earth_daymap.jpeg"),
        specularMap: loader.load("../src/assets/8k_earth_specular_map.png"),
    });

    const earthMesh = new THREE.Mesh(geometry, material);
    earthGroup.add(earthMesh);

    const lightsMat = new THREE.MeshBasicMaterial({
        map: loader.load("../src/assets/8k_earth_nightmap.jpeg"),
        blending: THREE.AdditiveBlending,
        opacity: 0.6
    });
    const lightsMesh = new THREE.Mesh(geometry, lightsMat);
    earthGroup.add(lightsMesh);

    const cloudsMat = new THREE.MeshStandardMaterial({
        map: loader.load("../src/assets/8k_earth_clouds.jpeg"),
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
    });
    const cloudsMesh = new THREE.Mesh(geometry, cloudsMat);
    earthGroup.add(cloudsMesh);

    const fresnelMat = getFresnelMat();
    const glowMesh = new THREE.Mesh(geometry, fresnelMat);
    glowMesh.scale.setScalar(1.01);
    earthGroup.add(glowMesh);

    const texture = loader.load(
        '../src/assets/8k_stars.jpeg',
        () => {
            texture.mapping = THREE.EquirectangularReflectionMapping;
            texture.colorSpace = THREE.SRGBColorSpace;
            scene.background = texture;
        });

    return {earthGroup };
};

const defineSun = (scene: THREE.Scene) => {
    const sunLight = new THREE.DirectionalLight(0xffffff, 2.0);
    sunLight.position.set(-2 - EARTH_RADIUS, 0.5 + EARTH_RADIUS, 1.5 + EARTH_RADIUS);
    scene.add(sunLight);

    return { sunLight };
};

const getFresnelMat = () => {
    const rimHex = 0x0088ff;
    const facingHex = 0x000000;

    const uniforms = {
        color1: {value: new THREE.Color(rimHex)},
        color2: {value: new THREE.Color(facingHex)},
        fresnelBias: {value: 0.1},
        fresnelScale: {value: 1.0},
        fresnelPower: {value: 4.0},
    };
    const vs = `
  uniform float fresnelBias;
  uniform float fresnelScale;
  uniform float fresnelPower;
  
  varying float vReflectionFactor;
  
  void main() {
    vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
    vec4 worldPosition = modelMatrix * vec4( position, 1.0 );
  
    vec3 worldNormal = normalize( mat3( modelMatrix[0].xyz, modelMatrix[1].xyz, modelMatrix[2].xyz ) * normal );
  
    vec3 I = worldPosition.xyz - cameraPosition;
  
    vReflectionFactor = fresnelBias + fresnelScale * pow( 1.0 + dot( normalize( I ), worldNormal ), fresnelPower );
  
    gl_Position = projectionMatrix * mvPosition;
  }
  `;
    const fs = `
  uniform vec3 color1;
  uniform vec3 color2;
  
  varying float vReflectionFactor;
  
  void main() {
    float f = clamp( vReflectionFactor, 0.0, 1.0 );
    gl_FragColor = vec4(mix(color2, color1, vec3(f)), f);
  }
  `;
    return new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: vs,
        fragmentShader: fs,
        transparent: true,
        blending: THREE.AdditiveBlending,
    });
}

defineMap("app");