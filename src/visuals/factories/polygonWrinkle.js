import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

export function create(params = {}, ctx = {}) {
  const shape = new THREE.Shape();
  const r = params.size || 20;
  for (let i=0;i<6;i++){ const a=(i/6)*Math.PI*2; const rr=r*(0.7+0.3*Math.random()); const x=Math.cos(a)*rr; const y=Math.sin(a)*rr; if(i===0)shape.moveTo(x,y); else shape.lineTo(x,y);} shape.closePath();
  const geo = new THREE.ShapeGeometry(shape);
  const mat = new THREE.MeshBasicMaterial({ color: params.colorA||0xffd1e0, transparent: true, opacity: 0.9 });
  const mesh = new THREE.Mesh(geo, mat);
  let x=0,y=0,t=0; const life=(params.lifespanMs||0.6*1000)/1000; let alive=true;
  return { id:`wrinkle_${Math.random().toString(36).slice(2)}`, object3D: mesh,
    update(){ t+=1/60; const k=Math.min(1,t/life); mesh.rotation.z += 0.1; mesh.scale.setScalar(1+0.5*k); mesh.material.opacity=1-k; mesh.position.set(x,y,0); if(t>=life)this.destroy(); },
    setPosition(nx,ny){x=nx;y=ny;}, getPosition(){return {x,y}}, destroy(){alive=false;mesh.removeFromParent();}, get alive(){return alive} };
}


