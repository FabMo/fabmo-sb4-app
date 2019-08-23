/*
* jog_dial.js
* modified from JogDial.js - v 1.0
* Copyright (c) 2014 Sean Oh (ohsiwon@gmail.com)
* Licensed under the MIT license
*/

(function (window, undefined) {
  'use strict';

  var bar = document.getElementById('jog_dial_one_meter_inner');

  /*
  * Constructor
  * JogDial
  * @param  {HTMLElement}    element
  * @param  {Object}         options
  * return  {JogDial.Instance}
  * TWO USES OF "wheel" HERE are vey CONFUSING; mousewheel vs the jogDialwheel
  */
  var JogDial = function (element, options) {
    return new JogDial.Instance(element, options || {});
  };

  /*
  * Set constant values and functions
  */
 
  function setConstants() {
    if (JogDial.Ready) {
      return;
    }

    // Constants
    JogDial.Doc   = window.document;
    JogDial.ToRad   = Math.PI / 180;
    JogDial.ToDeg   = 180 / Math.PI;

    // Detect mouse event type
    JogDial.ModernEvent   = (JogDial.Doc.addEventListener) ? true : false;
    JogDial.MobileRegEx   = '/Mobile|iP(hone|od|ad)|Android|BlackBerry|IEMobile|Kindle|NetFront|Silk-Accelerated|(hpw|web)OS|Fennec|Minimo|Opera M(obi|ini)|Blazer|Dolfin|Dolphin|Skyfire|Zune/';
    JogDial.MobileEvent   = ('ontouchstart' in window) && window.navigator.userAgent.match(JogDial.MobileRegEx);
    JogDial.PointerEvent  = (window.navigator.pointerEnabled || window.navigator.msPointerEnabled) ? true : false;

    // Predefined options
    JogDial.Defaults = {
      debug : false,
      touchMode : 'knob',  // knob | wheel  // $$means must engage knob
      knobSize : '30%',                     // $$how big know is relative to ... wheel ???
      wheelSize : '500%',                   // ?? size of wheel relative too ??? ##Set large to be forgiving
      zIndex : 9999,                        // ?? for ??
      degreeStartAt : 0,
      minDegree : null,  // (null) infinity
      maxDegree : null   // (null) infinity
    };

    // Predefined rotation info
    JogDial.DegInfo = {
      rotation: 0,
      quadrant: 1
    };

    // Predefined DOM events
    JogDial.DomEvent = {
      MOUSE_DOWN: 'mousedown',
      MOUSE_MOVE: 'mousemove',
      MOUSE_OUT: 'mouseout',
      MOUSE_UP: 'mouseup',

     KEY_DOWN: 'keydown',
     KEY_UP: 'keyup',
     WHEEL: 'wheel'
    };

    // Predefined custom events
    JogDial.CustomEvent = {
      MOUSE_DOWN: 'mousedown',
      MOUSE_MOVE: 'mousemove wheel',
      MOUSE_UP: 'mouseup',

     KEY_DOWN: 'keydown',
     KEY_UP: 'keyup',
    };

    // Utilities
    JogDial.utils  = {
      extend : function (target, src) {    // ?? .. ok so what is happening here
        for (var key in src) {
          target[key] = src[key];
        }
        return target;
      },

      //Return css styling
      getComputedStyle: function (el, prop) {
        if (window.getComputedStyle) { // W3C Standard
          return window.getComputedStyle(el).getPropertyValue(prop);
        }
        else if (el.currentStyle) { // IE7 and 8
          return el.currentStyle[prop];
        }
      },

      //Calculating x and y coordinates                 // ?? SEEMS where action is; triggered by PRESS (403) or DRAG (429)
                                                        //    .already only dragged or triggered if in AREA
      getCoordinates: function (e) {
        e = e || window.event;
        var target = e.target || e.srcElement,
          rect   = target.getBoundingClientRect(),
          _x   = ((JogDial.MobileEvent) ? e.targetTouches[0].clientX : e.clientX) - rect.left,
          _y   = ((JogDial.MobileEvent) ? e.targetTouches[0].clientY : e.clientY) - rect.top;
//console.log(target, e);
//console.log("rect - ", rect.left, rect.top, e.clientX); 
//console.log("calcCoord.util: ", _x, _y);                
        return {x:_x,y:_y};
      },

      // Return the current quadrant.
      // Note: JogDial's Cartesian plane is flipped, hence it's returning reversed value.
      getQuadrant: function(x, y){
        if (x>0 && y>0) return 4;
        else if (x<0 && y>0) return 3;
        else if (x<0 && y<0) return 2;
        else if (x>=0 && y<0) return 1;
      },

      // Return the sum of rotation value
      getRotation: function(self, quadrant, newDegree){
        var rotation, delta = 0, info = self.info;
          if(quadrant == 1 && info.old.quadrant == 2){ //From 360 to 0
            delta = 360;
          }
          else if(quadrant == 2 && info.old.quadrant == 1){ //From 0 to 360
            delta = -360;
          }
        rotation = newDegree + delta - info.old.rotation + info.now.rotation;
        info.old.rotation = newDegree; // return 0 ~ 360
        info.old.quadrant = quadrant; // return 1 ~ 4
//console.log("calcRot.util: ", rotation);
        return rotation;
      },

      //Checking collision  //@th initial state check for in knob, but does not include outside wheel ##need to listen for any
                                                          // ## Returns true (on knob) or false if in box; but outside excluded!
      checkBoxCollision: function (bound ,point) {
//console.log("ckCollision: ",bound ,point)
//console.log(bound.x1 < point.x
//   && bound.x2 > point.x
//   && bound.y1 < point.y
//   && bound.y2 > point.y)
        return bound.x1 < point.x
        && bound.x2 > point.x
        && bound.y1 < point.y
        && bound.y2 > point.y;
      },

      // AddEvent, cross-browser support (IE7+)
      addEvent: function (el, type, handler, capture) {
        type = type.split(' ');
//console.log('adding event listener: ', el,type, handler, capture);
        for(var i=0; i < type.length; i++) {
          if (el.addEventListener) {
            el.addEventListener(type[i], handler, capture);
          }
          else if (el.attachEvent) {
            el.attachEvent('on'+type[i], handler);
          }
        }
      },

      removeEvent: function (el, type, handler) {       // RemoveEvent, cross-browser support (IE7+)
        type = type.split(' ');
        for(var i=0; i < type.length; i++) {
          if (el.addEventListener) {
            el.removeEventListener(type[i], handler);
          }
          else if (el.detachEvent) {
            el.detachEvent('on'+type[i], handler);
          }
        }
      },
                                                        //@th ##SET MAIN EVENT???
      triggerEvent: function(el, type){                 // TriggerEvent, cross-browser support (IE7+) 
        var evt;
        if (JogDial.Doc.createEvent) { // W3C Standard
          evt = JogDial.Doc.createEvent("HTMLEvents");
//console.log(el)
//console.log(type)
//console.log(evt)
          evt.initEvent(type, true, true);
          el.dispatchEvent(evt);
        }
        else { // IE7 and 8
          evt = JogDial.Doc.createEventObject();
          evt.target = {};
          JogDial.utils.extend(evt.target, el);
          el.fireEvent('on' + type, evt);
        }
      },

      convertClockToUnit: function (n) {
        return n%360-90;
      },

      convertUnitToClock: function (n) {
        return (n >= -180 && n < -90 ) ? 450+n : 90+n;
      }
    };

    JogDial.Ready = true;
  };

  /*
  * Constructor
  * JogDial.Instance
  * @param  {HTMLElement}    element
  * @param  {Object}         options
  * return  {JogDial.Instance}
  */
  JogDial.Instance = function (el ,opt) {
    // Prevent duplication
    if (el.getAttribute('_jogDial_')) {
      window.alert('Please Check your code:\njogDial can not be initialized twice in a same element.');
      return false;
    }

    // Set global contant values and functions
    setConstants();

    // Set this instance
    setInstance(this, el, opt);

    // Set stage
    setStage(this);

    // Set events
    setEvents(this);

    // Set angle
    angleTo(this, JogDial.utils.convertClockToUnit(this.opt.degreeStartAt));

    return this;
  };

  /*
  * Prototype inheritance
  */
  JogDial.Instance.prototype = {
    on: function onEvent(type, listener) {
      JogDial.utils.addEvent(this.knob, type, listener, false);
      return this;
    },
    off: function onEvent(type, listener) {
      JogDial.utils.removeEvent(this.knob, type, listener);
      return this;
    },
    trigger: function triggerEvent(type, data) {
      switch (type){
        case 'angle':
          angleTo(this, JogDial.utils.convertClockToUnit(data), data);
          break;
        default:
          window.alert('Please Check your code:\njogDial does not have triggering event [' + type + ']');
          break;
      }
      return this;
    },
    angle: function angle(data) {
      var deg = (data > this.opt.maxDegree) ? this.opt.maxDegree : data;
      angleTo(this, JogDial.utils.convertClockToUnit(deg), deg);
    }
  };

  function setInstance(self, el, opt){
    self.base = el;
    self.base.setAttribute('_JogDial_', true);
    self.opt = JogDial.utils.extend(JogDial.utils.extend({}, JogDial.Defaults), opt);
    self.info = {} || self;
    self.info.now = JogDial.utils.extend({},JogDial.DegInfo);
    self.info.old = JogDial.utils.extend({},JogDial.DegInfo);
    self.info.snapshot = JogDial.utils.extend({},self.info);
    self.info.snapshot.direction = null;
  };

  function setStage(self) {
    /*
    * Create new elements
    * {HTMLElement}  JogDial.Instance.knob
    * {HTMLElement}  JogDial.Instance.wheel
    */
    var item   = {},
    BId      = self.base.getAttribute("id"),
    BW       = self.base.clientWidth,
    BH       = self.base.clientHeight,
    opt     = self.opt,
//                     T = item.myframe = document.createElement('div'),   //##
    K       = item.knob = document.createElement('div'),
    W       = item.wheel = document.createElement('div'),
    KS       = K.style,
    WS       = W.style,
    KRad, WRad, WMargnLT, WMargnTP;

    //Set position property as relative if it's not predefined in Stylesheet
    if (JogDial.utils.getComputedStyle(self.base, 'position') === 'static') {
      self.base.style.position = 'relative';
    }

    //Append to base and extend {object} item
    self.base.appendChild(K);
    self.base.appendChild(W);
    JogDial.utils.extend(self, item);

    //Set global position and size
    KS.position = WS.position = 'absolute';   
    KS.width = KS.height = opt.knobSize;
    WS.width = WS.height = opt.wheelSize;

    //Set radius value
    KRad = K.clientWidth/2;   //#### 2
    WRad = W.clientWidth/2;   //#### 2; does seem to control rotation radius, rel loc, w/o outer sense dim

    //Set knob properties
    K.setAttribute('id', BId + '_knob');
    KS.margin = -KRad + 'px 0 0 ' + -KRad + 'px';
    KS.zIndex = opt.zIndex;

    //Set wheel properties
    W.setAttribute('id', BId + '_wheel');
    WMargnLT = (BW-W.clientWidth)/2;
    WMargnTP = (BH-W.clientHeight)/2;
    //WS.left = WS.top = 0;
    //WS.margin = WMargnTP + 'px 0 0 ' + WMargnLT + 'px';
    WS.left = '-400px';
    WS.top = '-400px';
    WS.zIndex = opt.zIndex;

    //set radius and center point value
//    self.radius = WRad - KRad;
//    self.center = {x:WRad+WMargnLT, y:WRad+WMargnTP};
    self.radius = 100;                         //##
    self.center = {x:65, y:65};                //## ... hard-coded fussing to get this located, probably a better way
                                               //##Just over-ride these to set a forgiving sense area
//console.log("radius- (w/center) " + self.radius)
//console.log(self.center)
//console.log("WRad- " + WRad)
//console.log("KRad- " + KRad)
//console.log("Wmargns- " + WMargnLT + WMargnTP)

  };

  function setEvents(self) {
    /*
    * Set events to control elements
    * {HTMLElement}  JogDial.Instance.knob
    * {HTMLElement}  JogDial.Instance.wheel
    */
    //Detect event support type and override values
      if (JogDial.PointerEvent) { // Windows 8 touchscreen
        JogDial.utils.extend(JogDial.DomEvent,{
          MOUSE_DOWN: 'pointerdown MSPointerDown',
          MOUSE_MOVE: 'pointermove MSPointerMove',
          MOUSE_OUT: 'pointerout MSPointerOut',
          MOUSE_UP: 'pointerup pointercancel MSPointerUp MSPointerCancel'
        });
      }
      else if (JogDial.MobileEvent) { // Mobile standard
        JogDial.utils.extend(JogDial.DomEvent,{
          MOUSE_DOWN: 'touchstart',
          MOUSE_MOVE: 'touchmove',
          MOUSE_OUT: 'touchleave',
          MOUSE_UP: 'touchend'
        });
      }

    var opt = self.opt,
    info = self.info,
    //                T = self.myframe,  //##
    K = self.knob,
    W = self.wheel;
    self.pressed = false;

    // Add Defined DOM events from above
    JogDial.utils.addEvent(W, JogDial.DomEvent.MOUSE_DOWN, mouseDownEvent, false);
    JogDial.utils.addEvent(W, JogDial.DomEvent.MOUSE_MOVE, mouseDragEvent, false);
    JogDial.utils.addEvent(W, JogDial.DomEvent.MOUSE_UP, mouseUpEvent, false);
    JogDial.utils.addEvent(W, JogDial.DomEvent.MOUSE_OUT, mouseUpEvent, false);

    JogDial.utils.addEvent(document, JogDial.DomEvent.KEY_DOWN, keyDownEvent);
    //JogDial.utils.addEvent(document, JogDial.DomEvent.KEY_UP, keyUpEvent);
    JogDial.utils.addEvent(document, JogDial.DomEvent.WHEEL, wheelEvent);

  
    function mouseDownEvent(e) {                    // mouseDownEvent (MOUSE_DOWN)
      switch (opt.touchMode) {
        case 'knob':
        default:
          self.pressed = JogDial.utils.checkBoxCollision({
            x1: K.offsetLeft - W.offsetLeft,
            y1: K.offsetTop - W.offsetTop,
            x2: K.offsetLeft - W.offsetLeft + K.clientWidth,
            y2: K.offsetTop - W.offsetTop + K.clientHeight
            }, JogDial.utils.getCoordinates(e));
          break;
        case 'wheel':
          self.pressed = true;
          mouseDragEvent(e);
          break;
      }
      //Trigger down event
      if(self.pressed) JogDial.utils.triggerEvent(self.knob, JogDial.CustomEvent.MOUSE_DOWN);
    };

    function keyDownEvent(e) {
      if (globals.JOg_pad_open) {
        let dist = 5;
        e.preventDefault();  //#the does work on preventing key entry
        if (e.repeat) {
          return;
        } else {
//console.log(e.keyCode)
          switch (e.keyCode) {
            case 37: // [left-arrow]
               injectMove(self, info, -1*dist);
              break;	
            case 38: // [up-arrow]
                // ... to be next axis up
              break;
            case 39: // [right-arrow]
                injectMove(self, info, dist);
              break;	
            case 40: // [down-arrow]
                // ... to be next axis down
                break;
            case 65:  //A
              break;
            case 81: //Q
             break;	
          };
        };	
      }
    };  
    // function keyUpEvent(e) { 
    //     switch (e.keyCode) {
    //       case 65:  //A
    //         console.log("off A");
    //        break;
    //       case 81: //Q
    //         console.log("off Q");
    //        break;	
    //     }
    // };

    function wheelEvent(e) {                                // MOUSE WHEEL SCROLLING
      if (globals.JOg_pad_open) {
//        e.preventDefault();       // #does not seem to actually prevent scroll event at this point
        let dist = 5;
        let move = 0;
//console.log("wheel",e)
        let delta = Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail)));
        //just template for using delta ...      myimage.style.width = Math.max(50, Math.min(800, myimage.width + (30 * delta))) + "px";
//console.log(delta)
          move = dist * delta;
          injectMove(self, info, move);
          // angleTo(self, JogDial.utils.convertClockToUnit(info.now.rotation + move));
          // info.now.rotation += move;
      }  
    };  

    var lastRot = 0;
