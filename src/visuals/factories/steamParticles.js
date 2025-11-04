import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

export function create(params = {}, ctx = {}) {
  const group = new THREE.Group();
  const n = 20;
  const parts = [];
  for (let i=0;i<n;i++){
    const geo = new THREE.CircleGeometry(2, 12);
    const mat = new THREE.MeshBasicMaterial({ color: params.colorA||0xffffff, transparent:true, opacity:0.5 });
    const m = new THREE.Mesh(geo, mat);
    group.add(m);
    parts.push({ m, t: Math.random()*2 });
  }
  let x=0,y=0; let alive=true;
  return { id:`steam_${Math.random().toString(36).slice(2)}`, object3D: group,
    update(){ parts.forEach(p=>{ p.t+=0.03; const yy=y - 20*p.t; const xx=x + Math.sin(p.t*3)*5; p.m.position.set(xx, yy, 0); p.m.material.opacity = Math.max(0, 1 - p.t*0.5); if (p.t>2){ p.t=0; } }); },
    setPosition(nx,ny){x=nx;y=ny;}, getPosition(){return {x,y}}, destroy(){alive=false;group.removeFromParent();}, get alive(){return alive} };
}


