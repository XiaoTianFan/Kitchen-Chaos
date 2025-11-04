import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

export function create(params = {}, ctx = {}) {
  const group = new THREE.Group();
  const n = 30;
  const bubbles = [];
  for (let i=0;i<n;i++){
    const geo = new THREE.CircleGeometry(2+Math.random()*3, 16);
    const mat = new THREE.MeshBasicMaterial({ color: params.colorA||0xa8e6ff, transparent:true, opacity:0.8 });
    const m = new THREE.Mesh(geo, mat);
    group.add(m);
    bubbles.push({ m, t: Math.random()*2, ox: (Math.random()-0.5)*30 });
  }
  let x=0,y=0; let alive=true;
  return { id:`bubbles_${Math.random().toString(36).slice(2)}`, object3D: group,
    update(){ bubbles.forEach(b=>{ b.t+=0.02; const yy=y - 10*b.t; const xx=x + b.ox; b.m.position.set(xx, yy, 0); b.m.material.opacity = Math.max(0, 1 - b.t*0.4); if (b.t>2){ b.t=0; } }); },
    setPosition(nx,ny){x=nx;y=ny;}, getPosition(){return {x,y}}, destroy(){alive=false;group.removeFromParent();}, get alive(){return alive} };
}


