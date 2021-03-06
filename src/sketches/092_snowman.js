const THREE = require('three');
const random = require('canvas-sketch-util').random;
const scb = require('soundcloud-badge');
const spring = require('popmotion').spring;

global.THREE = THREE;

require('three/examples/js/controls/OrbitControls');
const glsl = require('glslify');

const canvasSketch = require('canvas-sketch');

// language=GLSL
const floorFragmentShader = `
  precision highp float;

  uniform vec2 iResolution;
  uniform float iTime;
  uniform float pSize;

  uniform mat3 uvTransform;

  #define BLACK_COL vec3(24,32,38)/255.
  #define WHITE_COL vec3(245,248,250)/255.

  void mainImage( out vec4 fragColor, in vec2 fragCoord )
  {
    vec2 uv = (fragCoord.xy - iResolution.xy * 0.5) / iResolution.y;

    vec2 st = vec2(atan(uv.x, uv.y), length(uv));

    st.x += iTime*.1 + floor(st.y * 5. - iTime*1.)*0.3925;

    float g = st.x * 3.82 * 2.;
    float b1 = fract(g);
    float b2 = sin(st.y*100. - iTime * 10.) * .25 + .5;

    float gf = floor(mod(g, 2.)) * .6;
    float m = step(.125 - st.y*.25 * gf, abs(b2 - b1) );

    m = (1.-m) * abs(1. - gf + .1);

    vec3 col = mix(BLACK_COL, WHITE_COL, m);

    fragColor = vec4(col, 1.0);
  }


  varying vec2 vUv;

  void main() {
    mainImage(gl_FragColor, vUv * iResolution.xy);
  }
`;

// language=GLSL
const glassFragmentShader = `
  precision highp float;

  uniform vec2 iResolution;
  uniform float iTime;
  uniform float pSize;

  uniform mat3 uvTransform;

  void mainImage(out vec4 fragColor, in vec2 fragCoord)
  { 
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    vec2 st = vec2(atan(uv.x, uv.y), length(uv));
    uv = vec2(st.x / 6.2831 + iTime * 2.0 - st.y * 5.0, st.y);
    float smf = .1;
    float m = fract(uv.x);
    float mask = smoothstep(0., smf, abs(m-.5)-.25);
    vec3 col = vec3(0.88, 0, 0.52) * mask;
    fragColor = vec4(col, 1.0);
  }

  varying vec2 vUv;

  void main() {
    mainImage(gl_FragColor, vUv * iResolution.xy);
  }
`;

// language=GLSL
const generalVertexShader = glsl`    
varying vec2 vUv;
varying vec3 vpos;

uniform float iTime;
uniform float pSize;
uniform vec3 camPosition;

void main() {
  vUv = uv;
  
  vpos = position;
  
  gl_Position = projectionMatrix * modelViewMatrix * vec4( vpos, 1.0 );
}
`;

// language=GLSL
const snowFragmentShader = `
  precision highp float;

  varying vec3 vpos;
  varying float hp;
  varying float hp2;
  varying float hp3;

  uniform vec2 iResolution;
  uniform float iTime;
  uniform float pSize;

  uniform mat3 uvTransform;

  #define hue(h) clamp( abs( fract(h + vec4(3,2,1,0)/3.) * 6. - 3.) -1. , 0., 1.)

  void mainImage( out vec4 fragColor, in vec2 fragCoord){
    vec2 uv = (uvTransform * vec3(gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1)).xy - .5;

    float t = iTime*.5 + hp; // Делаем время для точки такое же как в vertexShader

    float l = length(uv);
    float g = l * pSize/2.;
    float gx = clamp(.05 / smoothstep(.0, pSize, g), 0., 1.0);
    float lim = smoothstep(.5, .3, l);

    // Прозрачность считаем от hp3 чтоб все точки были с разной яркостью
    fragColor = vec4(hue(hp3*.75 + iTime*hp2).rgb, hp3/(pSize*.25)*gx / g * lim);
  }
  
  varying vec2 vUv;

  void main() {
    mainImage(gl_FragColor, vUv * iResolution.xy);
  }
`;

