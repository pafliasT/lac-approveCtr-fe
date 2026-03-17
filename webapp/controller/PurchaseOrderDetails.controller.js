sap.ui.define([
	"sap/com/bedigix/approvectrfe/controller/BaseController",
	"sap/ui/core/mvc/Controller",
	"sap/ui/core/routing/History",
	"sap/ui/model/json/JSONModel",
	"sap/m/MessageBox",
	"./D0_1461159223186",
	"./Popover1",
	"./Popover2",
	"./utilities",
	"sap/ui/core/BusyIndicator",
	"sap/m/library",
	"sap/m/upload/Uploader"
], function (BaseController, Controller, History, JSONModel, MessageBox, D0_1461159223186, Popover1, Popover2, Utilities, BusyIndicator,
	MobileLibrary, Uploader) { //  D3_1461160697744,
	"use strict";
	var that;
	return BaseController.extend("sap.com.bedigix.approvectrfe.controller.PurchaseOrderDetails", {
		onInit: function () {
			that = this;
			this.oRouter = sap.ui.core.UIComponent.getRouterFor(this);
			this.oRouter.getTarget("PurchaseOrderDetails").attachDisplay(jQuery.proxy(this.handleRouteMatched, this));
			var oView = this.getView();
			oView.addEventDelegate({
				onBeforeShow: function () {
					if (sap.ui.Device.system.phone) {
						var oPage = oView.getContent()[0];
						if (oPage.getShowNavButton && !oPage.getShowNavButton()) {
							oPage.setShowNavButton(true);
							oPage.attachNavButtonPress(function () {
								this.oRouter.navTo("purchase_orders", {}, true);
							}.bind(this));
						}
					}
				}.bind(this)
			});
		},
		
		handleRouteMatched: function (oEvent) {
			jQuery.sap.log.info("PurchaseOrderDetails controller handleRouteMatched");
			var oParams = {};
			if (oEvent.mParameters.data.context) {
				this.sContext = oEvent.mParameters.data.context;
				var oPath;
				if (this.sContext) {
					oPath = {
						path: "/" + this.sContext,
						parameters: oParams
					};
					this.getView().bindObject(oPath);
				}
			}
		},

		_onObjectHeaderTitlePress: function (oEvent) {
			var sPopoverName = "Popover1";
			this.mPopovers = this.mPopovers || {};
			var oPopover = this.mPopovers[sPopoverName];
			if (!oPopover) {
				oPopover = new Popover1(this.getView());
				this.mPopovers[sPopoverName] = oPopover;
				oPopover.getControl().setPlacement("Auto");
				// For navigation.
				oPopover.setRouter(this.oRouter);
			}
			var oSource = oEvent.getSource();
			oPopover.open(oSource);
		},
		
		_onObjectAttributePress: function (oEvent) {
			var sPopoverName = "Popover2";
			this.mPopovers = this.mPopovers || {};
			var oPopover = this.mPopovers[sPopoverName];
			if (!oPopover) {
				oPopover = new Popover2(this.getView());
				this.mPopovers[sPopoverName] = oPopover;
				oPopover.getControl().setPlacement("Auto");
				// For navigation.
				oPopover.setRouter(this.oRouter);
			}
			var oSource = oEvent.getSource();
			oPopover.open(oSource);
		},
		
		_onTableItemPress: function (oEvent) {
			var oBindingContext = oEvent.getParameter("listItem").getBindingContext();
			return new Promise(function (fnResolve) {
				this.doNavigate("line_item", oBindingContext, fnResolve, "");
			}.bind(this)).catch(function (err) {
				if (err !== undefined) {
					MessageBox.error(err.message);
				}
			});
		},
		
		doNavigate: function (sRouteName, oBindingContext, fnPromiseResolve, sViaRelation) {
			sap.ui.core.BusyIndicator.show(0);
			var sPath = (oBindingContext) ? oBindingContext.getPath() : null;
			var oModel = (oBindingContext) ? oBindingContext.getModel() : null;

			var sEntityNameSet;
			if (sPath !== null && sPath !== "") {
				var item_list = sap.ui.getCore().AppContext.mainModel.getProperty(sPath);
				var user = sap.ui.getCore().AppContext.mainModel.getProperty("/currentUser");
				this.getWS33(item_list.item_no, user);
				if (sPath.substring(0, 1) === "/") {
					sPath = sPath.substring(1);
				}
				sEntityNameSet = sPath; //.split("(")[0];
			}
			var sNavigationPropertyName;
			var sMasterContext = this.sMasterContext ? this.sMasterContext : sPath;
			if (sEntityNameSet !== null) {
				sNavigationPropertyName = sViaRelation || this.getOwnerComponent().getNavigationPropertyForNavigationWithContext(sEntityNameSet,
					sRouteName);
			}
			if (sNavigationPropertyName !== null && sNavigationPropertyName !== undefined) {
				if (sNavigationPropertyName === "") {
					this.oRouter.navTo(sRouteName, {
						context: sPath,
						masterContext: sMasterContext
					}, false);
				} else {
					oModel.createBindingContext(sNavigationPropertyName, oBindingContext, null, function (bindingContext) {
						if (bindingContext) {
							sPath = bindingContext.getPath();
							if (sPath.substring(0, 1) === "/") {
								sPath = sPath.substring(1);
							}
						} else {
							sPath = "undefined";
						}
						// If the navigation is a 1-n, sPath would be "undefined" as this is not supported in Build
						if (sPath === "undefined") {
							this.oRouter.navTo(sRouteName);
						} else {
							this.oRouter.navTo(sRouteName, {
								context: sPath,
								masterContext: sMasterContext
							}, false);
						}
					}.bind(this));
				}
			} else {
				this.oRouter.navTo(sRouteName);
			}
			if (typeof fnPromiseResolve === "function") {
				fnPromiseResolve();
			}
		},
		
		getWS33: function (item_no, user) {
			var doc = sap.ui.getCore().AppContext.mainModel.getProperty("/objTestataCo");
			var lingua = sap.ui.getCore().getConfiguration().getLanguage();
			//sap.ui.core.BusyIndicator.show(0);
			jQuery.ajax({
				url: "/backend/zpur_getitem_co?user_email=" + user + "&doc_num=" + doc.doc_num + "&language=" + lingua.substring(1, 0).toLocaleUpperCase() +
					"&item_no=" + item_no,
				cache: false,
				async: false,
				type: 'GET',
				success: function (data) {
					console.log(data);
					var string = data;
					var r = string.replace("{item_no:", '{"item_no":');
					r = r.replace(/material:/g, '"material":');
					r = r.replace(/description:/g, '"description":');
					r = r.replace(/acct_ass_cat:/g, '"acct_ass_cat":');
					r = r.replace(/quantity:/g, '"quantity":');
					r = r.replace(/uom:/g, '"uom":');
					r = r.replace(/mat_group:/g, '"mat_group":');
					r = r.replace(/desc_matgrp:/g, '"desc_matgrp":');
					r = r.replace(/plant:/g, '"plant":');
					r = r.replace(/del_addr:/g, '"del_addr":');
					r = r.replace(/\\&/g, '&');
					r = r.replace(/\\'/g, "'");
					r = r.replace(/del_date:/g, '"del_date":');
					r = r.replace(/item_text:/g, '"item_text":');
					r = r.replace(/doc_text:/g, '"doc_text":');
					r = r.replace(/cost_object:/g, '"cost_object":');
					r = r.replace(/gl_account:/g, '"gl_account":');
					var obj = JSON.parse(r);
					//var array=[];
					//array.push({note: obj.item_text});
					sap.ui.getCore().AppContext.mainModel.setProperty("/elencoDettagliCo", obj, true);
					sap.ui.getCore().AppContext.mainModel.setProperty("/arrayDettagliNoteCo", obj.item_text, true);
					setTimeout(function () {
						sap.ui.core.BusyIndicator.hide();
					}, 2000);
				},
				error: function (datao) {
					console.log(datao);
					sap.ui.core.BusyIndicator.hide();
				}
			});
		},
		
		pressDialog: null,
		
		_onButtonPress: function (oEvent) {
			MessageBox.warning(this.getResourceBundle().getText("MSG_Confirm_Text"), {
				icon: MessageBox.Icon.WARNING,
				title: "Conferma",
				actions: [MessageBox.Action.CANCEL, MessageBox.Action.OK],
				initialFocus: MessageBox.Action.CANCEL,
				onClose: function (oAction) {
					if (oAction === MessageBox.Action.OK) {
						that.onCallRelease();
					}
				}
			});
		},
		
		_onButtonPress1: function (oEvent) {
			var sDialogName = "D0_1461159223186";
			this.mDialogs = this.mDialogs || {};
			var oDialog = this.mDialogs[sDialogName];
			if (!oDialog) {
				oDialog = new D0_1461159223186(this.getView());
				this.mDialogs[sDialogName] = oDialog;
				// For navigation.
				oDialog.setRouter(this.oRouter);
			}
			var context = oEvent.getSource().getBindingContext();
			oDialog._oControl.setBindingContext(context);
			oDialog.open();
		},
		
		onExit: function () {
			// to destroy templates for bound aggregations when templateShareable is true on exit to prevent duplicateId issue
			var aControls = [{
				"controlId": "np-sap_m_IconTabFilter-1444869303496-17R-content-sap_m_FeedList-1527666209916",
				"groups": ["items"]
			}, {
				"controlId": "sap_Responsive_Page_0-content-build_simple_Table-1472657062609",
				"groups": ["items"]
			}];
			for (var i = 0; i < aControls.length; i++) {
				var oControl = this.getView().byId(aControls[i].controlId);
				if (oControl) {
					for (var j = 0; j < aControls[i].groups.length; j++) {
						var sAggregationName = aControls[i].groups[j];
						var oBindingInfo = oControl.getBindingInfo(sAggregationName);
						if (oBindingInfo) {
							var oTemplate = oBindingInfo.template;
							oTemplate.destroy();
						}
					}
				}
			}
		},
		
		onCallRelease: function () {
			var doc = sap.ui.getCore().AppContext.mainModel.getProperty("/objTestataCo");
			var lingua = sap.ui.getCore().getConfiguration().getLanguage();
			var user = sap.ui.getCore().AppContext.mainModel.getProperty("/currentUser");
			jQuery.ajax({
				url: "/backend/zpur_release_Co?user_email=" + user + "&doc_num=" + doc.doc_num + "&language=" + lingua.substring(1, 0).toLocaleUpperCase(),
				cache: false,
				async: false,
				type: 'GET',
				dataType: 'json',
				error: function (datao) {
					//console.log(datao);
					var string = datao.responseText;
					var r = string.replace("{return:", '{"return":');
					r = r.replace(/text:/g, '"text":');
					r = r.replace(/\\&/g, '&');
					r = r.replace(/\\'/g, "'");
					var obj = JSON.parse(r);
					sap.ui.getCore().AppContext.mainModel.setProperty("/objReturn", obj, true);
					if (obj.return === "KO") {
						MessageBox.warning((that.getResourceBundle().getText(obj.text)), {
							onClose: function (oAction) {
								if (oAction === MessageBox.Action.OK) {
									window.location.reload();
								}
							}
						});
					} else {
					//MessageBox.warning(datao.responseText);
					//var stringurl = window.location.hash.split('?');
					//window.location.hash = stringurl;
						window.location.reload();
					}
				}
			});
		}
	});
}, /* bExport= */ true);