//-------------------------------------------------------------------------------------------------------------------------------
    function mouseDragEvent(e) {                            // MOUSE DRAG > mouseDragEvent (MOUSE_MOVE)
//console.log("ON..");
//console.log(e);
      if (self.pressed) {
        // Prevent default event
//console.log("DRAGGED..");
        (e.preventDefault) ? e.preventDefault() : e.returnValue = false;
        // var info = self.info, opt = self.opt,
        var offset = JogDial.utils.getCoordinates(e),
        _x = offset.x -self.center.x + W.offsetLeft,
        _y = offset.y -self.center.y + W.offsetTop,
        radian = Math.atan2(_y, _x) * JogDial.ToDeg,
        quadrant = JogDial.utils.getQuadrant(_x, _y),
        degree = JogDial.utils.convertUnitToClock(radian),
        rotation;
        //Calculate the current rotation value based on pointer offset
        info.now.rotation = JogDial.utils.getRotation(self, (quadrant == undefined) ? info.old.quadrant : quadrant  , degree);
        rotation = info.now.rotation;//Math.ceil(info.now.rotation);

        if(opt.maxDegree != null && opt.maxDegree <= rotation){
//console.log("FirstIF..");
          if(info.snapshot.direction == null){
            info.snapshot.direction = 'right';
            info.snapshot.now = JogDial.utils.extend({},info.now);
            info.snapshot.old = JogDial.utils.extend({},info.old);
          }
            rotation = opt.maxDegree;
            radian = JogDial.utils.convertClockToUnit(rotation);
            degree = JogDial.utils.convertUnitToClock(radian);
        }
        else if(opt.minDegree != null && opt.minDegree >= rotation){
//console.log("SecondIF..");
          if(info.snapshot.direction == null){
            info.snapshot.direction = 'left';
            info.snapshot.now = JogDial.utils.extend({},info.now);
            info.snapshot.old = JogDial.utils.extend({},info.old);
          }
            rotation = opt.minDegree;
            radian = JogDial.utils.convertClockToUnit(rotation);
            degree = JogDial.utils.convertUnitToClock(radian);
        }
        else if(info.snapshot.direction != null){
//console.log("ELSE..");
          info.snapshot.direction = null;
        }
        
        JogDial.utils.extend(self.knob, {                    // Update JogDial data information
          rotation: rotation,
          degree: degree
        });
        angleTo(self, radian);                          // Update ANGLE and Do MOTION
        if (Math.abs(lastRot - rotation) >= 10) {           // ##Appears to be our STEP TEST
      console.log("vib")
            Haptics.vibrate(5);                             // HAPTICS  & SOUND ACTION
            beep(10, 400, 5);
            //###########################################
            doMotion(rotation * Math.PI / 180,); // probably don't want to do this division
            //############################################
            lastRot = rotation;
            var bar_width = Math.round((rotation/360)*10) + '%';   // size of indicator bar moves
            $("#jog_dial_one_meter_inner").css('width',bar_width);
        }
//console.log("dragEvt: ", degree, lastRot, rotation, info.old.rotation, info.now.rotation);
      }
    };