// language=GLSL
const snowVertexShader = glsl`    
#pragma glslify: noise = require('glsl-noise/simplex/3d')

varying vec2 vUv;
varying vec3 vpos;
varying float hp;
varying float hp2;
varying float hp3;

uniform float iTime;
uniform float pSize;
uniform vec3 camPosition;

float hash(vec3 p)// replace this by something better
{
  p  = fract(p*0.3183099+.1);
  p *= 17.0;
  return fract(p.x*p.y*p.z*(p.x+p.y+p.z));
}

void main() {
  vUv = uv;
  
  hp = hash(position); // Рандомный фактор для точки по позиции
  hp2 = hash(position*3.3); // Дополнительный рандомный фактор
  hp3 = hash(position*6.6); // Еще один рандомный фактор
  
  float t = iTime*.5 + hp; // Замедляем время и прибавляем рандомный фактор - у этой точки будет "своё" время

  vpos = position;

  // индивидульный рандомнеый vec3 для точки для определения движения точки
  vec3 npp = vec3(hash(position), hash(position*10.), hash(position*20.))*2.;
  
  // Фактор смещения через симплексный шум
  float nF = noise((npp + vec3(iTime*.525)) * 1.) * (.25 + fract(t))*.5;
  
  // Дивгаем точки
  vpos.y -= (vpos.y * fract(t)*2. );

  // Добавляем фактор плавающего смещения
  vpos.xyz += nF*2.;
  
  gl_PointSize = pSize*35. / length(camPosition - vpos);
  
  gl_Position = projectionMatrix * modelViewMatrix * vec4( vpos, 1.0 );
}
`;

const randomInstance = random.createRandom();
randomInstance.setSeed('415761');

const settings = {
    animate: true,
    context: 'webgl',
};

function createSnowManMaterial() {
    const material = new THREE.MeshLambertMaterial({
        color: 0xd0e3f0,

        // opacity: 0.5,
        // transparent: true,
    });

    material.emissive.setHex(0xffffff);
    material.emissiveIntensity = 0.2;

    return material;
}

function createFloorMaterial() {
    return new THREE.ShaderMaterial({
        uniforms: {
            iTime: { value: 0.0 },
            iResolution: new THREE.Uniform(new THREE.Vector2(2000, 2000)),
        },

        fragmentShader: floorFragmentShader,
        vertexShader: generalVertexShader,
    });
}

function createGlassMaterial() {
    return new THREE.ShaderMaterial({
        uniforms: {
            iTime: { value: 0.0 },
            iResolution: new THREE.Uniform(new THREE.Vector2(100, 100)),
        },

        fragmentShader: glassFragmentShader,
        vertexShader: generalVertexShader,
        side: THREE.DoubleSide,
    });
}

function createSnowMaterial() {
    const shaderPoint = THREE.ShaderLib.points;
    const uniforms = {
        ...shaderPoint.uniforms,
        iTime: { value: 0 },
        pSize: { value: 10 },
        camPosition: new THREE.Uniform(new THREE.Vector3()),
    };

    return new THREE.ShaderMaterial({
        uniforms,
        transparent: true,
        depthWrite: false,

        // blending: THREE.AdditiveBlending,
        blending: THREE.AdditiveBlending,

        fragmentShader: snowFragmentShader,
        vertexShader: snowVertexShader,
    });
}

function createBlackMaterial() {
    return new THREE.MeshLambertMaterial({
        color: 0x30404d,
    });
}

function createHatMaterial() {
    return new THREE.MeshPhongMaterial({
        color: 0xf5498b,
    });
}

function createMouthMaterial() {
    return new THREE.MeshLambertMaterial({
        color: 0xff6655,
    });
}

function createOrangeMaterial() {
    return new THREE.MeshLambertMaterial({
        color: 0xff6e4a,
    });
}

function createWoodMaterial() {
    return new THREE.MeshLambertMaterial({
        color: 0xcc6e4a,
    });
}

const shadowMaterial = new THREE.ShadowMaterial();
shadowMaterial.opacity = 0.9182;

