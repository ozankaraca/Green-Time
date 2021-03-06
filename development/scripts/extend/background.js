console.info('Background is loaded');

// Properties of background script
var isWaiting = false; // waiting now? control variable
var minuteMultiplier = 60*1000; // bekleme süresi: 5 dakika
// TODO: Waiting time options
var urlList = ["facebook.com"];
var passUrlList = [];
var daytimeList = [];

// This function is called once in the start of the browser
function initialize(){
  load_options();
}

// Funcitons of background script
function tabUpdate(tabId, changeInfo, tab){
  console.log("onUpdated "+tab.url);
  // check if the page should be filtered
  doFilter = filterTab(tab);
  console.log(tabId);
  // show green-pass if it does
  if(doFilter){
    bringGreenPass(tab);
  }
}

// this is called when a tab is created
function tabCreate(tabId, changeInfo, tab){
  // check if the page should be filtered
  doFilter = filterTab(tab);
  // show green-pass if it does
  if(doFilter){
    bringGreenPass(tab);
  }
}

// handle the messages coming from content scripts
function handleMessage(request, sender, sendResponse){
  console.log("Message received: " + request.topic);
  if(!request.topic){
    console.log("BG message request.topic should be specified!");
  }
  // Act according to request.topic
  switch (request.topic) {
    case "start waiting":
      startWaiting(request.time);
      break;

    case "console log":
      printLog(request.log);
      break;

    case "update options":
      updateOptions(request.options);
      break;

    case "green-pass url":
      sendGreenPassUrl(sender.tab.id);
      break;

    default:
      console.log("BG message request.topic is not understood!");
  }
}

// a general function to restore options
// it is called at initialization
function load_options() {
  chrome.storage.sync.get({
    urlList: urlList,
		daytimeList: daytimeList
  }, function(items) {

    // control the undefined case
    if(!items || items.length < 2){
      console.error("Option items are not proper.");
      return;
    }

    urlList = items.urlList
    daytimeList = items.daytimeList;

  });
  // log the bg console
  console.log("Options loaded");
}

// Decides if the tab should be filtered or not
// Checks the user URL-list
// Also controls the waiting time
function filterTab(tab){

  // check undefined (new tab situation)
  if(!tab || !tab.url){
    return false;
  }

  // check waiting time
  if(isWaiting) return false;

  // check daytime
  if(!filterDaytime()) return false;

  // iterate all urls in list
  len = urlList.length;
  for(var i=0; i<len; i++){
    // if empty then skip
    if(urlList[i].length <= 0) continue;

    var n = tab.url.search(urlList[i]);
    // does it match to the url?
    if (n >= 0) return true;
  }

  return false;
}

// compare current time if it fits to 'any' of the daytime intervals
function filterDaytime() {
  // get current time and create a string of HH:SS format
  var currentDate = new Date();
  var strTime = currentDate.getHours()+":"+currentDate.getMinutes()+":00";

  // compare if it fits to 'any' of the interval
  //iterate all intervals in list
  len = daytimeList.length;
  for(var i=0; i<len; i++){
    // TODO: check empty/improper daytime
    var strFrom = daytimeList[i].from+":00";
    var strTo = daytimeList[i].to+":00";

    // in this interval? then filter applies
    if (strTime > strFrom && strTime < strTo){
      return true
    }
  }
  return false;
}

// Show green-pass.html in the tab
function bringGreenPass(tab){
  // Show the green-pass view
  chrome.tabs.update(tab.id, {url: "./views/green-pass.html"});
  // record passUrl to inform green-pass later
  passUrlList[tab.id] = tab.url;
}

// starts waiting the given time*minutes
function startWaiting(time){
  isWaiting = true;
  var totalWait = time*minuteMultiplier;
  // start timer for waiting
  setTimeout(endWaiting, totalWait);
  console.log(totalWait + " Waiting has started");
}

// Procedure to call in the end of the waiting
function endWaiting(){
  console.log("Waiting has ended");
  isWaiting = false;
}

// sends green-pass page the url to direct, if user choses to 'visit'
function sendGreenPassUrl(tabId){
  // undefined?
  if (!tabId) {
    console.log("Green-pass tab id is undefined!");
    return;
  }
  // inform Green-pass
  chrome.tabs.sendMessage(tabId, {passUrl: passUrlList[tabId]});
}

// updates the options with the option values coming with message
function updateOptions(options){
  // undefined?
  if (!options) {
    console.log("Options are undefined!");
    return;
  }
  // assign bg variables
  urlList = options.urlList;

  console.log("Options are updated.");
}

// prints the logs coming from other scripts
// to background console for easier debug
function printLog(strLog){
  if (!strLog) {
    console.log("Please assign the request.log field \
    in \"console log\" messages");
    return;
  }

  console.log(strLog);
}


var plugin = {

  /*
   * onUpdate
   * Each request pass here on load stage
   */
  onLoad: function(context) {
    log('onLoad event is fired : ' + context.tab.url, 'warn');
  },

  /*
   * beforeEnter
   * Each request pass here on complated stage
   */
  onComplated: function(context) {
    log('onComplated event is fired : ' + context.tab.url, 'warn');
  }

};


initialize();