//-------------------------------------------------------------------------------------------------------------------------------

    function mouseUpEvent() {                               // mouseDragEvent (MOUSE_UP, MOUSE_OUT)
//console.log('got mouse-up in main')
      if(self.pressed){
        self.pressed = false;
        if(self.info.snapshot.direction != null){
          self.info.now = JogDial.utils.extend({},info.snapshot.now);
          self.info.old = JogDial.utils.extend({},info.snapshot.old);
          self.info.snapshot.direction = null;
        }
        // Trigger up event
        JogDial.utils.triggerEvent(self.knob, JogDial.CustomEvent.MOUSE_UP);
      }
    };
  };

//-------------------------------------------------------------------------------------------------------------------------------
  function angleTo(self, radian, triggeredDegree) {                  // HAVE WE MOVED ENOUGH TO Increment?
//console.log(radian)
    radian *= JogDial.ToRad;
    var _x =  Math.cos(radian) * self.radius + self.center.x,
        _y =  Math.sin(radian) * self.radius + self.center.y,
        quadrant = JogDial.utils.getQuadrant(_x, _y),
        degree = JogDial.utils.convertUnitToClock(radian);
    self.knob.style.left = _x + 'px';
    self.knob.style.top = _y + 'px';
    if(self.knob.rotation == undefined){
      // Update JogDial data information
      JogDial.utils.extend(self.knob, {
        rotation: self.opt.degreeStartAt,
        degree: JogDial.utils.convertUnitToClock(radian)
      });
    }

    if(triggeredDegree){
      // Update JogDial data information
      self.info.now = JogDial.utils.extend({},{rotation:triggeredDegree, quadrant: quadrant});
      self.info.old = JogDial.utils.extend({},{rotation: triggeredDegree%360, quadrant: quadrant});
      JogDial.utils.extend(self.knob, {
        rotation: triggeredDegree,
        degree: triggeredDegree%360
      });
    }
    // Trigger move event
    JogDial.utils.triggerEvent(self.knob, JogDial.CustomEvent.MOUSE_MOVE);
  };
