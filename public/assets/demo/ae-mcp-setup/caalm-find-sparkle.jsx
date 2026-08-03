(() => {
	var report = {
		status: "success",
		project: app.project.file ? app.project.file.fsName : "unsaved",
		compsNamed: [],
		shapeStars: [],
		nearCaalm: [],
		allShapeLayers: [],
		errors: [],
	};

	function writeReport(obj) {
		var paths = [
			Folder.myDocuments.fsName + "/ae-mcp-bridge/ae_mcp_result.json",
			"C:/Users/victo/Documents/ae-mcp-bridge/ae_mcp_result.json",
			"C:/Users/victo/OneDrive/Documents/ae-mcp-bridge/ae_mcp_result.json",
			"C:/Users/victo/Development/caalm-next/public/assets/demo/ae-mcp-setup/ae_mcp_result.json",
		];
		var json = JSON.stringify(obj, null, 2);
		for (var i = 0; i < paths.length; i++) {
			try {
				var f = new File(paths[i]);
				f.parent.create();
				f.encoding = "UTF-8";
				if (f.open("w")) {
					f.write(json);
					f.close();
				}
			} catch (e) {}
		}
	}

	function hasStarShape(layer) {
		try {
			if (layer.matchName !== "ADBE Vector Layer") return false;
			var contents = layer.property("Contents");
			if (!contents) return false;
			function walk(group, depth) {
				if (!group || depth > 8) return false;
				for (var i = 1; i <= group.numProperties; i++) {
					var p = group.property(i);
					if (!p) continue;
					if (
						p.matchName === "ADBE Vector Shape - Star" ||
						/star|polystar/i.test(p.name)
					) {
						return true;
					}
					if (p.numProperties && walk(p, depth + 1)) return true;
				}
				return false;
			}
			return walk(contents, 0);
		} catch (e) {
			return false;
		}
	}

	function layerBrief(comp, layer) {
		var o = {
			comp: comp.name,
			index: layer.index,
			name: layer.name,
			enabled: layer.enabled,
			type: null,
			source: null,
			pos: null,
			scale: null,
			text: null,
			hasStar: false,
		};
		try {
			if (layer instanceof TextLayer) {
				o.type = "Text";
				try {
					o.text = layer.property("Source Text").value.text;
				} catch (eT) {}
			} else if (layer.matchName === "ADBE Vector Layer") {
				o.type = "Shape";
				o.hasStar = hasStarShape(layer);
			} else if (layer.source) {
				o.source = layer.source.name;
				o.type = layer.source instanceof CompItem ? "Comp" : "Footage";
			}
			try {
				o.pos = layer.property("Position").value;
				o.scale = layer.property("Scale").value;
			} catch (eP) {}
		} catch (e) {}
		return o;
	}

	try {
		for (var i = 1; i <= app.project.numItems; i++) {
			var it = app.project.item(i);
			if (!(it instanceof CompItem)) continue;
			var n = it.name;
			report.compsNamed.push(n);

			var interesting =
				/^Text\s+0?[123]$/i.test(n) ||
				/^Scene/i.test(n) ||
				/sparkle|star|logo|color/i.test(n) ||
				/Final/i.test(n);

			for (var l = 1; l <= it.numLayers; l++) {
				var layer = it.layer(l);
				var brief = layerBrief(it, layer);

				if (brief.type === "Shape") {
					report.allShapeLayers.push(brief);
					if (brief.hasStar) report.shapeStars.push(brief);
				}

				if (
					/sparkle|star|flare|glint|shine|asterisk|\*|logo/i.test(layer.name) ||
					(brief.source && /sparkle|star|flare|logo/i.test(brief.source))
				) {
					report.nearCaalm.push(brief);
				}

				if (
					interesting &&
					brief.type === "Text" &&
					brief.text &&
					/CAALM|Neuro/i.test(brief.text)
				) {
					report.nearCaalm.push(brief);
					// Collect sibling layers in same comp
					for (var s = 1; s <= it.numLayers; s++) {
						report.nearCaalm.push(layerBrief(it, it.layer(s)));
					}
				}
			}
		}
	} catch (err) {
		report.status = "error";
		report.message = String(err);
	}

	writeReport(report);
})();
