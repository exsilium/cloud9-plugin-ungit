define(function(require, exports, module) {

var ide = require("core/ide");
var ext = require("core/ext");
var util = require("core/util");
var settings = require("ext/settings/settings");
var menus = require("ext/menus/menus");
var dock = require("ext/dockpanel/dockpanel");
var markup = require("text!ext/ungit/ungit.xml");
var skin    = require("text!ext/ungit/skin.xml");
var fa      = require("text!ext/ungit/style/font-awesome.css");
var css     = require("text!ext/ungit/style/style.css");
var markupSettings = require("text!ext/ungit/settings.xml");
var elementResizeEvent = require('ext/ungit/ElementResizeEvent');

var $name = "ext/ungit/ungit";

module.exports = ext.register($name, {
    name    : "Ungit",
    dev     : "Sten Feldman",
    type    : ext.GENERAL,
    alone   : true,
    markup  : markup,
    $name   : $name,
    $button : "pgUngit",
    skin    : {
        id   : "ungitskin",
        data : skin,
        "media-path" : ide.staticPrefix + "/ext/ungit/style/images/",
        "icon-path"  : ide.staticPrefix + "/ext/ungit/style/icons/"
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

    },

    hook: function() {
        var _self = this;

        settings.addSettings("Ungit", markupSettings);

        this.nodes.push(
            menus.$insertByIndex(barTools, new apf.button({
                skin : "c9-toolbarbutton-glossy",
                "class" : "ungit",
                tooltip : "Git in browser",
                caption : "Ungit",
                disabled : false,
                onclick : function() {
                  _self.ungit();
                }
            }), 9)
        );

        dock.addDockable({
            expanded : -1,
            width : 900,
            barNum: 3,
            "min-width" : 400,
            headerVisibility: "false",
            sections : [{
                width : 900,
                height: 200,
                buttons : [{
                    caption: "Ungit App",
                    ext : [this.$name, this.$button],
                    hidden : false
                }]
            }]
        });
        
        dock.register(this.$name, this.$button, {
            menu : "Ungit App",
            primary : {
                backgroundImage: ide.staticPrefix + "/ext/ungit/style/images/ungit.png",
                defaultState: { x: -11, y: -10 },
                activeState:  { x: -11, y: -46 }
            }
        }, function() {
            ext.initExtension(_self);
            return pgUngit;
        });

        ide.addEventListener("extload", function(e){
            ide.addEventListener("settings.load", function(e){
                settings.setDefaults("ungit", [
                    ["ungit_setting_app", "false"]
                ]);
            });
        });

        ide.addEventListener("dockpanel.loaded", function (e) {
            _self.hidePageHeader();
        });

        ext.initExtension(this);
    },

    isVisible: function () {
        console.log("HELO");
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

    ungit: function () {
        var bar = this._getDockBar();
        dock.showBar(bar);
        dock.expandBar(bar);
        dock.showSection(this.$name, false);
        this.hidePageHeader();
        var frmUngit = this.getIframe();
        this.refresh("https://localhost");
    },

    // Called when separating the dock to a separate window
    popup: function (url) {
        url = url || txtUngit.getValue();
        window.open(url, "https://localhost");
    },

    refresh: function (url) {
        var frmUngit = this.getIframe();
        var dockHeight = document.getElementsByClassName('docktab')[0].clientHeight || document.getElementsByClassName('docktab')[2].clientHeight;
        var dockWidth = document.getElementsByClassName('docktab')[0].clientWidth || document.getElementsByClassName('docktab')[2].clientWidth;
        url = url || txtUngit.getValue();
        frmUngit.$ext.src = url;
        txtUngit.setValue(url);
        console.log("Debug: " + dockHeight + " vs " + document.getElementById("ungit_div").clientHeight);
        console.log("Debug: " + dockWidth + " vs " + document.getElementById("ungit_div").clientWidth);
        ungit_iframe.style.width = dockWidth / 0.70 + 1 + "px";
        ungit_iframe.style.height = (dockHeight - 36) / 0.70 + 1 + "px";
        console.log("Debug: Height - " + document.getElementById("ungit_div").clientHeight + " | Width - " + document.getElementById("ungit_div").clientWidth);
    },

    close: function () {
        dock.hideSection(this.$name, this.$button);
        this.live = null;
    },

    init: function() {
        var resizeTimer = false;
        apf.importCssString(this.css || "");
        apf.importCssString(this.fa || "");
        txtUngit.setValue("https://localhost");

        var element = document.getElementById("ungit_div");
        elementResizeEvent(element, function() {
            console.log("Resized! " + element.clientWidth + "x" + element.clientHeight);
            console.log("Resize timer: " + (resizeTimer ? "true" : "false"));
            if(!resizeTimer) resizeTimer = true;
            /* During the resize, the iframe needs to be minimized, so that the dock window resize
               can successfully be made without clipping effect */
            if (ungit_iframe.style.width != "0px") ungit_iframe.style.width = 0 + "px";
            if (ungit_iframe.style.height != "0px") ungit_iframe.style.height = 0 + "px";
        });
    },
    
    getIframe: function() {
        return pgUngit.selectSingleNode("iframe");
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
