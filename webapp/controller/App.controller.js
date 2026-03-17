sap.ui.define([
	"sap/com/bedigix/approvectrfe/controller/BaseController",
	"sap/m/MessageBox",
	"sap/ui/model/json/JSONModel",
	"sap/ui/core/routing/History"
], function (BaseController, MessageBox, JSONModel, History) {
	"use strict";
	var that;
	return BaseController.extend("sap.com.bedigix.approvectrfe.controller.controller.App", {
		onInit: function () {
			var oViewModel,
				oListSelector = this.getOwnerComponent().oListSelector,
				iOriginalBusyDelay = this.getView().getBusyIndicatorDelay();

			oViewModel = new JSONModel({
				busy: true,
				delay: 0
			});
			this.setModel(oViewModel, "appView");

			sap.ui.getCore().AppContext = new Object();
			sap.ui.getCore().AppContext.context = this;
			sap.ui.getCore().AppContext.mainModel = new JSONModel({
				elencoListaCo: [],
				lengthListaCo: 0,
				currentUser: "",
				objTestataCo: {},
				//doc_type : "",
				//doc_value: "",
				header_text_length: 0,
				header_text: "",
				//currency: "",
				elencoListaCo_item: [],
				elencoListaCo_item_length: 0,
				elencoDettagliCo: {},
				arrayDettagliNoteCo: [],
				flagWS32: true
			});
			sap.ui.getCore().AppContext.mainView = this.getView();
			sap.ui.getCore().AppContext.mainView.setModel(sap.ui.getCore().AppContext.mainModel);

			this.setWS31();
			this.FirstRecord("/elencoListaCo");
			// Makes sure that master view is hidden in split app
			// after a new list entry has been selected.
			oListSelector.attachListSelectionChange(function () {
				this.byId("idAppControl").hideMaster();
			}, this);

			return new Promise(function (fnResolve) {
				var oModel, aPromises = [];
				oModel = this.getOwnerComponent().getModel();
				if (oModel !== undefined) {
					aPromises.push(oModel.metadataLoaded);
				}
				//in questo aPromises array inserisco i dati all'interno della mia view principale
				//adesso è vuota e quindi non è definita
				return Promise.all(aPromises).then(function () {
					oViewModel.setProperty("/busy", false);
					oViewModel.setProperty("/delay", iOriginalBusyDelay);
					fnResolve();
				});
			}.bind(this));
		},

		setMode: function (sMode) {
			this.byId("idAppControl").setMode(sMode);
		},

		setWS31: function () {
			this.showBusyDialog();
			var currentUser = "";
			$.when(
				jQuery.ajax({
					url: "user-api/currentUser",
					cache: false,
					async: false,
					type: 'GET',
					contentType: "application/json",
					dataType: 'json',
					success: function (data) {
						//console.log(data);
						currentUser = data.email;
						sap.ui.getCore().AppContext.mainModel.setProperty("/currentUser", currentUser, true);
					},
					error: function (oDataE) {
						//console.log("Errore get User Current  " + oDataE);
					}
				})
			).then(function () {
				jQuery.ajax({
					url: "backend/zpur_getlist_co?user_email=" + currentUser,
					cache: false,
					async: false,
					type: 'GET',
					//per levare il statusCode basta togliere il contentType e il dataType come parametro
					contentType: "application/json",
					dataType: 'json',
					statusCode: {
						200: function (data) {
							console.log("sii in chiamata servizio getCommesseFromGruppoApprovatore: " + data.responseText);
							var string = data.responseText;
							var r = string.replace("{doc_list:", '{"doc_list":');
							r = r.replace(/\\&/g, '&');
							r = r.replace(/\\'/g, "'");
							r = r.replace(/vendor_name:/g, '"vendor_name":');
							r = r.replace(/doc_value:/g, '"doc_value":');
							r = r.replace(/doc_num:/g, '"doc_num":');
							r = r.replace(/purch_grp:/g, '"purch_grp":');
							r = r.replace(/company:/g, '"company":');
							r = r.replace(/currency:/g, '"currency":');
							r = r.replace(/doc_date:/g, '"doc_date":');
							r = r.replace(/soc_desc:/g, '"soc_desc":');
							r = r.replace(/count_item:/g, '"count_item":');
							r = r.replace(/num_atta:/g, '"num_atta":');
							r = r.replace(/error:/g, '"error":'); //aggiunto nuovo campo BackEnd LS
							r = r.replace(/in_elab:/g, '"in_elab":'); //aggiunto nuovo campo BackEnd LS
							var obj = JSON.parse(r);
							sap.ui.getCore().AppContext.mainModel.setProperty("/elencoListaCo", obj.doc_list, true);
							sap.ui.getCore().AppContext.mainModel.setProperty("/lengthListaCo", obj.doc_list.length, true);
						},
						500: function (data) {
							console.log("ERRORE in chiamata servizio backend lista: " + data.responseText);
						}
					}
				});
			});
			this.hideBusyDialog();
		},

		FirstRecord: function (pathFirst) {
			var parametroDoc = sap.ui.getCore().AppContext.mainModel.getProperty(pathFirst);
			var user = sap.ui.getCore().AppContext.mainModel.getProperty("/currentUser");
			var startupParams = undefined;
			/*if (this.getOwnerComponent().getComponentData() != undefined) {
				startupParams = this.getOwnerComponent().getComponentData().technicalParameters;
				startupParams=startupParams["sap-ui-app-id-hint"];
				startupParams=startupParams[0];
			}*/
			if (location.hash != undefined) {
				startupParams = location.hash;
			}
			if (startupParams != undefined && startupParams.search('doc_num') != -1) {
				// cerco l'ordine passato nella url
				var Object = startupParams.split('?doc_num=');
				location.hash = Object[0];
				//Verifico che sia presente nella lista
				for (var i = 0; i < parametroDoc.length; i++) {
					if (parametroDoc[i].doc_num === Object[1]) {
						var item_i = parametroDoc[i];
						parametroDoc[i] = parametroDoc[0];
						parametroDoc[0] = item_i;
						//	parametroDoc[0].doc_num = Object[1];
						var ok = 'X'; //identificare il valore del parametro
					}
				}
				if (ok !== 'X') {
					MessageBox.warning((this.getResourceBundle().getText("noItems")), {
						onClose: function (oAction) {
							if (oAction === MessageBox.Action.OK) {
								window.location.reload();
							}
						}
					});
				} else {
					for (var j = 0; j < parametroDoc.length; j++) {
						if (parametroDoc[j].in_elab !== 'X') {
							this.WS32(parametroDoc[j].doc_num, user, parametroDoc[j].count_item, parametroDoc[j].in_elab);
							sap.ui.getCore().AppContext.mainModel.setProperty("/flagWS32", true);
							/* >>> U068 - Allegati */
							this.getAllegati(parametroDoc[j].doc_num, user);
							/* <<< U068 - Allegati */
							break;
						}
					}
				}
			} else {
				if ((parametroDoc.length > 0) && (parametroDoc[0].error !== 'X')) {
					for (var j = 0; j < parametroDoc.length; j++) {
						if (parametroDoc[j].in_elab !== 'X') {
							this.WS32(parametroDoc[j].doc_num, user, parametroDoc[j].count_item, parametroDoc[j].in_elab);
							sap.ui.getCore().AppContext.mainModel.setProperty("/flagWS32", true);
							/* >>> U068 - Allegati */
							this.getAllegati(parametroDoc[j].doc_num, user);
							/* <<< U068 - Allegati */
							break;
						}
					}
				} else {
					if ((parametroDoc.length > 0) && (parametroDoc[0].error === 'X')) {
						// No Authorization Profile
						MessageBox.warning(this.getResourceBundle().getText("noAuthProfile"));
					} else
						// No items in the list
						MessageBox.warning(this.getResourceBundle().getText("noItemsFound"));
				}
			}
		},

		WS32: function (doc_num, user, tot_item, elab) {
			that = this;
			var lingua = sap.ui.getCore().getConfiguration().getLanguage();
			//var docList = {};
			var flag = true;
			var range = parseInt(tot_item) / 100;
			var conteggio = 100;
			if (elab === 'X') {
				MessageBox.error(this.getResourceBundle().getText("inElab"));
			} else {
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
							200: function (data) {
								console.log("sii in chiamata servizio getCommesseFromGruppoApprovatore: " + data.responseText);
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
							},
							500: function (data) {
								//console.log("ERRORE in chiamata servizio backend lista: "+ data.responseText);
								sap.ui.getCore().AppContext.mainModel.setProperty("/objTestataCo", "", true);
								sap.ui.getCore().AppContext.mainModel.setProperty("/header_text", "".header_text, true);
								sap.ui.getCore().AppContext.mainModel.setProperty("/elencoListaCo_item", "".item_list, true);
								MessageBox.error(that.getResourceBundle().getText("errCaricamento"));
								flag = false;
							},
							504: function (data) {
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
						if (i == 0) {
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
									200: function (data) {
										console.log("sii in chiamata servizio getCommesseFromGruppoApprovatore: " + data.responseText);
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
									},
									500: function (data) {
										//console.log("ERRORE in chiamata servizio backend lista: "+ data.responseText);
										sap.ui.getCore().AppContext.mainModel.setProperty("/objTestataCo", "", true);
										sap.ui.getCore().AppContext.mainModel.setProperty("/header_text", "".header_text, true);
										sap.ui.getCore().AppContext.mainModel.setProperty("/elencoListaCo_item", "".item_list, true);
										MessageBox.error(that.getResourceBundle().getText("errCaricamento"));
										flag = false;
									},
									504: function (data) {
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
									200: function (data) {
										console.log("sii in chiamata servizio getCommesseFromGruppoApprovatore: " + data.responseText);
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
										console.log(objTestataCo);
										sap.ui.getCore().AppContext.mainModel.setProperty("/objTestataCo", objTestataCo, true);
										sap.ui.getCore().AppContext.mainModel.setProperty("/header_text", objTestataCo.header_text, true);
										sap.ui.getCore().AppContext.mainModel.setProperty("/elencoListaCo_item", objTestataCo.item_list, true);
										sap.ui.getCore().AppContext.mainModel.setProperty("/elencoListaCo_item_length", objTestataCo.item_list.length, true);
										flag = true;
									},
									500: function (data) {
										//console.log("ERRORE in chiamata servizio backend lista: "+ data.responseText);
										sap.ui.getCore().AppContext.mainModel.setProperty("/objTestataCo", "", true);
										sap.ui.getCore().AppContext.mainModel.setProperty("/header_text", "".header_text, true);
										sap.ui.getCore().AppContext.mainModel.setProperty("/elencoListaCo_item", "".item_list, true);
										MessageBox.error(that.getResourceBundle().getText("errCaricamento"));
										flag = false;
									},
									504: function (data) {
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
		}
		/* <<< U068 - Allegati */

	});
});