const sketch = ({ context }) => {
    let ready = false;

    let target = 2;

    const el = document.createElement('div');
    el.innerHTML = 'Click to let it snow!';
    el.style.cssText = 'position: absolute; font-size: 100px; font-weight: bold; cursor:pointer; font-family: cursive;';
    document.body.appendChild(el);

    document.addEventListener('mousedown', () => {
        if (ready) {
            return;
        }

        const targetAnimation = spring({ from: 20, to: 2, stiffness: 10 });
        targetAnimation.start(v => (target = v));

        document.body.removeChild(el);
        ready = true;
        scb(
            {
                client_id: 'b95f61a90da961736c03f659c03cb0cc',
                song: 'https://soundcloud.com/trap-seacrest/let-it-snow-trap-remix',
                dark: false,
                getFonts: true,
            },
            (err, src, data, div) => {
                if (err) {
                    console.error(err);
                    return;
                }

                const audio = new Audio(src);
                audio.crossOrigin = 'Anonymous';
                audio.autoplay = true;
                audio.play();
            }
        );
    });

    // Create a renderer
    const renderer = new THREE.WebGLRenderer({
        canvas: context.canvas,
    });

    renderer.setClearColor('hsl(200, 90%, 10%)', 1);
    // renderer.setClearColor('#182026', 1);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap

    const camera = new THREE.PerspectiveCamera(25, 2, 0.01, 100);
    camera.position.set(10, 5, 5);

    const controls = new THREE.OrbitControls(camera, context.canvas);
    controls.minDistance = 3;
    controls.maxDistance = 40;
    controls.target.set(0, 2, 0);

    const scene = new THREE.Scene();

    // ---------------------------------------------
    // Свет
    // ---------------------------------------------

    const whiteColor = 0xffffff;
    const lightMain = new THREE.HemisphereLight(whiteColor, 0xffffff, 0.42);
    scene.add(lightMain);

    const lightDir1 = new THREE.SpotLight(whiteColor, 0.98251, 30, Math.PI / 4, 2, 2);
    lightDir1.position.set(5, 7, 5);
    lightDir1.castShadow = true;
    scene.add(lightDir1);

    [lightDir1].forEach(light => {
        // Set up shadow properties for the light
        light.shadow.mapSize.width = 1024; // default
        light.shadow.mapSize.height = 1024; // default
        light.shadow.camera.near = 0.15; // default
        light.shadow.camera.far = 500; // default
        light.shadow.bias = 0.0001; // default

        const side = 15;
        light.shadow.camera.top = side;
        light.shadow.camera.bottom = -side;
        light.shadow.camera.left = side;
        light.shadow.camera.right = -side;

        // const shadowHelper = new THREE.CameraHelper(light.shadow.camera);
        // scene.add(shadowHelper);
    });

    const floorMaterial = createFloorMaterial();
    const glassMaterial = createGlassMaterial();
    const snowMaterial = createSnowMaterial();
    const blackMaterial = createBlackMaterial();
    const orangeMaterial = createOrangeMaterial();

    // ---------------------------------------------
    // Земля
    // ---------------------------------------------
    {
        const geometry = new THREE.PlaneGeometry(200, 200, 100, 100);
        const plane = new THREE.Mesh(geometry, floorMaterial);
        plane.rotation.x = -Math.PI * 0.5;
        scene.add(plane);

        const shadowPlane = new THREE.Mesh(geometry, new THREE.ShadowMaterial({ opacity: 0.5 }));
        shadowPlane.rotation.x = -Math.PI * 0.5;
        shadowPlane.rotation.y = 0.01;

        shadowPlane.receiveShadow = true;
        shadowPlane.castShadow = true;

        scene.add(shadowPlane);
    }

    // ---------------------------------------------
    // Снеговик
    // ---------------------------------------------

    const snowBalls = [];
    {
        const material = createSnowManMaterial();
        for (let i = 0; i < 3; i += 1) {
            const radius = 1 - i * 0.22;
            const geometry = new THREE.DodecahedronGeometry(radius, 3);
            geometry.vertices.forEach(v => {
                v.x += randomInstance.range(-0.01, 0.01);
                v.y += randomInstance.range(-0.01, 0.01);
                v.z += randomInstance.range(-0.01, 0.01);
            });
            const mesh = new THREE.Mesh(geometry, material);

            mesh.castShadow = true;
            mesh.receiveShadow = true;

            mesh.radius = radius;
            mesh.position.y += 0.75 + i * 1.1;

            scene.add(mesh);

            snowBalls.push(mesh);
        }
    }

    // ---------------------------------------------
    // Пуговицы + глаза
    // ---------------------------------------------

    {
        // Пуговицы
        for (let i = 0; i < 3; i += 1) {
            const radius = 0.075;
            const geometry = new THREE.DodecahedronGeometry(radius, 1);
            geometry.vertices.forEach(v => {
                const rStep = radius * 0.05;
                v.x += randomInstance.range(-rStep, rStep);
                v.y += randomInstance.range(-rStep, rStep);
                v.z += randomInstance.range(-rStep, rStep);
            });
            const mesh = new THREE.Mesh(geometry, blackMaterial);

            mesh.castShadow = true;

            const ballRadius = snowBalls[1].radius * 1.025;

            mesh.position.x = ballRadius * Math.cos(Math.PI / 4 - i * (Math.PI / 7) - 0.1);
            mesh.position.y = ballRadius * Math.sin(Math.PI / 4 - i * (Math.PI / 7) - 0.1) + snowBalls[1].position.y;
            // mesh.position.y = snowBalls[1].position.y + spaceBetween * (i - 1 + .85);
            scene.add(mesh);
        }

        // глаза
        const ballRadius = snowBalls[2].radius * 0.825;

        for (let i = -1; i <= 1; i += 2) {
            const radius = 0.075;
            const geometry = new THREE.DodecahedronGeometry(radius, 1);
            geometry.vertices.forEach(v => {
                const rStep = radius * 0.05;
                v.x += randomInstance.range(-rStep, rStep);
                v.y += randomInstance.range(-rStep, rStep);
                v.z += randomInstance.range(-rStep, rStep);
            });

            const mesh = new THREE.Mesh(geometry, floorMaterial);

            mesh.castShadow = true;

            mesh.position.x = ballRadius * Math.cos(Math.PI / 4 - 0.25);
            mesh.position.y = ballRadius * Math.sin(Math.PI / 4 - 0.25) + snowBalls[2].position.y;

            mesh.position.x = ballRadius * Math.cos(i * 0.325);
            mesh.position.z = ballRadius * Math.sin(i * 0.325);

            scene.add(mesh);

            // Линзы
            const glassGeometry = new THREE.CircleGeometry(radius * 1.5, 20);
            const glassMesh = new THREE.Mesh(glassGeometry, glassMaterial);
            glassMesh.rotateY(Math.PI / 2);
            glassMesh.castShadow = true;

            glassMesh.position.copy(mesh.position);
            glassMesh.position.x += 0.09;
            glassMesh.rotateX(-Math.PI / 10);

            scene.add(glassMesh);
        }

        // переносица
        const perGeometry = new THREE.CylinderGeometry(0.01, 0.01, 0.1, 16, 10);

        const perMesh = new THREE.Mesh(perGeometry, blackMaterial);
        perMesh.castShadow = true;

        perMesh.position.x = ballRadius * Math.cos(Math.PI / 4 - 0.25) + 0.125;
        perMesh.position.y = ballRadius * Math.sin(Math.PI / 4 - 0.25) + snowBalls[2].position.y;
        perMesh.rotateX(Math.PI / 2);

        scene.add(perMesh);
    }

    // ---------------------------------------------
    // Морковка
    // ---------------------------------------------

    {
        const width = 0.51;
        const geometry = new THREE.CylinderGeometry(0, width * 0.125, width, 16, 10);
        geometry.vertices.forEach(v => {
            const rStep = width * 0.015;
            v.x += randomInstance.range(-rStep, rStep);
            v.y += randomInstance.range(-rStep, rStep);
            v.z += randomInstance.range(-rStep, rStep);
        });
        const mesh = new THREE.Mesh(geometry, orangeMaterial);
        mesh.castShadow = true;

        mesh.position.y = snowBalls[2].position.y;
        mesh.position.x = snowBalls[2].radius * 0.95 + width / 2;
        mesh.rotateZ(-Math.PI / 2);

        scene.add(mesh);
    }

    // -------------------------
    // Рот
    // -------------------------

    {
        const material = createMouthMaterial();
        const smileWidth = 0.51;
        const geometry = new THREE.CylinderGeometry(smileWidth * 0.035, smileWidth * 0.035, smileWidth, 16, 10);
        geometry.vertices.forEach(v => {
            v.x -= v.y * v.y * 1.5;
            v.z += v.y * v.y * 0.25 - v.x * v.x * 5.25;
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;

        mesh.position.y = snowBalls[2].position.y - snowBalls[2].radius * 0.35;
        mesh.position.x = snowBalls[2].radius * 0.95;
        mesh.rotateZ(-Math.PI / 2);
        mesh.rotateX(-Math.PI / 2);

        scene.add(mesh);

        for (let i = -1; i <= 1; i += 2) {
            const width = 0.125;
            const geometry = new THREE.CylinderGeometry(width * 0.1275, width * 0.1275, width, 16, 10);

            const mesh = new THREE.Mesh(geometry, material);
            mesh.castShadow = true;

            mesh.position.y = snowBalls[2].position.y - snowBalls[2].radius * 0.35 + smileWidth * 0.175;
            mesh.position.x = snowBalls[2].radius * 0.95 - smileWidth * 0.075;
            mesh.position.z = (smileWidth / 2) * i;
            mesh.rotateZ(-Math.PI / 12);
            mesh.rotateX((-Math.PI / 10) * i);

            scene.add(mesh);
        }
    }

    // ---------------------------------------------
    // Шляпа
    // ---------------------------------------------

    {
        const material = createHatMaterial();
        const width = snowBalls[2].radius;
        const geometry = new THREE.CylinderGeometry(width * 0.55, width * 0.5, width, 16, 10);
        geometry.vertices.forEach(v => {
            const rStep = width * 0.025;
            if (v.y > -width / 2) {
                v.x += randomInstance.range(-rStep, rStep);
                v.y += randomInstance.range(-rStep, rStep);
                v.z += randomInstance.range(-rStep, rStep);
            } else {
                v.x *= 2;
                v.z *= 2;
                v.y += randomInstance.range(-rStep * 2, rStep * 2);
            }
        });
        geometry.center();
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;

        mesh.position.y = snowBalls[2].position.y + width / 2 + snowBalls[2].radius * 0.8;
        // mesh.position.x = snowBalls[2].radius * 0.95 + width / 2;
        // mesh.rotatex(-Math.PI / 2);
        mesh.rotateX(-Math.PI / 11);
        mesh.rotateZ(Math.PI / 15);
        mesh.position.z -= 0.15;
        mesh.position.x -= 0.1;

        scene.add(mesh);
    }

    // ---------------------------------------------
    // Палки
    // ---------------------------------------------

    const hands = [];
    {
        const material = createWoodMaterial();
        const width = 0.8;
        for (let i = -1; i <= 1; i += 2) {
            const geometry = new THREE.CylinderGeometry(0.02, 0.075, width, 16, 10);
            geometry.vertices.forEach(v => {
                const rs = 0.1 * v.y;

                v.y += width / 2 + randomInstance.range(-rs, rs);

                v.x += Math.sin(v.y * 10) * 0.02 + randomInstance.range(-rs, rs);
                v.z += Math.cos(v.y * 10) * 0.02 + randomInstance.range(-rs, rs);
            });
            // geometry.center();
            const mesh = new THREE.Mesh(geometry, material);
            mesh.castShadow = true;

            mesh.position.y = snowBalls[1].position.y * 1.2;
            mesh.position.z = snowBalls[1].radius * 0.8 * i;

            mesh.rotateX(-Math.PI / 4 + (Math.PI / 3) * i);
            mesh.rotateX(Math.PI / 4);

            mesh.originalRotationX = mesh.rotation.x;

            mesh.idx = i;
            hands.push(mesh);

            scene.add(mesh);
        }
    }

    // -------------------------
    // Снежок
    // -------------------------

    const particles = new THREE.Geometry(40, 40, 50, 50);
    particles.vertices = particles.vertices.map(v => {
        v.x += (randomInstance.value() - 0.5) * 0.05;
        v.y += (randomInstance.value() - 0.5) * 4 + 6;
        v.z += (randomInstance.value() - 0.5) * 0.05;
        return v;
    });

    for (let i = 0; i < 50000; i += 1) {
        particles.vertices.push(
            new THREE.Vector3(
                (randomInstance.value() - 0.5) * 40,
                (randomInstance.value() - 0.5) * 4 + 6,
                (randomInstance.value() - 0.5) * 40
            )
        );
    }

    const particleSystem = new THREE.Points(particles, snowMaterial);
    particleSystem.position.y += 4;
    particleSystem.sortParticles = true;

    scene.add(particleSystem);

    return {
        resize({ pixelRatio, viewportWidth, viewportHeight }) {
            renderer.setPixelRatio(pixelRatio);
            renderer.setSize(viewportWidth, viewportHeight, false);
            camera.aspect = viewportWidth / viewportHeight;
            camera.updateProjectionMatrix();
        },

        render({ time }) {
            if (!ready) {
                return;
            }

            hands.forEach(mesh => {
                mesh.rotation.x = mesh.originalRotationX + Math.sin(time * 7) * 0.3;
            });

            controls.target.set(0, target, 0);

            floorMaterial.uniforms.iTime.value = time;
            glassMaterial.uniforms.iTime.value = time;

            snowMaterial.uniforms.iTime.value = time * 0.2;
            snowMaterial.uniforms.camPosition = new THREE.Uniform(camera.position);

            camera.position.y = Math.max(camera.position.y, 0.1);

            controls.update();
            renderer.render(scene, camera);
        },

        unload() {
            controls.dispose();
            renderer.dispose();
        },
    };
};

canvasSketch(sketch, settings);
