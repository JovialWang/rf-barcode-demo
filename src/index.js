import Framework7, { Dom7, Template7} from 'framework7';
import { BrowserBarcodeReader } from '@zxing/library';
import BufferLoader from './lib/bufferloader.js';

// Import F7 Styles
import 'framework7/css/framework7.bundle.css';

// Import additional components
import SmartSelect from 'framework7/components/smart-select/smart-select.js';
import Sheet from 'framework7/components/sheet/sheet.js';
import Popup from 'framework7/components/popup/popup.js';


BrowserBarcodeReader.prototype.decodeFromVideoStream = function(stream){
  this.reset();

  this.prepareVideoElement();

  return new Promise((resolve, reject) => {

      const callback = () => {
          this.decodeOnceWithDelay(resolve, reject);
      };
      this.startDecodeFromStream(stream, callback);
  });
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

var selectedTemplate = Template7.compile("<option value=\"{{deviceId}}\" selected>{{deviceName}}</option>");
var listTemplate = Template7.compile("<option value=\"{{deviceId}}\">{{deviceName}}</option>");
var smartSelect;
var lastValue;

var videoEle = $$("#video")[0];

const codeReader = new BrowserBarcodeReader();


var mainView = app.views.create('.view-main',{
  on: {
    pageInit: function (e) {
      if(e.name==="home"){
        codeReader.getVideoInputDevices()
          .then((videoInputDevices) => {
            var num = 0;
            videoInputDevices.forEach((element) => {
              console.log(JSON.stringify(element));
              if(num===0){
                $$("#camera-list").append(selectedTemplate({
                  deviceId: element.deviceId,
                  deviceName: element.label
                }));
              }else{
                $$("#camera-list").append(listTemplate({
                  deviceId: element.deviceId,
                  deviceName: element.label
                }));
              }
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
                    initCamera();
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

var resultFunction;

function initCamera(){
  var constraints = { 
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

  if (navigator.mediaDevices) {
      navigator.mediaDevices.getUserMedia({ video: constraints}).then(gumSuccess).catch((e)=>alert(e));
  } else if (navigator.getUserMedia) {
    navigator.getUserMedia({ video: constraints}, gumSuccess, (e)=>alert(e));
  }
}

function gumSuccess(stream){
  videoEle.srcObject = stream;
  video.muted = true;
  videoEle.onloadedmetadata = function(e) {
    console.log("video load")
  };
}

function initDecoder(){
  codeReader
    .decodeFromVideoStream(videoEle.srcObject)
    .then(result => {
      console.log(result);
      if(resultFunction){
        resultFunction(result);
      }
      setTimeout(initCamera,500);
    })
    .catch(err => alert(err));
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
  var width = $$("#video-container")[0].clientWidth;
  $$("#video")[0].style.zoom = (width)/$$("#video")[0].videoWidth;
  resultFunction = function(result) {
    play();
    app.popup.close($$('.popup-camera'), true);
    $$('#bar-code')[0].value = result;
  }
  videoEle.play();
});

$$('.popup-camera').on('popup:close', function (e, popup) {
  //  codeReader.reset();
   console.log('Reset.')
   resultFunction = null;
   videoEle.pause();
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