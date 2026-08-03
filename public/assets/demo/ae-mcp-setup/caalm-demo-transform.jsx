// boot marker
(() => {
	try {
		var f = new File(
			"C:/Users/victo/Documents/ae-mcp-bridge/ae_transform_boot.txt",
		);
		f.open("w");
		f.write("boot " + new Date().toString());
		f.close();
	} catch (e) {}
})();
/**
 * Standalone CAALM demo transform (same logic as MCP transformCaalmDemo).
 * Close MCP Bridge Auto before running via File → Scripts → Run Script File.
 */
function transformCaalmDemo(args) {
	args = args || {};
	var ASSET_DIR =
		"c:/Users/victo/Development/caalm-next/public/assets/icons/demo-video/generated/";
	var DASHBOARD_FILES = [
		"demo-05-audit-charts.png",
		"demo-06-analytics.png",
		"demo-04-licenses.png",
		"demo-02-calendar.png",
		"demo-07-contracts-full.png",
	];
	var COLOR_BG = [248 / 255, 250 / 255, 252 / 255];
	var COLOR_BG_ALT = [242 / 255, 244 / 255, 248 / 255];
	var COLOR_TEAL = [3 / 255, 175 / 255, 191 / 255];
	var COLOR_TEXT = [51 / 255, 65 / 255, 85 / 255];
	var saveName = args.projectSaveName || "caalm-demo";
	var report = {
		status: "success",
		message: "",
		discovery: {},
		imported: [],
		textCompsProcessed: 0,
		dashboardsReplaced: 0,
		dashboardsAdded: 0,
		solidsRemapped: 0,
		shapesRemapped: 0,
		textUpdated: 0,
		layersRenamed: 0,
		itemsRenamed: 0,
		sceneCompsTouched: 0,
		fontFailures: [],
		errors: [],
		savedTo: null,
	};

	function replaceBrandText(value) {
		if (value === null || value === undefined) return value;
		return String(value)
			.replace(/NeuroStream/gi, "CAALM")
			.replace(/Smart SaaS/gi, "CAALM")
			.replace(/Ask AI anything/gi, "Ask CAALM anything");
	}

	function pickPoppinsLocal(currentFont) {
		var font = String(currentFont || "");
		var lower = font.toLowerCase();
		if (lower.indexOf("black") !== -1) return "Poppins-Black";
		if (lower.indexOf("extrabold") !== -1 || lower.indexOf("extra bold") !== -1)
			return "Poppins-ExtraBold";
		if (lower.indexOf("bold") !== -1) return "Poppins-Bold";
		if (lower.indexOf("semibold") !== -1 || lower.indexOf("semi bold") !== -1)
			return "Poppins-SemiBold";
		if (lower.indexOf("medium") !== -1) return "Poppins-Medium";
		if (lower.indexOf("light") !== -1) return "Poppins-Light";
		if (lower.indexOf("thin") !== -1) return "Poppins-Thin";
		if (lower.indexOf("italic") !== -1) return "Poppins-Italic";
		return "Poppins-Regular";
	}

	function updateTextDocLocal(textDocument) {
		var changed = false;
		var originalText = textDocument.text;
		var nextText = replaceBrandText(originalText);
		if (nextText !== originalText) {
			textDocument.text = nextText;
			changed = true;
		}
		var nextFont = pickPoppinsLocal(textDocument.font);
		if (textDocument.font !== nextFont) {
			try {
				textDocument.font = nextFont;
				changed = true;
			} catch (fontError) {
				try {
					textDocument.font = "Poppins";
					changed = true;
				} catch (fallbackError) {}
			}
		}
		try {
			var fc = textDocument.fillColor;
			if (fc && fc[0] > 0.85 && fc[1] > 0.85 && fc[2] > 0.85) {
				textDocument.fillColor = COLOR_TEXT;
				changed = true;
			}
		} catch (e3) {}
		return changed;
	}

	function luminance(rgb) {
		if (!rgb || rgb.length < 3) return 0;
		return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
	}

	function isDarkColor(rgb) {
		return luminance(rgb) < 0.35;
	}

	function isRedAccent(rgb) {
		if (!rgb || rgb.length < 3) return false;
		return rgb[0] > 0.55 && rgb[1] < 0.35 && rgb[2] < 0.35;
	}

	function remapSolidColor(rgb) {
		if (!rgb || rgb.length < 3) return null;
		if (isRedAccent(rgb)) return COLOR_TEAL;
		if (isDarkColor(rgb)) return COLOR_BG;
		return null;
	}

	function findCompByName(name) {
		for (var i = 1; i <= app.project.numItems; i++) {
			var item = app.project.item(i);
			if (item instanceof CompItem && item.name === name) return item;
		}
		return null;
	}

	function parseTextCompNumber(name) {
		var m = String(name).match(/^Text\s+(\d+)$/i);
		if (!m) return null;
		return parseInt(m[1], 10);
	}

	function isDashboardName(name) {
		var n = String(name).toLowerCase();
		return (
			/screen|dashboard|mockup|ui|preview|browser|laptop|phone|monitor|interface|saas|hero|content|placeholder|plate|image|footage|shot/.test(
				n,
			) || /demo-\d+/.test(n)
		);
	}

	function isImageFootage(item) {
		if (!(item instanceof FootageItem)) return false;
		try {
			if (item.mainSource instanceof FileSource) {
				var fname = String(item.file.name).toLowerCase();
				return /\.(png|jpg|jpeg|webp|tif|tiff|psd)$/.test(fname);
			}
		} catch (e) {}
		return false;
	}

	function collectTextComps() {
		var comps = [];
		for (var i = 1; i <= app.project.numItems; i++) {
			var item = app.project.item(i);
			if (!(item instanceof CompItem)) continue;
			var num = parseTextCompNumber(item.name);
			if (num !== null) comps.push({ comp: item, num: num });
		}
		comps.sort((a, b) => a.num - b.num);
		return comps;
	}

	function importDashboards(folderName) {
		var folder = null;
		for (var i = 1; i <= app.project.numItems; i++) {
			var item = app.project.item(i);
			if (item instanceof FolderItem && item.name === folderName) {
				folder = item;
				break;
			}
		}
		if (!folder) folder = app.project.items.addFolder(folderName);

		var imported = [];
		for (var f = 0; f < DASHBOARD_FILES.length; f++) {
			var path = ASSET_DIR + DASHBOARD_FILES[f];
			var file = new File(path);
			if (!file.exists) {
				imported.push({
					file: DASHBOARD_FILES[f],
					error: "missing",
					path: path,
				});
				continue;
			}
			var existing = null;
			for (var j = 1; j <= app.project.numItems; j++) {
				var it = app.project.item(j);
				if (it instanceof FootageItem && it.name === DASHBOARD_FILES[f]) {
					existing = it;
					break;
				}
			}
			if (existing) {
				imported.push({
					file: DASHBOARD_FILES[f],
					item: existing,
					reused: true,
				});
				continue;
			}
			var io = new ImportOptions(file);
			io.importAs = ImportAsType.FOOTAGE;
			var footage = app.project.importFile(io);
			footage.parentFolder = folder;
			imported.push({ file: DASHBOARD_FILES[f], item: footage, reused: false });
		}
		return imported;
	}

	function findReplaceableLayers(comp, depth) {
		var found = [];
		if (!comp || !(comp instanceof CompItem) || depth > 2) return found;
		for (var i = 1; i <= comp.numLayers; i++) {
			var layer = comp.layer(i);
			var source = null;
			try {
				source = layer.source;
			} catch (e) {
				source = null;
			}
			if (source && isImageFootage(source)) {
				found.push({
					layer: layer,
					comp: comp,
					score: isDashboardName(layer.name) ? 10 : 5,
				});
			} else if (source instanceof CompItem) {
				if (isDashboardName(layer.name) || isDashboardName(source.name)) {
					var nested = findReplaceableLayers(source, depth + 1);
					if (nested.length) {
						for (var n = 0; n < nested.length; n++) found.push(nested[n]);
					} else {
						found.push({
							layer: layer,
							comp: comp,
							score: 8,
							replacePrecomp: true,
						});
					}
				} else if (depth === 0) {
					var nested2 = findReplaceableLayers(source, depth + 1);
					for (var m = 0; m < nested2.length; m++) found.push(nested2[m]);
				}
			}
		}
		found.sort((a, b) => b.score - a.score);
		return found;
	}

	function replaceLayerSource(layer, footage) {
		if (!layer || !footage) return false;
		try {
			layer.replaceSource(footage, false);
			return true;
		} catch (e) {
			return false;
		}
	}

	function addDashboardLayer(comp, footage) {
		var layer = comp.layers.add(footage);
		layer.moveToBeginning();
		try {
			var sw = footage.width;
			var sh = footage.height;
			if (sw > 0 && sh > 0) {
				var targetW = comp.width * 0.72;
				var scale = (targetW / sw) * 100;
				layer.property("Scale").setValue([scale, scale]);
				layer
					.property("Position")
					.setValue([comp.width * 0.58, comp.height * 0.52]);
			}
		} catch (e) {}
		layer.name = "CAALM Dashboard";
		return layer;
	}

	function remapLayerColors(comp) {
		for (var i = 1; i <= comp.numLayers; i++) {
			var layer = comp.layer(i);
			var lname = String(layer.name).toLowerCase();
			try {
				var src = layer.source;
				if (
					src instanceof FootageItem &&
					src.mainSource instanceof SolidSource
				) {
					var color = src.mainSource.color;
					var next = null;
					if (lname === "bg" || lname.indexOf("background") !== -1)
						next = COLOR_BG;
					else if (lname.indexOf("grid") !== -1) next = COLOR_BG_ALT;
					else next = remapSolidColor(color);
					if (next) {
						src.mainSource.color = next;
						report.solidsRemapped += 1;
					}
				}
			} catch (e1) {}
			try {
				if (
					layer.matchName === "ADBE Vector Layer" ||
					(layer.property && layer.property("Contents"))
				) {
					var contents = layer.property("Contents");
					if (contents) {
						for (var c = 1; c <= contents.numProperties; c++) {
							var group = contents.property(c);
							try {
								var fill = group.property("Contents")
									? group.property("Contents").property("Fill")
									: null;
								if (!fill) fill = group.property("Fill");
								if (fill && fill.property("Color")) {
									var fillColor = fill.property("Color").value;
									var mapped = null;
									if (lname === "bg" || isDarkColor(fillColor))
										mapped = COLOR_BG;
									else if (isRedAccent(fillColor)) mapped = COLOR_TEAL;
									if (mapped) {
										fill.property("Color").setValue(mapped);
										report.shapesRemapped += 1;
									}
								}
							} catch (e2) {}
						}
					}
				}
			} catch (e3) {}
		}
	}

	function updateTextInComp(comp) {
		for (var i = 1; i <= comp.numLayers; i++) {
			var layer = comp.layer(i);
			var newName = replaceBrandText(layer.name);
			if (newName !== layer.name) {
				layer.name = newName;
				report.layersRenamed += 1;
			}
			if (!(layer instanceof TextLayer)) continue;
			try {
				var sourceText = layer.property("Source Text");
				if (!sourceText) continue;
				if (sourceText.numKeys && sourceText.numKeys > 0) {
					for (var k = 1; k <= sourceText.numKeys; k++) {
						var keyDoc = sourceText.keyValue(k);
						if (updateTextDocLocal(keyDoc)) {
							sourceText.setValueAtKey(k, keyDoc);
							report.textUpdated += 1;
						}
					}
				} else {
					var textDoc = sourceText.value;
					if (updateTextDocLocal(textDoc)) {
						sourceText.setValue(textDoc);
						report.textUpdated += 1;
					}
				}
			} catch (e) {
				report.fontFailures.push({
					comp: comp.name,
					layer: layer.name,
					error: String(e),
				});
			}
		}
	}

	function discoverSample(comp) {
		if (!comp) return null;
		var layers = [];
		for (var i = 1; i <= Math.min(comp.numLayers, 40); i++) {
			var layer = comp.layer(i);
			var info = {
				index: layer.index,
				name: layer.name,
				hasSource: false,
				sourceType: null,
				sourceName: null,
			};
			try {
				if (layer.source) {
					info.hasSource = true;
					info.sourceName = layer.source.name;
					if (layer.source instanceof CompItem) info.sourceType = "Comp";
					else if (layer.source instanceof FootageItem) {
						if (layer.source.mainSource instanceof SolidSource)
							info.sourceType = "Solid";
						else if (layer.source.mainSource instanceof FileSource)
							info.sourceType = "File";
						else info.sourceType = "Footage";
					}
				}
			} catch (e) {}
			if (layer instanceof TextLayer)
				info.sourceType = info.sourceType || "Text";
			layers.push(info);
		}
		return { name: comp.name, numLayers: comp.numLayers, layers: layers };
	}

	try {
		app.beginUndoGroup("Transform CAALM Demo");

		for (var ri = 1; ri <= app.project.numItems; ri++) {
			var ritem = app.project.item(ri);
			var rnn = replaceBrandText(ritem.name);
			if (rnn !== ritem.name) {
				ritem.name = rnn;
				report.itemsRenamed += 1;
			}
		}

		var textComps = collectTextComps();
		var scenes = [];
		for (var si = 1; si <= app.project.numItems; si++) {
			var sitem = app.project.item(si);
			if (sitem instanceof CompItem && /^Scene\s+\d+/i.test(sitem.name))
				scenes.push(sitem);
		}

		report.discovery = {
			textCompCount: textComps.length,
			text01: discoverSample(findCompByName("Text 01")),
			scene01: discoverSample(findCompByName("Scene 01")),
			colorComp: discoverSample(findCompByName("CAALM Presentation - Color")),
		};

		var imported = importDashboards("CAALM Dashboards");
		report.imported = [];
		var footageItems = [];
		for (var fi = 0; fi < imported.length; fi++) {
			report.imported.push({
				file: imported[fi].file,
				ok: !!imported[fi].item,
				reused: !!imported[fi].reused,
				error: imported[fi].error || null,
			});
			if (imported[fi].item) footageItems.push(imported[fi].item);
		}
		if (!footageItems.length)
			throw new Error(
				"No dashboard PNGs could be imported. Check asset paths.",
			);

		for (var t = 0; t < textComps.length; t++) {
			var entry = textComps[t];
			var comp = entry.comp;
			var footage = footageItems[(entry.num - 1) % footageItems.length];
			updateTextInComp(comp);
			remapLayerColors(comp);
			var candidates = findReplaceableLayers(comp, 0);
			var replaced = false;
			if (candidates.length) {
				replaced = replaceLayerSource(candidates[0].layer, footage);
				if (replaced) report.dashboardsReplaced += 1;
			}
			if (!replaced) {
				try {
					addDashboardLayer(comp, footage);
					report.dashboardsAdded += 1;
				} catch (addErr) {
					report.errors.push({ comp: comp.name, error: String(addErr) });
				}
			}
			report.textCompsProcessed += 1;
		}

		for (var sc = 0; sc < scenes.length; sc++) {
			var scene = scenes[sc];
			updateTextInComp(scene);
			remapLayerColors(scene);
			var sceneCandidates = findReplaceableLayers(scene, 0);
			if (sceneCandidates.length) {
				if (
					replaceLayerSource(
						sceneCandidates[0].layer,
						footageItems[sc % footageItems.length],
					)
				) {
					report.dashboardsReplaced += 1;
				}
			}
			report.sceneCompsTouched += 1;
		}

		var mainComp = findCompByName("CAALM Presentation - Color");
		if (mainComp) {
			updateTextInComp(mainComp);
			remapLayerColors(mainComp);
		}

		var saveFile = new File(
			Folder.myDocuments.fsName + "/" + saveName + ".aep",
		);
		app.project.save(saveFile);
		report.savedTo = saveFile.fsName;
		report.message =
			"Transformed to CAALM light mode; cycled dashboards across Text comps; saved project.";
		app.endUndoGroup();
		return JSON.stringify(report, null, 2);
	} catch (error) {
		try {
			app.endUndoGroup();
		} catch (e) {}
		report.status = "error";
		report.message = String(error);
		return JSON.stringify(report, null, 2);
	}
}

var __result = transformCaalmDemo({ projectSaveName: "caalm-demo" });
try {
	var outFile = new File(
		Folder.myDocuments.fsName + "/ae-mcp-bridge/ae_mcp_result.json",
	);
	outFile.encoding = "UTF-8";
	outFile.open("w");
	outFile.write(__result);
	outFile.close();
	var cmdFile = new File(
		Folder.myDocuments.fsName + "/ae-mcp-bridge/ae_command.json",
	);
	cmdFile.encoding = "UTF-8";
	cmdFile.open("w");
	cmdFile.write(
		'{"command":"transformCaalmDemo","status":"completed","timestamp":"' +
			new Date().toISOString() +
			'"}',
	);
	cmdFile.close();
} catch (e) {}
