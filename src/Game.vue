<script setup lang="ts">
  import { onMounted } from 'vue'

  let context = null;
  const drawDistance = 800;         // how far ahead to draw
  const cameraDepth = 1;            // FOV of camera
  const segmentLength = 100;        // length of each road segment
  const roadWidth = 500;            // how wide is road
  const curbWidth = 150;            // with of warning track
  const dashLineWidth = 9;          // width of the dashed line
  const maxPlayerX = 2e3;           // limit player offset
  const mountainCount = 30;         // how many mountains are there
  const timeDelta = 1/60;           // inverse frame rate
  const PI = Math.PI;               // shorthand for Math.PI

  // player settings
  const height = 150;               // high of player above ground
  const maxSpeed = 300;             // limit max player speed
  const playerAccel = 1;            // player forward acceleration
  const playerBrake = -3;           // player breaking acceleration
  const turnControl = .2;           // player turning rate
  const jumpAccel = 25;             // z speed added for jump
  const springConstant = .01;       // spring players pitch
  const collisionSlow = .1;         // slow down from collisions
  const pitchLerp = .1;             // rate camera pitch changes
  const pitchSpringDamp = .9;       // dampen the pitch spring
  const elasticity = 1.2;           // bounce elasticity
  const centrifugal = .002;         // how much turns pull player
  const forwardDamp = .999;         // dampen player z speed
  const lateralDamp = .7;           // dampen player x speed
  const offRoadDamp = .98;          // more damping when off road
  const gravity = -1;               // gravity to apply in y axis
  const cameraTurnScale = 2;        // how much to rotate camera
  const worldRotateScale = .00005;  // how much to rotate world
        
  // level settings
  const maxTime = 20;               // time to start
  const checkPointTime = 10;        // add time at checkpoints
  const checkPointDistance = 1e5;   // how far between checkpoints
  const maxDifficultySegment = 9e3; // how far until max difficulty
  const roadEnd = 1e4;              // how far until end of road

  onMounted(() => {
    // draw settings
    window.onload=function(){
      context = document.getElementById('canvas').getContext`2d`; // canvas context
    };
  })

  /** mouse input */ 

  let mouseDown     = 0;
  let mousePressed  = 0;
  let mouseUpFrames = 0;
  let mouseX        = 0;

  document.onmouseup =e=> mouseDown = 0;

  document.onmousedown =e=> mousePressed ? mouseDown = 1 : mousePressed = 1;

  document.onmousemove =e=> mouseX = e.x/window.innerWidth*2 - 1;

  /** math and helper functions */

  function Clamp(v, a, b) {
    Math.min(Math.max(v, a), b);
  }

  function ClampAngle(a) {
    (a+PI) % (2*PI) + (a+PI<0? PI : -PI);
  }

  function Lerp(p, a, b) {
    a + Clamp(p, 0, 1) * (b-a);
  }

  function R(a=1, b=0) {
    Lerp((Math.sin(++randSeed)+1)*1e5%1,a,b);
  }

  function LSHA(l,s=0,h=0,a=1) {
    `hsl(${h+hueShift},${s}%,${l}%,${a})`;
  }

</script>

<template>
<canvas id="canvas"></canvas>
</template>

<style>
</style>
