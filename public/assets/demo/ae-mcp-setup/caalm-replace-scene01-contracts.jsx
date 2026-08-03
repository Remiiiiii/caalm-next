/**
 * Replace Scene 01 visuals with demo-07-contracts-full.png
 * while keeping Scene 01 animation (transforms, timing, effects, parents).
 *
 * Strategy:
 * 1) Import contracts PNG
 * 2) Inside Design 01: hide existing UI layers, add PNG fitted to comp
 *    → Scene 01's "Design" layer keeps all its keyframes/effects
 * 3) Hide Scene 01 chrome that duplicates the screenshot (Icons, Text comps,
 *    Element shapes) so only the animated Design plate + controllers remain
 * 4) Copy Design layer effects onto the PNG if Design itself is disabled later
 *
 * Run: File → Scripts → Run Script File…
 */
function replaceScene01WithContracts(args) {
	args = args || {};
	var PNG_PATH =
		args.pngPath ||
		"c:/Users/victo/Development/caalm-next/public/assets/icons/demo-video/generated/demo-07-contracts-full.png";
	var report = {
		status: "success",
		analysis: { scene01: null, designLayer: null, animated: [] },
		actions: [],
		errors: [],
		savedTo: null,
	};

	function findComp(name) {
		for (var i = 1; i <= app.project.numItems; i++) {
			var it = app.project.item(i);
			if (it instanceof CompItem && it.name === name) return it;
		}
		return null;
	}

	function findFootage(name) {
		for (var i = 1; i <= app.project.numItems; i++) {
			var it = app.project.item(i);
			if (it instanceof FootageItem && it.name === name) return it;
		}
		return null;
	}

	function importPng() {
		var existing = findFootage("demo-07-contracts-full.png");
		if (existing) return existing;
		var file = new File(PNG_PATH);
		if (!file.exists) throw new Error("PNG not found: " + PNG_PATH);
		var io = new ImportOptions(file);
		io.importAs = ImportAsType.FOOTAGE;
		return app.project.importFile(io);
	}

	function keysOf(prop) {
		try {
			return prop ? prop.numKeys : 0;
		} catch (e) {
			return 0;
		}
	}

	function analyzeScene(scene) {
		var animated = [];
		var designLayer = null;
		for (var l = 1; l <= scene.numLayers; l++) {
			var layer = scene.layer(l);
			var entry = {
				index: layer.index,
				name: layer.name,
				enabled: layer.enabled,
				parent: layer.parent ? layer.parent.name : null,
				inPoint: layer.inPoint,
				outPoint: layer.outPoint,
				source: layer.source ? layer.source.name : null,
				keys: {},
				effects: [],
			};
			try {
				var t = layer.property("ADBE Transform Group");
				entry.keys.position = keysOf(t.property("ADBE Position"));
				entry.keys.scale = keysOf(t.property("ADBE Scale"));
				entry.keys.rotation = keysOf(t.property("ADBE Rotate Z"));
				entry.keys.opacity = keysOf(t.property("ADBE Opacity"));
			} catch (eT) {}
			try {
				var fx = layer.property("ADBE Effect Parade");
				if (fx) {
					for (var i = 1; i <= fx.numProperties; i++) {
						entry.effects.push(fx.property(i).name);
					}
				}
			} catch (eF) {}
			var total =
				(entry.keys.position || 0) +
				(entry.keys.scale || 0) +
				(entry.keys.rotation || 0) +
				(entry.keys.opacity || 0);
			if (total > 0 || entry.effects.length > 0) animated.push(entry);
			if (
				layer.source &&
				layer.source instanceof CompItem &&
				/^Design/i.test(layer.source.name)
			) {
				designLayer = entry;
				designLayer.layerIndex = layer.index;
			}
		}
		report.analysis.scene01 = {
			width: scene.width,
			height: scene.height,
			duration: scene.duration,
			numLayers: scene.numLayers,
		};
		report.analysis.designLayer = designLayer;
		report.analysis.animated = animated;
	}

	function fitLayerToComp(layer, footage, comp) {
		var sw = footage.width;
		var sh = footage.height;
		if (sw <= 0 || sh <= 0) return 100;
		var scale = Math.min(comp.width / sw, comp.height / sh) * 100;
		layer.property("Scale").setValue([scale, scale]);
		layer.property("Position").setValue([comp.width / 2, comp.height / 2]);
		return scale;
	}

	function clearDesignAndAddPng(designComp, footage) {
		// Remove prior contracts plates
		for (var l = designComp.numLayers; l >= 1; l--) {
			var ly = designComp.layer(l);
			if (/^CAALM Contracts/i.test(ly.name)) {
				ly.remove();
				report.actions.push({
					action: "removed-old-plate",
					comp: designComp.name,
				});
			}
		}

		// Disable existing design UI layers (keep them for undo / reference)
		for (var i = 1; i <= designComp.numLayers; i++) {
			var layer = designComp.layer(i);
			if (layer.enabled) {
				layer.enabled = false;
				report.actions.push({
					action: "disabled-design-layer",
					name: layer.name,
				});
			}
		}

		var plate = designComp.layers.add(footage);
		plate.name = "CAALM Contracts";
		plate.moveToBeginning();
		plate.startTime = 0;
		plate.inPoint = 0;
		plate.outPoint = designComp.duration;
		var scale = fitLayerToComp(plate, footage, designComp);
		report.actions.push({
			action: "added-png-in-design",
			comp: designComp.name,
			scale: scale,
		});
		return plate;
	}

	function hideSceneChrome(scene) {
		// Hide Icon/Text/Element chrome so the Design plate (now contracts PNG) is the hero.
		// Keep: Design, Nulls, Adjustment, Controllers, Settings nulls that may drive anim.
		for (var l = 1; l <= scene.numLayers; l++) {
			var layer = scene.layer(l);
			var name = layer.name;
			var hide = false;

			if (/^Icon\s+\d+/i.test(name)) hide = true;
			if (/^Text\s+\d+/i.test(name)) hide = true;
			if (/^Element/i.test(name)) hide = true;
			if (/^Button/i.test(name)) hide = true;
			if (/^PREFETENSE/i.test(name)) hide = true;
			if (/^Cursor/i.test(name)) hide = true;

			// Keep Design (animated plate), Nulls, Adjustment, Controllers, Settings
			if (/^Design/i.test(name)) hide = false;
			if (layer.nullLayer) hide = false;
			if (layer.adjustmentLayer) hide = false;
			if (/^Controllers?$/i.test(name)) hide = false;
			if (/^Settings$/i.test(name)) hide = false;
			if (/^Null/i.test(name)) hide = false;

			if (hide && layer.enabled) {
				layer.enabled = false;
				report.actions.push({
					action: "hid-chrome",
					name: name,
					index: layer.index,
				});
			}
		}
	}

	function ensureDesignKeepsAnimation(scene) {
		// Make sure Design layer stays enabled — it holds Scene 01 motion
		for (var l = 1; l <= scene.numLayers; l++) {
			var layer = scene.layer(l);
			if (
				layer.source &&
				layer.source instanceof CompItem &&
				/^Design/i.test(layer.source.name)
			) {
				layer.enabled = true;
				report.actions.push({
					action: "ensure-design-enabled",
					name: layer.name,
					keys: {
						// snapshot for report
					},
					parent: layer.parent ? layer.parent.name : null,
					inPoint: layer.inPoint,
					outPoint: layer.outPoint,
					effects: (() => {
						var names = [];
						try {
							var fx = layer.property("ADBE Effect Parade");
							if (fx) {
								for (var i = 1; i <= fx.numProperties; i++) {
									names.push(fx.property(i).name);
								}
							}
						} catch (e) {}
						return names;
					})(),
				});
				return layer;
			}
		}
		return null;
	}

	try {
		app.beginUndoGroup("Replace Scene 01 with contracts PNG");

		var scene = findComp("Scene 01");
		if (!scene) throw new Error("Scene 01 not found");

		analyzeScene(scene);

		var footage = importPng();
		report.png = footage.name;

		var designComp = findComp("Design 01");
		if (!designComp) {
			// Fallback: add PNG directly into Scene 01, copy Design transforms if any
			var designLayer = null;
			for (var s = 1; s <= scene.numLayers; s++) {
				if (/^Design/i.test(scene.layer(s).name)) {
					designLayer = scene.layer(s);
					break;
				}
			}

			// Remove old plate
			for (var r = scene.numLayers; r >= 1; r--) {
				if (/^CAALM Contracts/i.test(scene.layer(r).name)) {
					scene.layer(r).remove();
				}
			}

			var plate = scene.layers.add(footage);
			plate.name = "CAALM Contracts";
			if (designLayer) {
				plate.moveAfter(designLayer);
				plate.startTime = designLayer.startTime;
				plate.inPoint = designLayer.inPoint;
				plate.outPoint = designLayer.outPoint;
				plate.parent = designLayer.parent;
				// Copy transform values/keyframes
				try {
					var props = [
						"ADBE Position",
						"ADBE Scale",
						"ADBE Rotate Z",
						"ADBE Opacity",
						"ADBE Anchor Point",
					];
					var srcT = designLayer.property("ADBE Transform Group");
					var dstT = plate.property("ADBE Transform Group");
					for (var p = 0; p < props.length; p++) {
						var sp = srcT.property(props[p]);
						var dp = dstT.property(props[p]);
						if (sp.numKeys > 0) {
							for (var k = 1; k <= sp.numKeys; k++) {
								dp.setValueAtTime(sp.keyTime(k), sp.keyValue(k));
							}
						} else {
							dp.setValue(sp.value);
						}
					}
				} catch (eCopy) {
					report.errors.push({ step: "copy-transform", error: String(eCopy) });
				}
				// Fit relative to scene
				fitLayerToComp(plate, footage, scene);
				designLayer.enabled = false;
			} else {
				plate.moveToBeginning();
				fitLayerToComp(plate, footage, scene);
			}
			hideSceneChrome(scene);
			report.actions.push({ action: "fallback-scene-plate" });
		} else {
			clearDesignAndAddPng(designComp, footage);
			ensureDesignKeepsAnimation(scene);
			hideSceneChrome(scene);
		}

		app.project.save();
		report.savedTo = app.project.file ? app.project.file.fsName : null;
		app.endUndoGroup();
	} catch (err) {
		try {
			app.endUndoGroup();
		} catch (e2) {}
		report.status = "error";
		report.message = String(err);
	}

	return JSON.stringify(report, null, 2);
}

(() => {
	var isBridge =
		typeof logToPanel === "function" || typeof getResultFilePath === "function";
	if (isBridge) return;
	var result = replaceScene01WithContracts({});
	try {
		var f = new File(
			"C:/Users/victo/Documents/ae-mcp-bridge/ae_mcp_result.json",
		);
		f.encoding = "UTF-8";
		f.open("w");
		f.write(result);
		f.close();
	} catch (e) {}
	try {
		var b = new File(
			"C:/Users/victo/Documents/ae-mcp-bridge/ae_scene01_boot.txt",
		);
		b.open("w");
		b.write("scene01-contracts " + new Date().toString());
		b.close();
	} catch (e2) {}
})();
