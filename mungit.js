/* global pgMungit txtMungit mungit_iframe */

define(function(require, exports, module) {

var ide = require("core/ide");
var ext = require("core/ext");
var util = require("core/util");
var settings = require("ext/settings/settings");
var menus = require("ext/menus/menus");
var dock = require("ext/dockpanel/dockpanel");
var markup = require("text!ext/mungit/mungit.xml");
var skin    = require("text!ext/mungit/skin.xml");
var fa      = require("text!ext/mungit/style/font-awesome.css");
var css     = require("text!ext/mungit/style/style.css");
var markupSettings = require("text!ext/mungit/settings.xml");
var elementResizeEvent = require('ext/mungit/ElementResizeEvent');

var $name = "ext/mungit/mungit";

function constructAddress() {
  var baseURL = settings.model.queryValue("mungit/@mungit_addr");
  
  if(baseURL.substring(0, 7) === 'http://' || baseURL.substring(0,8) === 'https://') {
    if(baseURL[baseURL.length-1] !== "/") {
      baseURL = baseURL + '/';
    }
    baseURL = baseURL + '?noheader=true/#/repository?path=' +
              encodeURIComponent(settings.model.queryValue("mungit/@workspace_base")) +
              encodeURIComponent(settings.model.queryValue("auto/tree_selection/@path"));
              
    return baseURL;
  }
  else {
    return "Invalid Configuration";
  }
}

function openTab(url) {
    // Create a link
    var a = window.document.createElement("a");
    a.target = '_blank';
    a.href = url;
 
    // Dispatch event
    var e = window.document.createEvent("MouseEvents");
    e.initMouseEvent("click", true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
    a.dispatchEvent(e);
}

function bindElementResize() {
  console.log("BIND CALLED!");
  var resizeTimer = null;
  var bindingInit = false;
  var element = document.getElementById("mungit_div");
  elementResizeEvent(element, function() {
    if(bindingInit) {
      if (settings.model.queryValue("mungit/@plugin_debug") === "true") {
        console.log("Resized! " + element.clientWidth + "x" + element.clientHeight);
        console.log("Resize timer: " + (resizeTimer ? "true" : "false"));
      }
      if(resizeTimer) {
        clearTimeout(resizeTimer);
      }
    
      resizeTimer = setTimeout(function() {
        var height_offset = 36;
        
        if (settings.model.queryValue("mungit/@top_bar") === "false") {
          height_offset = 0;
        }
        resizeTimer = null;
        mungit_iframe.style.width = element.clientWidth / 0.70 + 1 + "px";
        mungit_iframe.style.height = (element.clientHeight - height_offset) / 0.70 + 1 + "px";
      }, 500);
    
      /* During the resize, the iframe needs to be minimized, so that the dock window resize
         can successfully be made without clipping effect */
      if (mungit_iframe.style.width != "0px") mungit_iframe.style.width = 0 + "px";
      if (mungit_iframe.style.height != "0px") mungit_iframe.style.height = 0 + "px";
    }
    bindingInit = true;
  });
}
    
function unbindElementResize(element) {
  elementResizeEvent.unbind(element);
}

module.exports = ext.register($name, {
    name    : "Mungit",
    dev     : "Sten Feldman",
    type    : ext.GENERAL,
    alone   : true,
    markup  : markup,
    $name   : $name,
    $button : "pgMungit",
    skin    : {
        id   : "mungitskin",
        data : skin,
        "media-path" : ide.staticPrefix + "/ext/mungit/style/images/",
        "icon-path"  : ide.staticPrefix + "/ext/mungit/style/icons/"
    },
    fa      : util.replaceStaticPrefix(fa),
    css     : util.replaceStaticPrefix(css),
    deps    : [dock],
    autodisable : ext.ONLINE | ext.LOCAL,
    disableLut: {
        "terminal": true
    },
    nodes   : [],
    live    : null,

    _getDockBar: function () {
        return dock.getBars(this.$name, this.$button)[0];
    },

    _getDockButton: function () {
        return dock.getButtons(this.$name, this.$button)[0];
    },

    onLoad: function () {
      // onLoad is called when the panel is shown for the first time.
      // (Including when the dock app is shown without the actual window)
      if(this.live === null) {
        this.live = true;
      }
    },
    
    hook: function() {
        var _self = this;

        settings.addSettings("Mungit", markupSettings);

        this.nodes.push(
            menus.$insertByIndex(barTools, new ppc.button({
                skin : "c9-toolbarbutton-glossy",
                "class" : "mungit",
                tooltip : "Git in browser",
                caption : "Mungit",
                disabled : false,
                onclick : function() {
                  _self.mungit();
                }
            }), 9)
        );

        dock.addDockable({
            expanded : -1,
            width : 900,
            barNum: 3,
            "min-width" : 400,
            headerVisibility: "true",
            sections : [{
                width : 900,
                height: 200,
                buttons : [{
                    caption: "Mungit App",
                    ext : [this.$name, this.$button],
                    hidden : false
                }]
            }]
        });
        
        dock.register(this.$name, this.$button, {
            menu : "Mungit App",
            primary : {
                backgroundImage: ide.staticPrefix + "/ext/mungit/style/images/ungit.png",
                defaultState: { x: -11, y: -10 },
                activeState:  { x: -11, y: -46 }
            }
        }, function() {
            ext.initExtension(_self);
            return pgMungit;
        });

        ide.addEventListener("extload", function(e){
            ide.addEventListener("settings.load", function(e){
                settings.setDefaults("mungit", [
                    ["plugin_debug", "false"],
                    ["top_bar", "true"],
                    ["mungit_addr", "https://host/mungit/"],
                    ["workspace_base", "/home/user"]
                ]);
            });
        });

        ide.addEventListener("dockpanel.loaded", function (e) {
          _self.hidePageHeader();
          
          /* This example shows how to read back the dock button value.
           * Dockpanel does not dispatch a separate event when the button
           * is pressed.
           */
          if (settings.model.queryValue("mungit/@plugin_debug") === "true") {
            var dockButton = _self._getDockButton();
            if('cache' in dockButton) {
              dockButton.cache.addEventListener("onmouseup", function(e) { 
                console.log("Button value: " + e.currentTarget.value);
                
                if(e.currentTarget.value === true) {
                  console.log("The state is true");
                  bindElementResize();
                }
                
                if(e.currentTarget.value === false) {
                  console.log("The state is false!");
                  var element = document.getElementById("mungit_div");
                  unbindElementResize(element);
                }
                
              }, false);
            }
          }
        });
        
        ext.initExtension(this);
    },

    isVisible: function () {
      var button = this._getDockButton();
      return button && button.hidden && button.hidden === -1;
    },

    // Patch the docked section to remove the page caption
    hidePageHeader: function () {
        var button = this._getDockButton();
        if (!button || !button.cache)
            return;
        var pNode = button.cache.$dockpage.$pHtmlNode;
        if (pNode.children.length === 4) {
            pNode.removeChild(pNode.children[2]);
            pNode.children[2].style.top = 0;
        }
    },

    /* Called when Mungit menu item is clicked */
    mungit: function () {
      if(ppc.isIphone) {
        // on iOS, driving a full application within iframe is simply too much even on A10X
        // We fall back to opening ungit in a new tab instead.
        openTab(constructAddress());
      }
      else {
        console.log("Visible: " + this.isVisible());
        var bar = this._getDockBar();
        dock.showBar(bar);
        dock.expandBar(bar);
        dock.showSection(this.$name, false);
        this.hidePageHeader();
        this.refresh(constructAddress());

        bindElementResize();
      }
    },

    // Called when separating the dock to a separate window
    popup: function (url) {
        url = url || txtMungit.getValue();
        window.open(url);
    },

    refresh: function (url) {
      var frmMungit = this.getIframe();
      var dockHeight = document.getElementsByClassName('docktab')[0].clientHeight || document.getElementsByClassName('docktab')[2].clientHeight;
      var dockWidth = document.getElementsByClassName('docktab')[0].clientWidth || document.getElementsByClassName('docktab')[2].clientWidth;
      url = url || txtMungit.getValue();
      frmMungit.$ext.src = url;
      txtMungit.setValue(url);
      if (settings.model.queryValue("mungit/@plugin_debug") === "true") {
        console.log("Debug: " + dockHeight + " vs " + document.getElementById("mungit_div").clientHeight);
        console.log("Debug: " + dockWidth + " vs " + document.getElementById("mungit_div").clientWidth);
      }
      mungit_iframe.style.width = dockWidth / 0.70 + 1 + "px";
      mungit_iframe.style.height = (dockHeight - 36) / 0.70 + 1 + "px";
      if (settings.model.queryValue("mungit/@plugin_debug") === "true") {
        console.log("Debug: Height - " + document.getElementById("mungit_div").clientHeight + " | Width - " + document.getElementById("mungit_div").clientWidth);
      }
    },

    /* Close is called when Window Section is closed, not, when the dockable window is hidden */
    close: function () {
      var element = document.getElementById("mungit_div");
      unbindElementResize(element);
      dock.hideSection(this.$name, this.$button);
      this.live = null;
    },

    init: function() {
      console.log("Init called!");
      ppc.importCssString(this.css || "");
      ppc.importCssString(this.fa || "");
      txtMungit.setValue("https://localhost");
    },
    
    getIframe: function() {
        return pgMungit.selectSingleNode("iframe");
    },

    enable : function() {
        var page = ide.getActivePage();
        var contentType = (page && page.getModel().data.getAttribute("contenttype")) || "";
        if(this.disableLut[contentType])
            return this.disable();
        this.$enable();
    },

    disable: function() {
        this.live = null;
        this.$disable();
    }
});

});
