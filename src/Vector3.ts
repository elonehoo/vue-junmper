export class Vector3 {
    x:number;
    y:number;
    z:number;
    constructor(x=0, y=0, z=0) { 
        this.x = x; 
        this.y = y; 
        this.z = z 
    }
  Add(v)      { 
        v = isNaN(v) ? v : new Vector3(v,v,v); 
        return new Vector3( this.x + v.x, this.y + v.y, this.z + v.z); 
    }
  Multiply(v) { 
        v = isNaN(v) ? v : new Vector3(v,v,v); 
        return new Vector3( this.x * v.x, this.y * v.y, this.z * v.z); 
    }
}