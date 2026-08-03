/**
 * Discover where Text 01– are nested and which sibling layers look like sparkle/logo animation.
 */
(() => {
	var report = {
		status: "success",
		textComps: [],
		usages: [],
		parentLayers: [],
		errors: [],
	};

	function writeReport(obj) {
		try {
			var f = new File(
				"C:/Users/victo/Documents/ae-mcp-bridge/ae_mcp_result.json",
			);
			f.encoding = "UTF-8";
			f.open("w");
			f.write(JSON.stringify(obj, null, 2));
			f.close();
		} catch (e) {}
	}

	function layerBrief(comp, layer) {
		var o = {
			comp: comp.name,
			index: layer.index,
			name: layer.name,
			enabled: layer.enabled,
			type: "?",
			source: null,
			pos: null,
			scale: null,
			hasKeys: {},
			parent: null,
			effects: [],
		};
		try {
			if (layer instanceof TextLayer) {
				o.type = "Text";
				try {
					o.text = String(layer.property("Source Text").value.text);
				} catch (eT) {}
			} else if (layer.matchName === "ADBE Vector Layer") o.type = "Shape";
			else if (layer.source) {
				o.source = layer.source.name;
				o.type = layer.source instanceof CompItem ? "Comp" : "Footage";
			}
			o.pos = layer.property("Position").value;
			o.scale = layer.property("Scale").value;
			o.hasKeys.position = layer.property("Position").numKeys;
			o.hasKeys.scale = layer.property("Scale").numKeys;
			o.hasKeys.rotation = layer.property("Rotation").numKeys;
			o.hasKeys.opacity = layer.property("Opacity").numKeys;
			if (layer.parent) o.parent = layer.parent.name;
			try {
				var fx = layer.property("ADBE Effect Parade");
				if (fx) {
					for (var i = 1; i <= fx.numProperties; i++) {
						o.effects.push(fx.property(i).name);
					}
				}
			} catch (eF) {}
		} catch (e) {}
		return o;
	}

	try {
		var textById = {};
		for (var i = 1; i <= app.project.numItems; i++) {
			var it = app.project.item(i);
			if (!(it instanceof CompItem)) continue;
			if (!/^Text\s+\d+/i.test(it.name)) continue;
			var layers = [];
			for (var l = 1; l <= it.numLayers; l++) {
				layers.push(layerBrief(it, it.layer(l)));
			}
			report.textComps.push({
				name: it.name,
				id: it.id,
				numLayers: it.numLayers,
				layers: layers,
			});
			textById[it.id] = it.name;
		}

		// Find parent comps that use Text 01– layers
		for (var p = 1; p <= app.project.numItems; p++) {
			var parent = app.project.item(p);
			if (!(parent instanceof CompItem)) continue;
			if (/^Text\s+\d+/i.test(parent.name)) continue;

			var usedText = [];
			var allLayers = [];
			for (var pl = 1; pl <= parent.numLayers; pl++) {
				var ly = parent.layer(pl);
				allLayers.push(layerBrief(parent, ly));
				if (
					ly.source &&
					ly.source instanceof CompItem &&
					textById[ly.source.id]
				) {
					usedText.push({
						layerName: ly.name,
						textComp: textById[ly.source.id],
						index: ly.index,
						pos: ly.property("Position").value,
						scale: ly.property("Scale").value,
						posKeys: ly.property("Position").numKeys,
						scaleKeys: ly.property("Scale").numKeys,
						opacityKeys: ly.property("Opacity").numKeys,
						parent: ly.parent ? ly.parent.name : null,
					});
				}
			}
			if (usedText.length) {
				report.usages.push({
					parentComp: parent.name,
					textLayers: usedText,
					siblingCount: parent.numLayers,
					siblings: allLayers,
				});
			}
		}

		// Focus Color / Final / Scene comps even without text refs
		for (var q = 1; q <= app.project.numItems; q++) {
			var c = app.project.item(q);
			if (!(c instanceof CompItem)) continue;
			if (!/Color|Final|Scene\s*01|Intro|Title/i.test(c.name)) continue;
			var already = false;
			for (var u = 0; u < report.usages.length; u++) {
				if (report.usages[u].parentComp === c.name) {
					already = true;
					break;
				}
			}
			if (!already) {
				var sibs = [];
				for (var s = 1; s <= c.numLayers; s++) {
					sibs.push(layerBrief(c, c.layer(s)));
				}
				report.parentLayers.push({
					comp: c.name,
					layers: sibs,
				});
			}
		}
	} catch (err) {
		report.status = "error";
		report.message = String(err);
	}

	writeReport(report);
})();
