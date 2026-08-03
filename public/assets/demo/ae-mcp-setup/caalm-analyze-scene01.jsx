/**
 * Analyze Scene 01 motion: keyframes, effects, parents, nesting.
 */
(() => {
	var report = {
		status: "success",
		scene01: null,
		design01: null,
		animatedLayers: [],
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

	function keysOf(prop) {
		if (!prop) return 0;
		try {
			return prop.numKeys;
		} catch (e) {
			return 0;
		}
	}

	function analyzeLayer(comp, layer) {
		var info = {
			comp: comp.name,
			index: layer.index,
			name: layer.name,
			enabled: layer.enabled,
			solo: false,
			inPoint: layer.inPoint,
			outPoint: layer.outPoint,
			startTime: layer.startTime,
			sourceType: null,
			sourceName: null,
			parent: layer.parent ? layer.parent.name : null,
			keys: {},
			effects: [],
			hasMotionBlur: false,
			blendingMode: null,
		};
		try {
			if (layer instanceof TextLayer) info.sourceType = "Text";
			else if (layer.matchName === "ADBE Vector Layer")
				info.sourceType = "Shape";
			else if (layer.nullLayer) info.sourceType = "Null";
			else if (layer.adjustmentLayer) info.sourceType = "Adjustment";
			else if (layer.source) {
				info.sourceName = layer.source.name;
				info.sourceType = layer.source instanceof CompItem ? "Comp" : "Footage";
			}
		} catch (e) {}

		try {
			var t = layer.property("ADBE Transform Group");
			info.keys.position = keysOf(t.property("ADBE Position"));
			info.keys.scale = keysOf(t.property("ADBE Scale"));
			info.keys.rotation = keysOf(t.property("ADBE Rotate Z"));
			info.keys.opacity = keysOf(t.property("ADBE Opacity"));
			info.keys.anchor = keysOf(t.property("ADBE Anchor Point"));
			try {
				info.pos = t.property("ADBE Position").value;
				info.scale = t.property("ADBE Scale").value;
				info.opacity = t.property("ADBE Opacity").value;
			} catch (eV) {}
		} catch (eT) {}

		try {
			var fx = layer.property("ADBE Effect Parade");
			if (fx) {
				for (var i = 1; i <= fx.numProperties; i++) {
					info.effects.push(fx.property(i).name);
				}
			}
		} catch (eF) {}

		try {
			info.hasMotionBlur = layer.motionBlur;
			info.blendingMode = layer.blendingMode;
		} catch (eB) {}

		var totalKeys =
			(info.keys.position || 0) +
			(info.keys.scale || 0) +
			(info.keys.rotation || 0) +
			(info.keys.opacity || 0) +
			(info.keys.anchor || 0);
		info.animated = totalKeys > 0 || info.effects.length > 0;
		return info;
	}

	function findComp(name) {
		for (var i = 1; i <= app.project.numItems; i++) {
			var it = app.project.item(i);
			if (it instanceof CompItem && it.name === name) return it;
		}
		return null;
	}

	try {
		var scene = findComp("Scene 01");
		if (!scene) throw new Error("Scene 01 not found");

		var layers = [];
		var animated = [];
		for (var l = 1; l <= scene.numLayers; l++) {
			var info = analyzeLayer(scene, scene.layer(l));
			layers.push(info);
			if (info.animated || info.enabled) animated.push(info);
		}
		report.scene01 = {
			name: scene.name,
			width: scene.width,
			height: scene.height,
			duration: scene.duration,
			frameRate: scene.frameRate,
			numLayers: scene.numLayers,
			layers: layers,
		};
		report.animatedLayers = animated;

		var design = findComp("Design 01");
		if (design) {
			var dLayers = [];
			for (var d = 1; d <= design.numLayers; d++) {
				dLayers.push(analyzeLayer(design, design.layer(d)));
			}
			report.design01 = {
				name: design.name,
				width: design.width,
				height: design.height,
				numLayers: design.numLayers,
				layers: dLayers,
			};
		}
	} catch (err) {
		report.status = "error";
		report.message = String(err);
	}

	writeReport(report);
})();
