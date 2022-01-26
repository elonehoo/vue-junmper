<script setup lang="ts">
  import { onMounted,nextTick } from 'vue'
  import { Vector3 } from './Vector3'

  const oninitCanvas = () => {
            nextTick(() => {
                            
              /////////////////////////////////////////////////////////////////////////////////////    
              // debug settings
              /////////////////////////////////////////////////////////////////////////////////////

              // enable debug features
              let debug = 0;                     
              // remove pointer lock for 2k build
              let usePointerLock = 1;            

              /////////////////////////////////////////////////////////////////////////////////////
              // draw settings
              /////////////////////////////////////////////////////////////////////////////////////

              // canvas 2d context
              let c = document.getElementById('canvas');
              let context = c.getContext('2d');  
              
              // how many road segments to draw in front of player
              let drawDistance = 800;            
              // FOV of camera (1 / Math.tan((fieldOfView/2) * Math.PI/180))
              let cameraDepth = 1;               
              // length of each road segment
              let roadSegmentLength = 100;       
              // how wide is road
              let roadWidth = 500;               
              // with of road plus warning track
              let warningTrackWidth = 150;       
              // width of the dashed line in the road
              let dashLineWidth = 9;             
              // player can not move this far from center of road
              let maxPlayerX = 2e3;              
              // how many mountains are there
              let mountainCount = 30;            
              // inverse frame rate
              let timeDelta = 1/60;              

              /////////////////////////////////////////////////////////////////////////////////////
              // player settings
              /////////////////////////////////////////////////////////////////////////////////////
              // how high is player above ground
              let playerHeight = 150;            
              // limit max player speed
              let playerMaxSpeed = 300;          
              // player acceleration
              let playerAccel = 1;               
              // player acceleration when breaking
              let playerBrake = -3;              
              // player turning rate
              let playerTurnControl = .2;        
              // z speed added for jump
              let playerJumpSpeed = 25;       
              // spring players pitch   
              let playerSpringConstant = .01;    
              // slow down from collisions
              let playerCollisionSlow = .1;      
              // speed that camera pitch changes
              let pitchLerp = .1;                
              // dampen the pitch spring
              let pitchSpringDamping = .9;       
              // bounce elasticity (2 is full bounce, 1 is none)
              let elasticity = 1.2;              
              // how much to pull player on turns
              let centrifugal = .002;            
              // dampen player z speed
              let forwardDamping = .999;         
              // dampen player x speed
              let lateralDamping = .7;           
              // more damping when off road
              let offRoadDamping = .98;          
              // gravity to apply in y axis
              let gravity = -1;                  
              // scale of player turning to rotate camera
              let cameraHeadingScale = 2;        
              // how much to rotate world around turns
              let worldRotateScale = .00005;     

              /////////////////////////////////////////////////////////////////////////////////////        
              // level settings
              /////////////////////////////////////////////////////////////////////////////////////    

              // time to start with
              const maxTime = 20;                  
              // how much time for getting to checkpoint
              const checkPointTime = 10;           
              // how far between checkpoints
              const checkPointDistance = 1e5;      
              // how many checkpoints before max difficulty
              const checkpointMaxDifficulty = 9;   
              // how many sections until end of the road
              const roadEnd = 1e4;                 

              /////////////////////////////////////////////////////////////////////////////////////    
              // global game variables  
              /////////////////////////////////////////////////////////////////////////////////////

              // player position 3d vector
              let playerPos;                  
              // player velocity 3d vector
              let playerVelocity;             
              // spring for player pitch bounce
              let playerPitchSpring;          
              // velocity of pitch spring
              let playerPitchSpringVelocity;  
              // pitch of road, or 0 if player is in air
              let playerPitchRoad;            
              // how many frames player has been in air
              let playerAirFrame;             
              // heading to turn skybox
              let worldHeading;               
              // random seed for level
              let randomSeed;                 
              // save the starting seed for active use
              let startRandomSeed;            
              // distance of next checkpoint
              let nextCheckPoint;             
              // current hue shift for all hsl colors
              let hueShift;                   
              // the list of road segments
              let road;                       
              // time left before game over
              let time;                       
              // time of last update
              let lastUpdate = 0;             
              // frame rate adjustment
              let timeBuffer = 0;             

              function StartLevel() { 
                  /////////////////////////////////////////////////////////////////////////////////////
                  // build the road with procedural generation
                  /////////////////////////////////////////////////////////////////////////////////////

                  // init end of section distance
                  let roadGenSectionDistanceMax = 0;          
                  // starting road width
                  let roadGenWidth = roadWidth;               
                  // distance left for this section
                  let roadGenSectionDistance = 0;             
                  // length of taper
                  let roadGenTaper = 0;                       
                  // X wave frequency 
                  let roadGenWaveFrequencyX = 0;              
                  // Y wave frequency
                  let roadGenWaveFrequencyY = 0;              
                  // X wave amplitude (turn size)
                  let roadGenWaveScaleX = 0;     
                  // Y wave amplitude (hill size)             
                  let roadGenWaveScaleY = 0;               
                  // set random seed   
                  startRandomSeed = randomSeed = Date.now();  
                  // clear list of road segments
                  road = [];                                  
                  
                  /////////////////////////////////////////////////////////////////////////////////////
                  // generate the road
                  /////////////////////////////////////////////////////////////////////////////////////

                  // build road past end
                  for( let i = 0; i < roadEnd*2; ++i ) {
                      // check for end of section
                      if (roadGenSectionDistance++ > roadGenSectionDistanceMax) {
                          // calculate difficulty percent
                          // difficulty
                          const difficulty = Math.min(1, i*roadSegmentLength/checkPointDistance/checkpointMaxDifficulty); 
                          
                          /////////////////////////////////////////////////////////////////////////////////////
                          // randomize road settings
                          /////////////////////////////////////////////////////////////////////////////////////

                          // road width
                          roadGenWidth = roadWidth*Random(1-difficulty*.7, 3-2*difficulty);     
                          // X frequency   
                          roadGenWaveFrequencyX = Random(Lerp(difficulty, .01, .02));    
                          // Y frequency          
                          roadGenWaveFrequencyY = Random(Lerp(difficulty, .01, .03));   
                          // X scale           
                          roadGenWaveScaleX = i > roadEnd ? 0 : Random(Lerp(difficulty, .2, .6));  
                          // Y scale
                          roadGenWaveScaleY = Random(Lerp(difficulty, 1e3, 2e3));                  
                          
                          /////////////////////////////////////////////////////////////////////////////////////
                          // apply taper and move back
                          /////////////////////////////////////////////////////////////////////////////////////

                          // randomize taper
                          roadGenTaper = Random(99, 1e3)|0; 
                          // randomize segment distance                          
                          roadGenSectionDistanceMax = roadGenTaper + Random(99, 1e3);
                          // reset section distance 
                          roadGenSectionDistance = 0;    
                          // subtract taper                             
                          i -= roadGenTaper;                                          
                      }
                      
                      /////////////////////////////////////////////////////////////////////////////////////
                      // make a wavy road
                      /////////////////////////////////////////////////////////////////////////////////////

                      // road X
                      const x = Math.sin(i*roadGenWaveFrequencyX) * roadGenWaveScaleX;      
                      // road Y
                      const y = Math.sin(i*roadGenWaveFrequencyY) * roadGenWaveScaleY;      
                      // get or make road segment
                      road[i] = road[i]? road[i] : {x:x, y:y, w:roadGenWidth};              

                      /////////////////////////////////////////////////////////////////////////////////////
                      // apply taper from last section
                      /////////////////////////////////////////////////////////////////////////////////////

                      // get taper percent
                      const p = Clamp(roadGenSectionDistance / roadGenTaper, 0, 1);        
                      // X pos and taper 
                      road[i].x = Lerp(p, road[i].x, x);                           
                      // Y pos and taper         
                      road[i].y = Lerp(p, road[i].y, y);                                    
                      // check for road end, width and taper
                      road[i].w = i > roadEnd ? 0 : Lerp(p, road[i].w, roadGenWidth);       
                      // road pitch angle
                      road[i].a = road[i-1] ? Math.atan2(road[i-1].y-road[i].y, roadSegmentLength) : 0; 
                  }  
                  
                  /////////////////////////////////////////////////////////////////////////////////////
                  // init game
                  /////////////////////////////////////////////////////////////////////////////////////
                  
                  // reset everything
                  playerVelocity = new Vector3 ( 
                      playerPitchSpring = 
                      playerPitchSpringVelocity = 
                      playerPitchRoad =  
                      hueShift = 0
                  );
                  // set player pos
                  playerPos = new Vector3(0, playerHeight);   
                  // randomize world heading
                  worldHeading = randomSeed;  
                  // init next checkpoint               
                  nextCheckPoint = checkPointDistance;        
                  // set the starting time
                  time = maxTime;                             
              }
                  
              function Update() {
                  // time regulation, in case running faster then 60 fps, though it causes judder REMOVE FROM MINFIED
                  const now = performance.now();
                  if (lastUpdate)
                  {
                      // limit to 60 fps
                      const delta = now - lastUpdate;
                      if (timeBuffer + delta < 0)
                      {
                          // running fast
                          requestAnimationFrame(Update);
                          return;
                      }
                      
                      // update time buffer
                      timeBuffer += delta;
                      timeBuffer -= timeDelta * 1e3;
                      if (timeBuffer > timeDelta * 1e3) {
                          // if running too slow
                          timeBuffer = 0; 
                      }
                  }
                  lastUpdate = now;
                  
                  // start frame
                  if (snapshot) {
                      c.width|0
                  } else                                  // DEBUG REMOVE FROM MINFIED
                      // clear the screen and set size
                      c.width = window.innerWidth,c.height = window.innerHeight; 
                  
                  if (!c.width) // REMOVE FROM MINFIED
                  {
                      // fix bug on itch, wait for canvas before updating
                      requestAnimationFrame(Update);
                      return;
                  }
                  
                  // set mouse down if pointer lock released
                  if (usePointerLock && document.pointerLockElement !== c && !touchMode) {
                      mouseDown = 1; 
                  }
                  
                  UpdateDebugPre(); // DEBUG REMOVE FROM MINFIED
                  
                  /////////////////////////////////////////////////////////////////////////////////////
                  // update player - controls and physics
                  /////////////////////////////////////////////////////////////////////////////////////
                  
                  // get player road segment

                  // current player road segment 
                  const playerRoadSegment = playerPos.z/roadSegmentLength|0;         
                  // how far player is along current segment
                  const playerRoadSegmentPercent = playerPos.z/roadSegmentLength%1;  
                  
                  /////////////////////////////////////////////////////////////////////////////////////
                  // get lerped values between last and current road segment
                  /////////////////////////////////////////////////////////////////////////////////////

                  const playerRoadX = Lerp(playerRoadSegmentPercent, road[playerRoadSegment].x, road[playerRoadSegment+1].x);
                  const playerRoadY = Lerp(playerRoadSegmentPercent, road[playerRoadSegment].y, road[playerRoadSegment+1].y) + playerHeight;
                  const roadPitch = Lerp(playerRoadSegmentPercent, road[playerRoadSegment].a, road[playerRoadSegment+1].a);
                  
                  // save last velocity
                  const playerVelocityLast = playerVelocity.Add(0);                      
                  // gravity
                  playerVelocity.y += gravity;                              
                  // apply lateral damping             
                  playerVelocity.x *= lateralDamping;                                    
                  // apply damping, prevent moving backwards
                  playerVelocity.z = Math.max(0, time ? forwardDamping*playerVelocity.z : 0); 
                  // add player velocity
                  playerPos = playerPos.Add(playerVelocity);                             
                  
                  // turning
                  const playerTurnAmount = Lerp(playerVelocity.z/playerMaxSpeed, mouseX * playerTurnControl, 0); 
                  // update x velocity
                  playerVelocity.x +=                                          
                      // apply turn
                      playerVelocity.z * playerTurnAmount -                    
                      // apply centrifugal force
                      playerVelocity.z ** 2 * centrifugal * playerRoadX;       
                  // limit player x position
                  playerPos.x = Clamp(playerPos.x, -maxPlayerX, maxPlayerX);   
                  
                  /////////////////////////////////////////////////////////////////////////////////////
                  // check if on ground
                  /////////////////////////////////////////////////////////////////////////////////////

                  if (playerPos.y < playerRoadY) {
                      /////////////////////////////////////////////////////////////////////////////////////
                      // bounce velocity against ground normal
                      /////////////////////////////////////////////////////////////////////////////////////

                      // match y to ground plane
                      playerPos.y = playerRoadY;                                                                
                      // reset air grace frames
                      playerAirFrame = 0;                                                                       
                      // get ground normal
                      playerVelocity = new Vector3(0, Math.cos(roadPitch), Math.sin(roadPitch))                 
                          // apply bounce
                          .Multiply(-elasticity *                                                               
                              // dot of road and velocity
                              (Math.cos(roadPitch) * playerVelocity.y + Math.sin(roadPitch) * playerVelocity.z)) 
                          // add velocity
                          .Add(playerVelocity);                                                                 

                      playerVelocity.z += 
                          // apply brake 
                          mouseDown? playerBrake :                                                
                          // apply accel             
                          Lerp(playerVelocity.z/playerMaxSpeed, mouseWasPressed*playerAccel, 0);  
                      
                      // check if off road
                      if (Math.abs(playerPos.x) > road[playerRoadSegment].w) {
                          // slow down when off road
                          playerVelocity.z *= offRoadDamping;                                     
                          // bump when off road
                          playerPitchSpring += Math.sin(playerPos.z/99)**4/99;                    
                      }
                  }
                
                  /////////////////////////////////////////////////////////////////////////////////////
                  // update jump
                  /////////////////////////////////////////////////////////////////////////////////////

                  // check for jump
                  if (playerAirFrame++<6 && mouseDown && mouseUpFrames && mouseUpFrames<9 && time) {
                      // apply jump velocity
                      playerVelocity.y += playerJumpSpeed;                                          
                      // prevent jumping again
                      playerAirFrame = 9;                                                           
                  }
                  // update mouse up frames for double click
                  mouseUpFrames = mouseDown? 0 : mouseUpFrames+1;                                   
                  // calculate above ground percent
                  const airPercent = (playerPos.y-playerRoadY)/99;                                  
                  // pitch down with vertical velocity
                  playerPitchSpringVelocity += Lerp(airPercent,0,playerVelocity.y/4e4);             
                  
                  /////////////////////////////////////////////////////////////////////////////////////
                  // update player pitch
                  /////////////////////////////////////////////////////////////////////////////////////

                  // pitch down with forward accel
                  playerPitchSpringVelocity += (playerVelocity.z - playerVelocityLast.z)/2e3;       
                  // apply pitch spring constant
                  playerPitchSpringVelocity -= playerPitchSpring * playerSpringConstant;            
                  // dampen pitch spring
                  playerPitchSpringVelocity *= pitchSpringDamping;                                  
                  // update pitch spring        
                  playerPitchSpring += playerPitchSpringVelocity;                                   
                  // match pitch to road
                  playerPitchRoad = Lerp(pitchLerp, playerPitchRoad, Lerp(airPercent,-roadPitch,0));
                  // update player pitch
                  const playerPitch = playerPitchSpring + playerPitchRoad;                          
                  
                  // crossed checkpoint
                  if (playerPos.z > nextCheckPoint) {
                      // add more time
                      time += checkPointTime;                
                      // set next checkpoint
                      nextCheckPoint += checkPointDistance;  
                      // shift hue
                      hueShift += 36;                        
                  }
                  
                  /////////////////////////////////////////////////////////////////////////////////////
                  // draw background - sky, sun/moon, mountains, and horizon
                  /////////////////////////////////////////////////////////////////////////////////////
                  
                  // multi use local variables
                  let x, y, w, i;

                  // set start seed
                  randomSeed = startRandomSeed;                                                                 
                  // update world angle
                  worldHeading = ClampAngle(worldHeading + playerVelocity.z * playerRoadX * worldRotateScale);  
                  
                  /////////////////////////////////////////////////////////////////////////////////////
                  // pre calculate projection scale, flip y because y+ is down on canvas
                  /////////////////////////////////////////////////////////////////////////////////////

                  // get projection scale
                  const projectScale = (new Vector3(1, -1, 1)).Multiply(c.width/2/cameraDepth);                 
                  // turn camera with player 
                  const cameraHeading = playerTurnAmount * cameraHeadingScale;                                  
                  // apply heading with offset
                  const cameraOffset = Math.sin(cameraHeading)/2;   

                  /////////////////////////////////////////////////////////////////////////////////////
                  // draw sky
                  /////////////////////////////////////////////////////////////////////////////////////

                  // brightness from sun
                  const lighting = Math.cos(worldHeading);                                    
                  // get horizon line
                  const horizon = c.height/2 - Math.tan(playerPitch) * projectScale.y;        
                  // linear gradient for sky
                  const g = context.createLinearGradient(0,horizon-c.height/2,0,horizon);   
                  // top sky color  
                  g.addColorStop(0,LSHA(39+lighting*25,49+lighting*19,230-lighting*19));      
                  // bottom sky color
                  g.addColorStop(1,LSHA(5,79,250-lighting*9));                                
                  // draw sky
                  DrawPoly(c.width/2, 0, c.width/2, c.width/2, c.height, c.width/2, g);       

                  /////////////////////////////////////////////////////////////////////////////////////
                  // draw sun and moon
                  /////////////////////////////////////////////////////////////////////////////////////

                  // 0 is sun, 1 is moon
                  for( i = 2; i--; ) {
                      // radial gradient for sun
                      const g = context.createRadialGradient(                                 
                          // angle 0 is center
                          x = c.width*(.5+Lerp(                                               
                              // sun angle percent 
                              (worldHeading/Math.PI/2+.5+i/2)%1,                              
                              // sun x pos, move far away for wrap
                              4, -4)-cameraOffset),                                           
                          // sun y pos
                          y = horizon - c.width/5,                                            
                          // sun size
                          c.width/25,                                                         
                          // sun end pos & size
                          x, y, i?c.width/23:c.width);                                        
                      // sun start color
                      g.addColorStop(0, LSHA(i?70:99));                                       
                      // sun end color
                      g.addColorStop(1, LSHA(0,0,0,0));                                       
                      // draw sun
                      DrawPoly(c.width/2, 0, c.width/2, c.width/2, c.height, c.width/2, g);   
                  }

                  /////////////////////////////////////////////////////////////////////////////////////
                  // draw mountains
                  /////////////////////////////////////////////////////////////////////////////////////
                  // draw every mountain
                  for( i = mountainCount; i--; ) {
                      // mountain random angle
                      const angle = ClampAngle(worldHeading+Random(19));                      
                      // mountain lighting
                      const lighting = Math.cos(angle-worldHeading);                          
                      DrawPoly(
                          // mountain x pos, move far away for wrap
                          x = c.width*(.5+Lerp(angle/Math.PI/2+.5, 4, -4)-cameraOffset),      
                          // mountain base
                          y = horizon,                                                        
                          // mountain width
                          w = Random(.2,.8)**2*c.width/2,                                     
                          // random tip skew
                          x+w*Random(-.5,.5),                                                 
                          // mountain height
                          y - Random(.5,.8)*w, 0,                                             
                          
                          LSHA(Random(15,25)+i/3-lighting*9,i/2+Random(19),Random(220,230))); 
                  }
                  
                  /////////////////////////////////////////////////////////////////////////////////////
                  // draw horizon
                  /////////////////////////////////////////////////////////////////////////////////////

                  // horizon pos & size
                  DrawPoly(c.width/2, horizon, c.width/2, c.width/2, c.height, c.width/2, LSHA(25, 30, 95));                                                      
                  
                  /////////////////////////////////////////////////////////////////////////////////////
                  // draw road and objects
                  /////////////////////////////////////////////////////////////////////////////////////
                  
                  // calculate road x offsets and projections
                  for( x = w = i = 0; i < drawDistance+1; ) {
                      /////////////////////////////////////////////////////////////////////////////////////
                      // create road world position
                      /////////////////////////////////////////////////////////////////////////////////////

                      // set road position
                      let p = new Vector3(                                                     
                          // sum local road offsets
                          x += w += road[playerRoadSegment+i].x,                               
                          // road y and z pos
                          road[playerRoadSegment+i].y, (playerRoadSegment+i)*roadSegmentLength)
                              // subtract to get local space
                              .Add(playerPos.Multiply(-1));                                    
                      // rotate camera heading
                      p.x = p.x*Math.cos(cameraHeading) - p.z*Math.sin(cameraHeading); 
                      
                      /////////////////////////////////////////////////////////////////////////////////////
                      // tilt camera pitch
                      /////////////////////////////////////////////////////////////////////////////////////

                      // invert z for projection
                      const z = 1 / (p.z*Math.cos(playerPitch) - p.y*Math.sin(playerPitch)); 
                      p.y = p.y*Math.cos(playerPitch) - p.z*Math.sin(playerPitch);
                      p.z = z;
                      
                      /////////////////////////////////////////////////////////////////////////////////////
                      // project road segment to canvas space
                      /////////////////////////////////////////////////////////////////////////////////////

                      // set projected road point
                      road[playerRoadSegment+i++].p =                 
                          // projection
                          p.Multiply(new Vector3(z, z, 1))            
                          // scale
                          .Multiply(projectScale)                     
                          // center on canvas
                          .Add(new Vector3(c.width/2,c.height/2))     
                  }
                  
                  /////////////////////////////////////////////////////////////////////////////////////
                  // draw the road segments
                  /////////////////////////////////////////////////////////////////////////////////////

                  // store the last segment
                  let segment2 = road[playerRoadSegment+drawDistance];                     
                  // iterate in reverse
                  for( i = drawDistance; i--; ) {
                      const segment1 = road[playerRoadSegment+i];                         
                      // random seed for this segment
                      randomSeed = startRandomSeed + playerRoadSegment + i;                
                      // calculate segment lighting
                      const lighting = Math.sin(segment1.a) * Math.cos(worldHeading)*99;   
                      // projected point
                      const p1 = segment1.p;                                               
                      // last projected point
                      const p2 = segment2.p;                                               
                      // check near and far clip
                      if (p1.z < 1e5 && p1.z > 0) {

                          /////////////////////////////////////////////////////////////////////////////////////
                          // draw road segment
                          /////////////////////////////////////////////////////////////////////////////////////

                          // fade in road resolution
                          if (i % (Lerp(i/drawDistance,1,9)|0) == 0) {
                              /////////////////////////////////////////////////////////////////////////////////////
                              // ground
                              /////////////////////////////////////////////////////////////////////////////////////

                              // ground top & bottom
                              DrawPoly(c.width/2, p1.y, c.width/2, c.width/2, p2.y, c.width/2,    
                                  // ground color
                                  LSHA(25+lighting, 30, 95));                                     

                              /////////////////////////////////////////////////////////////////////////////////////
                              // warning track
                              /////////////////////////////////////////////////////////////////////////////////////
                              // no warning track if thin
                              if (segment1.w > 400) {
                                  // warning track top
                                  DrawPoly(p1.x, p1.y, p1.z*(segment1.w+warningTrackWidth),       
                                      // warning track bottom
                                      p2.x, p2.y, p2.z*(segment2.w+warningTrackWidth),            
                                      // warning track stripe color
                                      LSHA(((playerRoadSegment+i)%19<9? 50: 20)+lighting));       
                              }     

                              /////////////////////////////////////////////////////////////////////////////////////                                          
                              // road
                              /////////////////////////////////////////////////////////////////////////////////////
                              
                              // segment distance
                              const z = (playerRoadSegment+i)*roadSegmentLength;                  
                              // road top
                              DrawPoly(p1.x, p1.y, p1.z*segment1.w,      
                                  // road bottom                         
                                  p2.x, p2.y, p2.z*segment2.w,        
                                  // road color and checkpoint                            
                                  LSHA((z%checkPointDistance < 300 ? 70 : 7)+lighting)); 
                                  
                              /////////////////////////////////////////////////////////////////////////////////////    
                              // dashed lines
                              /////////////////////////////////////////////////////////////////////////////////////
                              
                              // no dash lines if very thin
                              if (segment1.w > 300) {
                                  // make dashes and skip if far out
                                  (playerRoadSegment+i)%9==0 && i < drawDistance/3 &&             
                                      // dash lines top
                                      DrawPoly(p1.x, p1.y, p1.z*dashLineWidth,                    
                                      // dash lines bottom
                                      p2.x, p2.y, p2.z*dashLineWidth,                             
                                      // dash lines color
                                      LSHA(70+lighting));                                         
                              }                                                                   
                              // prep for next segment
                              segment2 = segment1;                                                
                          }

                          /////////////////////////////////////////////////////////////////////////////////////
                          // random object (tree or rock)
                          /////////////////////////////////////////////////////////////////////////////////////

                          // check for road object
                          if (Random()<.2 && playerRoadSegment+i>29) {
                              /////////////////////////////////////////////////////////////////////////////////////
                              // player object collision check
                              /////////////////////////////////////////////////////////////////////////////////////

                              // segment distance
                              const z = (playerRoadSegment+i)*roadSegmentLength;               
                              // object type & height
                              const height = (Random(2)|0) * 400;                              
                              // choose object pos
                              x = 2*roadWidth * Random(10,-10) * Random(9);                    
                              // prevent hitting the same object
                              if (!segment1.h                                                  
                                  // x collision
                                  && Math.abs(playerPos.x - x) < 200                           
                                  // z collision
                                  && Math.abs(playerPos.z - z) < 200                           
                                  // y collision + object height
                                  && playerPos.y-playerHeight < segment1.y+200+height) {
                                  // stop player and mark hit
                                  playerVelocity = playerVelocity.Multiply(segment1.h = playerCollisionSlow); 
                              }

                              /////////////////////////////////////////////////////////////////////////////////////
                              // draw road object
                              /////////////////////////////////////////////////////////////////////////////////////

                              // fade in object alpha
                              const alpha = Lerp(i/drawDistance, 4, 0);                        
                              if (height) { // tree  
                                  // trunk bottom
                                  DrawPoly(x = p1.x+p1.z * x, p1.y, p1.z*29,             
                                      // trunk top      
                                      x, p1.y-99*p1.z, p1.z*29,                
                                      // trunk color                
                                      LSHA(5+Random(9), 50+Random(9), 29+Random(9), alpha));  
                                  // leaves bottom 
                                  DrawPoly(x, p1.y-Random(50,99)*p1.z, p1.z*Random(199,250),  
                                      // leaves top 
                                      x, p1.y-Random(600,800)*p1.z, 0,                         
                                      // leaves color
                                      LSHA(25+Random(9), 80+Random(9), 9+Random(29), alpha));  
                              }
                              else { // rock
                                  // rock bottom
                                  DrawPoly(x = p1.x+p1.z * x, p1.y, p1.z*Random(200,250),                    
                                      // rock top
                                      x+p1.z*(Random(99,-99)), p1.y-Random(200,250)*p1.z, p1.z*Random(99),   
                                      // rock color
                                      LSHA(50+Random(19), 25+Random(19), 209+Random(9), alpha));             
                              }
                          }
                      }
                  }
                  
                  // DEBUG REMOVE FROM MINFIED
                  UpdateDebugPost(); 
                  
                  /////////////////////////////////////////////////////////////////////////////////////
                  // draw and update time
                  /////////////////////////////////////////////////////////////////////////////////////
                  
                  if (mouseWasPressed) {
                      // show and update time
                      DrawText(Math.ceil(time = Clamp(time - timeDelta, 0, maxTime)), 9); 
                      // set right alignment for distance
                      context.textAlign = 'right';                                        
                      // show distance
                      DrawText(0|playerPos.z/1e3, c.width-9);                             
                  }
                  else {
                      // set center alignment for title
                      context.textAlign = 'center';        
                      // draw title text
                      DrawText('vue jumper', c.width/2);   
                  }
                  // kick off next frame
                  requestAnimationFrame(Update);           
              }
                  
              /////////////////////////////////////////////////////////////////////////////////////
              // math and helper functions
              /////////////////////////////////////////////////////////////////////////////////////
                  
              const LSHA = (l, s=0, h=0, a=1) =>`hsl(${ h + hueShift },${ s }%,${ l }%,${ a })`;
              const Clamp = (v, min, max) => Math.min(Math.max(v, min), max);
              const ClampAngle = (a) => (a+Math.PI) % (2*Math.PI) + (a+Math.PI<0? Math.PI : -Math.PI);
              const Lerp = (p, a, b) => a + Clamp(p, 0, 1) * (b-a);
              const Random = (max=1, min=0) => Lerp((Math.sin(++randomSeed)+1)*1e5%1, min, max);
               
              /////////////////////////////////////////////////////////////////////////////////////
              // draw a trapazoid shaped poly
              /////////////////////////////////////////////////////////////////////////////////////
              function DrawPoly(x1, y1, w1, x2, y2, w2, fillStyle) {
                  context.beginPath(context.fillStyle = fillStyle);
                  context.lineTo(x1-w1, y1|0);
                  context.lineTo(x1+w1, y1|0);
                  context.lineTo(x2+w2, y2|0);
                  context.lineTo(x2-w2, y2|0);
                  context.fill();
              }

              /////////////////////////////////////////////////////////////////////////////////////
              // draw outlined hud text
              /////////////////////////////////////////////////////////////////////////////////////
              function DrawText(text, posX) {
                  // set font size
                  context.font = '9em impact';           
                  // set font 
                  context.fillStyle = LSHA(99,0,0,.5);   
                  // fill text
                  context.fillText(text, posX, 129);     
                  // line width
                  context.lineWidth = 3;                 
                  // outline text
                  context.strokeText(text, posX, 129);   
              }

              /////////////////////////////////////////////////////////////////////////////////////
              // mouse input
              /////////////////////////////////////////////////////////////////////////////////////

              let mouseDown       = 0; 
              let mouseWasPressed = 0;
              let mouseUpFrames   = 0;
              let mouseX          = 0;
              let mouseLockX      = 0;
              let touchMode       = 0;
                  
              onmouseup   = e => mouseDown = 0;
              onmousedown = e => {
                  if (mouseWasPressed){
                      mouseDown = 1;
                  }
                  mouseWasPressed = 1;
                  if (usePointerLock && e.button == 0 && document.pointerLockElement !== c) {
                      c.requestPointerLock = c.requestPointerLock || c.mozRequestPointerLock;
                      c.requestPointerLock();
                      mouseLockX = 0;
                  }
              }

              onmousemove = e => {
                  if (!usePointerLock) {
                      mouseX = e.x/window.innerWidth*2-1
                      return;
                  }
                  
                  if (document.pointerLockElement !== c){
                      return;
                  }
                  
                  // adjust for pointer lock 
                  mouseLockX += e.movementX;
                  mouseLockX = Clamp(mouseLockX, -window.innerWidth/2,  window.innerWidth/2);
                  
                  // apply curve to input
                  const inputCurve = 1.5;
                  mouseX = mouseLockX;
                  mouseX /= window.innerWidth/2;
                  mouseX = Math.sign(mouseX) * (1-(1-Math.abs(mouseX))**inputCurve);
                  mouseX *= window.innerWidth/2;
                  mouseX += window.innerWidth/2;
                  mouseX = mouseX/window.innerWidth*2-1
              }

              /////////////////////////////////////////////////////////////////////////////////////
              // touch control
              /////////////////////////////////////////////////////////////////////////////////////

              if (typeof ontouchend != 'undefined')
              {
                  let ProcessTouch = e =>
                  {
                      e.preventDefault();
                      mouseDown = !(e.touches.length > 0);
                      mouseWasPressed = 1;
                      touchMode = 1;
                      
                      if (mouseDown)
                          return;

                      // average all touch positions
                      let x = 0, y = 0;
                      for (let touch of e.touches)
                      {
                          x += touch.clientX;
                          y += touch.clientY;
                      }
                      mouseX = x/e.touches.length;
                      mouseX = mouseX/window.innerWidth*2-1
                  }

                  c.addEventListener('touchstart',  ProcessTouch, false);
                  c.addEventListener('touchmove',   ProcessTouch, false);
                  c.addEventListener('touchcancel', ProcessTouch, false);
                  c.addEventListener('touchend',    ProcessTouch, false);
              }
                  
              /////////////////////////////////////////////////////////////////////////////////////
              // debug stuff
              /////////////////////////////////////////////////////////////////////////////////////

              let debugPrintLines;
              let snapshot;
                  
              function UpdateDebugPre(){
                  debugPrintLines = [];
                  // R = restart
                  if (inputWasPushed[82]) {
                      mouseLockX = 0;
                      StartLevel(); 
                  }
                  // 1 = screenshot
                  if (inputWasPushed[49]) {
                      snapshot = 1;
                      
                      // use 1080p resolution
                      c.width = 1920;
                      c.height = 1080;
                  }
              }
                  
              function UpdateDebugPost(){
                  if (snapshot){
                      SaveSnapshot();
                      snapshot = 0;
                  }
                  
                  UpdateInput();
                  
                  if (!debug){
                      return;
                  }
                  
                  UpdateFps();
                  
                  context.font='2em"';
                  for (let i in debugPrintLines) {
                      let line = debugPrintLines[i];
                      context.fillStyle = line.color;
                      context.fillText(line.text,c.width/2,35+35*i);
                  }
              }
                  
              function DebugPrint(text, color='#F00') {
                  if (!debug){
                      return;
                  }
                  
                  if (typeof text == 'object'){
                      text += JSON.stringify(text);
                  }
                  
                  let line = {text:text, color:color};
                  debugPrintLines.push(line);
              }
                  
              function SaveSnapshot() {   
                  downloadLink.download="snapshot.png";
                  downloadLink.href=c.toDataURL("image/jpg").replace("image/jpg", "image/octet-stream");
                  downloadLink.click();
              }

              /////////////////////////////////////////////////////////////////////////////////////
              // frame rate counter
              /////////////////////////////////////////////////////////////////////////////////////
                  
              let lastFpsMS = 0;
              let averageFps = 0;
              function UpdateFps() {
                  let ms = performance.now();
                  let deltaMS = ms - lastFpsMS;
                  lastFpsMS = ms;
                  
                  let fps = 1/(deltaMS/1e3);
                  averageFps = averageFps*.9 + fps*.1;
                  context.font='3em"';
                  context.fillStyle='#0007';
                  context.fillText(averageFps|0,c.width-90,c.height-40);
              }

              /////////////////////////////////////////////////////////////////////////////////////
              // keyboard control
              /////////////////////////////////////////////////////////////////////////////////////

              let inputIsDown = [];
              let inputWasDown = [];
              let inputWasPushed = [];
              onkeydown = e => inputIsDown[e.keyCode] = 1;
              onkeyup   = e => inputIsDown[e.keyCode] = 0;
              function UpdateInput() {
                  inputWasPushed = inputIsDown.map((e,i) => e && !inputWasDown[i]);
                  inputWasDown = inputIsDown.slice();
              }
                  
              /////////////////////////////////////////////////////////////////////////////////////
              // init hue jumper
              /////////////////////////////////////////////////////////////////////////////////////
                
              // startup and kick off update loop
              StartLevel();
              Update();
                  
            })
        }
        onMounted(() => {
           oninitCanvas()
        })
</script>

<template>
  <canvas id="canvas" class=".canvas"></canvas>
</template>

<style>
.canvas{
  touch-action:none;
  position:absolute;
  
  left:0px;
  top:0px;
  width:100%;
  height:100%
}
</style>
