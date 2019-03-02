import Framework7, { Dom7, Template7} from 'framework7';
import { BrowserBarcodeReader } from '@zxing/library';
import BufferLoader from './lib/bufferloader.js';

// Import F7 Styles
import 'framework7/css/framework7.bundle.css';

// Import additional components
import SmartSelect from 'framework7/components/smart-select/smart-select.js';
import Sheet from 'framework7/components/sheet/sheet.js';
import Popup from 'framework7/components/popup/popup.js';


BrowserBarcodeReader.prototype.decodeFromVideoStream = function(stream, videoElement){
    var _this = this;
    this.reset();
    this.prepareVideoElement(videoElement);

    return new Promise(function (resolve, reject) {
        var callback = function () {
            _this.decodeOnceWithDelay(resolve, reject);
        };
        return _this.startDecodeFromStream(stream, callback);
    });
}

BrowserBarcodeReader.prototype.decodeFromVideoStreamOnce = function(){
    var _this = this;
    return new Promise(function (resolve, reject) {
        _this.decodeOnceWithDelay(resolve, reject);
    });
}

BrowserBarcodeReader.prototype.decodeFromVideoStreamPause = function(){
  if(undefined !== this.timeoutHandler) {
    clearTimeout(this.timeoutHandler);
    this.timeoutHandler = undefined;
  }
}

var soundUrl = './9360.mp3';

Framework7.use([SmartSelect, Sheet, Popup]);

var $$ = Dom7;

var app = new Framework7({
  // App root element
  root: '#app',
  // App Name
  name: '手机捡货',
  // App id
  id: 'wdk.open.rf',
});

//var selectedTemplate = Template7.compile("<option value=\"{{deviceId}}\" selected>{{deviceName}}</option>");
var listTemplate = Template7.compile("<option value=\"{{deviceId}}\">{{deviceName}}</option>");
var smartSelect;
var lastValue;

var videoEle = $$("#video")[0];

var codeReader = new BrowserBarcodeReader();

var decodeInit = false;


var mainView = app.views.create('.view-main',{
  on: {
    pageInit: function (e) {
      if(e.name==="home"){
        codeReader.getVideoInputDevices()
          .then((videoInputDevices) => {
            videoInputDevices.forEach((element) => {
              $$("#camera-list").append(listTemplate({
                  deviceId: element.deviceId,
                  deviceName: element.label
              }));
            });
            smartSelect = app.smartSelect.create({
              el:$$(".smart-select"),
              openIn:"sheet",
              on: {
                opened: function () {
                  console.log('Smart select opened')
                },
                close: function() {
                  if(lastValue!=smartSelect.getValue()){
                    lastValue = smartSelect.getValue();
                    codeReader.reset();
                    videoEle.remove();
                    videoEle = document.createElement('video');
                    $$("#video-container").append(videoEle);
                    initCamera();
                    decodeInit = false;
                  }
                }
              }
            });
            var cameraView = app.views.create('.view-camera',{
              on: {
                pageInit: function (e) {
                  lastValue = smartSelect.getValue();
                  initCamera();
                }
              }
            });
          })
          .catch((err)=>{
            console.error(err);
          });
      }
    }
  }
});

var resultFunction = function(result) {
    play();
    app.popup.close($$('.popup-camera'), true);
    $$('#bar-code')[0].value = result;
  }

function initCamera(){
  var constraints;
  if(smartSelect.getValue()=="default"){
    constraints = { 
      width: {min: 640},
      height: {min: 480},
      frameRate: 30,
      advanced: [
        {width: 650},
        {width: {min: 650}},
        {width: {max: 800}},
      ],
      facingMode:"environment"
    };
  }else{
    constraints = { 
      width: {min: 640},
      height: {min: 480},
      frameRate: 30,
      advanced: [
        {width: 650},
        {width: {min: 650}},
        {width: {max: 800}},
      ],
      deviceId:{
        exact:smartSelect.getValue()
      }
    };
  }
  navigator.mediaDevices.getUserMedia({ video: constraints}).then(gumSuccess).catch((e)=>{
    if(smartSelect.getValue()=="default"){
      constraints = { 
        width: 600,
        height: 400,
        facingMode:"environment"
      };
    }else{
      constraints = { 
        width: 600,
        height: 400,
        deviceId:{
          exact:smartSelect.getValue()
        } 
      };
    }
    navigator.mediaDevices.getUserMedia({ video: constraints}).then(gumSuccess).catch((e)=>{
      alert(e);
    });
  });
}

function gumSuccess(stream){
  console.log("video init")
  videoEle.srcObject = stream;
}

function initDecoder(){
  console.log("start")
  codeReader
    .decodeFromVideoStream(videoEle.srcObject, videoEle)
    .then(result => {
      console.log(result);
      if(resultFunction){
        resultFunction(result);
      }
    })
    .catch(err => {
      alert(err);
      console.error(err);
    });
}

function startDecoder(){
   codeReader
    .decodeFromVideoStreamOnce()
    .then(result => {
      console.log(result);
      if(resultFunction){
        resultFunction(result);
      }
    })
    .catch(err => {
      alert(err);
      console.error(err);
    });   
}

function pauseDecoder(){
  codeReader.decodeFromVideoStreamPause();
}

$$('.popup-camera').on('popup:open', function (e, popup) {
  if(!context) {
    context = new (window.AudioContext || window.webkitAudioContext)();
    bufferLoader = new BufferLoader(
          context, [soundUrl], (bufferList) => {
              buffer = bufferList[0];
          }, () => {
              console.log("init audio error")
          }
      )
    bufferLoader.load();
  }
  if(decodeInit){
    var width = $$("#video-container")[0].clientWidth;
    $$("#video")[0].style.zoom = (width)/$$("#video")[0].videoWidth;
    startDecoder();
  }else{
    decodeInit = true;
    initDecoder();
  }
});

$$('.popup-camera').on('popup:close', function (e, popup) {
   pauseDecoder();
   //initCamera();
   console.log('Reset.')
});


var buffer;
var context;

var bufferLoader;


function initSound() {
    var source = context.createBufferSource();
    var gainNode = context.createGain();
    source.buffer = buffer;
    source.connect(gainNode);
    gainNode.connect(context.destination);
    return source;
}

function play(){
  initSound().start();
}