// Les mains du personnage : modèles « generic-hand » de WebXR Input Profiles (licence MIT, voir modeles/LICENCE.txt),
// un vrai squelette de 25 articulations. On les habille (peau, ongles dessinés, manche de pull) et on les pose
// en pliant chaque phalange autour de son axe naturel, calculé une fois pour toutes depuis la pose de repos.
import { GLTFLoader } from './vendor/GLTFLoader.js';

const FINGERS = ['thumb', 'index-finger', 'middle-finger', 'ring-finger', 'pinky-finger'];
const PHAL = { thumb: ['metacarpal', 'phalanx-proximal', 'phalanx-distal'], other: ['phalanx-proximal', 'phalanx-intermediate', 'phalanx-distal'] };

// Texture de peau : légère variation, plis des phalanges, ongles plus clairs aux bouts
function skinTexture(THREE) {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#e9a986'; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2600; i++) {
    const x = Math.random() * 512, y = Math.random() * 512, r = 1 + Math.random() * 3;
    g.fillStyle = Math.random() < 0.5 ? 'rgba(255,215,190,.06)' : 'rgba(170,80,60,.05)';
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function knitTexture(THREE, color = '#3a64b8') {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = color; g.fillRect(0, 0, 256, 256);
  for (let x = 0; x < 256; x += 16) {
    const grd = g.createLinearGradient(x, 0, x + 16, 0);
    grd.addColorStop(0, 'rgba(0,0,0,.28)'); grd.addColorStop(0.5, 'rgba(255,255,255,.12)'); grd.addColorStop(1, 'rgba(0,0,0,.28)');
    g.fillStyle = grd; g.fillRect(x, 0, 16, 256);
    for (let y = 0; y < 256; y += 10) { g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x + 3, y); g.lineTo(x + 8, y + 6); g.lineTo(x + 13, y); g.stroke(); }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export async function loadHands(THREE, dir = 'modeles/') {
  const loader = new GLTFLoader();
  const skinMap = skinTexture(THREE), knit = knitTexture(THREE);
  const skin = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, map: skinMap, roughness: 0.52, metalness: 0,
    sheen: 1, sheenColor: new THREE.Color(0xff8f70), sheenRoughness: 0.5,
    clearcoat: 0.08, clearcoatRoughness: 0.6, emissive: 0x5a1e10, emissiveIntensity: 0.12,
  });
  const nailMat = new THREE.MeshPhysicalMaterial({ color: 0xffd9cf, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08, emissive: 0xffa090, emissiveIntensity: 0.12 });
  const sleeveMat = new THREE.MeshStandardMaterial({ map: knit, roughness: 0.95 });
  const cuffMat = new THREE.MeshStandardMaterial({ color: 0x2c4f96, roughness: 0.95 });
  const one = async (file, side) => {
    const gltf = await loader.loadAsync(dir + file);
    const root = gltf.scene;
    let mesh = null;
    const bones = {};
    root.traverse(o => { if (o.isSkinnedMesh) mesh = o; if (o.isBone || /wrist|finger|thumb/.test(o.name)) bones[o.name] = o; });
    mesh.material = skin;
    mesh.castShadow = true; mesh.frustumCulled = false;
    // Surface plus lisse : normales recalculées et partagées
    root.updateMatrixWorld(true);
    // Repères de la main au repos (dans le repère de la racine) : direction des doigts, dos de la main, côté du pouce
    const W = n => new THREE.Vector3().setFromMatrixPosition(bones[n].matrixWorld);
    const wrist = W('wrist'), mid = W('middle-finger-phalanx-proximal'), idx = W('index-finger-phalanx-proximal'), pky = W('pinky-finger-phalanx-proximal');
    const fwd = mid.clone().sub(wrist).normalize();
    const across = idx.clone().sub(pky).normalize();                         // du petit doigt vers l'index
    let back = new THREE.Vector3().crossVectors(fwd, across).normalize();     // dos de la main (sens à vérifier selon la main)
    // Le dos est du côté opposé au creux : les bouts des doigts au repos sont légèrement pliés vers la paume
    const tip = W('middle-finger-tip');
    const bend = tip.clone().sub(mid).normalize();
    if (bend.dot(back) > 0) back.negate();
    // Dans ce modèle, les os ne sont PAS chaînés (tous rattachés à l'armature, comme le veut WebXR) :
    // on calcule nous-mêmes la chaîne de chaque doigt (cinématique directe) puis on place chaque os.
    // Tout est exprimé dans le repère de la racine au repos, puis ramené dans celui de l'armature.
    const joints = {};
    for (const f of FINGERS) {
      const names = [...(f === 'thumb' ? PHAL.thumb : PHAL.other).map(p => `${f}-${p}`), `${f}-tip`];
      const pts = names.map(n => W(n));
      const quats = names.map(n => { const q = new THREE.Quaternion(); bones[n].getWorldQuaternion(q); return q; });
      const dir = pts[1].clone().sub(pts[0]).normalize();
      // Les doigts se plient vers la paume : axe = direction × dos ; le pouce se replie en travers de la paume
      const axis = f === 'thumb'
        ? new THREE.Vector3().crossVectors(back.clone().multiplyScalar(0.7).addScaledVector(across, 0.35).normalize(), dir).normalize()
        : new THREE.Vector3().crossVectors(back, dir).normalize();
      joints[f] = { bones: names.map(n => bones[n]), pts, quats, axis };
    }
    const arm = bones.wrist.parent;
    const armInvM = new THREE.Matrix4().copy(arm.matrixWorld).invert();
    const armInvQ = new THREE.Quaternion(); arm.getWorldQuaternion(armInvQ); armInvQ.invert();
    const TMPQ = new THREE.Quaternion();
    // Plie un doigt : angles[i] autour de l'articulation i, chaque pli entraîne la suite du doigt ; spread = écart à la base
    const bendFinger = (J, angles, spread) => {
      const P = J.pts.map(p => p.clone()), Q = J.quats.map(q => q.clone());
      const ax = J.axis.clone();
      const rotFrom = (i, R) => {
        for (let k = i; k < P.length; k++) {
          if (k > i) P[k].sub(P[i]).applyQuaternion(R).add(P[i]);
          Q[k].premultiply(R);
        }
        ax.applyQuaternion(R);
      };
      if (spread) rotFrom(0, TMPQ.setFromAxisAngle(back, spread).clone());
      angles.forEach((a, i) => { if (a) rotFrom(i, new THREE.Quaternion().setFromAxisAngle(ax, a)); });
      J.bones.forEach((b, k) => { b.position.copy(P[k]).applyMatrix4(armInvM); b.quaternion.copy(armInvQ).multiply(Q[k]); });
    };
    // Ongles : petites coques brillantes posées sur la dernière phalange
    // (calculés dans le repère de la racine, puis rattachés à l'os : ils suivent le doigt quand il se plie)
    for (const f of FINGERS) {
      const d = bones[`${f}-phalanx-distal`];
      const p0 = W(`${f}-phalanx-distal`), p1 = W(`${f}-tip`);
      const len = p1.distanceTo(p0), dir = p1.clone().sub(p0).normalize();
      // le dos de cette phalange : « dos de la main » rendu perpendiculaire au doigt
      const up = back.clone().addScaledVector(dir, -back.dot(dir)).normalize();
      const n = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), nailMat);
      const w = f === 'thumb' ? 0.0062 : f === 'pinky-finger' ? 0.0043 : 0.005;
      const thick = f === 'thumb' ? 0.0085 : f === 'pinky-finger' ? 0.0062 : 0.0072; // demi-épaisseur du doigt au niveau de l'ongle
      n.scale.set(w, 0.0012, len * 0.42);
      n.position.copy(p0).addScaledVector(dir, len * 0.6).addScaledVector(up, thick * 0.78);
      n.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3().crossVectors(up, dir).normalize(), up, dir));
      root.add(n);
      d.attach(n);
    }
    // Manche de pull : cylindre tricoté qui part du poignet vers le coude
    const sleeve = new THREE.Group();
    const sl = new THREE.Mesh(new THREE.CylinderGeometry(0.043, 0.056, 0.62, 32, 16, true), sleeveMat);
    sl.material.map.repeat.set(3, 2.4);
    sl.position.y = -0.36; sleeve.add(sl); // longue : son bout reste hors du champ, même quand on regarde le tiroir
    const capB = new THREE.Mesh(new THREE.CircleGeometry(0.056, 32), sleeveMat); capB.rotation.x = Math.PI / 2; capB.position.y = -0.66; sleeve.add(capB);
    // Bord côtelé du poignet : un manchon un peu plus serré, à fines côtes, arrondi au bord
    const cuffTex = knitTexture(THREE, '#2c4f96'); cuffTex.repeat.set(9, 0.6);
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.039, 0.043, 0.04, 40, 1, true), new THREE.MeshStandardMaterial({ map: cuffTex, roughness: 0.95 }));
    cuff.position.y = -0.032; sleeve.add(cuff);
    const lip = new THREE.Mesh(new THREE.TorusGeometry(0.0385, 0.0028, 8, 40), cuffMat); lip.rotation.x = Math.PI / 2; lip.position.y = -0.012; sleeve.add(lip);
    sleeve.traverse(o => { if (o.isMesh) o.castShadow = true; });
    // orienter le manchon : son axe +y vers les doigts, à partir d'un peu derrière le poignet
    sleeve.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), fwd);
    sleeve.position.copy(wrist).addScaledVector(fwd, -0.012).addScaledVector(back, -0.004);
    root.add(sleeve);
    const hand = { root, mesh, bones, joints, side, fwd, back, across, wrist, sleeve };
    // pose : { curl: [pouce, index, majeur, annulaire, auriculaire] (0 = tendu, 1 = poing), spread: écart des doigts (−1 à 1) }
    hand.pose = (curl, spread = 0) => {
      FINGERS.forEach((f, k) => {
        const c = Array.isArray(curl) ? curl[k] : curl;
        const ang = f === 'thumb' ? [0.3 * c, 0.5 * c, 0.7 * c, 0] : [1.35 * c, 1.5 * c, 0.95 * c, 0];
        const spr = f === 'thumb' ? 0.25 * spread : [0, 0.11, 0, -0.09, -0.18][k] * spread * (side === 'left' ? -1 : 1);
        bendFinger(joints[f], ang, spr);
      });
    };
    // Oriente la main : les doigts vers fingerDir, le dos de la main vers backDir (repère du parent)
    const restBasis = new THREE.Matrix4().makeBasis(new THREE.Vector3().crossVectors(fwd, back).normalize(), back, fwd.clone().negate());
    const restInv = new THREE.Quaternion().setFromRotationMatrix(restBasis).invert();
    hand.orient = (fingerDir, backDir) => {
      const z = fingerDir.clone().normalize().negate();
      const y = backDir.clone().addScaledVector(z, -backDir.dot(z)).normalize();
      const x = new THREE.Vector3().crossVectors(y, z);
      const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
      root.quaternion.copy(q).multiply(restInv);
    };
    // Place le poignet à un point donné (repère du parent), après orient()
    hand.placeWrist = p => { root.updateMatrix(); root.position.copy(p).sub(wrist.clone().applyQuaternion(root.quaternion)); };
    hand.pose([0.15, 0.12, 0.15, 0.2, 0.25]);
    return hand;
  };
  const [right, left] = await Promise.all([one('main-droite.glb', 'right'), one('main-gauche.glb', 'left')]);
  return { right, left };
}

// Poses toutes prêtes
export const POSES = {
  repos: [[0.15, 0.12, 0.15, 0.2, 0.25], 0.2],          // main détendue
  plate: [[0.02, 0.02, 0.03, 0.04, 0.06], 0.35],        // posée à plat sur le bureau
  attrape: [[0.45, 0.45, 0.5, 0.55, 0.6], 0.1],          // prête à saisir
  tient: [[0.55, 0.62, 0.7, 0.75, 0.8], 0],              // tient la toupie au creux de la main
  poing: [[0.8, 1, 1, 1, 1], 0],
};
