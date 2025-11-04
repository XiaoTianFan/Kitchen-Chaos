import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

export function create(params = {}, ctx = {}) {
  const geom = new THREE.BufferGeometry();
  const positions = new Float32Array(3*32);
  geom.setAttribute('position', new THREE.BufferAttribute(positions,3));
  const mat = new THREE.LineBasicMaterial({ color: params.colorA||0xffdd66, transparent:true, opacity:1 });
  const line = new THREE.Line(geom, mat);
  let x=0,y=0,t=0,cnt=2; let alive=true;
  positions[0]=0;positions[1]=0;positions[2]=0; positions[3]=20;positions[4]=0;positions[5]=0; geom.setDrawRange(0,cnt);
  return { id:`spark_${Math.random().toString(36).slice(2)}`, object3D: line,
    update(){ t+=1/60; const k=Math.min(1,t/0.5); line.material.opacity=1-k; line.position.set(x,y,0); if (t>0.5) this.destroy(); },
    setPosition(nx,ny){x=nx;y=ny; if (cnt<32){ cnt++; geom.setDrawRange(0,cnt); } }, getPosition(){return {x,y}}, destroy(){alive=false;line.removeFromParent();}, get alive(){return alive} };
}


