import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

export function create(params = {}, ctx = {}) {
  const geo = new THREE.CircleGeometry(params.size||10, 32);
  const mat = new THREE.MeshBasicMaterial({ color: params.colorA||0xffe1a8, transparent:true, opacity:0.9 });
  const mesh = new THREE.Mesh(geo, mat);
  let x=0,y=0,t=0; const life=(params.lifespanMs||0.5*1000)/1000; let alive=true;
  return { id:`flare_${Math.random().toString(36).slice(2)}`, object3D: mesh,
    update(){ t+=1/60; const k=Math.min(1,t/life); mesh.scale.setScalar(1+1.5*k); mesh.material.opacity=1-k; mesh.position.set(x,y,0); if(t>=life)this.destroy(); },
    setPosition(nx,ny){x=nx;y=ny;}, getPosition(){return {x,y}}, destroy(){alive=false;mesh.removeFromParent();}, get alive(){return alive} };
}


