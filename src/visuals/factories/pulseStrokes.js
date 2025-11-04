import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

export function create(params = {}, ctx = {}) {
  const group = new THREE.Group();
  const color = new THREE.Color(params.colorA || 0xffffff);
  const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 1 });
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0,0,0, 20,0,0]), 3));
  const line = new THREE.Line(geom, mat);
  group.add(line);
  let x=0,y=0,t=0; let alive=true; const life=(params.lifespanMs||400)/1000;
  return {
    id:`pulse_${Math.random().toString(36).slice(2)}`,
    object3D: group,
    update(){ t+=1/60; const k=Math.min(1,t/life); line.scale.setScalar(1+2*k); line.material.opacity=1-k; group.position.set(x,y,0); if(t>=life)this.destroy(); },
    setPosition(nx,ny){x=nx;y=ny;}, getPosition(){return {x,y}}, destroy(){alive=false;group.removeFromParent();}, get alive(){return alive}
  };
}


