AFRAME.registerComponent('control', {
    schema: {
        gameDuration:{type: 'string', default: "short"},
        popMultiple:{type: 'boolean', default:false}
    },

    init: function(){
        this.durations= {"short": 30, "long": 45}
        this.duration = this.durations[this.data.gameDuration]
        this.scoreText = document.getElementById("control-score");
        this.stage = document.getElementById("stage");
        this.controlInstructions = document.getElementById("control-instruction");
        this.cursor = document.getElementById("cursor-entity");
        this.highscoreText = document.getElementById("highscore-text");
        this.collidable= true;

        //dipslay a score of 0 at the start of the game
        this.score=0;
        this.setScore();
        this.displayHighscore();

        this.event = undefined;
        this.cursor = undefined;

        if(AFRAME.utils.device.checkHeadsetConnected () && !AFRAME.utils.device.isGearVR () && !AFRAME.utils.device.isOculusGo () && !AFRAME.utils.device.isMobile ()){
          this.event="collidestart"
          document.getElementById("right-hammer").emit("enable");
          document.getElementById("left-hammer").emit("enable");
        }
        else{
          this.event="click"
          this.cursor = document.createElement("a-entity");
          this.cursor.setAttribute("position","0 0 -1")
          this.cursor.setAttribute("hammer-logic","")
          this.cursor.setAttribute("id","cursor-entity")
          this.cursor.setAttribute("cursor","fuse: true; fuseTimeout: 500")
          this.cursor.setAttribute("animation__click","property: rotation; startEvents: click; easing: easeInCubic; dur: 250; from: -45 0 0; to: 0 0 0")
          this.cursor.setAttribute("animation__fusing","property: scale; startEvents: fusing; easing: easeInCubic; dur: 500; from: 0.1 0.1 0.1; to:0.15 0.15 0.15")
          this.cursor.setAttribute("animation__mouseleave","property: scale; startEvents: mouseleave; easing: easeInCubic; dur: 250; to: 0.1 0.1 0.1")
          this.cursor.setAttribute("geometry","primitive: ring; radiusInner: 0.02; radiusOuter: 0.03")
          this.cursor.setAttribute("material","color: black; shader: flat")
          this.cursor.setAttribute("scale","0.1 0.1 0.1")
          this.cursor.setAttribute("mixin","hammer")
          this.cursor.setAttribute("raycaster","objects: .clickable")
          this.cursor.setAttribute("sound","src: #hit-sound; on: click")
          document.getElementById("camera").appendChild(this.cursor)
        }


        //listen for event called when mole is hit
        this.el.addEventListener("addScore",()=>{
        this.score+=1;
        this.setScore()
      })

      //listen to when the control button is clicked or collided with i.e to play or replay the game
      this.el.addEventListener(this.event,()=>{
        if(this.event=="click" || this.collidable){
          console.log("inside")
        this.el.classList.remove("clickable");
        this.score=0;
        this.setScore();
        this.stage.emit("start", {'multiple':this.data.popMultiple});
        this.el.setAttribute("mixin","control-countdown-animation");
        this.controlInstructions.setAttribute("text","value", `Time: ${this.duration}`);

        //set the timer for the game and keep updating the timer text every second
        this.timer = setInterval(()=>{
            this.duration-=1;
            this.controlInstructions.setAttribute("text","value", `Time: ${this.duration}`);
            if(this.duration<=0){
                this.stage.emit("timeup");
                setTimeout(()=>this.allowRestart(this.el), 3500);
                if(this.event=="click"){
                  this.cursor.setAttribute("cursor", "fuse", "false");
                }
                clearInterval(this.timer);
            }
        }, 1000)
      }
      });
    },

    //display highscore on billboard
    displayHighscore: function(){
        this.highscoreText.setAttribute("text", "value", `Highscore: ${this.getHighscore()}`);
    },

    //return highscore from local storage or 0 if non is stored
    getHighscore: function(){
        const highscore = localStorage.getItem('moleacre');
        if (highscore==null) return 0;
        else return parseInt(highscore);
    },

    //store score in local storage if it is greater than highscore
    setHighscore: function(){
        const highscore = this.getHighscore();
        if(this.score>highscore){
            localStorage.setItem("moleacre", this.score);
        }
    },
    
    //display current score on the control button
    setScore: function(){
      this.scoreText.setAttribute("text","value", `Hits: ${this.score}`);
    },

    //reset timer and control
    allowRestart: function() {
        this.setHighscore();
        this.displayHighscore();
        this.duration=this.durations[this.data.gameDuration];
        this.el.setAttribute("mixin","control-allowRestart-animation"); //initialse the control entity's animation back to it initial position
        this.el.addEventListener("animationcomplete",(e)=>{ //listen for when thee control entity has been animated back to it initial position
          if(e.detail.name=="animation__restart"){
            this.el.classList.add("clickable");      
            this.controlInstructions.setAttribute("text","value", "Hit to Replay");
            if(this.event=="click"){
              this.cursor.setAttribute("cursor", "fuse", "true");
            }
            else{
              this.collidable = true
            }
        }
        });
    }
  });


  AFRAME.registerComponent('mole-acre', {
    schema: {
      difficulty: {type:'int', default: 1}
    },

    init: function () {
      this.whackableMoles = []
      this.timeup = false;
      this.setupGameArea();
      this.whackableMoles = Array.from(document.querySelectorAll('.mole'));

      //listen for when controls tie=mer runs out, i.e when the gane is over
      this.el.addEventListener("timeup", ()=>{
        this.timeup = true;
      });

      //listen for when the game should start, then expand the holes and pop up a random mole
      this.el.addEventListener("start", (e)=>{
        this.timeup=false;
        this.setHoleAnimation("hole-start-animation");
        this.popRandomMole();
        if(e.detail.multiple==true){
            setTimeout(()=>this.popRandomMole(), 750)
        }
      })

      //listen for when a mole returns from the surface, put it back in que to be oped again and pop up another random mole
      this.el.addEventListener('setAsWhackable', (e)=>{
        this.whackableMoles.push(e.detail.entity);
        if(!this.timeup){
          this.popRandomMole();
        }
        else{
          this.setHoleAnimation("hole-end-animation");
        }
      });   
    },

    //set the appropriate animation for the holes
    setHoleAnimation: function(animationName){
      Array.from(document.querySelectorAll('.hole')).forEach(element => {
        element.setAttribute("mixin", animationName);
      });
    },

    //get a random mole from the array of moles and emit an event for it to be popped
    popRandomMole: function(){
      this.whackableMoles = shuffle(this.whackableMoles);
      const mole = this.whackableMoles.pop();
      mole.emit('visible');
    },

    //create and position holes and moles
    setupGameArea: function(){
      const SIZE = 3;
      const CENTER = 6
      let i_ = -1;
      let counter = 1;
      for(let i = 1; i <=SIZE; i++){
        let j_ = -1;
        for(let j = 1; j <=SIZE; j++){
          counter+=1;
          if(counter!=CENTER){
            const hole = document.createElement('a-cylinder');
            hole.object3D.position.x = 1 * j_;
            hole.object3D.position.z = 1 * i_;
            hole.setAttribute('radius', '0.15');
            hole.setAttribute('height', '0.01');
            hole.setAttribute('material', 'color:#b2865d; shader:flat');
            hole.className="hole"
       
            const mole =  document.createElement('a-entity');
            mole.setAttribute('id', counter)
            mole.setAttribute('mixin', 'mole');
            mole.object3D.position.y = -0.34
            mole.setAttribute('mole-logic', '')
            mole.className="mole"
            hole.appendChild(mole)
            this.el.appendChild(hole)
          }  
          j_+=1 
        }
        i_+=1
      }
    }
  });  

  AFRAME.registerComponent('mole-logic', {
    init: function () {
      const PI = 3.14;
      this.hitRotation = -PI/6;
      let el = this.el
      this.hit = false;

      //listedn for when a mole is hit
      el.addEventListener('click',  (e)=> {
        document.getElementById("control-entity").emit("addScore")
        el.setAttribute("mixin", "mole mole-animation")
        el.object3D.rotation.x = this.hitRotation;
        el.classList.remove("clickable")
        this.hit=true;
      });

      //listen for when mole is hit by hammer
      el.addEventListener('collidestart',  (e)=> {
        if(this.collidable){
          document.getElementById("control-entity").emit("addScore")
          el.setAttribute("mixin", "mole mole-animation")
          this.el.setAttribute("ammo-body", "collisionFilterGroup: 30; collisionFilterMask: 20")//do not detect collision with hammer
          el.object3D.rotation.x = this.hitRotation;
          this.hit=true;
          this.collidable=false;
        }
      });

      //listen for when mole is poped
      el.addEventListener('visible', (e)=>{
        el.setAttribute("mixin", "mole mole-animation")
        el.classList.add("clickable");
        el.object3D.rotation.x = 0;
        this.collidable = true;
        this.el.setAttribute("ammo-body", "collisionFilterGroup: 1; collisionFilterMask: 5") //detect collision with hammer
      });

      //listen for when mole completes its pop up animation
      el.addEventListener('animationcomplete', (e)=>{
        el.setAttribute("mixin", "mole")
        e.target.classList.remove("clickable")
        this.collidable=false;
        document.getElementById('stage').emit('setAsWhackable', {'entity':e.target})
        this.el.setAttribute("ammo-body", "collisionFilterGroup: 30; collisionFilterMask: 20")
      })
    }
  })

  //array shuffle from https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
  function shuffle(array) {
    let currentIndex = array.length,  randomIndex;
    // While there remain elements to shuffle...
    while (currentIndex != 0) {
      // Pick a remaining element...
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;
      // And swap it with the current element.
      [array[currentIndex], array[randomIndex]] = [
        array[randomIndex], array[currentIndex]];
    }
    return array;
  }

  AFRAME.registerComponent('controller-hammer', {
    schema: { 
      flyingHammerID:{type:"string", default:""},
      topRibbonID:{type:"string", default:""},
      bottomRibbonID:{type:"string", default:""}
    },
    init() {
      //if the control component detects controllers
      this.el.addEventListener("enable", ()=>{

        //get the flying hammer for this controller and its handle ribbons
        this.flyingHammer = document.getElementById(this.data.flyingHammerID);
        this.topRibbon = document.getElementById(this.data.topRibbonID)
        this.bottomRibbon = document.getElementById(this.data.bottomRibbonID)
        this.el.parentElement.setAttribute("visible","true")
        //counter for recalling hammer animations
        this.animationCounter=0;
        
        this.states={'INHAND':'inhand', 'SHOT':'shot','RECALLED': 'recalled'}
        this.hammerState=this.states.INHAND

        //if the flying hammer is back in the players hand
        this.el.addEventListener("hammerBack", ()=>{
          this.el.emit("playHammerSound")
          this.hammerState=this.states.INHAND
          this.el.setAttribute("visible", "true")
          this.el.setAttribute("ammo-body", "collisionFilterGroup: 4; collisionFilterMask: 7") //allow collisions with inhand hammer
          this.topRibbon.setAttribute("mixin","hammer-ribbon") //stop ribbon animation
          this.topRibbon.setAttribute("position", "0 -0.02 0")
        })

        //change ribbon animation if the flying hammer collides with an object and is reversed
        this.flyingHammer.addEventListener("collidestart",(e)=>{
          this.bottomRibbon.setAttribute("mixin","hammer-ribbon")
          this.bottomRibbon.setAttribute("position", "0 -0.14 0")
          this.topRibbon.setAttribute("mixin","hammer-ribbon ribbon-recall-animation")
        })

        //if the controller trigger is pressed
        document.addEventListener("triggerdown", (e)=>{
          if(e.srcElement==this.el.parentElement){
          {
            if(this.hammerState==this.states.SHOT){
              this.flyingHammer.emit("recall")
              this.hammerState=this.states.RECALLED
              this.topRibbon.setAttribute("mixin","hammer-ribbon ribbon-recall-animation")
              this.bottomRibbon.setAttribute("mixin","hammer-ribbon")
              this.bottomRibbon.setAttribute("position", "0 -0.14 0")
            }
            else if(this.hammerState==this.states.INHAND){ //if the hammer is inhand create a flying hammer and hide controller hammer
              let lastPosition=new THREE.Vector3( )
              this.el.object3D.getWorldPosition(lastPosition);
              const lastRotation = new THREE.Quaternion();
              this.el.object3D.getWorldQuaternion(lastRotation);
              this.el.setAttribute("visible", "false")
              this.flyingHammer.setAttribute("position", ""+lastPosition.x+" "+lastPosition.y + " "+lastPosition.z)
              this.flyingHammer.object3D.applyQuaternion(lastRotation)
              this.flyingHammer.emit("shoot")
              this.hammerState=this.states.SHOT
              this.el.setAttribute("ammo-body", "collisionFilterGroup: 10; collisionFilterMask: 10")
              this.bottomRibbon.setAttribute("mixin","hammer-ribbon ribbon-shot-animation")
              this.el.emit("playHammerSound")
            }
          }
        }
      })
    })},
  });

  AFRAME.registerComponent('flying-hammer', {
    schema: { 
      controlHammerID:{type:"string", default:""}
    },

    init() {
      this.animationCounter=0;
      this.origin=document.getElementById(this.data.controlHammerID)
      this.speed=-0.015;
      this.forward = true;

      //when the flying hammer collides with an object, reverse it
      this.el.addEventListener("collidestart",(e)=>{
        let origin = this.createPositionData()
        this.recallHammer(origin[0])
        this.forward=false;
        this.el.emit("recallHammer")
      })

      this.el.addEventListener("shoot",()=>{
        this.el.setAttribute("visible", "true")
        this.el.setAttribute("ammo-body", "collisionFilterGroup: 4; collisionFilterMask: 7")
        this.forward=true;
        this.el.setAttribute("ammo-body", "emitCollisionEvents", "true")
        this.animationCounter =0;
      })

      this.el.addEventListener("recall", ()=>{
        this.forward=false
        this.el.setAttribute("ammo-body", "emitCollisionEvents", "false")
        let origin = this.createPositionData()
        this.recallHammer(origin[0])
      })
    },

    //retun the position vector and string of the controller hammer
    createPositionData(){
      let lastPosition=new THREE.Vector3( )
      this.origin.object3D.getWorldPosition(lastPosition);
      pos = ""+lastPosition.x +" "+lastPosition.y+" "+lastPosition.z
      return [pos, lastPosition]
    },

    calcDistance(){ //between controller hammer and flying hammer
      let origin = this.createPositionData()
      let x = this.el.object3D.position.x - origin[1].x;
      let y = this.el.object3D.position.y - origin[1].y;
      let z = this.el.object3D.position.z - origin[1].z;
      return Math.sqrt(x*x + y*y + z*z);
    },

    setRecallAnimation(pos){
      let durPerRation = 200;
      let distance = this.calcDistance()
      let ratio = distance/4;
      let dur = ratio * durPerRation;
      this.el.setAttribute('animation__recall'+this.animationCounter,`property:position; to:${pos}; dur: ${dur};`);
    },

    //recall flying hammer to controller hammer location (recursively if controller hammer moves before the recall animation ends)
    recallHammer(pos){
      this.setRecallAnimation(pos)
      this.el.addEventListener('animationcomplete', (e)=>{
        if(e.detail.name=='animation__recall'+this.animationCounter){
          this.el.removeAttribute("animation__recall"+this.animationCounter)
          let distance = this.calcDistance();
          if(distance<0.1)
          {
            this.animationCounter=0;
            this.forward=false
            this.origin.emit("hammerBack");
            this.el.setAttribute("ammo-body", "collisionFilterGroup: 10; collisionFilterMask: 10")
            this.el.setAttribute("visible","false")
            this.el.setAttribute("rotation","0 0 0")
          }
          else {
            this.animationCounter+=1;
            let origin = this.createPositionData()
            this.recallHammer(origin[0])
          }
        }
      })
    },
    tick(t, dt){
      if(this.forward==true){
        this.el.object3D.translateZ(this.speed*dt)
      }
    }
  })