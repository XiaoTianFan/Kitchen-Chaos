import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

export function create(params = {}, ctx = {}) {
  const group = new THREE.Group();
  const rings = [];
  for (let i=0;i<5;i++){
    const geo = new THREE.RingGeometry(5,6, 48);
    const mat = new THREE.MeshBasicMaterial({ color: params.colorA||0x99ddff, transparent:true, opacity:0.8, side: THREE.DoubleSide });
    const m = new THREE.Mesh(geo, mat);
    rings.push({ m, t: i*0.2 });
    group.add(m);
  }
  let x=0,y=0; let alive=true;
  return { id:`ripple_${Math.random().toString(36).slice(2)}`, object3D: group,
    update(){ rings.forEach(r=>{ r.t+=0.03; const s=1+r.t*3; r.m.scale.setScalar(s); r.m.material.opacity=Math.max(0,1-r.t); r.m.position.set(x,y,0); if (r.t>1){ r.t=0; } }); },
    setPosition(nx,ny){x=nx;y=ny;}, getPosition(){return {x,y}}, destroy(){alive=false;group.removeFromParent();}, get alive(){return alive} };
}