//-------------------------------------------------------------------------------------------------------------------------------

//-------------------------------------------------------------------------------------------------------------------------------
  function injectMove(self, info, dist) {                                    // *** INJECT MOTION
        angleTo(self, JogDial.utils.convertClockToUnit(info.now.rotation + dist));
        beep(10, 400, 5);
        info.now.rotation += dist;
        info.old.rotation = (info.old.rotation + dist)%360
        var bar_width = Math.round((info.now.rotation/360)*10) + '%';   // size of indicator bar moves
        $("#jog_dial_one_meter_inner").css('width',bar_width);
        //###########################################
        doMotion(info.now.rotation * Math.PI / 180,); // probably don't want to do this division
        //############################################

//console.log(self,info,dist)
//console.log("injEvt: ", info.old.rotation, info.now.rotation);
//console.log(info.old.rotation * Math.PI / 180)
//var new_rad = info.old.rotation * Math.PI / 180;
////var new_rad = globals.TOol_x * Math.PI / 180;
////var _x =  Math.cos(new_rad) * 165,
////_y =  Math.sin(new_rad) * 165;
//quadrant = JogDial.utils.getQuadrant(_x, _y),
//degree = JogDial.utils.convertUnitToClock(radian);
////document.querySelector("#jog_dial_follower").style.left = _x + 'px';
////document.querySelector("#jog_dial_follower").style.top = _y + 'px';
//              var lastRot = info.now.rotation;
  }
