import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

export function create(params = {}, ctx = {}) {
  const group = new THREE.Group();
  const size = params.size || 48;
  for (let i=0;i<4;i++){
    for (let j=0;j<4;j++){
      const geo=new THREE.PlaneGeometry(size/6,size/6);
      const mat=new THREE.MeshBasicMaterial({ color: params.colorA||0xffccff, transparent:true, opacity:0.8 });
      const m=new THREE.Mesh(geo,mat);
      m.position.set((i-1.5)*(size/4),(j-1.5)*(size/4),0);
      group.add(m);
    }
  }
  let x=0,y=0,t=0; let alive=true; const life=(params.lifespanMs||1000)/1000;
  return { id:`mw_${Math.random().toString(36).slice(2)}`, object3D: group,
    update(){ t+=1/60; const k=(Math.sin(t*6)+1)/2; group.children.forEach(c=>{ c.material.opacity=0.3+0.7*k; }); group.position.set(x,y,0); if (t>=life) this.destroy(); },
    setPosition(nx,ny){x=nx;y=ny;}, getPosition(){return {x,y}}, destroy(){alive=false;group.removeFromParent();}, get alive(){return alive} };
}


