import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

export function create(params = {}, ctx = {}) {
  const group = new THREE.Group();
  const n=12;
  for (let i=0;i<n;i++){
    const geo=new THREE.CircleGeometry(2,12);
    const mat=new THREE.MeshBasicMaterial({ color: params.colorA||0xffe066, transparent:true, opacity:1 });
    const m=new THREE.Mesh(geo,mat); m.rotation.z=(i/n)*Math.PI*2; group.add(m);
  }
  let x=0,y=0,t=0; let alive=true;
  return { id:`citrus_${Math.random().toString(36).slice(2)}`, object3D: group,
    update(){ t+=1/60; const k=Math.min(1,t/0.8); group.children.forEach((m,i)=>{ const ang=(i/n)*Math.PI*2; const dist=30*k; m.position.set(Math.cos(ang)*dist, Math.sin(ang)*dist, 0); m.material.opacity=1-k; }); group.position.set(x,y,0); if (t>=0.8) this.destroy(); },
    setPosition(nx,ny){x=nx;y=ny;}, getPosition(){return {x,y}}, destroy(){alive=false;group.removeFromParent();}, get alive(){return alive} };
}