//-------------------------------------------------------------------------------------------------------------------------------

  // UMD Wrapper pattern
  // Based on returnExports.js script from (https://github.com/umdjs/umd/blob/master/returnExports.js)
  if (typeof define === 'function' && define.amd) {
      // AMD. Register as an anonymous module.
      define(function() { return JogDial; });
  } else if (typeof exports === 'object') {
      // Node. Does not work with strict CommonJS, but
      // only CommonJS-like environments that support module.exports,
      // like Node.
      module.exports = JogDial;
  } else {
      // Browser globals
      window.JogDial = JogDial;
  }

})(window);

// ----------------------------------------- MOVE the FOLLOWER MARKER
function update_loc (angle) {
  var new_rad = globals.TOol_x  // * Math.PI / 180;
  var _x =  (Math.cos(new_rad) * 125) + 80,
      _y =  (Math.sin(new_rad) * 125) -15;
//quadrant = JogDial.utils.getQuadrant(_x, _y),
//degree = JogDial.utils.convertUnitToClock(radian);
    document.querySelector("#jog_dial_follower").style.left = _x + 'px';
    document.querySelector("#jog_dial_follower").style.top = _y + 'px';
//              var lastRot = info.now.rotation;
console.log('X-update-- ', globals.TOol_x, new_rad)
}  

//--------------------------------------------SOUNDS
const a=new AudioContext()
console.log(a.baseLatency)
  function beep(vol, freq, duration){
    v=a.createOscillator()
    u=a.createGain()
    v.connect(u)
    v.frequency.value=freq
    v.type="square"
    u.connect(a.destination)
    u.gain.value=vol*0.01
    v.start(a.currentTime)
    v.stop(a.currentTime+duration*0.001)
  }


//---------------------------------------------ON-LOAD  
// ##@th added for bar control
window.onload = function(){
  var bar = document.getElementById('jog_dial_one_meter_inner');
  var dialOne = JogDial(document.getElementById('jog_dial_one'),
          {minDegree:null, maxDegree:null, degreeStartAt: 180})
//          {debug:false, minDegree:null, maxDegree:null, degreeStartAt: 180})
    .on('mousemove', function(evt){
console.log('got mouse event!')      
      bar.style.width = Math.round((evt.target.rotation/360)*10) + '%';   // size of indicator bar moves
    });

    beep(20, 1800, 1);
    // beep(50, 100, 200);


}

