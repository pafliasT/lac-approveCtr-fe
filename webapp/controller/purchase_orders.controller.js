sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/com/bedigix/approvectrfe/controller/BaseController",
	"sap/m/MessageBox",
	"./utilities",
	"sap/ui/core/routing/History",
	"sap/ui/model/json/JSONModel",
	"sap/ui/core/BusyIndicator"
], function (Controller, BaseController, MessageBox, Utilities, History, JSONModel, BusyIndicator) {
	"use strict";
	var that;
	return BaseController.extend("sap.com.bedigix.approvectrfe.controller.purchase_orders", {
		onInit: function () {
			this.oRouter = sap.ui.core.UIComponent.getRouterFor(this);
			this.oRouter.getTarget("purchase_orders").attachDisplay(jQuery.proxy(this.handleRouteMatched, this));
			that = this;
		},

		handleRouteMatched: function (oEvent) {
			jQuery.sap.log.info("purchase_orders controller handleRouteMatched");
			var oParams = {};
			var oView = this.getView();
			var bSelectFirstListItem = true;
			if (oEvent.mParameters.data.context || oEvent.mParameters.data.masterContext === undefined) {
				this.sContext = oEvent.mParameters.data.context;
				var oPath;
				oEvent.mParameters.data.masterContext = sap.ui.getCore().AppContext.mainModel.getProperty("/elencoListaCo/0/doc_num");
				this.sMasterContext = oEvent.mParameters.data.masterContext;
				if (this.sMasterContext) {
					oPath = {
						path: "/" + this.sMasterContext,
						parameters: oParams
					};
					this.getView().bindObject(oPath);
				} else if (this.sContext) {
					var sCurrentContextPath = "/" + this.sContext;

					bSelectFirstListItem = false;
				}
			}
			if (bSelectFirstListItem) {
				oView.addEventDelegate({
					onBeforeShow: function () {
						var oContent = this.getView().getContent();
						if (oContent) {
							if (!sap.ui.Device.system.phone) {
								var oList = oContent[0].getContent() ? oContent[0].getContent()[0] : undefined;
								if (oList) {
									var sContentName = oList.getMetadata().getName();
									if (sContentName.indexOf("List") > -1) {
										oList.attachEventOnce("updateFinished", function () {
											var oFirstListItem = this.getItems()[0];
											//that.getView().getModel("applicationModel").setProperty("/count",this.getItems().length);
											if (oFirstListItem) {
												oList.setSelectedItem(oFirstListItem);
												oList.fireItemPress({
													listItem: oFirstListItem
												});
											}
										}.bind(oList));
									}
								}
							}
						}
					}.bind(this)
				});
			}
		},

		_attachSelectListItemWithContextPath: function (sContextPath) {
			var oView = this.getView();
			var oContent = this.getView().getContent();
			if (oContent) {
				if (!sap.ui.Device.system.phone) {
					var oList = oContent[0].getContent() ? oContent[0].getContent()[0] : undefined;
					if (oList && sContextPath) {
						var sContentName = oList.getMetadata().getName();
						var oItemToSelect, oItem, oContext, aItems, i;
						if (sContentName.indexOf("List") > -1) {
							if (oList.getItems().length) {
								oItemToSelect = null;
								aItems = oList.getItems();
								for (i = 0; i < aItems.length; i++) {
									oItem = aItems[i];
									oContext = oItem.getBindingContext();
									if (oContext && oContext.getPath() === sContextPath) {
										oItemToSelect = oItem;
									}
								}
								if (oItemToSelect) {
									oList.setSelectedItem(oItemToSelect);
								}
							} else {
								oView.addEventDelegate({
									onBeforeShow: function () {
										oList.attachEventOnce("updateFinished", function () {
											oItemToSelect = null;
											aItems = oList.getItems();
											for (i = 0; i < aItems.length; i++) {
												oItem = aItems[i];
												oContext = oItem.getBindingContext();
												if (oContext && oContext.getPath() === sContextPath) {
													oItemToSelect = oItem;
												}
											}
											if (oItemToSelect) {
												oList.setSelectedItem(oItemToSelect);
											}
										});
									}
								});
							}
						}
					}
				}
			}
		},

		_onObjectListItemPress: function (oEvent) {
			var oBindingContext = oEvent.getParameter("listItem").getBindingContext();
			var test =
				new Promise(function (fnResolve) {
					if (sap.ui.getCore().AppContext.mainModel.getProperty("/flagWS32") === false) {
						this.doNavigate("PurchaseOrderDetails", oBindingContext, fnResolve, "");
					}
				}.bind(this)).catch(function (err) {
					//sap.ui.core.BusyIndicator.hide();
					if (err !== undefined) {
						sap.ui.getCore().AppContext.mainModel.setProperty("/flagWS32", false);
						MessageBox.error(err.message);
					}
				});
			sap.ui.getCore().AppContext.mainModel.setProperty("/flagWS32", false);
			return test;
		},

		doNavigate: function (sRouteName, oBindingContext, fnPromiseResolve, sViaRelation) {
			var sPath = (oBindingContext) ? oBindingContext.getPath() : null;
			var oModel = (oBindingContext) ? oBindingContext.getModel() : null;

			var sEntityNameSet;
			if (sPath !== null && sPath !== "") {
				var doc_list = sap.ui.getCore().AppContext.mainModel.getProperty(sPath);
				var user = sap.ui.getCore().AppContext.mainModel.getProperty("/currentUser");
				//sap.ui.core.BusyIndicator.show(0);
				//if (read_doc.doc_num !== doc_list.doc_num) {
				this.WS32(doc_list.doc_num, user, doc_list.count_item, doc_list.in_elab);
				//}
				if (sPath.substring(0, 1) === "/") {
					sPath = sPath.substring(1);
				}
				sEntityNameSet = sPath; //sPath.split("(")[0];
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

		WS32: function (doc_num, user, tot_item, elab) {
			var lingua = sap.ui.getCore().getConfiguration().getLanguage();
			var range = parseInt(tot_item) / 100;
			var conteggio = 100;
			var flag = true;
			if (elab === 'X') {
				sap.ui.getCore().AppContext.mainModel.setProperty("/objTestataCo", "", true);
				sap.ui.getCore().AppContext.mainModel.setProperty("/header_text", "".header_text, true);
				sap.ui.getCore().AppContext.mainModel.setProperty("/elencoListaCo_item", "".item_list, true);
				MessageBox.warning(this.getResourceBundle().getText("inElab"));
			} else {
				that.showBusyDialog();
				if (parseInt(tot_item) < 100) {
					var item_da = '';
					var item_a = '';
					// Richiamo una sola volta il BackEnd
					jQuery.ajax({
						url: "backend/zpur_gethead_co?user_email=" + user + "&doc_num=" + doc_num + "&language=" + lingua.substring(1, 0).toLocaleUpperCase() +
							"&item_da=" + item_da + "&item_a=" + item_a,
						cache: false,
						async: false,

						type: 'GET',
						//per levare il statusCode basta togliere il contentType e il dataType come parametro
						contentType: "application/json",
						dataType: 'json',
						statusCode: {
							200: jQuery.proxy(function (data) {
								jQuery.sap.log.info("sii in chiamata servizio getCommesseFromGruppoApprovatore: " + data.responseText);
								//console.log("sii in chiamata servizio getCommesseFromGruppoApprovatore: " + data.responseText);
								var string = data.responseText;
								var r = string.replace("{vendor_no:", '{"vendor_no":');
								r = r.replace(/vendor_name:/g, '"vendor_name":');
								r = r.replace(/purch_grp_no:/g, '"purch_grp_no":');
								r = r.replace(/purch_grp:/g, '"purch_grp":');
								r = r.replace(/doc_value:/g, '"doc_value":');
								r = r.replace(/doc_num:/g, '"doc_num":');
								r = r.replace(/paym_terms:/g, '"paym_terms":');
								r = r.replace(/incoterms:/g, '"incoterms":');
								r = r.replace(/company:/g, '"company":');
								r = r.replace(/header_text:/g, '"header_text":');
								r = r.replace(/doc_text:/g, '"doc_text":');
								r = r.replace(/item_list:/g, '"item_list":');
								r = r.replace(/item_no:/g, '"item_no":');
								r = r.replace(/material:/g, '"material":');
								r = r.replace(/description:/g, '"description":');
								r = r.replace(/quantity:/g, '"quantity":');
								r = r.replace(/uom:/g, '"uom":');
								r = r.replace(/unit_price:/g, '"unit_price":');
								r = r.replace(/unita_prz:/g, '"unita_prz":');
								r = r.replace(/price_val:/g, '"price_val":');
								r = r.replace(/currency:/g, '"currency":');
								r = r.replace(/uom_prz:/g, '"uom_prz":');
								r = r.replace(/start_date:/g, '"start_date":');
								r = r.replace(/end_date:/g, '"end_date":');
								r = r.replace(/name_user:/g, '"name_user":');
								r = r.replace(/valid_contr:/g, '"valid_contr":');
								r = r.replace(/\\&/g, "&");
								r = r.replace(/\\'/g, "'");
								var obj = JSON.parse(r);
								sap.ui.getCore().AppContext.mainModel.setProperty("/objTestataCo", obj, true);
								sap.ui.getCore().AppContext.mainModel.setProperty("/header_text", obj.header_text, true);
								sap.ui.getCore().AppContext.mainModel.setProperty("/elencoListaCo_item", obj.item_list, true);
								sap.ui.getCore().AppContext.mainModel.setProperty("/elencoListaCo_item_length", obj.item_list.length, true);
								flag = true;
								/* >>> U068 - Allegati */
								this.getAllegati(doc_num, user);
								/* <<< U068 - Allegati */
							}, this),
							500: function (data) {
								jQuery.sap.log.error("ERRORE in chiamata servizio backend lista: " + data.responseText);
								//console.log("ERRORE in chiamata servizio backend lista: "+ data.responseText);
								sap.ui.getCore().AppContext.mainModel.setProperty("/objTestataCo", "", true);
								sap.ui.getCore().AppContext.mainModel.setProperty("/header_text", "".header_text, true);
								sap.ui.getCore().AppContext.mainModel.setProperty("/elencoListaCo_item", "".item_list, true);
								MessageBox.error(that.getResourceBundle().getText("errCaricamento"));
								flag = false;
							},
							504: function (data) {
								jQuery.sap.log.error("ERRORE in chiamata servizio backend lista: " + data.responseText);
								//console.log("ERRORE in chiamata servizio backend lista: "+ data.responseText);
								sap.ui.getCore().AppContext.mainModel.setProperty("/objTestataCo", "", true);
								sap.ui.getCore().AppContext.mainModel.setProperty("/header_text", "".header_text, true);
								sap.ui.getCore().AppContext.mainModel.setProperty("/elencoListaCo_item", "".item_list, true);
								MessageBox.error(that.getResourceBundle().getText("errCaricamento"));
								flag = false;
							}
						}
					});
				} else {
					for (var i = 0; i <= range && flag !== false; i++) {
						if (i === 0) {
							jQuery.ajax({
								type: 'GET',
								url: "backend/zpur_gethead_co?user_email=" + user + "&doc_num=" + doc_num + "&language=" + lingua.substring(1, 0).toLocaleUpperCase() +
									"&item_da=" + i + "&item_a=" + (conteggio + 1),
								cache: false,
								async: false,
								//per levare il statusCode basta togliere il contentType e il dataType come parametro
								contentType: "application/json",
								dataType: 'json',
								statusCode: {
									200: jQuery.proxy(function (data) {
										jQuery.sap.log.info("sii in chiamata servizio getCommesseFromGruppoApprovatore: " + data.responseText);
										//console.log("sii in chiamata servizio getCommesseFromGruppoApprovatore: " + data.responseText);
										var string = data.responseText;
										var r = string.replace("{vendor_no:", '{"vendor_no":');
										r = r.replace(/vendor_name:/g, '"vendor_name":');
										r = r.replace(/purch_grp_no:/g, '"purch_grp_no":');
										r = r.replace(/purch_grp:/g, '"purch_grp":');
										r = r.replace(/doc_value:/g, '"doc_value":');
										r = r.replace(/doc_num:/g, '"doc_num":');
										r = r.replace(/paym_terms:/g, '"paym_terms":');
										r = r.replace(/incoterms:/g, '"incoterms":');
										r = r.replace(/company:/g, '"company":');
										r = r.replace(/header_text:/g, '"header_text":');
										r = r.replace(/doc_text:/g, '"doc_text":');
										r = r.replace(/item_list:/g, '"item_list":');
										r = r.replace(/item_no:/g, '"item_no":');
										r = r.replace(/material:/g, '"material":');
										r = r.replace(/description:/g, '"description":');
										r = r.replace(/quantity:/g, '"quantity":');
										r = r.replace(/uom:/g, '"uom":');
										r = r.replace(/unit_price:/g, '"unit_price":');
										r = r.replace(/unita_prz:/g, '"unita_prz":');
										r = r.replace(/price_val:/g, '"price_val":');
										r = r.replace(/currency:/g, '"currency":');
										r = r.replace(/uom_prz:/g, '"uom_prz":');
										r = r.replace(/start_date:/g, '"start_date":');
										r = r.replace(/end_date:/g, '"end_date":');
										r = r.replace(/name_user:/g, '"name_user":');
										r = r.replace(/valid_contr:/g, '"valid_contr":');
										r = r.replace(/\\&/g, "&");
										r = r.replace(/\\'/g, "'");
										var obj = JSON.parse(r);
										sap.ui.getCore().AppContext.mainModel.setProperty("/objTestataCo", obj, true);
										sap.ui.getCore().AppContext.mainModel.setProperty("/header_text", obj.header_text, true);
										sap.ui.getCore().AppContext.mainModel.setProperty("/elencoListaCo_item", obj.item_list, true);
										sap.ui.getCore().AppContext.mainModel.setProperty("/elencoListaCo_item_length", obj.item_list.length, true);
										flag = true;
										/* >>> U068 - Allegati */
										this.getAllegati(doc_num, user);
										/* <<< U068 - Allegati */
									}, this),
									500: function (data) {
										jQuery.sap.log.error("ERRORE in chiamata servizio backend lista: " + data.responseText);
										//console.log("ERRORE in chiamata servizio backend lista: "+ data.responseText);
										sap.ui.getCore().AppContext.mainModel.setProperty("/objTestataCo", "", true);
										sap.ui.getCore().AppContext.mainModel.setProperty("/header_text", "".header_text, true);
										sap.ui.getCore().AppContext.mainModel.setProperty("/elencoListaCo_item", "".item_list, true);
										MessageBox.error(that.getResourceBundle().getText("errCaricamento"));
										flag = false;
									},
									504: function (data) {
										jQuery.sap.log.error("ERRORE in chiamata servizio backend lista: " + data.responseText);
										//console.log("ERRORE in chiamata servizio backend lista: "+ data.responseText);
										sap.ui.getCore().AppContext.mainModel.setProperty("/objTestataCo", "", true);
										sap.ui.getCore().AppContext.mainModel.setProperty("/header_text", "".header_text, true);
										sap.ui.getCore().AppContext.mainModel.setProperty("/elencoListaCo_item", "".item_list, true);
										MessageBox.error(that.getResourceBundle().getText("errCaricamento"));
										flag = false;
									}
								}
							});
						} else {
							jQuery.ajax({
								type: 'GET',
								url: "backend/zpur_gethead_co?user_email=" + user + "&doc_num=" + doc_num + "&language=" + lingua.substring(1, 0).toLocaleUpperCase() +
									"&item_da=" + (i * conteggio) + "&item_a=" + (conteggio + 1),
								cache: false,
								async: false,
								//per levare il statusCode basta togliere il contentType e il dataType come parametro
								contentType: "application/json",
								dataType: 'json',
								statusCode: {
									200: jQuery.proxy(function (data) {
										jQuery.sap.log.info("sii in chiamata servizio getCommesseFromGruppoApprovatore: " + data.responseText);
										//console.log("sii in chiamata servizio getCommesseFromGruppoApprovatore: " + data.responseText);
										var string = data.responseText;
										var r = string.replace("{vendor_no:", '{"vendor_no":');
										r = r.replace(/vendor_name:/g, '"vendor_name":');
										r = r.replace(/purch_grp_no:/g, '"purch_grp_no":');
										r = r.replace(/purch_grp:/g, '"purch_grp":');
										r = r.replace(/doc_value:/g, '"doc_value":');
										r = r.replace(/doc_num:/g, '"doc_num":');
										r = r.replace(/paym_terms:/g, '"paym_terms":');
										r = r.replace(/incoterms:/g, '"incoterms":');
										r = r.replace(/company:/g, '"company":');
										r = r.replace(/header_text:/g, '"header_text":');
										r = r.replace(/doc_text:/g, '"doc_text":');
										r = r.replace(/item_list:/g, '"item_list":');
										r = r.replace(/item_no:/g, '"item_no":');
										r = r.replace(/material:/g, '"material":');
										r = r.replace(/description:/g, '"description":');
										r = r.replace(/quantity:/g, '"quantity":');
										r = r.replace(/uom:/g, '"uom":');
										r = r.replace(/unit_price:/g, '"unit_price":');
										r = r.replace(/unita_prz:/g, '"unita_prz":');
										r = r.replace(/price_val:/g, '"price_val":');
										r = r.replace(/currency:/g, '"currency":');
										r = r.replace(/uom_prz:/g, '"uom_prz":');
										r = r.replace(/start_date:/g, '"start_date":');
										r = r.replace(/end_date:/g, '"end_date":');
										r = r.replace(/name_user:/g, '"name_user":');
										r = r.replace(/valid_contr:/g, '"valid_contr":');
										r = r.replace(/\\&/g, "&");
										r = r.replace(/\\'/g, "'");
										var obj = JSON.parse(r);
										var objTestataCo = sap.ui.getCore().AppContext.mainModel.getProperty("/objTestataCo");
										Array.prototype.push.apply(objTestataCo, obj);
										Array.prototype.push.apply(objTestataCo.header_text, obj.header_text);
										Array.prototype.push.apply(objTestataCo.item_list, obj.item_list);
										jQuery.sap.log.info(objTestataCo);
										//console.log(objTestataCo);
										sap.ui.getCore().AppContext.mainModel.setProperty("/objTestataCo", objTestataCo, true);
										sap.ui.getCore().AppContext.mainModel.setProperty("/header_text", objTestataCo.header_text, true);
										sap.ui.getCore().AppContext.mainModel.setProperty("/elencoListaCo_item", objTestataCo.item_list, true);
										sap.ui.getCore().AppContext.mainModel.setProperty("/elencoListaCo_item_length", objTestataCo.item_list.length, true);
										flag = true;
										/* >>> U068 - Allegati */
										this.getAllegati(doc_num, user);
										/* <<< U068 - Allegati */
									}, this),
									500: function (data) {
										jQuery.sap.log.error("ERRORE in chiamata servizio backend lista: " + data.responseText);
										//console.log("ERRORE in chiamata servizio backend lista: "+ data.responseText);
										sap.ui.getCore().AppContext.mainModel.setProperty("/objTestataCo", "", true);
										sap.ui.getCore().AppContext.mainModel.setProperty("/header_text", "".header_text, true);
										sap.ui.getCore().AppContext.mainModel.setProperty("/elencoListaCo_item", "".item_list, true);
										MessageBox.error(that.getResourceBundle().getText("errCaricamento"));
										flag = false;
									},
									504: function (data) {
										jQuery.sap.log.error("ERRORE in chiamata servizio backend lista: " + data.responseText);
										//console.log("ERRORE in chiamata servizio backend lista: "+ data.responseText);
										sap.ui.getCore().AppContext.mainModel.setProperty("/objTestataCo", "", true);
										sap.ui.getCore().AppContext.mainModel.setProperty("/header_text", "".header_text, true);
										sap.ui.getCore().AppContext.mainModel.setProperty("/elencoListaCo_item", "".item_list, true);
										MessageBox.error(that.getResourceBundle().getText("errCaricamento"));
										flag = false;
									}
								}
							});
						}
					}
				}
				that.hideBusyDialog();
			}
		},

		/* >>> U068 - Allegati */
		getAllegati: function (docNum, email) {
			that = this;
			var oModel = sap.ui.getCore().AppContext.mainModel;
			var items = [];
			oModel.setProperty("/items", items, true);
			oModel.setProperty("/lunghezza", 0, true);
			jQuery.ajax({
				type: "GET",
				url: "backend/zpur_getatta_co?user_email=" + email + "&doc_num=" + docNum,
				headers: {
					"content-type": "application/json",
					"Accept": "application/json"
				},
				cache: false,
				async: false,
				success: function (data) {
					data = data.replace(/doc_id:/g, '"doc_id":');
					data = data.replace(/obj_type:/g, '"obj_type":');
					data = data.replace(/obj_name:/g, '"obj_name":');
					data = data.replace(/obj_descr:/g, '"obj_descr":');
					data = data.replace(/creat_name:/g, '"creat_name":');
					data = data.replace(/creat_fnam:/g, '"creat_fnam":');
					data = data.replace(/creat_date:/g, '"creat_date":');
					data = data.replace(/creat_time:/g, '"creat_time":');
					data = data.replace(/chang_name:/g, '"chang_name":');
					data = data.replace(/chang_fnam:/g, '"chang_fnam":');
					data = data.replace(/chang_date:/g, '"chang_date":');
					data = data.replace(/chang_time:/g, '"chang_time":');
					data = data.replace(/filename:/g, '"filename":');
					data = data.replace(/\\&/g, "");
					data = data.replace(/\\'/g, "");
					data = data.split("/").join(' ');
					data = JSON.parse(data);
					if (data.length > 0) {
						for (var i = 0; i < data.length; i++) {
							var filename = data[i].filename;
							var chunks = filename.split(".");
							var estensione = chunks[chunks.length - 1];
							var mimeType = that.getMimeType(estensione);
							var urlFile = that.contenutoAllegati(data[i].doc_id, mimeType);
							items.push({
								"documentId": data[i].doc_id,
								"visibleEdit": false,
								"visibleDelete": false,
								"fileName": filename,
								"mimeType": mimeType,
								"mediaType": mimeType,
								"thumbnailUrl": "",
								"url": urlFile,
								"uploadState": "Complete",
								"attributes": [{
									// 	"title": "Tipo Documento",
									// 	"text": data[i].obj_type,
									// 	"active": true
									// }, {
									// 	"title": "Descrizione Documento",
									// 	"text": data[i].obj_descr,
									// 	"active": true
									// }, {
									"title": "Data Creazione",
									"text": data[i].creat_date,
									"active": true
								}, {
									"title": "Autore",
									"text": data[i].creat_name,
									"active": true
								}],
								// "markers": [{
								// 	"type": "Locked"
								// }],
								"selected": false
							});
						}
						oModel.setProperty("/items", items, true);
						oModel.setProperty("/lunghezza", data.length, true);
					}
					//console.log(data);
					jQuery.sap.log.info(data);
				},
				error: function (errorDate) {
					jQuery.sap.log.error("Errore GET zpur_getatta_co");
				}
			});
		},

		getMimeType: function (type) {
			type = type.toUpperCase();
			switch (type) {
			case "PDF":
				return "application/pdf";
			case "DOC":
				return "application/msword";
			case "DOCX":
				return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
			case "XLS":
				return "application/vnd.ms-excel";
			case "XLSX":
				return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
			case "PPT":
				return "application/vnd.ms-powerpoint";
			case "PPTX":
				return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
			case "ZIP":
				return "application/zip";
			case "GIF":
				return "image/gif";
			case "PNG":
				return "image/png";
			case "JPEG":
				return "image/jpeg";
			case "JPG":
				return "image/jpeg";
			default:
				return "application/octet-stream";
			}
		},

		contenutoAllegati: function (atta_id, mimeType) {
			var oModel = sap.ui.getCore().AppContext.mainModel;
			var email = oModel.getProperty("/currentUser");
			var docNum = oModel.getProperty("/objTestataCo/doc_num");
			var fileURL = "";
			jQuery.ajax({
				type: "GET",
				url: "backend/zpur_dwnatta_co?user_email=" + email + "&doc_num=" + docNum + "&atta_id=" + atta_id,
				headers: {
					"content-type": "application/json",
					"Accept": "application/json"
				},
				cache: false,
				async: false,
				success: function (data) {
					data = data.replace(/doc_id:/g, '"doc_id":');
					data = data.replace(/filename:/g, '"filename":');
					data = data.replace(/content64:/g, '"content64":');
					data = JSON.parse(data);
					if (data.content64 !== "") {
						// decode base64 string, remove space for IE compatibility
						var binary = atob(data.content64.replace(/\s/g, ''));
						var len = binary.length;
						var buffer = new ArrayBuffer(len);
						var view = new Uint8Array(buffer);
						for (var i = 0; i < len; i++) {
							view[i] = binary.charCodeAt(i);
						}
						var blob = new Blob([view], {
							type: mimeType
						});
						blob.name = data.filename;
						fileURL = URL.createObjectURL(blob);
					}
					jQuery.sap.log.info(data);
					//console.log(data);
				},
				error: function (errorDate) {
					jQuery.sap.log.error("Errore GET zpur_dwnatta_co");
					//console.log(errorDate); 
				}
			});
			return fileURL;
		},
		/* <<< U068 - Allegati */

		_onSearchFieldLiveChange: function (oEvent) {
			var sControlId = "sap_m_List_3";
			var oControl = this.getView().byId(sControlId);
			// Get the search query, regardless of the triggered event ('query' for the search event, 'newValue' for the liveChange one).
			var sQuery = oEvent.getParameter("query") || oEvent.getParameter("newValue");
			var sSourceId = oEvent.getSource().getId();
			return new Promise(function (fnResolve) {
				var aFinalFilters = [];
				var aFilters = [];
				// 1) Search filters (with OR)
				if (sQuery && sQuery.length > 0) {
					aFilters.push(new sap.ui.model.Filter("doc_num", sap.ui.model.FilterOperator.Contains, sQuery));
					aFilters.push(new sap.ui.model.Filter("vendor_name", sap.ui.model.FilterOperator.Contains, sQuery));
					/*	aFilters.push(new sap.ui.model.Filter("doc_date", sap.ui.model.FilterOperator.Contains, sQuery));*/
				}
				aFinalFilters = aFilters.length > 0 ? [new sap.ui.model.Filter(aFilters, false)] : [];
				var oBindingOptions = this.updateBindingOptions(sControlId, {
					filters: aFinalFilters
				}, sSourceId);
				var oBindingInfo = oControl.getBindingInfo("items");
				oControl.bindAggregation("items", {
					model: oBindingInfo.model,
					path: oBindingInfo.path,
					parameters: oBindingInfo.parameters,
					template: oBindingInfo.template,
					templateShareable: true,
					sorter: oBindingOptions.sorters,
					filters: oBindingOptions.filters
				});
			}.bind(this)).catch(function (err) {
				if (err !== undefined) {
					MessageBox.error(err.message);
				}
			});
		},

		updateBindingOptions: function (sCollectionId, oBindingData, sSourceId) {
			this.mBindingOptions = this.mBindingOptions || {};
			this.mBindingOptions[sCollectionId] = this.mBindingOptions[sCollectionId] || {};

			var aSorters = this.mBindingOptions[sCollectionId].sorters;
			var aGroupby = this.mBindingOptions[sCollectionId].groupby;

			// If there is no oBindingData parameter, we just need the processed filters and sorters from this function
			if (oBindingData) {
				if (oBindingData.sorters) {
					aSorters = oBindingData.sorters;
				}
				if (oBindingData.groupby || oBindingData.groupby === null) {
					aGroupby = oBindingData.groupby;
				}
				// 1) Update the filters map for the given collection and source
				this.mBindingOptions[sCollectionId].sorters = aSorters;
				this.mBindingOptions[sCollectionId].groupby = aGroupby;
				this.mBindingOptions[sCollectionId].filters = this.mBindingOptions[sCollectionId].filters || {};
				this.mBindingOptions[sCollectionId].filters[sSourceId] = oBindingData.filters || [];
			}

			// 2) Reapply all the filters and sorters
			var aFilters = [];
			for (var key in this.mBindingOptions[sCollectionId].filters) {
				aFilters = aFilters.concat(this.mBindingOptions[sCollectionId].filters[key]);
			}

			// Add the groupby first in the sorters array
			if (aGroupby) {
				aSorters = aSorters ? aGroupby.concat(aSorters) : aGroupby;
			}
			var aFinalFilters = aFilters.length > 0 ? [new sap.ui.model.Filter(aFilters, true)] : undefined;
			return {
				filters: aFinalFilters,
				sorters: aSorters
			};
		},

		onExit: function () {
			// to destroy templates for bound aggregations when templateShareable is true on exit to prevent duplicateId issue
			var aControls = [{
				"controlId": "sap_Responsive_Page_0-content-sap_m_ObjectList-1527499290411",
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

		}
	});
}, /* bExport= */ true);