/**
 * Replace intro sparkle/star next to "CAALM" with public/assets/images/logo.png
 * Run: File → Scripts → Run Script File… (close MCP Bridge Auto first if -r fails)
 */
(function () {
	var LOGO_PATH =
		"c:/Users/victo/Development/caalm-next/public/assets/images/logo.png";
	var report = {
		status: "success",
		sparkleCandidates: [],
		replaced: [],
		errors: [],
		savedTo: null,
		boot: new Date().toString(),
	};

	function writeBoot() {
		try {
			var b = new File(
				"C:/Users/victo/Documents/ae-mcp-bridge/ae_sparkle_boot.txt",
			);
			b.open("w");
			b.write("boot " + new Date().toString());
			b.close();
		} catch (e) {}
	}

	function writeReport(obj) {
		var paths = [
			"C:/Users/victo/Documents/ae-mcp-bridge/ae_mcp_result.json",
			Folder.myDocuments.fsName + "/ae-mcp-bridge/ae_mcp_result.json",
		];
		var json = JSON.stringify(obj, null, 2);
		for (var i = 0; i < paths.length; i++) {
			try {
				var f = new File(paths[i]);
				f.encoding = "UTF-8";
				if (f.open("w")) {
					f.write(json);
					f.close();
				}
			} catch (e) {}
		}
	}

	writeBoot();

	function layerInfo(comp, layer) {
		var info = {
			comp: comp.name,
			index: layer.index,
			name: layer.name,
			enabled: layer.enabled,
			sourceName: null,
			sourceType: null,
			pos: null,
			scale: null,
		};
		try {
			info.pos = layer.property("Position").value;
			info.scale = layer.property("Scale").value;
		} catch (eP) {}
		try {
			if (layer.source) {
				info.sourceName = layer.source.name;
				if (layer.source instanceof CompItem) info.sourceType = "Comp";
				else if (layer.source instanceof FootageItem) {
					if (layer.source.mainSource instanceof SolidSource)
						info.sourceType = "Solid";
					else if (layer.source.mainSource instanceof FileSource)
						info.sourceType = "File";
					else info.sourceType = "Footage";
				}
			} else if (layer instanceof TextLayer) info.sourceType = "Text";
			else if (layer.matchName === "ADBE Vector Layer")
				info.sourceType = "Shape";
		} catch (e) {}
		return info;
	}

	function isSparkleName(name) {
		var n = String(name).toLowerCase();
		return /sparkle|star|flare|glint|shine|asterisk|twinkle|burst/.test(n);
	}

	function hasStarShape(layer) {
		try {
			if (layer.matchName !== "ADBE Vector Layer") return false;
			var contents = layer.property("Contents");
			if (!contents) return false;
			function walk(group, depth) {
				if (!group || depth > 10) return false;
				for (var i = 1; i <= group.numProperties; i++) {
					var p = group.property(i);
					if (!p) continue;
					if (p.matchName === "ADBE Vector Shape - Star") return true;
					if (/star|polystar/i.test(p.name)) return true;
					if (p.numProperties && walk(p, depth + 1)) return true;
				}
				return false;
			}
			return walk(contents, 0);
		} catch (e) {
			return false;
		}
	}

	function getTextContent(layer) {
		try {
			if (!(layer instanceof TextLayer)) return null;
			return String(layer.property("Source Text").value.text || "");
		} catch (e) {
			return null;
		}
	}

	function placeLogoOverLayer(comp, layer, logoFootage, method) {
		var pos = layer.property("Position").value;
		var scale = layer.property("Scale").value;
		var rot = 0;
		var opac = 100;
		try {
			rot = layer.property("Rotation").value;
		} catch (eR) {}
		try {
			opac = layer.property("Opacity").value;
		} catch (eO) {}

		layer.enabled = false;

		var newLayer = comp.layers.add(logoFootage);
		newLayer.moveBefore(layer);
		newLayer.name = "CAALM Logo";
		newLayer.property("Position").setValue(pos);

		// Fit logo roughly to prior sparkle visual size (~40–80px tall)
		var targetPct = 12;
		try {
			var sy = Math.abs(scale[1]);
			if (sy > 0 && sy < 80) targetPct = Math.max(8, Math.min(25, sy * 0.35));
			else if (sy >= 80) targetPct = Math.max(8, Math.min(30, sy * 0.15));
		} catch (eS) {}
		newLayer.property("Scale").setValue([targetPct, targetPct]);
		newLayer.property("Rotation").setValue(rot);
		newLayer.property("Opacity").setValue(opac);
		newLayer.inPoint = layer.inPoint;
		newLayer.outPoint = layer.outPoint;

		report.replaced.push({
			comp: comp.name,
			layer: layer.name,
			index: layer.index,
			method: method,
			logoScale: targetPct,
		});
		return newLayer;
	}

	try {
		app.beginUndoGroup("Replace intro sparkle with CAALM logo");

		var logoFootage = null;
		for (var i = 1; i <= app.project.numItems; i++) {
			var it = app.project.item(i);
			if (it instanceof FootageItem && it.name === "logo.png") {
				logoFootage = it;
				break;
			}
		}
		if (!logoFootage) {
			var file = new File(LOGO_PATH);
			if (!file.exists) throw new Error("Logo not found: " + LOGO_PATH);
			var io = new ImportOptions(file);
			io.importAs = ImportAsType.FOOTAGE;
			logoFootage = app.project.importFile(io);
		}
		report.logoImported = logoFootage.name;

		function tryReplaceLayer(comp, layer, reason) {
			var info = layerInfo(comp, layer);
			info.reason = reason;
			report.sparkleCandidates.push(info);

			try {
				if (layer instanceof TextLayer) {
					var txt = getTextContent(layer);
					// Text that is only a sparkle/star glyph or asterisk
					if (
						txt &&
						txt.length <= 4 &&
						!/[A-Za-z0-9]/.test(txt) &&
						/[\*\u2605\u2606\u2726\u2727\u2736]/.test(txt)
					) {
						placeLogoOverLayer(
							comp,
							layer,
							logoFootage,
							"glyph-text->" + reason,
						);
						return true;
					}
					return false;
				}
				if (layer.source && layer.source instanceof CompItem) {
					layer.replaceSource(logoFootage, false);
					report.replaced.push({
						comp: comp.name,
						layer: layer.name,
						index: layer.index,
						method: "replaceSource-" + reason,
					});
					return true;
				}
				if (layer.source && layer.source instanceof FootageItem) {
					layer.replaceSource(logoFootage, false);
					report.replaced.push({
						comp: comp.name,
						layer: layer.name,
						index: layer.index,
						method: "replaceSource-footage-" + reason,
					});
					return true;
				}
				if (layer.matchName === "ADBE Vector Layer") {
					placeLogoOverLayer(comp, layer, logoFootage, "shape->" + reason);
					return true;
				}
			} catch (eRep) {
				report.errors.push({
					comp: comp.name,
					layer: layer.name,
					error: String(eRep),
				});
			}
			return false;
		}

		function findCaalmTextPos(comp) {
			for (var l = 1; l <= comp.numLayers; l++) {
				var layer = comp.layer(l);
				var txt = getTextContent(layer);
				if (txt && /CAALM|NeuroStream/i.test(txt) && txt.length < 40) {
					try {
						return {
							layer: layer,
							pos: layer.property("Position").value,
							index: layer.index,
						};
					} catch (e) {
						return { layer: layer, pos: null, index: layer.index };
					}
				}
			}
			return null;
		}

		function processComp(comp, depth) {
			if (!comp || depth > 4) return;

			var caalm = findCaalmTextPos(comp);

			for (var l = 1; l <= comp.numLayers; l++) {
				var layer = comp.layer(l);
				var nameHit = isSparkleName(layer.name);
				var sourceHit =
					layer.source && isSparkleName(layer.source.name);
				var starShape = hasStarShape(layer);

				// Near CAALM: small shape / named sparkle to the left of title
				var nearTitle = false;
				if (caalm && caalm.pos && layer.enabled) {
					try {
						var p = layer.property("Position").value;
						var leftOf = p[0] < caalm.pos[0] - 10;
						var sameRow = Math.abs(p[1] - caalm.pos[1]) < 120;
						var isShapeOrSparkle =
							starShape ||
							nameHit ||
							sourceHit ||
							layer.matchName === "ADBE Vector Layer";
						if (leftOf && sameRow && isShapeOrSparkle) nearTitle = true;
					} catch (eN) {}
				}

				if (nameHit || sourceHit || starShape || nearTitle) {
					var reason = "near-caalm";
					if (nameHit) reason = "name";
					else if (sourceHit) reason = "source";
					else if (starShape) reason = "polystar";
					tryReplaceLayer(comp, layer, reason);
				}

				// Recurse into early text / sparkle / title comps
				try {
					if (layer.source instanceof CompItem) {
						var sn = layer.source.name;
						if (
							depth < 2 ||
							isSparkleName(layer.name) ||
							isSparkleName(sn) ||
							/^Text\s+0?[123]$/i.test(sn) ||
							/^Scene/i.test(sn) ||
							/Color|Final|Title|Logo|Intro/i.test(sn)
						) {
							processComp(layer.source, depth + 1);
						}
					}
				} catch (eNest) {}
			}
		}

		// Walk title-related comps first
		for (var p = 1; p <= app.project.numItems; p++) {
			var item = app.project.item(p);
			if (!(item instanceof CompItem)) continue;
			if (
				/^Text\s+0?[123]$/i.test(item.name) ||
				/^Scene/i.test(item.name) ||
				/Sparkle|Star|Title|Intro|Logo|Color|Final/i.test(item.name)
			) {
				processComp(item, 0);
			}
		}

		// Global fallback: any polystar or sparkle-named layer
		if (!report.replaced.length) {
			for (var r = 1; r <= app.project.numItems; r++) {
				var ci = app.project.item(r);
				if (!(ci instanceof CompItem)) continue;
				for (var li = 1; li <= ci.numLayers; li++) {
					var ly = ci.layer(li);
					if (isSparkleName(ly.name) || hasStarShape(ly)) {
						tryReplaceLayer(
							ci,
							ly,
							hasStarShape(ly) ? "global-polystar" : "global-name",
						);
					}
				}
			}
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

	writeReport(report);
})();
