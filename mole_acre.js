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

        //dipslay a score of 0 at the start of the game
        this.score=0;
        this.setScore();
        this.displayHighscore();

        //listen for event called when mole is hit
        this.el.addEventListener("addScore",()=>{
        this.score+=1;
        this.setScore()
      })

      //listen to when the controlbutton is clicked i.e to play or replay the game
    this.el.addEventListener('click',()=>{
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
                this.cursor.setAttribute("cursor", "fuse", "false");
                clearInterval(this.timer);
            }
        }, 1000)
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
        console.log("Allow Restart")
        this.setHighscore();
        this.displayHighscore();
        this.duration=this.durations[this.data.gameDuration];
        this.el.setAttribute("mixin","control-allowRestart-animation"); //initialse the control entity's animation back to it initial position
        this.el.addEventListener("animationcomplete",(e)=>{ //listen for when thee control entity has been animated back to it initial position
            if(e.detail.name=="animation__restart"){
                console.log("Restart animation is complete")
                this.el.classList.add("clickable");      
                this.controlInstructions.setAttribute("text","value", "Hit to Replay");
                this.cursor.setAttribute("cursor", "fuse",  "true");
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
      this.hitRotation = PI/12;
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

      //listen for when mole is poped
      el.addEventListener('visible', (e)=>{
        el.setAttribute("mixin", "mole mole-animation")
        el.classList.add("clickable");
        el.object3D.rotation.x = 0;
      });

      //listen for when mole completes its pop up animation
      el.addEventListener('animationcomplete', (e)=>{
        el.setAttribute("mixin", "mole")
        e.target.classList.remove("clickable")
        document.getElementById('stage').emit('setAsWhackable', {'entity':e.target})
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