/**
 * Place logo.png to the LEFT of CAALM wordmarks in Text folder comps (Text 01–).
 * Parents logo to the text layer so existing animation carries through.
 *
 * Standalone: File → Scripts → Run Script File…
 * MCP: placeCaalmLogoLeft
 */
function placeCaalmLogoLeft(args) {
	args = args || {};
	var LOGO_PATH =
		args.logoPath ||
		"c:/Users/victo/Development/caalm-next/public/assets/images/logo.png";
	var GAP = args.gap != null ? args.gap : 36;
	var report = {
		status: "success",
		processed: [],
		skipped: [],
		cleaned: [],
		parentFixed: [],
		errors: [],
		savedTo: null,
	};

	function textOf(layer) {
		try {
			return String(layer.property("Source Text").value.text || "");
		} catch (e) {
			return "";
		}
	}

	function findLogo() {
		for (var i = 1; i <= app.project.numItems; i++) {
			var it = app.project.item(i);
			if (it instanceof FootageItem && it.name === "logo.png") return it;
		}
		var file = new File(LOGO_PATH);
		if (!file.exists) throw new Error("Logo not found: " + LOGO_PATH);
		var io = new ImportOptions(file);
		io.importAs = ImportAsType.FOOTAGE;
		return app.project.importFile(io);
	}

	function cleanLogoLayers(comp) {
		for (var l = comp.numLayers; l >= 1; l--) {
			var layer = comp.layer(l);
			var kill = false;
			if (/^CAALM Logo$/i.test(layer.name)) kill = true;
			try {
				if (
					layer.source &&
					layer.source.name === "logo.png" &&
					!(layer instanceof TextLayer)
				)
					kill = true;
			} catch (e) {}
			if (kill) {
				report.cleaned.push({
					comp: comp.name,
					layer: layer.name,
				});
				layer.remove();
			}
		}
	}

	function shouldProcess(comp, textLayer) {
		var name = comp.name;
		var txt = textOf(textLayer).replace(/^\s+|\s+$/g, "");
		if (/^Text\s+0?1$/i.test(name) || /^Text\s+42$/i.test(name)) return true;
		if (/^CAALM$/i.test(txt)) return true;
		if (/^CAALM\b/i.test(txt) && txt.length <= 16) return true;
		return false;
	}

	function placeInTextComp(comp, logo) {
		cleanLogoLayers(comp);

		var textLayer = null;
		for (var l = 1; l <= comp.numLayers; l++) {
			if (comp.layer(l) instanceof TextLayer) {
				textLayer = comp.layer(l);
				break;
			}
		}
		if (!textLayer) {
			report.skipped.push({ comp: comp.name, reason: "no-text" });
			return;
		}
		if (!shouldProcess(comp, textLayer)) {
			report.skipped.push({
				comp: comp.name,
				reason: "not-caalm-title",
				text: textOf(textLayer).substring(0, 40),
			});
			return;
		}

		var logoLayer = comp.layers.add(logo);
		logoLayer.name = "CAALM Logo";
		logoLayer.moveToBeginning();
		logoLayer.startTime = textLayer.startTime;
		logoLayer.inPoint = textLayer.inPoint;
		logoLayer.outPoint = textLayer.outPoint;

		var targetH = Math.max(40, comp.height * 0.8);
		var scalePct = (targetH / logo.height) * 100;
		logoLayer.property("Scale").setValue([scalePct, scalePct]);
		var logoW = logo.width * (scalePct / 100);

		var extra = Math.ceil(logoW + GAP + 24);
		comp.width = comp.width + extra;

		for (var i = 1; i <= comp.numLayers; i++) {
			var ly = comp.layer(i);
			if (ly === logoLayer) continue;
			if (ly.parent) continue;
			try {
				var pos = ly.property("Position");
				if (pos.numKeys > 0) {
					for (var k = 1; k <= pos.numKeys; k++) {
						var kv = pos.keyValue(k);
						pos.setValueAtKey(k, [kv[0] + extra, kv[1]]);
					}
				} else {
					var v = pos.value;
					pos.setValue([v[0] + extra, v[1]]);
				}
			} catch (eShift) {}
		}

		logoLayer.parent = textLayer;
		logoLayer.property("Position").setValue([-(GAP + logoW * 0.55), 0]);

		try {
			var tOp = textLayer.property("Opacity");
			var lOp = logoLayer.property("Opacity");
			if (tOp.numKeys > 0) {
				for (var ok = 1; ok <= tOp.numKeys; ok++) {
					lOp.setValueAtTime(tOp.keyTime(ok), tOp.keyValue(ok));
				}
			} else {
				lOp.setValue(tOp.value);
			}
		} catch (eOp) {}

		report.processed.push({
			comp: comp.name,
			text: textOf(textLayer).substring(0, 48),
			scale: scalePct,
			width: comp.width,
			extra: extra,
			parent: textLayer.name,
		});
	}

	function fixParentLogoNearText01(logo) {
		// In Color / Scene comps: if logo.png sits on Text 01, parent it left of that layer
		for (var p = 1; p <= app.project.numItems; p++) {
			var parent = app.project.item(p);
			if (!(parent instanceof CompItem)) continue;
			if (/^Text\s+\d+/i.test(parent.name)) continue;
			if (!/Color|Scene|Final/i.test(parent.name)) continue;

			var text01Layer = null;
			for (var t = 1; t <= parent.numLayers; t++) {
				var tl = parent.layer(t);
				if (
					tl.source &&
					tl.source instanceof CompItem &&
					/^Text\s+0?1$/i.test(tl.source.name)
				) {
					text01Layer = tl;
					break;
				}
			}
			if (!text01Layer) continue;

			for (var l = parent.numLayers; l >= 1; l--) {
				var ly = parent.layer(l);
				var isLogo = false;
				try {
					if (/^CAALM Logo$/i.test(ly.name)) isLogo = true;
					if (
						ly.source &&
						ly.source instanceof FootageItem &&
						ly.source.name === "logo.png"
					)
						isLogo = true;
				} catch (e) {}
				if (!isLogo) continue;

				try {
					ly.name = "CAALM Logo";
					ly.enabled = true;
					ly.startTime = text01Layer.startTime;
					ly.inPoint = text01Layer.inPoint;
					ly.outPoint = text01Layer.outPoint;

					var targetH = Math.max(60, 140);
					try {
						targetH = Math.max(60, text01Layer.source.height * 0.75);
					} catch (eH) {}
					var scalePct = (targetH / logo.height) * 100;
					ly.property("Scale").setValue([scalePct, scalePct]);
					var logoW = logo.width * (scalePct / 100);

					ly.parent = text01Layer;
					ly.property("Position").setValue([
						-(GAP + logoW * 0.55 + text01Layer.source.width * 0.5),
						0,
					]);

					report.parentFixed.push({
						comp: parent.name,
						layer: ly.name,
						parentedTo: text01Layer.name,
						scale: scalePct,
					});
				} catch (eFix) {
					report.errors.push({
						comp: parent.name,
						error: String(eFix),
					});
				}
			}
		}
	}

	try {
		app.beginUndoGroup("CAALM logo left of Text");

		var logo = findLogo();
		report.logo = logo.name;

		for (var i = 1; i <= app.project.numItems; i++) {
			var it = app.project.item(i);
			if (!(it instanceof CompItem)) continue;
			if (!/^Text\s+\d+/i.test(it.name)) continue;
			try {
				placeInTextComp(it, logo);
			} catch (eC) {
				report.errors.push({ comp: it.name, error: String(eC) });
			}
		}

		try {
			fixParentLogoNearText01(logo);
		} catch (eP) {
			report.errors.push({ step: "parentFix", error: String(eP) });
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

// Standalone run
(() => {
	var isBridge =
		typeof logToPanel === "function" || typeof getResultFilePath === "function";
	if (isBridge) return;
	var result = placeCaalmLogoLeft({});
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
			"C:/Users/victo/Documents/ae-mcp-bridge/ae_sparkle_boot.txt",
		);
		b.open("w");
		b.write("place-logo-left " + new Date().toString());
		b.close();
	} catch (e2) {}
})();
