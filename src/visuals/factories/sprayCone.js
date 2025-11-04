import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

export function create(params = {}, ctx = {}) {
  const group = new THREE.Group();
  const n = 40; const parts=[];
  for (let i=0;i<n;i++){
    const geo = new THREE.CircleGeometry(1.2, 8);
    const mat = new THREE.MeshBasicMaterial({ color: params.colorA||0xfff0b3, transparent:true, opacity:0.8 });
    const m = new THREE.Mesh(geo, mat);
    group.add(m); parts.push({ m, t: Math.random()*1 });
  }
  let x=0,y=0; let alive=true;
  return { id:`spray_${Math.random().toString(36).slice(2)}`, object3D: group,
    update(){ parts.forEach(p=>{ p.t+=0.1; const ang=-Math.PI/2 + (Math.random()-0.5)*0.4; const dist=30*p.t; p.m.position.set(x+Math.cos(ang)*dist, y+Math.sin(ang)*dist, 0); p.m.material.opacity=Math.max(0,1-p.t); if(p.t>1)p.t=0; }); },
    setPosition(nx,ny){x=nx;y=ny;}, getPosition(){return {x,y}}, destroy(){alive=false;group.removeFromParent();}, get alive(){return alive} };
}


